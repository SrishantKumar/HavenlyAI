import { recordingService } from './recordingService';
import { playbackService } from './playbackService';
export interface PlaybackStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis?: number;
  didJustFinish: boolean;
}

export const audioService = {
  // Recording
  requestMicrophonePermission(): Promise<boolean> {
    return recordingService.requestPermission();
  },

  startRecording(): Promise<void> {
    return recordingService.startRecording();
  },

  pauseRecording(): Promise<void> {
    return recordingService.pauseRecording();
  },

  resumeRecording(): Promise<void> {
    return recordingService.resumeRecording();
  },

  stopRecording(): Promise<{ uri: string | null; durationMs: number }> {
    return recordingService.stopRecording();
  },

  // Playback
  play(uri: string, onStatusUpdate?: (status: PlaybackStatus) => void): Promise<void> {
    return playbackService.play(uri, onStatusUpdate);
  },

  pausePlayback(): Promise<void> {
    return playbackService.pause();
  },

  resumePlayback(): Promise<void> {
    return playbackService.resume();
  },

  stopPlayback(): Promise<void> {
    return playbackService.stop();
  },

  setPlaybackSpeed(speed: number): Promise<void> {
    return playbackService.setRate(speed);
  },

  seekPlayback(positionMillis: number): Promise<void> {
    return playbackService.seek(positionMillis);
  },

  // Cleanup
  async cleanup(): Promise<void> {
    await recordingService.cleanup();
    await playbackService.stop();
  },
};
