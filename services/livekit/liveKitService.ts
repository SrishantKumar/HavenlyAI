import { Platform } from 'react-native';
import { CONFIG } from '../../constants/config';

// Import LiveKit client conditionally if possible, or stub it for compile-time safety
let LiveKitClient: any = null;
try {
  // LiveKit requires registering globals on React Native
  if (Platform.OS !== 'web') {
    const { registerGlobals } = require('@livekit/react-native');
    registerGlobals();
  }
  LiveKitClient = require('livekit-client');
} catch (e) {
  console.warn('LiveKit native SDK load warning (using mock mode fallback)', e);
}

export type LiveKitConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface LiveKitCallbacks {
  onConnectionStateChanged?: (state: LiveKitConnectionState) => void;
  onAudioTrackSubscribed?: (track: any) => void;
  onAudioTrackUnsubscribed?: () => void;
}

class UnifiedLiveKitService {
  private room: any = null;
  private callbacks: LiveKitCallbacks = {};
  private simulatedState: LiveKitConnectionState = 'disconnected';

  setCallbacks(callbacks: LiveKitCallbacks) {
    this.callbacks = callbacks;
  }

  getConnectionState(): LiveKitConnectionState {
    if (CONFIG.isDemoMode) {
      return this.simulatedState;
    }
    if (!this.room) return 'disconnected';
    
    // Map livekit room connection state to our simplified state
    const state = this.room.state;
    if (state === 'connecting') return 'connecting';
    if (state === 'connected') return 'connected';
    if (state === 'reconnecting') return 'reconnecting';
    return 'disconnected';
  }

  /**
   * Connects to a LiveKit WebRTC room.
   */
  async connect(wsUrl: string, token: string): Promise<void> {
    if (CONFIG.isDemoMode) {
      this.updateSimulatedState('connecting');
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.updateSimulatedState('connected');
      console.log('LiveKit: Simulated connection active');
      return;
    }

    if (!LiveKitClient || !LiveKitClient.Room) {
      throw new Error('LiveKit client library is unavailable');
    }

    try {
      this.callbacks.onConnectionStateChanged?.('connecting');
      
      // Create new Room instance
      this.room = new LiveKitClient.Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Register connection event listeners
      this.room.on(LiveKitClient.RoomEvent.ConnectionStateChanged, (state: string) => {
        console.log('LiveKit Connection State:', state);
        if (state === 'connected') {
          this.callbacks.onConnectionStateChanged?.('connected');
        } else if (state === 'connecting') {
          this.callbacks.onConnectionStateChanged?.('connecting');
        } else if (state === 'reconnecting') {
          this.callbacks.onConnectionStateChanged?.('reconnecting');
        } else {
          this.callbacks.onConnectionStateChanged?.('disconnected');
        }
      });

      // Handle track subscription (hearing the AI response stream)
      this.room.on(LiveKitClient.RoomEvent.TrackSubscribed, (track: any) => {
        if (track.kind === 'audio') {
          console.log('LiveKit Subscribed to Audio Track');
          this.callbacks.onAudioTrackSubscribed?.(track);
        }
      });

      this.room.on(LiveKitClient.RoomEvent.TrackUnsubscribed, (track: any) => {
        if (track.kind === 'audio') {
          this.callbacks.onAudioTrackUnsubscribed?.();
        }
      });

      // Connect to the room WebRTC
      await this.room.connect(wsUrl, token);
      
      // Auto-publish local microphone
      await this.publishMicrophone();
      
    } catch (e) {
      console.error('LiveKit connect failed:', e);
      this.callbacks.onConnectionStateChanged?.('error');
      throw e;
    }
  }

  /**
   * Publish local microphone track
   */
  async publishMicrophone(): Promise<void> {
    if (CONFIG.isDemoMode) return;
    if (!this.room) return;

    try {
      await this.room.localParticipant.enableCameraAndMicrophone(false, true);
      console.log('LiveKit Published local microphone');
    } catch (e) {
      console.error('LiveKit failed to enable microphone track', e);
      throw e;
    }
  }

  /**
   * Mute local microphone track
   */
  async muteMicrophone(muted: boolean): Promise<void> {
    if (CONFIG.isDemoMode) {
      console.log(`LiveKit: Local microphone ${muted ? 'muted' : 'unmuted'}`);
      return;
    }
    if (!this.room) return;

    try {
      await this.room.localParticipant.setMicrophoneEnabled(!muted);
      console.log(`LiveKit microphone enabled: ${!muted}`);
    } catch (e) {
      console.error('Failed to set microphone status', e);
    }
  }

  /**
   * Cleanly disconnects the current session and stops WebRTC threads
   */
  async disconnect(): Promise<void> {
    if (CONFIG.isDemoMode) {
      this.updateSimulatedState('disconnected');
      return;
    }

    if (this.room) {
      try {
        await this.room.disconnect();
      } catch (e) {
        console.warn('Error disconnecting room', e);
      }
      this.room = null;
    }
    this.callbacks.onConnectionStateChanged?.('disconnected');
  }

  private updateSimulatedState(state: LiveKitConnectionState) {
    this.simulatedState = state;
    this.callbacks.onConnectionStateChanged?.(state);
  }
}

export const liveKitService = new UnifiedLiveKitService();
