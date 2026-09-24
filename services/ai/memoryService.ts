import { supabase } from '../supabaseClient';
import { CONFIG, AI_CONFIG } from '../../constants/config';
import { Message } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { openRouterService } from './openRouterService';

export const memoryService = {
  /**
   * Resolves the user's name from active app state, auth metadata, or conversation history.
   */
  async getUserName(): Promise<string> {
    // 1. Check client store
    const storeUser = useAppStore.getState().user;
    if (storeUser?.name && storeUser.name !== 'User' && storeUser.name.trim()) {
      return storeUser.name.trim();
    }

    // 2. Check Supabase auth session
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const metaName = user.user_metadata?.name || user.user_metadata?.full_name;
        if (metaName && metaName !== 'User' && metaName.trim()) {
          return metaName.trim();
        }

        // Check user_profiles table for full_name
        const { data } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();

        if (data?.full_name && data.full_name !== 'User' && data.full_name.trim()) {
          return data.full_name.trim();
        }
      }
    } catch (_) {}

    // 3. Scan recent user messages for self-introductions ("my name is ...", "call me ...")
    try {
      const messages = useAppStore.getState().messages;
      for (const m of messages) {
        if (m.role === 'user') {
          const match = m.content.match(/(?:my name is|call me|i am|i'm)\s+([A-Za-z]+)/i);
          if (
            match &&
            match[1] &&
            !['sad', 'fine', 'tired', 'here', 'back', 'good', 'okay', 'bad', 'sorry', 'feeling'].includes(
              match[1].toLowerCase()
            )
          ) {
            return match[1].trim();
          }
        }
      }
    } catch (_) {}

    return '';
  },

  /**
   * Fetches the user's current memory profile summary, including name and context.
   */
  async getMemoryProfile(): Promise<string> {
    const userName = await this.getUserName();

    if (CONFIG.isDemoMode) {
      const namePart = userName ? `User's Name: ${userName}\n` : '';
      return `${namePart}The user is exploring the demo and likes to reflect on daily stress. They appreciate gentle check-ins.`;
    }

    let summary = '';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('memory_summary')
          .eq('user_id', user.id)
          .single();

        if (!error && data?.memory_summary) {
          summary = data.memory_summary;
        }
      }
    } catch (e) {
      console.warn('Exception fetching memory profile:', e);
    }

    const sections: string[] = [];
    if (userName) {
      sections.push(`User's Name: ${userName}`);
    }
    if (summary) {
      sections.push(`User's Known Background & Emotional Insights: ${summary}`);
    }

    return sections.join('\n');
  },

  /**
   * Extracts new insights from a conversation and merges them with the existing memory summary.
   */
  async evolveMemoryProfile(conversationHistory: Message[]): Promise<void> {
    if (CONFIG.isDemoMode) return;
    if (conversationHistory.length < 4) return;

    try {
      const currentMemory = await this.getMemoryProfile();

      const chatContext = conversationHistory
        .filter((msg) => msg.role !== 'system')
        .map((msg) => `${msg.role === 'user' ? 'User' : 'Haven'}: ${msg.content}`)
        .join('\n');

      const prompt = `
You are a memory consolidation AI for HavenlyAI.
Current Memory Profile about the user: "${currentMemory}"

Recent Conversation:
${chatContext}

Your task is to extract any long-term facts, emotional triggers, personal details (such as the user's name if mentioned), or healing progress from the recent conversation. 
If there are new insights, merge them with the Current Memory Profile to create an updated, concise summary (under 150 words). 
If nothing significant was mentioned that warrants long-term memory, return the Current Memory Profile exactly as it is.
Focus on: their name, relationships, recurring stressors, goals, and what helps them heal.
Return ONLY the updated memory summary text.
`;

      let updatedMemory: string | null = null;

      // 1. Try OpenRouter free models first
      if (CONFIG.openRouterApiKey) {
        try {
          updatedMemory = await openRouterService.generateCompletion(
            'You are a precise memory consolidation assistant. Return only the updated memory summary.',
            [],
            prompt
          );
        } catch (_) {}
      }

      // 2. Fall back to Gemini if available
      if (!updatedMemory && CONFIG.geminiApiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.textModel}:generateContent?key=${CONFIG.geminiApiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1 },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          updatedMemory = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
        }
      }

      if (updatedMemory) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Upsert the new memory profile
        await supabase
          .from('user_profiles')
          .upsert(
            {
              user_id: user.id,
              memory_summary: updatedMemory,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
      }
    } catch (e) {
      console.warn('Failed to evolve memory profile:', e);
    }
  },
};
