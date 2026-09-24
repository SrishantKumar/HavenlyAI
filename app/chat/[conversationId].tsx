import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { chatService } from '../../services/chat/chatService';
import { api } from '../../services/api';
import Header from '../../components/ui/Header';
import ChatBubble from '../../components/chat/ChatBubble';
import ChatComposer from '../../components/chat/ChatComposer';
import TypingIndicator from '../../components/chat/TypingIndicator';

export default function ChatSessionScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  
  const { theme, messages, setMessages, addMessage } = useAppStore();
  const colors = theme === 'dark' ? COLORS.dark : COLORS.light;

  const [loading, setLoading] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);

  // 1. Load conversation messages on launch
  useEffect(() => {
    async function loadMessages() {
      if (!conversationId) return;
      setLoading(true);
      try {
        const history = await chatService.getMessages(conversationId);
        setMessages(history);
      } catch (e) {
        console.warn('Failed to load messages', e);
      } finally {
        setLoading(false);
      }
    }
    loadMessages();
  }, [conversationId]);

  // 2. Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Handle Text Submission
  const handleSendText = async (text: string) => {
    if (!conversationId) return;

    // A. Optimistic UI update
    const userMsg = {
      id: `msg_opt_${Date.now()}`,
      conversationId,
      role: 'user' as const,
      content: text,
      timestamp: new Date().toISOString(),
      messageType: 'text' as const,
      isPending: true,
    };
    addMessage(userMsg);
    setAiTyping(true);

    try {
      // B. Send to chat service and wait for response
      const response = await chatService.sendMessage(text, conversationId, messages);
      // C. Update actual messages from server output
      const history = await chatService.getMessages(conversationId);
      setMessages(history);
    } catch (e) {
      console.warn('Send text failed', e);
    } finally {
      setAiTyping(false);
    }
  };

  // Handle Voice Note Submission
  const handleSendVoice = async (uri: string, durationSec: number, transcript?: string) => {
    if (!conversationId) return;

    setAiTyping(true);
    try {
      // A. Upload and get AI text reply
      await api.uploadAudio(uri, conversationId, transcript);
      // B. Refresh messages list
      const history = await chatService.getMessages(conversationId);
      setMessages(history);
    } catch (e) {
      console.warn('Upload audio failed', e);
    } finally {
      setAiTyping(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header title="HavenlyAI" showBackButton rightAction="safety" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.chatArea}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => <ChatBubble message={item} />}
            ListFooterComponent={aiTyping ? <TypingIndicator /> : null}
          />
        </View>

        <ChatComposer
          onSendText={handleSendText}
          onSendVoice={handleSendVoice}
          isSending={aiTyping}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  chatArea: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.md,
  },
});
