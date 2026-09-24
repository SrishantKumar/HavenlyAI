import { CONFIG, AI_CONFIG } from '../../constants/config';
import { Message } from '../../types';

export const OPENROUTER_FREE_MODELS = [
  'openrouter/free',
  'google/gemma-4-31b-it:free',
  'qwen/qwen3.8-27b:free',
  'liquid/lfm-2.5-2.6b:free',
  'nvidia/nemotron-3.5-lightning:free',
  'nex-agi/nex-n2.5-mini:free',
];

export const openRouterService = {
  async generateCompletion(
    systemPrompt: string,
    history: { role: 'user' | 'model' | 'assistant' | 'system'; content: string }[],
    userMessage: string
  ): Promise<string | null> {
    const apiKey = CONFIG.openRouterApiKey;
    if (!apiKey) return null;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history
        .filter((h) => h.role !== 'system')
        .map((h) => ({
          role: h.role === 'model' ? 'assistant' : h.role,
          content: h.content,
        })),
      { role: 'user', content: userMessage },
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
            max_tokens: 300,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const reply = data.choices?.[0]?.message?.content?.trim();
          if (reply) {
            console.log(`[OpenRouter Success] (${model}):`, reply);
            return reply;
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
