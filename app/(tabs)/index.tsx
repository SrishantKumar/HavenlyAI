import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MessageSquare, Mic, Phone, ChevronRight } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';

const IconMessageSquare = MessageSquare as any;
const IconMic = Mic as any;
const IconPhone = Phone as any;
const IconChevronRight = ChevronRight as any;
import { chatService } from '../../services/chat/chatService';
import { getGreeting, formatFriendlyDate } from '../../utils/formatters';
import HavenlyOrb from '../../components/havenly/HavenlyOrb';
import EmotionSelector from '../../components/ui/EmotionSelector';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';
import { EmotionType } from '../../types';

export default function HomeScreen() {
  const router = useRouter();
  const { theme, user, conversations, setConversations } = useAppStore();
  const colors = theme === 'dark' ? COLORS.dark : COLORS.light;

  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType | null>(null);
  const [mascotMessage, setMascotMessage] = useState<string | null>(null);
  const msgOpacity = useRef(new Animated.Value(0)).current;

  const mascotGreetings = [
    '\u2728 Hey! I am Haven, your companion.',
    '\ud83d\udc9c I am always here when you need me.',
    '\ud83c\udf1f You are doing great. Really.',
    '\ud83c\udf0a Take a breath. I have got you.',
    '\ud83e\udde1 Want to talk? I am listening.',
    '\u2728 You matter more than you know.',
  ];

  const handleMascotPress = useCallback(() => {
    const msg = mascotGreetings[Math.floor(Math.random() * mascotGreetings.length)];
    setMascotMessage(msg);
    msgOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(msgOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(msgOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setMascotMessage(null));
  }, [msgOpacity]);

  // Load conversations on mount
  useEffect(() => {
    async function loadData() {
      try {
        const list = await chatService.getConversations();
        setConversations(list);
      } catch (e) {
        console.warn('Failed to load conversations', e);
      }
    }
    loadData();
  }, []);

  const handleSelectEmotion = (emotion: EmotionType) => {
    setSelectedEmotion(emotion);
  };

  const handleTalkPress = () => {
    router.push('/voice/session');
  };

  const handleWritePress = async () => {
    try {
      const conv = await chatService.createConversation('New reflection', 'text');
      router.push(`/chat/${conv.id}`);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleVoiceNotePress = () => {
    router.push('/(tabs)/voice');
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header title="Sanctuary" rightAction="safety" />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.greeting, { color: colors.text }]}>
            {getGreeting()}, {user?.name || 'Friend'}
          </Text>
          <Text style={[styles.subtext, { color: colors.textMuted }]}>
            What's on your mind today?
          </Text>
        </View>

        {/* HavenlyAI Mascot */}
        <View style={styles.orbContainer}>
          <HavenlyOrb size={160} state="idle" onPress={handleMascotPress} />
          {mascotMessage != null && (
            <Animated.View style={[styles.mascotBubble, { opacity: msgOpacity }]}>
              <Text style={styles.mascotBubbleText}>{mascotMessage}</Text>
            </Animated.View>
          )}
          <Text style={[styles.tapHint, { color: colors.textMuted }]}>tap Haven to say hi 💜</Text>
        </View>

        {/* Main CTA */}
        <Button
          title="Talk with HavenlyAI"
          onPress={handleTalkPress}
          variant="primary"
          size="large"
          style={styles.mainCta}
        />

        {/* Emotion Selector Pills */}
        <EmotionSelector 
          selectedEmotion={selectedEmotion} 
          onSelectEmotion={handleSelectEmotion} 
        />

        {/* Quick Secondary Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={handleWritePress}
              style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}
            >
              <IconMessageSquare color={colors.primary} size={22} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>Write something</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={handleVoiceNotePress}
              style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}
            >
              <IconMic color={colors.primary} size={22} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>Send a voice note</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Conversations */}
        <View style={styles.recentContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent reflections</Text>
          {conversations.slice(0, 2).map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => router.push(item.type === 'text' ? `/chat/${item.id}` : '/(tabs)/history')}
              style={[styles.recentCard, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}
            >
              <View style={styles.recentLeft}>
                <Text style={[styles.recentTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.recentType, { color: colors.textMuted }]}>
                  {formatFriendlyDate(item.createdAt)} · {item.type}
                </Text>
              </View>
              <IconChevronRight color={colors.textMuted} size={18} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.spacing.lg,
    paddingTop: LAYOUT.spacing.md,
    paddingBottom: LAYOUT.spacing.xl,
  },
  welcomeSection: {
    marginVertical: LAYOUT.spacing.sm,
  },
  greeting: {
    ...TYPOGRAPHY.hero,
    fontSize: 26,
    fontWeight: '700',
  },
  subtext: {
    ...TYPOGRAPHY.body,
    fontSize: 16,
    marginTop: 2,
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  mascotBubble: {
    marginTop: -10,
    backgroundColor: '#7C3AED',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    maxWidth: 260,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  mascotBubbleText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  tapHint: {
    fontSize: 12,
    marginTop: 6,
    opacity: 0.6,
  },
  mainCta: {
    marginBottom: LAYOUT.spacing.lg,
  },
  quickActionsContainer: {
    marginVertical: LAYOUT.spacing.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: LAYOUT.spacing.sm,
    paddingHorizontal: LAYOUT.spacing.xs,
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: LAYOUT.borderRadius.large,
    padding: LAYOUT.spacing.lg,
    marginHorizontal: 6,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  actionLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  recentContainer: {
    marginVertical: LAYOUT.spacing.md,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: LAYOUT.spacing.lg,
    borderRadius: LAYOUT.borderRadius.large,
    borderWidth: 1,
    marginBottom: LAYOUT.spacing.sm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  recentLeft: {
    flex: 1,
    marginRight: LAYOUT.spacing.sm,
  },
  recentTitle: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    fontWeight: '600',
  },
  recentType: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    marginTop: 2,
  },
});
