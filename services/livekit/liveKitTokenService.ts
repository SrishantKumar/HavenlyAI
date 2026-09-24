import { LiveKitSession } from '../../types';
import { CONFIG } from '../../constants/config';

export const liveKitTokenService = {
  /**
   * Requests a temporary LiveKit WebRTC session credentials from the backend.
   */
  async requestVoiceSession(userId: string): Promise<LiveKitSession> {
    if (CONFIG.isDemoMode) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        roomName: `havenly-session-${Math.random().toString(36).substr(2, 5)}`,
        token: 'mock-livekit-jwt-token',
        wsUrl: 'wss://mock-livekit-server.havenly.ai',
      };
    }

    if (CONFIG.geminiApiKey) {
      return {
        roomName: `havenly-direct-${userId}`,
        token: CONFIG.geminiApiKey,
        wsUrl: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent',
      };
    }

    try {
      const response = await fetch(`${CONFIG.apiUrl}/voice/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to request realtime voice session');
      }

      return await response.json();
    } catch (error) {
      console.error('liveKitTokenService request error:', error);
      throw error;
    }
  },

  /**
   * Notifies backend that call session has ended.
   */
  async endVoiceSession(roomName: string): Promise<void> {
    if (CONFIG.isDemoMode) return;

    try {
      await fetch(`${CONFIG.apiUrl}/voice/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName }),
      });
    } catch (e) {
      console.warn('Failed to notify backend of ended voice session', e);
    }
  },
};
