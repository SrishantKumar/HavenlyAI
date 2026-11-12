import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Sparkles, Mic, Wind } from 'lucide-react-native';

import { COLORS, LAYOUT, TYPOGRAPHY } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { chatService } from '../../services/chat/chatService';
import { api } from '../../services/api';
import { getTodaysQuest } from '../../constants/quests';
import Header from '../../components/ui/Header';
import ChatBubble from '../../components/chat/ChatBubble';
import ChatComposer from '../../components/chat/ChatComposer';
import TypingIndicator from '../../components/chat/TypingIndicator';

const IconSparkles = Sparkles as any;
const IconMic = Mic as any;
const IconWind = Wind as any;

export default function ChatSessionScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();

  const { theme, messages, setMessages, addMessage } = useAppStore();
  const colors = theme === 'dark' ? COLORS.dark : COLORS.light;
  const isDark = theme === 'dark';

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

  // Quick Action Handlers
  const handleBreathePress = () => {
    handleSendText("Can we do a short 4-7-8 breathing exercise together?");
  };

  const handleQuestPress = () => {
    const today = getTodaysQuest();
    router.push(`/quest/${today.id}` as any);
  };

  const handleVoicePress = () => {
    router.push('/voice/session');
  };

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
      await chatService.sendMessage(text, conversationId, messages);
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
      await api.uploadAudio(uri, conversationId, transcript);
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

      {/* Quick Action Navigation Row */}
      <View style={[styles.quickBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickBarContent}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleBreathePress}
            style={[styles.quickPill, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(14, 165, 233, 0.1)' }]}
          >
            <IconWind color={colors.cyanAccent} size={14} style={{ marginRight: 6 }} />
            <Text style={[styles.quickPillText, { color: colors.cyanAccent }]}>Breathe</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleQuestPress}
            style={[styles.quickPill, { backgroundColor: isDark ? 'rgba(167, 139, 250, 0.16)' : 'rgba(139, 92, 246, 0.1)' }]}
          >
            <IconSparkles color={colors.accent} size={14} style={{ marginRight: 6 }} />
            <Text style={[styles.quickPillText, { color: colors.accent }]}>Grounding Quest</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleVoicePress}
            style={[styles.quickPill, { backgroundColor: isDark ? 'rgba(129, 140, 248, 0.16)' : 'rgba(99, 102, 241, 0.1)' }]}
          >
            <IconMic color={colors.primary} size={14} style={{ marginRight: 6 }} />
            <Text style={[styles.quickPillText, { color: colors.primary }]}>Voice Session</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
  quickBar: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  quickBarContent: {
    paddingHorizontal: LAYOUT.spacing.md,
    gap: 8,
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: LAYOUT.borderRadius.full,
  },
  quickPillText: {
    fontSize: 12,
    fontWeight: '600',
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
