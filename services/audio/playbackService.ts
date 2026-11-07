import { Platform } from 'react-native';
import { useAppStore } from '../../store/useAppStore';

let createAudioPlayer: any = null;
let setAudioModeAsync: any = null;

try {
  const expoAudio = require('expo-audio');
  createAudioPlayer = expoAudio.createAudioPlayer;
  setAudioModeAsync = expoAudio.setAudioModeAsync;
} catch (e) {
  console.warn('expo-audio package not found or failed to load in playbackService.');
}

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

/**
 * Creates a standard 44-byte WAV header for raw 16-bit Mono PCM audio.
 */
export const createWavHeader = (pcmLength: number, sampleRate: number = 24000): Uint8Array => {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmLength, true);
  writeString(view, 8, 'WAVE');

  // FMT sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1 for Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // Data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, pcmLength, true);

  return new Uint8Array(header);
};

const B64_MAP: { [char: string]: number } = {};
const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
for (let i = 0; i < B64_ALPHABET.length; i++) {
  B64_MAP[B64_ALPHABET[i]] = i;
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const cleanB64 = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = cleanB64.length;
  const byteLen = Math.floor((len * 3) / 4);
  const bytes = new Uint8Array(byteLen);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const b0 = B64_MAP[cleanB64[i]] ?? 0;
    const b1 = B64_MAP[cleanB64[i + 1]] ?? 0;
    const b2 = i + 2 < len ? (B64_MAP[cleanB64[i + 2]] ?? 0) : 0;
    const b3 = i + 3 < len ? (B64_MAP[cleanB64[i + 3]] ?? 0) : 0;

    bytes[p++] = (b0 << 2) | (b1 >> 4);
    if (i + 2 < len && p < byteLen) bytes[p++] = ((b1 & 15) << 4) | (b2 >> 2);
    if (i + 3 < len && p < byteLen) bytes[p++] = ((b2 & 3) << 6) | b3;
  }
  return bytes;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  const len = bytes.byteLength;
  let base64 = '';
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    base64 += B64_ALPHABET[b0 >> 2];
    base64 += B64_ALPHABET[((b0 & 3) << 4) | (b1 >> 4)];
    base64 += i + 1 < len ? B64_ALPHABET[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    base64 += i + 2 < len ? B64_ALPHABET[b2 & 63] : '=';
  }
  return base64;
}

export function pcmChunksToWav(
  pcmByteArrays: Uint8Array[],
  sampleRate: number = 24000
): { wavBytes: Uint8Array; wavBase64: string } {
  let totalPcmLength = 0;
  for (const arr of pcmByteArrays) {
    totalPcmLength += arr.length;
  }

  const header = createWavHeader(totalPcmLength, sampleRate);
  const wavBytes = new Uint8Array(header.length + totalPcmLength);
  wavBytes.set(header, 0);

  let offset = header.length;
  for (const arr of pcmByteArrays) {
    wavBytes.set(arr, offset);
    offset += arr.length;
  }

  const wavBase64 = uint8ArrayToBase64(wavBytes);
  return { wavBytes, wavBase64 };
}

export function convertPcmBase64ToWav(
  pcmBase64: string,
  sampleRate: number = 24000
): { wavBytes: Uint8Array; wavBase64: string } {
  const pcmBytes = base64ToUint8Array(pcmBase64);
  return pcmChunksToWav([pcmBytes], sampleRate);
}

/**
 * Converts raw PCM chunks (as Uint8Array[] or Base64 string[]) into a single,
 * valid WAV audio file on the device filesystem (or a Blob URL on web) and returns
 * the playable URI.
 */
export async function savePcmAsWavFile(
  input: string | string[] | Uint8Array | Uint8Array[],
  sampleRate: number = 24000
): Promise<string> {
  let pcmArrays: Uint8Array[];
  if (Array.isArray(input)) {
    if (input.length === 0) return '';
    if (typeof input[0] === 'string') {
      pcmArrays = (input as string[]).map((b64) => base64ToUint8Array(b64));
    } else {
      pcmArrays = input as Uint8Array[];
    }
  } else if (typeof input === 'string') {
    pcmArrays = [base64ToUint8Array(input)];
  } else {
    pcmArrays = [input as Uint8Array];
  }

  const { wavBytes, wavBase64 } = pcmChunksToWav(pcmArrays, sampleRate);

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const blob = new Blob([wavBytes as any], { type: 'audio/wav' });
    const blobUrl = URL.createObjectURL(blob);
    console.log(`[WAV Decoder] Created Web Audio WAV blob: ${blobUrl} (${wavBytes.length} bytes)`);
    return blobUrl;
  }

  const FileSystem = require('expo-file-system/legacy');
  const cacheDir = FileSystem.cacheDirectory || '';
  const filePath = `${cacheDir}kore_${Date.now()}_${Math.random().toString(36).substring(7)}.wav`;

  await FileSystem.writeAsStringAsync(filePath, wavBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  console.log(`[WAV Decoder] Created WAV file from 24kHz PCM: ${filePath} (${wavBytes.length} bytes)`);
  return filePath;
}

let playerInstance: any = null;
let onPlaybackStatusUpdateCallback: ((status: any) => void) | null = null;
let activeUtterance: any = null;
let statusInterval: any = null;

export const playbackService = {
  /**
   * Loads and starts playback of a given audio file URL or local path.
   */
  async play(
    uri: string,
    onStatusUpdate?: (status: any) => void
  ): Promise<void> {
    try {
      // 1. Unload any active playing sound or speech
      await this.stop();

      onPlaybackStatusUpdateCallback = onStatusUpdate || null;

      // Handle custom speech synthesis URI fallback for serverless web or native mobile environments
      if (uri.startsWith('speech://')) {
        const rawText = decodeURIComponent(uri.substring(9));
        // Strip all emojis so speech engines never pronounce emoji names like "purple heart"
        const text = rawText.replace(/\p{Extended_Pictographic}/gu, '').replace(/\s+/g, ' ').trim();
        
        // Mobile fallback using expo-speech
        if (Platform.OS !== 'web') {
          try {
            const Speech = require('expo-speech');
            console.log('Using native expo-speech for vocal output:', text);
            
            let selectedVoiceId: string | undefined = undefined;

            // Strictly default to premium natural female voice (Samantha / female_1)
            try {
              const list = await Speech.getAvailableVoicesAsync();
              const match = list.find((v: any) => {
                const n = (v.name || '').toLowerCase();
                const id = (v.identifier || '').toLowerCase();
                const l = (v.language || '').toLowerCase();
                if (!l.startsWith('en')) return false;
                return (
                  n.includes('samantha') ||
                  id.includes('samantha') ||
                  n.includes('female_1') ||
                  id.includes('female_1') ||
                  n.includes('ava') ||
                  n.includes('karen') ||
                  n.includes('zira') ||
                  n.includes('female')
                );
              });
              if (match) {
                selectedVoiceId = match.identifier;
              }
            } catch (_) {}

            if (onPlaybackStatusUpdateCallback) {
              onPlaybackStatusUpdateCallback({
                isLoaded: true,
                isPlaying: true,
                positionMillis: 0,
                durationMillis: text.length * 80,
                didJustFinish: false,
              });
            }

            Speech.speak(text, {
              voice: selectedVoiceId,
              pitch: 1.0,
              rate: 0.95,
              onStart: () => {
                if (onPlaybackStatusUpdateCallback) {
                  onPlaybackStatusUpdateCallback({
                    isLoaded: true,
                    isPlaying: true,
                    positionMillis: 0,
                    durationMillis: text.length * 80,
                    didJustFinish: false,
                  });
                }
              },
              onComplete: () => {
                if (onPlaybackStatusUpdateCallback) {
                  onPlaybackStatusUpdateCallback({
                    isLoaded: true,
                    isPlaying: false,
                    positionMillis: text.length * 80,
                    durationMillis: text.length * 80,
                    didJustFinish: true,
                  });
                }
              },
              onError: (err: any) => {
                console.error('expo-speech error:', err);
                if (onPlaybackStatusUpdateCallback) {
                  onPlaybackStatusUpdateCallback({
                    isLoaded: true,
                    isPlaying: false,
                    positionMillis: 0,
                    durationMillis: 100,
                    didJustFinish: true,
                  });
                }
              }
            });
            return;
          } catch (e) {
            console.warn('Failed to load expo-speech native module', e);
          }
        }

        // Web fallback using browser speech synthesis
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();

          const utterance = new SpeechSynthesisUtterance(text);
          activeUtterance = utterance;

          utterance.pitch = 1.0;
          utterance.rate = 0.95;
          utterance.volume = 1.0;

          const voices = window.speechSynthesis.getVoices();
          let selectedVoice = null;

          const maleNames = ['david', 'ravi', 'george', 'daniel', 'mark', 'richard', 'thomas', 'guy', 'stefan', 'james', 'alex'];
          const preferredVoiceKeywords = [
            'veena', 'heera', 'en-in', 'samantha', 'zira', 'susan', 'karen', 'hazel', 'google us english'
          ];

          const englishVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
          const candidateVoices = englishVoices.filter(v => 
            !maleNames.some(name => v.name.toLowerCase().includes(name))
          );

          for (const keyword of preferredVoiceKeywords) {
            selectedVoice = candidateVoices.find(v => 
              v.name.toLowerCase().includes(keyword) || 
              v.lang.toLowerCase().replace('_', '-').includes(keyword)
            ) || null;
            if (selectedVoice) break;
          }

          if (!selectedVoice && candidateVoices.length > 0) {
            selectedVoice = candidateVoices[0];
          }

          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }

          utterance.onstart = () => {
            if (onPlaybackStatusUpdateCallback) {
              onPlaybackStatusUpdateCallback({
                isLoaded: true,
                isPlaying: true,
                positionMillis: 0,
                durationMillis: text.length * 80,
                didJustFinish: false,
              });
            }
          };

          utterance.onend = () => {
            if (onPlaybackStatusUpdateCallback) {
              onPlaybackStatusUpdateCallback({
                isLoaded: true,
                isPlaying: false,
                positionMillis: text.length * 80,
                durationMillis: text.length * 80,
                didJustFinish: true,
              });
            }
            activeUtterance = null;
          };

          utterance.onerror = () => {
            if (onPlaybackStatusUpdateCallback) {
              onPlaybackStatusUpdateCallback({
                isLoaded: true,
                isPlaying: false,
                positionMillis: 0,
                durationMillis: 100,
                didJustFinish: true,
              });
            }
            activeUtterance = null;
          };

          window.speechSynthesis.speak(utterance);
        }
        return;
      }

      // Configure audio session for playback
      if (setAudioModeAsync) {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
        });
      }

      // Load and play sound via expo-audio
      if (createAudioPlayer) {
        const player = createAudioPlayer(uri);
        player.volume = 1.0;
        playerInstance = player;

        // Monitor playback progress
        statusInterval = setInterval(() => {
          if (playerInstance && onPlaybackStatusUpdateCallback) {
            const isPlaying = playerInstance.playing;
            const positionMillis = (playerInstance.currentTime || 0) * 1000;
            const durationMillis = (playerInstance.duration || 0) * 1000;
            const isLoaded = playerInstance.isLoaded;
            const didJustFinish = isLoaded && !isPlaying && (positionMillis >= durationMillis - 100);

            onPlaybackStatusUpdateCallback({
              isLoaded,
              isPlaying,
              positionMillis,
              durationMillis,
              didJustFinish,
            });

            if (didJustFinish) {
              clearInterval(statusInterval);
            }
          }
        }, 200);

        player.play();
      } else if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
        const audio = new Audio(uri);
        playerInstance = audio;
        audio.onloadedmetadata = () => {
          if (onPlaybackStatusUpdateCallback) {
            onPlaybackStatusUpdateCallback({
              isLoaded: true,
              isPlaying: true,
              positionMillis: 0,
              durationMillis: (audio.duration || 0) * 1000,
              didJustFinish: false,
            });
          }
        };
        audio.ontimeupdate = () => {
          if (onPlaybackStatusUpdateCallback) {
            onPlaybackStatusUpdateCallback({
              isLoaded: true,
              isPlaying: !audio.paused,
              positionMillis: (audio.currentTime || 0) * 1000,
              durationMillis: (audio.duration || 0) * 1000,
              didJustFinish: audio.ended,
            });
          }
        };
        audio.onended = () => {
          if (onPlaybackStatusUpdateCallback) {
            onPlaybackStatusUpdateCallback({
              isLoaded: true,
              isPlaying: false,
              positionMillis: (audio.duration || 0) * 1000,
              durationMillis: (audio.duration || 0) * 1000,
              didJustFinish: true,
            });
          }
        };
        await audio.play();
      } else {
        console.warn('Playback not supported in this environment.');
      }
    } catch (error) {
      console.error('Failed to play audio', error);
      throw error;
    }
  },

  /**
   * Pauses the active audio playback.
   */
  async pause(): Promise<void> {
    try {
      if (playerInstance && typeof playerInstance.pause === 'function') {
        playerInstance.pause();
      }
      // Native expo-speech pause (iOS)
      if (Platform.OS !== 'web') {
        try {
          const Speech = require('expo-speech');
          Speech.pause();
        } catch (e) {}
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.pause();
      }
      console.log('Audio playback paused');
    } catch (error) {
      console.error('Failed to pause playback', error);
      throw error;
    }
  },

  /**
   * Resumes the paused audio playback.
   */
  async resume(): Promise<void> {
    try {
      if (playerInstance && typeof playerInstance.play === 'function') {
        playerInstance.play();
      }
      // Native expo-speech resume (iOS)
      if (Platform.OS !== 'web') {
        try {
          const Speech = require('expo-speech');
          Speech.resume();
        } catch (e) {}
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.resume();
      }
      console.log('Audio playback resumed');
    } catch (error) {
      console.error('Failed to resume playback', error);
      throw error;
    }
  },

  /**
   * Plays Haven's response audio, pulses HavenlyOrb in 'speaking' mode,
   * synchronizes completion back to 'listening' or 'idle', and registers
   * active audio player in Zustand for barge-in interruptions.
   */
  async playHavenResponse(fileUri: string): Promise<void> {
    const store = useAppStore.getState();

    // 1. Halt any running speech or audio playback before beginning
    await this.stopPlayback();

    // 2. Synchronize Zustand Orb state to 'speaking' so HavenlyOrb pulses immediately
    store.setOrbState('speaking');

    const handleFinished = () => {
      const currentSession = useAppStore.getState().voiceSessionState;
      // Return to 'listening' if session is live, or 'idle' when static
      useAppStore.getState().setOrbState(currentSession === 'connected' ? 'listening' : 'idle');
      useAppStore.getState().setAudioPlayerRef(null);
    };

    try {
      if (setAudioModeAsync) {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
        });
      }

      if (createAudioPlayer) {
        const player = createAudioPlayer(fileUri);
        player.volume = 1.0;
        playerInstance = player;
        store.setAudioPlayerRef(player);

        statusInterval = setInterval(() => {
          if (playerInstance) {
            const isPlaying = playerInstance.playing;
            const position = (playerInstance.currentTime || 0) * 1000;
            const duration = (playerInstance.duration || 0) * 1000;
            const didJustFinish =
              playerInstance.isLoaded && !isPlaying && (position >= duration - 150);

            if (didJustFinish) {
              if (statusInterval) {
                clearInterval(statusInterval);
                statusInterval = null;
              }
              handleFinished();
            }
          }
        }, 150);

        player.play();
      } else if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
        const audio = new Audio(fileUri);
        playerInstance = audio;
        store.setAudioPlayerRef(audio);

        audio.onended = () => {
          handleFinished();
        };
        audio.onerror = () => {
          console.warn('[PlaybackService] Audio player error encountered.');
          handleFinished();
        };

        await audio.play();
      } else {
        console.warn('[PlaybackService] Playback not supported in current environment.');
        handleFinished();
      }
    } catch (error) {
      console.error('[PlaybackService] Failed to play Haven response audio:', error);
      store.setOrbState('error');
      setTimeout(() => {
        handleFinished();
      }, 1200);
    }
  },

  /**
   * Stops the active audio playback immediately for barge-in / interruption
   * and resets orbState to 'listening'.
   */
  async stopPlayback(): Promise<void> {
    try {
      if (statusInterval) {
        clearInterval(statusInterval);
        statusInterval = null;
      }

      const store = useAppStore.getState();
      const activeRef = store.audioPlayerRef || playerInstance;

      if (activeRef) {
        if (typeof activeRef.stopAsync === 'function') {
          try { await activeRef.stopAsync(); } catch (_) {}
        }
        if (typeof activeRef.unloadAsync === 'function') {
          try { await activeRef.unloadAsync(); } catch (_) {}
        }
        if (typeof activeRef.pause === 'function') {
          try { activeRef.pause(); } catch (_) {}
        }
        if (typeof activeRef.remove === 'function') {
          try { activeRef.remove(); } catch (_) {}
        }
      }

      playerInstance = null;
      store.setAudioPlayerRef(null);

      // Stop native speech synthesis if active
      if (Platform.OS !== 'web') {
        try {
          const Speech = require('expo-speech');
          Speech.stop();
        } catch (_) {}
      }

      // Stop browser speech synthesis if active
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      activeUtterance = null;
      onPlaybackStatusUpdateCallback = null;

      // Set orb state back to 'listening' for smooth conversation flow
      store.setOrbState('listening');
    } catch (error) {
      console.error('[PlaybackService] Error in stopPlayback:', error);
    }
  },

  /**
   * Stops the active audio playback and releases resources.
   */
  async stop(): Promise<void> {
    await this.stopPlayback();
  },

  /**
   * Seeks the active audio playback to a specific position in milliseconds.
   */
  async seek(positionMillis: number): Promise<void> {
    if (!playerInstance) return;
    try {
      if (typeof playerInstance.seekTo === 'function') {
        await playerInstance.seekTo(positionMillis / 1000);
      } else if (typeof playerInstance.currentTime !== 'undefined') {
        playerInstance.currentTime = positionMillis / 1000;
      }
      console.log('Audio playback seeked to:', positionMillis);
    } catch (error) {
      console.error('Failed to seek playback', error);
      throw error;
    }
  },

  /**
   * Sets the playback rate/speed.
   */
  async setRate(rate: number): Promise<void> {
    if (!playerInstance) return;
    try {
      playerInstance.playbackRate = rate;
      console.log('Audio playback rate set to:', rate);
    } catch (error) {
      console.error('Failed to set playback rate', error);
      throw error;
    }
  },
};
