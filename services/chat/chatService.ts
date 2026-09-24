import { Conversation, Message } from '../../types';
import { CONFIG } from '../../constants/config';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from '../../constants/mockData';
import { aiService } from '../ai/aiService';
import { geminiService, SentimentResult } from '../ai/geminiService';
import { supabase } from '../supabaseClient';
import { generateUUID } from '../../utils/uuid';
import { memoryService } from '../ai/memoryService';

export const chatService = {
  /**
   * Fetches all conversations for the user
   */
  async getConversations(): Promise<Conversation[]> {
    if (CONFIG.isDemoMode) {
      await new Promise(resolve => setTimeout(resolve, 600));
      return [...MOCK_CONVERSATIONS];
    }

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      return data.map((c: any) => ({
        id: c.id,
        title: c.title,
        createdAt: c.created_at || c.createdAt,
        updatedAt: c.updated_at || c.updatedAt,
        type: c.type,
        lastMessageText: c.last_message_text || c.lastMessageText || '',
      }));
    } catch (e) {
      console.warn('Supabase DB getConversations failed, falling back to mock memory data:', e);
      return [...MOCK_CONVERSATIONS];
    }
  },

  /**
   * Fetches messages for a given conversation
   */
  async getMessages(conversationId: string): Promise<Message[]> {
    if (CONFIG.isDemoMode) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return [...(MOCK_MESSAGES[conversationId] || [])];
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!data) return [];

      return data.map((m: any) => ({
        id: m.id,
        conversationId: m.conversation_id || m.conversationId,
        role: m.role,
        content: m.content,
        timestamp: m.created_at || m.timestamp,
        messageType: m.message_type || m.messageType || 'text',
        audioUrl: m.audio_url || m.audioUrl,
      }));
    } catch (e) {
      console.warn('Supabase DB getMessages failed, falling back to mock messages:', e);
      return [...(MOCK_MESSAGES[conversationId] || [])];
    }
  },

  /**
   * Sends a user text message and streams/awaits AI response
   */
  async sendMessage(
    text: string,
    conversationId: string,
    history: Message[]
  ): Promise<{ userMessage: Message; assistantMessage: Message; sentiment: SentimentResult | null }> {
    const userMessage: Message = {
      id: generateUUID(),
      conversationId,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      messageType: 'text',
    };

    // Run AI response + sentiment analysis in parallel (sentiment is non-blocking)
    const [aiResponse, sentiment] = await Promise.all([
      aiService.sendTextMessage(text, conversationId, history),
      geminiService.analyzeSentiment(text).catch(() => null),
    ]);
    const assistantMessage: Message = {
      id: generateUUID(),
      conversationId,
      role: 'assistant',
      content: aiResponse.text,
      timestamp: new Date().toISOString(),
      messageType: 'text',
      audioUrl: `speech://${encodeURIComponent(aiResponse.text)}`,
    };

    if (CONFIG.isDemoMode) {
      if (!MOCK_MESSAGES[conversationId]) {
        MOCK_MESSAGES[conversationId] = [];
      }
      MOCK_MESSAGES[conversationId].push(userMessage, assistantMessage);

      const conv = MOCK_CONVERSATIONS.find(c => c.id === conversationId);
      if (conv) {
        conv.lastMessageText = text;
        conv.updatedAt = new Date().toISOString();
      }

      // Fire and forget memory evolution
      memoryService.evolveMemoryProfile([...history, userMessage, assistantMessage]).catch(console.warn);

      return { userMessage, assistantMessage, sentiment };
    }

    try {
      // 2. Persist to Supabase if possible
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('messages').insert([
        {
          id: userMessage.id,
          conversation_id: conversationId,
          role: 'user',
          content: text,
          message_type: 'text',
          user_id: user?.id,
        },
        {
          id: assistantMessage.id,
          conversation_id: conversationId,
          role: 'assistant',
          content: aiResponse.text,
          message_type: 'text',
          user_id: user?.id,
        }
      ]);

      await supabase
        .from('conversations')
        .update({
          last_message_text: text,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      // Fire and forget memory evolution
      memoryService.evolveMemoryProfile([...history, userMessage, assistantMessage]).catch(console.warn);

      return { userMessage, assistantMessage, sentiment };
    } catch (e) {
      console.warn('Supabase DB sendMessage failed, syncing locally:', e);
      // Fallback local persistence
      if (!MOCK_MESSAGES[conversationId]) {
        MOCK_MESSAGES[conversationId] = [];
      }
      MOCK_MESSAGES[conversationId].push(userMessage, assistantMessage);

      const conv = MOCK_CONVERSATIONS.find(c => c.id === conversationId);
      if (conv) {
        conv.lastMessageText = text;
        conv.updatedAt = new Date().toISOString();
      }

      return { userMessage, assistantMessage, sentiment };
    }
  },

  /**
   * Creates a new conversation
   */
  async createConversation(title: string, type: 'text' | 'voice' | 'live'): Promise<Conversation> {
    const newId = generateUUID();
    if (CONFIG.isDemoMode) {
      const newConv: Conversation = {
        id: newId,
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type,
        lastMessageText: type === 'text' ? 'Started a new conversation' : 'Voice session initiated',
      };
      MOCK_CONVERSATIONS.unshift(newConv);
      MOCK_MESSAGES[newConv.id] = [];
      return newConv;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          id: newId,
          title,
          type,
          user_id: user?.id,
          last_message_text: type === 'text' ? 'Started a new conversation' : 'Voice session initiated',
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        title: data.title,
        createdAt: data.created_at || data.createdAt,
        updatedAt: data.updated_at || data.updatedAt,
        type: data.type,
        lastMessageText: data.last_message_text || data.lastMessageText || '',
      };
    } catch (e) {
      console.warn('Supabase DB createConversation failed, creating locally:', e);
      const newConv: Conversation = {
        id: newId,
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type,
        lastMessageText: type === 'text' ? 'Started a new conversation' : 'Voice session initiated',
      };
      MOCK_CONVERSATIONS.unshift(newConv);
      MOCK_MESSAGES[newConv.id] = [];
      return newConv;
    }
  },

  /**
   * Deletes a conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    if (CONFIG.isDemoMode) {
      const index = MOCK_CONVERSATIONS.findIndex(c => c.id === conversationId);
      if (index !== -1) {
        MOCK_CONVERSATIONS.splice(index, 1);
      }
      delete MOCK_MESSAGES[conversationId];
      return;
    }

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;
    } catch (e) {
      console.warn('Supabase DB deleteConversation failed, deleting locally:', e);
      const index = MOCK_CONVERSATIONS.findIndex(c => c.id === conversationId);
      if (index !== -1) {
        MOCK_CONVERSATIONS.splice(index, 1);
      }
      delete MOCK_MESSAGES[conversationId];
    }
  },
};
