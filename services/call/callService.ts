import { liveKitTokenService } from '../livekit/liveKitTokenService';
import { liveKitService } from '../livekit/liveKitService';
import { CONFIG } from '../../constants/config';

export interface SimulatedCallStatus {
  status: 'REQUESTING' | 'QUEUED' | 'CALLING' | 'CONNECTED' | 'ENDED';
  roomName?: string;
  token?: string;
  wsUrl?: string;
}

export const callService = {
  /**
   * Request a call session (represented in-app as a Live Voice Conversation).
   */
  async requestCall(userId: string): Promise<SimulatedCallStatus> {
    try {
      const session = await liveKitTokenService.requestVoiceSession(userId);
      return {
        status: 'CONNECTED',
        roomName: session.roomName,
        token: session.token,
        wsUrl: session.wsUrl,
      };
    } catch (e) {
      console.error('Call request via LiveKit token failed:', e);
      throw e;
    }
  },

  /**
   * Stub helper to simulate incoming/outgoing telephone routing compatibility.
   */
  async getCallStatus(roomName: string): Promise<SimulatedCallStatus['status']> {
    if (CONFIG.isDemoMode) {
      return 'CONNECTED';
    }
    const state = liveKitService.getConnectionState();
    if (state === 'connecting') return 'QUEUED';
    if (state === 'connected') return 'CONNECTED';
    return 'ENDED';
  },

  async cancelCall(roomName: string): Promise<void> {
    await liveKitService.disconnect();
    await liveKitTokenService.endVoiceSession(roomName);
  },

  async getCallHistory() {
    return [
      { id: '1', date: 'Yesterday', duration: '12m 30s', outcome: 'Helpful' },
      { id: '2', date: '3 days ago', duration: '5m 12s', outcome: 'Okay' },
    ];
  },
};
