import { SafetyLevel } from '../../types';

// Simple heuristic-based classification for client-side protection or mock mode.
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

const JAILBREAK_TRIGGERS = [
  'ignore previous instructions',
  'ignore all instructions',
  'ignore your rules',
  'pretend you are',
  'act as dan',
  'you are now',
  'system prompt',
  'developer mode',
  'reveal your prompt',
  'what are your instructions',
  'forget your rules',
  'disregard all previous',
  'bypass rules',
];

const OUT_OF_SCOPE_TRIGGERS = [
  'give me code',
  'write code',
  'binary search tree',
  'python code',
  'python script',
  'javascript code',
  'c++ code',
  'java code',
  'html code',
  'css code',
  'sql query',
  'write a function',
  'write a program',
  'solve this math',
  'solve this equation',
  'math equation',
  'write an essay',
  'write a blog post',
  'recipe for',
  'how to bake',
  'how to cook',
  'who is the president',
  'capital of',
  'translate to',
];

const VOICE_QUERY_TRIGGERS = [
  'change your voice',
  'change voice',
  'different voice',
  'switch voice',
  'how to change voice',
  'can you change your voice',
  'can you switch voice',
  'change the voice',
];

export const safetyService = {
  /**
   * Deterministic client-side check for prompt injection / jailbreak attempts.
   */
  checkJailbreak(text: string): { isJailbreak: boolean; response: string } | null {
    const lower = (text || '').toLowerCase().trim();
    const matched = JAILBREAK_TRIGGERS.some((trigger) => lower.includes(trigger));
    if (matched) {
      return {
        isJailbreak: true,
        response:
          "I'm Haven. I'm here for you — not for that. Is there something you're feeling that you'd like to talk about? 💜",
      };
    }
    return null;
  },

  /**
   * Deterministic client-side check for non-mental-wellness scope queries (coding, math, general trivia).
   */
  checkScope(text: string): { isOutOfScope: boolean; response: string } | null {
    const lower = (text || '').toLowerCase().trim();
    const matched = OUT_OF_SCOPE_TRIGGERS.some((trigger) => lower.includes(trigger));
    if (matched) {
      return {
        isOutOfScope: true,
        response:
          "I'm Haven, and I'm only here to support your emotional well-being. I'm not able to help with that, but I'm always here to listen if something's on your mind. 💜",
      };
    }
    return null;
  },

  /**
   * Deterministic check for voice customization queries.
   */
  checkVoiceQuery(text: string): { isVoiceQuery: boolean; response: string } | null {
    const lower = (text || '').toLowerCase().trim();
    const matched = VOICE_QUERY_TRIGGERS.some((trigger) => lower.includes(trigger));
    if (matched) {
      return {
        isVoiceQuery: true,
        response:
          "You can customize my voice anytime in Settings! You can choose between Kore, Charon, Puck, or Fenrir to find the tone that feels most comforting to you. 💜",
      };
    }
    return null;
  },

  /**
   * Deterministic check for identity queries: "who am i", "what is my name", "do you know who i am"
   */
  checkIdentityQuery(text: string, userName?: string): { isIdentityQuery: boolean; response: string } | null {
    const lower = (text || '')
      .toLowerCase()
      .trim()
      .replace(/[?!.,]/g, '')
      .replace(/\s+/g, ' ');

    const identityPatterns = [
      'who am i',
      'who am i really',
      'what is my name',
      'whats my name',
      'what is my name again',
      'do you know who i am',
      'do you know my name',
      'do you remember me',
      'do you remember my name',
      'tell me my name',
      'what do you call me',
    ];

    const matched = identityPatterns.some((p) => lower === p || lower.startsWith(p));
    if (matched) {
      if (userName && userName !== 'User' && userName.trim()) {
        return {
          isIdentityQuery: true,
          response: `You're ${userName.trim()}! I'm Haven, and I'm always right here with you. How are you feeling today? 💜`,
        };
      }
      return {
        isIdentityQuery: true,
        response: "You're my friend here in Havenly, and I'm right here with you. What would you like me to call you? 💜",
      };
    }
    return null;
  },

  /**
   * Classifies user text into safety risk levels
   */
  async classifySafety(text: string): Promise<SafetyLevel> {
    const normalized = text.toLowerCase();
    const isCrisis = CRISIS_KEYWORDS.some((keyword) => normalized.includes(keyword));

    if (isCrisis) {
      return 'high';
    }

    if (
      normalized.includes('hate my life') ||
      normalized.includes('cant go on') ||
      normalized.includes('so lonely I want to stop')
    ) {
      return 'moderate';
    }

    return 'none';
  },

  /**
   * Synchronous check for quick evaluations
   */
  getSafetyLevel(text: string): SafetyLevel {
    const normalized = text.toLowerCase();
    const isCrisis = CRISIS_KEYWORDS.some((keyword) => normalized.includes(keyword));
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
