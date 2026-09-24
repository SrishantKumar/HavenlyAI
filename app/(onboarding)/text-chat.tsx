import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import OnboardingShell from '../../components/onboarding/OnboardingShell';
import ChatBubble from '../../components/chat/ChatBubble';

export default function OnboardingTextChat() {
  const router = useRouter();
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <OnboardingShell
      step={2}
      title="Put it into words."
      description="Tell HavenlyAI what's on your mind. There is no need to find the perfect words."
      onContinue={() => router.push('/(onboarding)/voice')}
    >
      {/* Mock Chat Interface Box */}
      <View style={[styles.chatBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ChatBubble
          message={{
            id: 'm_mock_1',
            conversationId: 'mock',
            role: 'user',
            content: "I've been feeling stressed lately.",
            timestamp: new Date().toISOString(),
            messageType: 'text',
          }}
        />
        <ChatBubble
          message={{
            id: 'm_mock_2',
            conversationId: 'mock',
            role: 'assistant',
            content: "I hear you. Stress can be exhausting to hold. What feels like it's taking up the most space?",
            timestamp: new Date().toISOString(),
            messageType: 'text',
          }}
        />
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  chatBox: {
    width: '100%',
    maxWidth: 320,
    borderRadius: LAYOUT.borderRadius.large,
    borderWidth: 1,
    padding: LAYOUT.spacing.md,
    height: 180,
    justifyContent: 'center',
    shadowColor: 'rgba(0,0,0,0.01)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
});
