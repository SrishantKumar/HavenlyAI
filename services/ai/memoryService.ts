import { supabase } from '../supabaseClient';
import { CONFIG, AI_CONFIG } from '../../constants/config';
import { Message } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { openRouterService } from './openRouterService';
import { scheduleActivationTask } from '../notifications/taskScheduler';

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
   * Fetches longitudinal wellness history across ALL user conversations.
   * CRITICAL ARCHITECTURAL DIRECTIVE (Phase 4):
   * This query deliberately IGNORES the `is_archived` column so that the AI continues
   * to learn from and retain the longitudinal therapeutic pattern even when the user
   * soft-archives a conversation to hide it from their active screen.
   */
  async getLongitudinalWellnessContext(): Promise<string> {
    if (CONFIG.isDemoMode) return '';

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return '';

      // Deliberately query conversations WITHOUT filtering is_archived = false
      const { data: convs, error } = await supabase
        .from('conversations')
        .select('id, title, type, last_message_text, created_at, is_archived')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error || !convs || convs.length === 0) return '';

      const items = convs.map((c) => {
        const archivedNote = c.is_archived ? ' [Archived Reflection]' : '';
        return `- ${c.title}${archivedNote}: "${c.last_message_text || 'Reflection session'}" (${new Date(c.created_at).toLocaleDateString()})`;
      });

      return `Longitudinal Wellness History (includes archived reflections for emotional continuity):\n${items.join('\n')}`;
    } catch (e) {
      console.warn('Failed to fetch longitudinal wellness context:', e);
      return '';
    }
  },

  /**
   * Extracts new insights from a conversation and merges them with the existing memory summary.
   * PHASE 3 DIRECTIVE:
   * Extracts structured JSON containing both the updated memory summary AND a concrete,
   * offline behavioral activation task (physical/social action) with clinical rationale.
   */
  async evolveMemoryProfile(conversationHistory: Message[]): Promise<void> {
    if (CONFIG.isDemoMode) return;
    if (conversationHistory.length < 3) return;

    try {
      const currentMemory = await this.getMemoryProfile();

      const chatContext = conversationHistory
        .filter((msg) => msg.role !== 'system')
        .map((msg) => `${msg.role === 'user' ? 'User' : 'Haven'}: ${msg.content}`)
        .join('\n');

      const prompt = `
You are a therapeutic memory consolidation and behavioral activation AI for HavenlyAI.
Current Memory Profile about the user: "${currentMemory}"

Recent Conversation:
${chatContext}

Your task:
1. Extract any long-term facts, emotional triggers, personal details (such as the user's name if mentioned), or healing progress from the recent conversation. Merge them into a concise updated memory summary (under 150 words).
2. Suggest an offline, physical, or social behavioral activation task based on the conversation context to help the user break depressive/anxious feedback loops. Provide a brief clinical rationale. Example: "Take a 10-minute walk outside without headphones."

Return ONLY a valid JSON object with NO markdown, NO code fences, and NO explanation, following this schema:
{
  "memory_summary": "Concise updated memory profile string under 150 words",
  "suggested_behavioral_task": "Actionable, concrete offline physical or social task (e.g. 'Take a 10-minute walk outside without headphones.')",
  "rationale": "Brief rationale explaining how this helps break rumination or grounding."
}
`;

      let rawOutput: string | null = null;

      // 1. Try OpenRouter free models first
      if (CONFIG.openRouterApiKey) {
        try {
          rawOutput = await openRouterService.generateCompletion(
            'You are a memory consolidation and behavioral activation AI. Output only valid JSON with no formatting.',
            [],
            prompt
          );
        } catch (_) {}
      }

      // 2. Fall back to Gemini if available
      if (!rawOutput && CONFIG.geminiApiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.textModel}:generateContent?key=${CONFIG.geminiApiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
        }
      }

      if (rawOutput) {
        let parsed: {
          memory_summary?: string;
          suggested_behavioral_task?: string;
          rationale?: string;
        } | null = null;

        try {
          // Clean JSON markdown if model wrapped it
          const cleanJson = rawOutput.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
          parsed = JSON.parse(cleanJson);
        } catch (parseErr) {
          console.warn('Could not parse memory consolidation JSON, using raw text as summary:', parseErr);
          parsed = { memory_summary: rawOutput };
        }

        const updatedMemory = parsed?.memory_summary?.trim() || null;
        const suggestedTask = parsed?.suggested_behavioral_task?.trim() || null;
        const rationale = parsed?.rationale?.trim() || '';

        // 1. Handle Behavioral Activation Task (Phase 3)
        if (suggestedTask) {
          console.log('[Behavioral Activation] New task generated:', suggestedTask);
          const taskObj = {
            task: suggestedTask,
            rationale,
            scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            isCompleted: false,
          };
          await useAppStore.getState().setActiveBehavioralTask(taskObj);
          // Schedule local push notification 24 hours later
          await scheduleActivationTask(suggestedTask, rationale);
        }

        // 2. Persist updated memory summary to Supabase user_profiles
        if (updatedMemory) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
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
        }
      }
    } catch (e) {
      console.warn('Failed to evolve memory profile:', e);
    }
  },
};
