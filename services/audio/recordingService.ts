import { Platform } from 'react-native';

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
  console.warn('expo-audio package not found or failed to load in recordingService.');
}

let recordingInstance: any = null;
let isRecordingActive = false;

export const recordingService = {
  /**
   * Requests native microphone permissions and returns status.
   */
  async requestPermission(): Promise<boolean> {
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
   * Starts recording audio. Configures recording settings suitable for voice notes.
   */
  async startRecording(): Promise<void> {
    try {
      // 1. Ensure permission is granted
      if (getRecordingPermissionsAsync) {
        const { status } = await getRecordingPermissionsAsync();
        if (status !== 'granted') {
          const granted = await this.requestPermission();
          if (!granted) throw new Error('Microphone permission denied');
        }
      }

      // 2. Set audio session active (for iOS/Android audio routing)
      if (setAudioModeAsync) {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
      }

      // 3. Unload any existing recording
      if (recordingInstance) {
        try {
          await recordingInstance.stop();
        } catch (e) {}
        recordingInstance = null;
      }

      // 4. Create and prepare recording
      if (AudioModule && AudioModule.AudioRecorder && RecordingPresets) {
        const recording = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
        await recording.prepareToRecordAsync();
        recording.record();
        recordingInstance = recording;
      } else {
        // Fallback mock recording
        recordingInstance = {
          stop: () => Promise.resolve(),
          uri: 'mock-voice-note.m4a',
          currentTime: 0,
        };
      }

      isRecordingActive = true;
      console.log('Audio recording started');
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
    if (!recordingInstance || !isRecordingActive) return;
    try {
      if (typeof recordingInstance.pause === 'function') {
        recordingInstance.pause();
      }
      console.log('Audio recording paused');
    } catch (error) {
      console.error('Failed to pause recording', error);
      throw error;
    }
  },

  /**
   * Resumes the paused recording.
   */
  async resumeRecording(): Promise<void> {
    if (!recordingInstance) return;
    try {
      if (typeof recordingInstance.record === 'function') {
        recordingInstance.record();
      }
      console.log('Audio recording resumed');
    } catch (error) {
      console.error('Failed to resume recording', error);
      throw error;
    }
  },

  /**
   * Stops recording, unloads instance, and returns local file URI and duration.
   */
  async stopRecording(): Promise<{ uri: string | null; durationMs: number }> {
    if (!recordingInstance) return { uri: null, durationMs: 0 };

    try {
      isRecordingActive = false;
      const durationMs = (recordingInstance.currentTime || 0) * 1000;

      await recordingInstance.stop();
      const uri = recordingInstance.uri || 'mock-voice-note.m4a';
      recordingInstance = null;

      // Reset audio mode so other components can play sounds
      if (setAudioModeAsync) {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
        });
      }

      console.log('Audio recording stopped. Saved to:', uri);
      return { uri, durationMs };
    } catch (error) {
      console.error('Failed to stop recording', error);
      recordingInstance = null;
      return { uri: null, durationMs: 0 };
    }
  },

  /**
   * Cleans up any resources if the screen unmounts.
   */
  async cleanup(): Promise<void> {
    isRecordingActive = false;
    if (recordingInstance) {
      try {
        await recordingInstance.stop();
      } catch (e) {
        // Safe check
      }
      recordingInstance = null;
    }
  },
};
