import { Quest } from '../../types/quest';
import { safetyService } from './safetyService';
import { openRouterService, cleanModelResponse } from './openRouterService';
import { CONFIG, AI_CONFIG } from '../../constants/config';
import { SafetyLevel } from '../../types';

export interface QuestFollowUpResult {
  text: string;
  safetyLevel: SafetyLevel;
  isCrisis: boolean;
  isOutOfScope?: boolean;
}

const STATIC_FALLBACKS: Record<string, string[]> = {
  sight: [
    'I love the detail you noticed. How does looking closely at it make your space feel right now?',
    'That stands out so clearly. Does it bring back any pleasant memory for you?',
  ],
  sound: [
    'Listening that closely takes real presence. Which sound feels the most soothing right now?',
    'I appreciate you sharing those sounds with me. How does the quiet between them feel?',
  ],
  touch: [
    'Feeling the physical world can be so steadying. Which texture felt the most grounding to notice?',
    'Thank you for anchoring in your body. How does your breathing feel right now?',
  ],
  smell: [
    'Scent connects so deeply to how we feel. What sensation does that scent bring with it?',
  ],
  taste: [
    'Noticing subtle sensations can bring us right into the present. How does taking this moment feel?',
  ],
  mixed: [
    'You did a wonderful job pausing to ground yourself. How does your mind feel compared to when we started?',
    'Taking this pause together is meaningful. What is one word for how you feel right now?',
  ],
};

export function getStaticFallback(quest: Quest, answers: string[]): string {
  const chosenAnswer = answers[0] || 'your surroundings';
  const fallbacks = STATIC_FALLBACKS[quest.sense] || STATIC_FALLBACKS.mixed;
  const template = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  return `I noticed you mentioned "${chosenAnswer}". ${template}`;
}

const QUEST_SYSTEM_PROMPT = `You are Haven, a warm, calm grounding companion in the HavenlyAI app.
A user has just completed a sensory grounding quest.
CRITICAL INSTRUCTIONS:
- Maximum 2 short, gentle sentences total.
- Acknowledge ONE specific answer they gave with genuine warmth.
- Ask ONE gentle, open follow-up about it (e.g. how it feels right now, a pleasant memory, or a sensory detail).
- Absolutely NO medical advice, NO diagnosis, NO lists, NO lecturing, and NO emojis.
- Never judge or evaluate their answers. Keep the tone soft, quiet, and spacious.`;

/**
 * Timeout wrapper for promise
 */
function withTimeout<T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> {
  return new Promise((resolve) => {
    let timer: any = setTimeout(() => {
      resolve(fallbackValue);
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallbackValue);
      });
  });
}

export const questService = {
  /**
   * Evaluates user input for safety risks (crisis, out of scope, jailbreak).
   */
  evaluateInputSafety(input: string): {
    safetyLevel: SafetyLevel;
    isCrisis: boolean;
    blockReason?: string;
  } {
    const safetyLevel = safetyService.getSafetyLevel(input);
    if (safetyLevel === 'high') {
      return { safetyLevel: 'high', isCrisis: true, blockReason: 'crisis' };
    }

    const jailbreak = safetyService.checkJailbreak(input);
    if (jailbreak?.isJailbreak) {
      return { safetyLevel: 'none', isCrisis: false, blockReason: 'jailbreak' };
    }

    const outOfScope = safetyService.checkScope(input);
    if (outOfScope?.isOutOfScope) {
      return { safetyLevel: 'none', isCrisis: false, blockReason: 'out_of_scope' };
    }

    return { safetyLevel, isCrisis: false };
  },

  /**
   * Generates a conversational follow-up for the user's quest answers.
   * Cascades: OpenRouter free models -> Direct Gemini -> Static fallback.
   * Bounded by ~8s timeout.
   */
  async getQuestFollowUp(
    quest: Quest,
    answers: string[],
    previousTurns: { role: 'user' | 'assistant'; content: string }[] = []
  ): Promise<QuestFollowUpResult> {
    // 1. Pre-flight safety check across all answers
    for (const ans of answers) {
      const evaluation = this.evaluateInputSafety(ans);
      if (evaluation.isCrisis) {
        return {
          text: '',
          safetyLevel: 'high',
          isCrisis: true,
        };
      }
    }

    const staticDefault = getStaticFallback(quest, answers);
    const answersListFormatted = answers.map((a, i) => `${i + 1}. ${a}`).join('\n');
    const userPrompt = `Quest: "${quest.title}" (${quest.prompt})\nUser's observations:\n${answersListFormatted}\n\nPlease acknowledge one answer and ask one gentle follow-up question.`;

    const fetchAiCompletion = async (): Promise<string | null> => {
      // 1. Cascade through OpenRouter free models
      try {
        const historyForOpenRouter = previousTurns.map((t) => ({
          role: t.role as 'user' | 'assistant',
          content: t.content,
        }));
        const openRouterResponse = await openRouterService.generateCompletion(
          QUEST_SYSTEM_PROMPT,
          historyForOpenRouter,
          userPrompt
        );
        if (openRouterResponse && openRouterResponse.length > 5) {
          return openRouterResponse;
        }
      } catch (orErr) {
        console.warn('[questService] OpenRouter cascade failed:', orErr);
      }

      // 2. Fallback to direct Gemini
      if (CONFIG.geminiApiKey) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.textModel}:generateContent?key=${CONFIG.geminiApiKey}`;
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                ...previousTurns.map((t) => ({
                  role: t.role === 'assistant' ? 'model' : 'user',
                  parts: [{ text: t.content }],
                })),
                {
                  role: 'user',
                  parts: [{ text: userPrompt }],
                },
              ],
              systemInstruction: {
                parts: [{ text: QUEST_SYSTEM_PROMPT }],
              },
              generationConfig: {
                maxOutputTokens: 200,
                temperature: 0.7,
                thinkingConfig: {
                  thinkingBudget: 0,
                },
              },
            }),
          });

          if (resp.ok) {
            const data = await resp.json();
            const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
            const cleaned = cleanModelResponse(raw || '');
            if (cleaned) {
              return cleaned;
            }
          }
        } catch (geminiErr) {
          console.warn('[questService] Gemini fallback failed:', geminiErr);
        }
      }

      return null;
    };

    // 8-second bounded execution
    const aiText = await withTimeout(fetchAiCompletion(), 8000, null);

    return {
      text: aiText || staticDefault,
      safetyLevel: 'none',
      isCrisis: false,
    };
  },

  /**
   * Generates a final gentle closing turn after user replies to the follow-up.
   */
  async getClosingTurn(
    quest: Quest,
    userReply: string
  ): Promise<QuestFollowUpResult> {
    const evaluation = this.evaluateInputSafety(userReply);
    if (evaluation.isCrisis) {
      return { text: '', safetyLevel: 'high', isCrisis: true };
    }

    const staticClosing = `Thank you for sharing that with me. Grounding your senses takes care and patience, and you showed up for yourself today.`;

    const prompt = `The user answered your grounding follow-up with: "${userReply}". Give a 1-sentence warm, soothing acknowledgement honoring their awareness. No emojis, no lists.`;

    const fetchClosing = async (): Promise<string | null> => {
      try {
        const res = await openRouterService.generateCompletion(
          QUEST_SYSTEM_PROMPT,
          [],
          prompt
        );
        if (res) return res;
      } catch (_) {}
      return null;
    };

    const closing = await withTimeout(fetchClosing(), 6000, null);

    return {
      text: closing || staticClosing,
      safetyLevel: 'none',
      isCrisis: false,
    };
  },
};

