import { SafetyLevel } from '../../types';

// Simple heuristic-based classification for client-side protection or mock mode.
// Real production classification must happen on the backend server.
const CRISIS_KEYWORDS = [
  'suicide',
  'kill myself',
  'want to die',
  'end my life',
  'hurt myself',
  'self harm',
  'cutting myself',
  'take my life',
  'end it all',
  'overdose',
  'jump off a bridge',
];

export const safetyService = {
  /**
   * Classifies user text into safety risk levels
   */
  async classifySafety(text: string): Promise<SafetyLevel> {
    const normalized = text.toLowerCase();
    const isCrisis = CRISIS_KEYWORDS.some(keyword => normalized.includes(keyword));
    
    if (isCrisis) {
      return 'high';
    }
    
    // Add additional moderate checks if needed (e.g., self-deprecation, intense distress)
    if (normalized.includes('hate my life') || normalized.includes('cant go on') || normalized.includes('so lonely I want to stop')) {
      return 'moderate';
    }

    return 'none';
  },

  /**
   * Synchronous check for quick evaluations
   */
  getSafetyLevel(text: string): SafetyLevel {
    const normalized = text.toLowerCase();
    const isCrisis = CRISIS_KEYWORDS.some(keyword => normalized.includes(keyword));
    if (isCrisis) return 'high';
    if (normalized.includes('hate my life') || normalized.includes('cant go on')) return 'moderate';
    return 'none';
  },

  /**
   * Helper to determine if the UI should display the SafetySupportCard overlay
   */
  shouldShowSafetySupport(text: string): boolean {
    const level = this.getSafetyLevel(text);
    return level === 'high' || level === 'moderate';
  },
};
