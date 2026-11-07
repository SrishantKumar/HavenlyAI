import { Platform } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { playbackService } from './playbackService';

const THRESHOLD = -35; // Decibel threshold for voice activity detection (VAD)

let AudioModule: any = null;
let requestRecordingPermissionsAsync: any = null;
let getRecordingPermissionsAsync: any = null;
let setAudioModeAsync: any = null;
let RecordingPresets: any = null;

try {
  const expoAudio = require('expo-audio');
  AudioModule = expoAudio.AudioModule;
  requestRecordingPermissionsAsync = expoAudio.requestRecordingPermissionsAsync;
  getRecordingPermissionsAsync = expoAudio.getRecordingPermissionsAsync;
  setAudioModeAsync = expoAudio.setAudioModeAsync;
  RecordingPresets = expoAudio.RecordingPresets;
} catch (e) {
  // expo-audio is native only
}

interface WebRecordingSession {
  mediaRecorder: any;
  stream: any;
  chunks: Blob[];
  startTime: number;
  pauseTime?: number;
  totalPausedMs: number;
  speechRec?: any;
  transcript: string;
}

let webSession: WebRecordingSession | null = null;
let recordingInstance: any = null;
let isRecordingActive = false;
let vadInterval: any = null;
let webAudioCtx: any = null;

export const recordingService = {
  /**
   * Requests microphone permissions and returns status.
   */
  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'web' || (typeof window !== 'undefined' && navigator?.mediaDevices?.getUserMedia)) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        return true;
      } catch (e) {
        console.warn('Microphone permission request failed on web:', e);
        return false;
      }
    }
    if (!requestRecordingPermissionsAsync) return true;
    try {
      const { status } = await requestRecordingPermissionsAsync();
      return status === 'granted';
    } catch (e) {
      console.warn('Microphone permission request failed', e);
      return false;
    }
  },

  /**
   * Starts recording audio. Uses MediaRecorder on Web and AudioRecorder on Native.
   */
  async startRecording(): Promise<void> {
    try {
      await this.cleanup();

      // ponytail: HTML5 MediaRecorder + SpeechRecognition captures real audio & transcript on Web with zero external npm dependencies.
      if (Platform.OS === 'web' || (typeof window !== 'undefined' && navigator?.mediaDevices?.getUserMedia)) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        let mimeType = '';
        const supportedTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
        for (const t of supportedTypes) {
          if ((window as any).MediaRecorder?.isTypeSupported?.(t)) {
            mimeType = t;
            break;
          }
        }

        const mediaRecorder = mimeType
          ? new (window as any).MediaRecorder(stream, { mimeType })
          : new (window as any).MediaRecorder(stream);
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e: any) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        mediaRecorder.start(250);

        // Web Audio VAD: Real-time amplitude metering & decibel calculation for barge-in
        const AudioContextClass =
          typeof window !== 'undefined' &&
          ((window as any).AudioContext || (window as any).webkitAudioContext);
        if (AudioContextClass) {
          try {
            const audioCtx = new AudioContextClass();
            webAudioCtx = audioCtx;
            const sourceNode = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 512;
            sourceNode.connect(analyser);
            const dataArray = new Float32Array(analyser.fftSize);

            vadInterval = setInterval(() => {
              if (!isRecordingActive) return;
              analyser.getFloatTimeDomainData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i] * dataArray[i];
              }
              const rms = Math.sqrt(sum / dataArray.length);
              const meteringDecibels = rms > 0 ? 20 * Math.log10(rms) : -160;

              const { orbState } = useAppStore.getState();
              // VAD Hookup: If user speaks while Haven is talking, cut off playback instantly
              if (meteringDecibels > THRESHOLD && orbState === 'speaking') {
                console.log(
                  `[VAD] User speech detected (${meteringDecibels.toFixed(1)} dB > ${THRESHOLD} dB). Interrupting Haven.`
                );
                playbackService.stopPlayback();
              }
            }, 100);
          } catch (e) {
            console.warn('[VAD] Failed to initialize web audio analyzer:', e);
          }
        }

        // Optional parallel Web Speech Recognition to capture text transcript
        let speechRec: any = null;
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          try {
            speechRec = new SpeechRec();
            speechRec.continuous = true;
            speechRec.interimResults = true;
            speechRec.lang = 'en-US';
            speechRec.onresult = (event: any) => {
              // Immediate interruption if user speaks during assistant audio
              const { orbState } = useAppStore.getState();
              if (orbState === 'speaking') {
                playbackService.stopPlayback();
              }

              let full = '';
              for (let i = 0; i < event.results.length; ++i) {
                full += event.results[i][0].transcript + ' ';
              }
              if (webSession) {
                webSession.transcript = full.trim();
              }
            };
            speechRec.onerror = () => {};
            speechRec.start();
          } catch (_) {}
        }

        webSession = {
          mediaRecorder,
          stream,
          chunks,
          startTime: Date.now(),
          totalPausedMs: 0,
          speechRec,
          transcript: '',
        };
        isRecordingActive = true;
        console.log('Web audio recording started');
        return;
      }

      // Native Recording
      if (getRecordingPermissionsAsync) {
        const { status } = await getRecordingPermissionsAsync();
        if (status !== 'granted') {
          const granted = await this.requestPermission();
          if (!granted) throw new Error('Microphone permission denied');
        }
      }

      if (setAudioModeAsync) {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
      }

      if (AudioModule && AudioModule.AudioRecorder && RecordingPresets) {
        const recordingOptions = {
          ...RecordingPresets.HIGH_QUALITY,
          isMeteringEnabled: true,
        };
        const recording = new AudioModule.AudioRecorder(recordingOptions);
        await recording.prepareToRecordAsync();
        recording.record();
        recordingInstance = recording;

        vadInterval = setInterval(async () => {
          if (!isRecordingActive || !recordingInstance) return;
          try {
            const status = typeof recordingInstance.getStatus === 'function' ? await recordingInstance.getStatus() : null;
            const meteringDecibels = status?.metering ?? -160;
            const { orbState } = useAppStore.getState();
            if (meteringDecibels > THRESHOLD && orbState === 'speaking') {
              console.log(
                `[VAD Native] User speech detected (${meteringDecibels} dB > ${THRESHOLD} dB). Interrupting Haven.`
              );
              playbackService.stopPlayback();
            }
          } catch (_) {}
        }, 100);
      }

      isRecordingActive = true;
      console.log('Native audio recording started');
    } catch (error) {
      console.error('Failed to start recording', error);
      isRecordingActive = false;
      throw error;
    }
  },

  /**
   * Pauses the active recording.
   */
  async pauseRecording(): Promise<void> {
    if (!isRecordingActive) return;
    try {
      if (webSession) {
        if (webSession.mediaRecorder?.state === 'recording') {
          webSession.mediaRecorder.pause();
          webSession.pauseTime = Date.now();
        }
        if (webSession.speechRec) {
          try { webSession.speechRec.stop(); } catch (_) {}
        }
        return;
      }
      if (recordingInstance && typeof recordingInstance.pause === 'function') {
        recordingInstance.pause();
      }
    } catch (error) {
      console.error('Failed to pause recording', error);
      throw error;
    }
  },

  /**
   * Resumes the paused recording.
   */
  async resumeRecording(): Promise<void> {
    try {
      if (webSession) {
        if (webSession.mediaRecorder?.state === 'paused') {
          if (webSession.pauseTime) {
            webSession.totalPausedMs += (Date.now() - webSession.pauseTime);
            webSession.pauseTime = undefined;
          }
          webSession.mediaRecorder.resume();
        }
        if (webSession.speechRec) {
          try { webSession.speechRec.start(); } catch (_) {}
        }
        return;
      }
      if (recordingInstance && typeof recordingInstance.record === 'function') {
        recordingInstance.record();
      }
    } catch (error) {
      console.error('Failed to resume recording', error);
      throw error;
    }
  },

  /**
   * Stops recording and returns the audio URI (base64 Data URL or file URI), duration, and transcript.
   */
  async stopRecording(): Promise<{ uri: string | null; durationMs: number; transcript?: string }> {
    if (!isRecordingActive && !webSession && !recordingInstance) {
      return { uri: null, durationMs: 0 };
    }

    try {
      isRecordingActive = false;

      // Handle web session
      if (webSession) {
        const { mediaRecorder, stream, chunks, startTime, totalPausedMs, speechRec } = webSession;
        const durationMs = Math.max(1000, Date.now() - startTime - totalPausedMs);
        if (speechRec) {
          try { speechRec.stop(); } catch (_) {}
        }
        const transcript = webSession.transcript;

        const dataUri = await new Promise<string>((resolve) => {
          mediaRecorder.onstop = () => {
            const type = mediaRecorder.mimeType || 'audio/webm';
            const blob = new Blob(chunks, { type });
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string) || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(blob);
          };
          try {
            if (mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
            } else {
              const type = mediaRecorder.mimeType || 'audio/webm';
              const blob = new Blob(chunks, { type });
              const reader = new FileReader();
              reader.onloadend = () => resolve((reader.result as string) || '');
              reader.readAsDataURL(blob);
            }
          } catch (_) {
            resolve('');
          }
        });

        try {
          stream.getTracks().forEach((track: any) => track.stop());
        } catch (_) {}

        webSession = null;
        return { uri: dataUri || null, durationMs, transcript };
      }

      // Handle native session
      if (recordingInstance) {
        const durationMs = (recordingInstance.currentTime || 0) * 1000;
        await recordingInstance.stop();
        const uri = recordingInstance.uri || null;
        recordingInstance = null;

        if (setAudioModeAsync) {
          await setAudioModeAsync({
            allowsRecording: false,
            playsInSilentMode: true,
          });
        }
        return { uri, durationMs };
      }

      return { uri: null, durationMs: 0 };
    } catch (error) {
      console.error('Failed to stop recording', error);
      await this.cleanup();
      return { uri: null, durationMs: 0 };
    }
  },

  /**
   * Cleans up any resources if the screen unmounts.
   */
  async cleanup(): Promise<void> {
    isRecordingActive = false;
    if (vadInterval) {
      clearInterval(vadInterval);
      vadInterval = null;
    }
    if (webAudioCtx) {
      try {
        await webAudioCtx.close();
      } catch (_) {}
      webAudioCtx = null;
    }
    if (webSession) {
      try {
        if (webSession.speechRec) webSession.speechRec.stop();
        if (webSession.mediaRecorder && webSession.mediaRecorder.state !== 'inactive') {
          webSession.mediaRecorder.stop();
        }
        webSession.stream.getTracks().forEach((t: any) => t.stop());
      } catch (_) {}
      webSession = null;
    }
    if (recordingInstance) {
      try {
        await recordingInstance.stop();
      } catch (_) {}
      recordingInstance = null;
    }
  },
};
