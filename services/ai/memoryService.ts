import { supabase } from '../supabaseClient';
import { CONFIG, AI_CONFIG } from '../../constants/config';
import { Message } from '../../types';

export const memoryService = {
  /**
   * Fetches the user's current memory profile summary.
   */
  async getMemoryProfile(): Promise<string> {
    if (CONFIG.isDemoMode) {
      return "The user is exploring the demo and likes to reflect on daily stress. They appreciate gentle check-ins.";
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "";

      const { data, error } = await supabase
        .from('user_profiles')
        .select('memory_summary')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching memory profile:', error);
        return "";
      }

      return data?.memory_summary || "";
    } catch (e) {
      console.warn('Exception fetching memory profile:', e);
      return "";
    }
  },

  /**
   * Extracts new insights from a conversation and merges them with the existing memory summary.
   */
  async evolveMemoryProfile(conversationHistory: Message[]): Promise<void> {
    if (CONFIG.isDemoMode || !CONFIG.geminiApiKey) return;
    
    // Don't evolve if the conversation is too short
    if (conversationHistory.length < 4) return;

    try {
      const currentMemory = await this.getMemoryProfile();
      
      const chatContext = conversationHistory
        .filter(msg => msg.role !== 'system')
        .map(msg => `${msg.role === 'user' ? 'User' : 'Haven'}: ${msg.content}`)
        .join('\n');

      const prompt = `
You are a memory consolidation AI. 
Current Memory Profile about the user: "${currentMemory}"

Recent Conversation:
${chatContext}

Your task is to extract any long-term facts, emotional triggers, or healing progress from the recent conversation. 
If there are new insights, merge them with the Current Memory Profile to create an updated, concise summary (under 150 words). 
If nothing significant was mentioned that warrants long-term memory, return the Current Memory Profile exactly as it is.
Focus on: their name, pets, family members mentioned, recurring stressors, goals, and what helps them heal. Do not include trivial small talk.
Return ONLY the updated memory summary text.
`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.textModel}:generateContent?key=${CONFIG.geminiApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 },
        })
      });

      if (response.ok) {
        const data = await response.json();
        const updatedMemory = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        
        if (updatedMemory) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // Upsert the new memory profile
          await supabase
            .from('user_profiles')
            .upsert({
              user_id: user.id,
              memory_summary: updatedMemory,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
        }
      }
    } catch (e) {
      console.warn('Failed to evolve memory profile:', e);
    }
  }
};
