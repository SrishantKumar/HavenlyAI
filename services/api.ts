import { authService } from './auth/authService';
import { chatService } from './chat/chatService';
import { aiService } from './ai/aiService';
import { liveKitTokenService } from './livekit/liveKitTokenService';
import { User, Message } from '../types';
import { CONFIG } from '../constants/config';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from '../constants/mockData';
import { supabase } from './supabaseClient';
import { generateUUID } from '../utils/uuid';

export const api = {
  // Authentication
  login: authService.login.bind(authService),
  signup: authService.signup.bind(authService),
  getCurrentUser: async (): Promise<User | null> => {
    const session = await authService.getCurrentSession();
    return session ? session.user : null;
  },
  logout: authService.logout.bind(authService),

  // Messaging & Conversations
  getConversations: chatService.getConversations.bind(chatService),
  getMessages: chatService.getMessages.bind(chatService),
  sendMessage: chatService.sendMessage.bind(chatService),
  createConversation: chatService.createConversation.bind(chatService),
  deleteConversation: chatService.deleteConversation.bind(chatService),

  // Audio Uploads
  uploadAudio: async (uri: string, conversationId: string, userTranscript?: string): Promise<Message[]> => {
    const aiResponse = await aiService.analyzeAudio(uri, conversationId, userTranscript);
    
    // Construct user voice message and AI reply
    const userVoiceMessage: Message = {
      id: generateUUID(),
      conversationId,
      role: 'user',
      content: userTranscript && userTranscript.trim() ? userTranscript.trim() : 'Voice message sent to HavenlyAI',
      timestamp: new Date().toISOString(),
      messageType: 'voice',
      audioUrl: uri,
    };

    const assistantReply: Message = {
      id: generateUUID(),
      conversationId,
      role: 'assistant',
      content: aiResponse.text,
      timestamp: new Date().toISOString(),
      messageType: 'text',
      audioUrl: aiResponse.audioUrl || `speech://${encodeURIComponent(aiResponse.text)}`,
    };

    // Save to Local memory storage (always fallback/sync)
    if (!MOCK_MESSAGES[conversationId]) {
      MOCK_MESSAGES[conversationId] = [];
    }
    MOCK_MESSAGES[conversationId].push(userVoiceMessage, assistantReply);

    const conv = MOCK_CONVERSATIONS.find(c => c.id === conversationId);
    if (conv) {
      conv.lastMessageText = 'Voice note reflection';
      conv.updatedAt = new Date().toISOString();
    } else {
      MOCK_CONVERSATIONS.push({
        id: conversationId,
        title: 'Voice Reflections Log',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: 'voice',
        lastMessageText: 'Voice note reflection',
      });
    }

    // Persist to Supabase in the background (non-blocking)
    if (!CONFIG.isDemoMode) {
      (async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();

          // Check if conversation container exists
          const { data: existingConv } = await supabase
            .from('conversations')
            .select('id')
            .eq('id', conversationId)
            .maybeSingle();

          if (!existingConv) {
            await supabase.from('conversations').insert({
              id: conversationId,
              title: 'Voice Reflections Log',
              type: 'voice',
              user_id: user?.id,
              last_message_text: 'Voice note reflection',
              updated_at: new Date().toISOString(),
            });
          } else {
            await supabase
              .from('conversations')
              .update({
                last_message_text: 'Voice note reflection',
                updated_at: new Date().toISOString()
              })
              .eq('id', conversationId);
          }

          await supabase.from('messages').insert([
            {
              id: userVoiceMessage.id,
              conversation_id: conversationId,
              role: 'user',
              content: 'Voice message sent to HavenlyAI',
              message_type: 'voice',
              audio_url: uri,
              user_id: user?.id,
            },
            {
              id: assistantReply.id,
              conversation_id: conversationId,
              role: 'assistant',
              content: aiResponse.text,
              message_type: 'text',
              audio_url: aiResponse.audioUrl || null,
              user_id: user?.id,
            }
          ]);
        } catch (e) {
          console.warn('Supabase voice note persist failed, synced locally:', e);
        }
      })();
    }

    return [userVoiceMessage, assistantReply];
  },

  // Realtime Session Token Requests
  requestVoiceSession: liveKitTokenService.requestVoiceSession.bind(liveKitTokenService),
  endVoiceSession: liveKitTokenService.endVoiceSession.bind(liveKitTokenService),
};
