import { CONFIG, AI_CONFIG } from '../../constants/config';
import { Message } from '../../types';

export const OPENROUTER_FREE_MODELS = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'dots-studio/dots-3-note-preview:free',
  'liquid/lfm-2.5-2.6b:free',
  'nvidia/nemotron-3.5-lightning:free',
  'z-ai/glm-5.2:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nex-agi/nex-n2.5-mini:free',
  'nex-agi/nex-n2.5-pro:free',
  'qwen/qwen3.8-27b:free',
];

function isMetaThought(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const metaTokens = [
    'the user',
    "user's",
    'user is',
    'user seems',
    'user feels',
    "they've",
    'they are',
    "they didn't",
    'they seem',
    'they repeat',
    'instructions',
    'per instructions',
    'my response',
    'response must',
    'checks tone',
    '*checks tone*',
    'avoiding:',
    'thinking process',
    'thought process',
    'scratchpad',
    'tone check',
    'internal monologue',
    'hmm,',
    'hmm ',
    '...ah',
    'ah.',
    'prescriptive',
    'overbearing',
    "here's a thinking process",
    'here is a thinking process',
    'analyze user input',
    'check rules/scope',
    'scope lock',
    'jailbreak immunity',
    'determine response',
    'formulate response',
    'per rule',
    'rule 1',
    'rule 2',
    'rule 3',
    'user says:',
    'user safety:',
    'response safety:',
    'user safety',
    'response safety',
    'safety categories:',
  ];
  return metaTokens.some((t) => lower.includes(t));
}

/**
 * Sanitizes model responses: removes <think> tags, internal reasoning,
 * scratchpads, and markdown formatting, ensuring only spoken dialogue is returned.
 */
export function cleanModelResponse(rawText: string): string {
  if (!rawText) return '';

  let cleaned = rawText;

  // 1. Remove XML/HTML thought tags: <think>...</think>, <thought>...</thought>, etc.
  cleaned = cleaned.replace(/<(think|thought|reasoning|scratchpad|inner_monologue)[\s\S]*?<\/\1>/gi, '');
  cleaned = cleaned.replace(/<think>[\s\S]*$/gi, ''); // Truncated unclosed think tag

  // 2. Remove markdown code blocks if any
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');

  // 3. If text contains meta thoughts or reasoning planning, extract the actual spoken paragraph
  if (isMetaThought(cleaned)) {
    const paragraphs = cleaned.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const candidate = paragraphs.reverse().find((p) => {
      return (
        !isMetaThought(p) &&
        !p.startsWith('-') &&
        !p.startsWith('*') &&
        p.length > 8
      );
    });

    if (candidate) {
      cleaned = candidate;
    } else {
      // Entire text was internal thinking; discard so next model is chosen
      return '';
    }
  }

  // 4. Strip markdown formatting so speech engines pronounce pure words
  cleaned = cleaned
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (isMetaThought(cleaned)) {
    return '';
  }

  return cleaned;
}

export const openRouterService = {
  async generateCompletion(
    systemPrompt: string,
    history: { role: 'user' | 'model' | 'assistant' | 'system'; content: string }[],
    userMessage: string
  ): Promise<string | null> {
    const apiKey = CONFIG.openRouterApiKey;
    if (!apiKey) return null;

    // Deduplicate history and ensure clean turn alternating
    const cleanedHistory = history
      .filter((h) => h.role !== 'system')
      .map((h) => ({
        role: h.role === 'model' ? ('assistant' as const) : ('user' as const),
        content: (h.content || '').trim(),
      }))
      .filter((h) => h.content.length > 0);

    const lastEntry = cleanedHistory[cleanedHistory.length - 1];
    const trimmedUser = userMessage.trim();
    const isAlreadyLast =
      lastEntry &&
      lastEntry.role === 'user' &&
      lastEntry.content.toLowerCase() === trimmedUser.toLowerCase();

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...cleanedHistory,
      ...(isAlreadyLast || !trimmedUser ? [] : [{ role: 'user' as const, content: trimmedUser }]),
    ];

    for (const model of OPENROUTER_FREE_MODELS) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://havenly-ai.vercel.app',
            'X-Title': 'HavenlyAI',
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: 450,
            temperature: 0.7,
            include_reasoning: false,
            reasoning: { effort: 'none' },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const rawReply = data.choices?.[0]?.message?.content;
          const cleaned = cleanModelResponse(rawReply || '');

          if (cleaned) {
            console.log(`[OpenRouter Success] (${model}):`, cleaned);
            return cleaned;
          } else {
            console.warn(`[OpenRouter] Model ${model} returned unparsed reasoning/empty text, trying next model.`);
          }
        } else {
          console.warn(`[OpenRouter] Model ${model} returned HTTP ${response.status}`);
        }
      } catch (err) {
        console.warn(`[OpenRouter] Failed request on ${model}:`, err);
      }
    }

    return null;
  },
};
