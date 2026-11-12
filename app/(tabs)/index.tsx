import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  MessageSquare,
  Mic,
  ChevronRight,
  Compass,
  CheckCircle2,
  Sparkles,
  Flame,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, RadialGradient as SvgRadialGradient, Rect, Stop } from 'react-native-svg';

import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { useQuestStore, calculateLevel, xpForLevel, xpForNextLevel, getLocalDateString } from '../../store/useQuestStore';
import { getTodaysQuest } from '../../constants/quests';
import { chatService } from '../../services/chat/chatService';
import { getGreeting, formatFriendlyDate } from '../../utils/formatters';
import HavenlyOrb from '../../components/havenly/HavenlyOrb';
import ProgressRing from '../../components/ui/ProgressRing';
import Card from '../../components/ui/Card';
import Chip from '../../components/ui/Chip';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';
import { EmotionType } from '../../types';

const IconMessageSquare = MessageSquare as any;
const IconMic = Mic as any;
const IconChevronRight = ChevronRight as any;
const IconCompass = Compass as any;
const IconCheckCircle2 = CheckCircle2 as any;
const IconSparkles = Sparkles as any;
const IconFlame = Flame as any;
const IconClock = Clock as any;
const IconArrowRight = ArrowRight as any;
const IconShieldAlert = ShieldAlert as any;

const MOOD_COLORS: Record<EmotionType, { color: string; bg: string }> = {
  okay: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.18)' },
  low: { color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.18)' },
  stressed: { color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.18)' },
  overwhelmed: { color: '#F87171', bg: 'rgba(248, 113, 113, 0.18)' },
  lonely: { color: '#C084FC', bg: 'rgba(192, 132, 252, 0.18)' },
  talk: { color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.18)' },
};

const MOOD_CHIPS: { type: EmotionType; label: string; emoji: string }[] = [
  { type: 'okay', label: "I'm okay", emoji: '😌' },
  { type: 'low', label: 'A little low', emoji: '☁️' },
  { type: 'stressed', label: 'Stressed', emoji: '🌪️' },
  { type: 'overwhelmed', label: 'Overwhelmed', emoji: '🌊' },
  { type: 'lonely', label: 'Lonely', emoji: '🕯️' },
  { type: 'talk', label: 'Need to talk', emoji: '💬' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const {
    theme,
    user,
    conversations,
    setConversations,
    activeBehavioralTask,
    incrementBehavioralTasksCompleted,
    behavioralTasksCompleted,
    setShowSafetySupport,
  } = useAppStore();

  // Quest Store gamification state
  const {
    xp,
    level,
    streak,
    lastQuestDate,
    initQuestStore,
  } = useQuestStore();

  const colors = theme === 'dark' ? COLORS.dark : COLORS.light;
  const isDark = theme === 'dark';

  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType | null>(null);
  const [mascotMessage, setMascotMessage] = useState<string | null>(null);
  const msgOpacity = useRef(new Animated.Value(0)).current;

  // Background aura hue animation value (0 to 1)
  const auraOpacity = useRef(new Animated.Value(0.45)).current;

  // Initialize stores and load data
  useEffect(() => {
    initQuestStore();
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

  // Today's Quest
  const todaysQuest = getTodaysQuest();
  const todayStr = getLocalDateString();
  const isQuestDoneToday = lastQuestDate === todayStr;

  // Mascot Greeting hints
  const mascotGreetings = [
    '✨ Hey! I am Haven, your grounding companion.',
    '💜 I am right here whenever you need a pause.',
    '🌟 Take a slow breath. You are doing well.',
    '🌊 Let thoughts come and go like gentle waves.',
    '🎙️ Want to talk? I am listening.',
    '✨ You matter more than you know.',
  ];

  const handleMascotPress = useCallback(() => {
    const msg = mascotGreetings[Math.floor(Math.random() * mascotGreetings.length)];
    setMascotMessage(msg);
    msgOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(msgOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(msgOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setMascotMessage(null));
  }, [msgOpacity]);

  const handleSelectEmotion = async (emotion: EmotionType) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    setSelectedEmotion(emotion);

    // Pulse the soft aura background
    Animated.sequence([
      Animated.timing(auraOpacity, { toValue: 0.8, duration: 300, useNativeDriver: true }),
      Animated.timing(auraOpacity, { toValue: 0.5, duration: 500, useNativeDriver: true }),
    ]).start();
  };

  const handleCompleteTask = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
    await incrementBehavioralTasksCompleted();
  };

  const handleTalkPress = () => {
    router.push('/voice/session');
  };

  const handleStartQuest = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}
    router.push(`/quest/${todaysQuest.id}` as any);
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

  // Level & XP calculations for Header Ring
  const currentLevel = level || 1;
  const levelBase = xpForLevel(currentLevel);
  const nextLevelBase = xpForNextLevel(currentLevel);
  const xpSpan = Math.max(1, nextLevelBase - levelBase);
  const xpInto = Math.max(0, xp - levelBase);
  const levelProgressRatio = Math.min(1, xpInto / xpSpan);

  // Background aura radial gradient color based on selected emotion
  const auraGlowColor = selectedEmotion
    ? MOOD_COLORS[selectedEmotion].color
    : colors.primary;

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header with Title, Streak Flame, Level Progress Ring, and Safety Shield */}
      <Header
        title="Sanctuary"
        rightAction="none"
        rightComponent={
          <View style={styles.headerRightContainer}>
            {/* Streak Indicator */}
            <View
              style={[
                styles.streakPill,
                {
                  backgroundColor: isDark ? 'rgba(251, 191, 36, 0.14)' : 'rgba(245, 158, 11, 0.12)',
                  borderColor: isDark ? 'rgba(251, 191, 36, 0.3)' : 'rgba(245, 158, 11, 0.25)',
                },
              ]}
              accessibilityRole="text"
              accessibilityLabel={`${streak} day grounding streak`}
            >
              <IconFlame color={colors.streak} size={15} style={{ marginRight: 4 }} />
              <Text style={[styles.streakText, { color: colors.streak }]}>{streak}d</Text>
            </View>

            {/* Level Ring */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/profile')}
              accessibilityRole="button"
              accessibilityLabel={`Level ${currentLevel}, tap to view profile`}
            >
              <ProgressRing
                progress={levelProgressRatio}
                size={34}
                strokeWidth={3}
                label={`L${currentLevel}`}
              />
            </TouchableOpacity>

            {/* Safety Support Shield */}
            <TouchableOpacity
              onPress={() => setShowSafetySupport(true)}
              style={styles.safetyIconBtn}
              accessibilityLabel="Emergency support resources"
              accessibilityRole="button"
            >
              <IconShieldAlert color={colors.error} size={20} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Welcome Greeting */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.greeting, { color: colors.text }]}>
            {getGreeting()}, {user?.name || 'Friend'}
          </Text>
          <Text style={[styles.subtext, { color: colors.textMuted }]}>
            How is your heart feeling in this moment?
          </Text>
        </View>

        {/* Havenly Mascot with Soft Dynamic Radial Aura */}
        <View style={styles.mascotSection}>
          {/* Subtle Ambient Radial Aura Gradient */}
          <View style={styles.radialAuraWrapper} pointerEvents="none">
            <Svg width={280} height={280} viewBox="0 0 280 280">
              <Defs>
                <SvgRadialGradient id="homeAura" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={auraGlowColor} stopOpacity={isDark ? '0.28' : '0.15'} />
                  <Stop offset="60%" stopColor={auraGlowColor} stopOpacity={isDark ? '0.08' : '0.04'} />
                  <Stop offset="100%" stopColor={auraGlowColor} stopOpacity="0" />
                </SvgRadialGradient>
              </Defs>
              <Rect width="280" height="280" fill="url(#homeAura)" />
            </Svg>
          </View>

          <HavenlyOrb size={150} state="idle" level={currentLevel} onPress={handleMascotPress} />

          {mascotMessage != null && (
            <Animated.View style={[styles.mascotBubble, { opacity: msgOpacity }]}>
              <Text style={styles.mascotBubbleText}>{mascotMessage}</Text>
            </Animated.View>
          )}

          <Text style={[styles.tapHint, { color: colors.textMuted }]}>
            tap Haven to say hi 💜
          </Text>
        </View>

        {/* Primary CTA: Talk with HavenlyAI */}
        <Button
          title="Talk with HavenlyAI"
          onPress={handleTalkPress}
          variant="primary"
          size="large"
          style={styles.mainCta}
        />

        {/* TODAY'S QUEST CARD (Secondary Gamified Quest Entry) */}
        <Card style={styles.questCard} variant="elevated">
          <View style={styles.questHeader}>
            <View style={styles.questHeaderLeft}>
              <Badge
                label="Today's Quest"
                variant={isQuestDoneToday ? 'success' : 'primary'}
                icon={<IconSparkles color={isQuestDoneToday ? colors.success : colors.primary} size={12} />}
              />
              <Badge
                label={`+${todaysQuest.xp} XP`}
                variant="gold"
                style={{ marginLeft: 6 }}
              />
            </View>

            <View style={styles.questHeaderRight}>
              <IconClock color={colors.textMuted} size={13} style={{ marginRight: 4 }} />
              <Text style={[styles.questTimeText, { color: colors.textMuted }]}>
                ~{todaysQuest.estimatedSeconds}s
              </Text>
            </View>
          </View>

          <Text style={[styles.questTitle, { color: colors.text }]}>
            {todaysQuest.title}
          </Text>

          <Text style={[styles.questPrompt, { color: colors.textMuted }]} numberOfLines={2}>
            {todaysQuest.prompt}
          </Text>

          <View style={styles.questFooter}>
            <View style={styles.senseChipRow}>
              <Chip
                label={`${todaysQuest.slots} observations · ${todaysQuest.sense}`}
                size="small"
                variant="default"
              />
            </View>

            {isQuestDoneToday ? (
              <View style={[styles.questCompletedTag, { backgroundColor: colors.successLight }]}>
                <IconCheckCircle2 color={colors.success} size={16} style={{ marginRight: 6 }} />
                <Text style={[styles.questCompletedText, { color: colors.success }]}>
                  Completed Today
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleStartQuest}
                style={[styles.startQuestBtn, { backgroundColor: colors.primary }]}
                accessibilityRole="button"
                accessibilityLabel="Start today's quest"
              >
                <Text style={styles.startQuestBtnText}>Start Quest</Text>
                <IconArrowRight color="#FFFFFF" size={15} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}
          </View>
        </Card>

        {/* One-Tap Mood Check-In Row of 6 Chips */}
        <View style={styles.moodSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            How are you feeling right now?
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.moodRow}
          >
            {MOOD_CHIPS.map((chip) => {
              const isSelected = selectedEmotion === chip.type;
              return (
                <TouchableOpacity
                  key={chip.type}
                  activeOpacity={0.7}
                  onPress={() => handleSelectEmotion(chip.type)}
                  style={[
                    styles.moodPill,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? 'rgba(167, 139, 250, 0.22)'
                          : 'rgba(99, 102, 241, 0.12)'
                        : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                >
                  <Text style={styles.moodEmoji}>{chip.emoji}</Text>
                  <Text
                    style={[
                      styles.moodLabel,
                      {
                        color: isSelected ? colors.primary : colors.text,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Behavioral Activation Card (Somatic Anchor) */}
        <Card style={styles.taskCard} variant="subtle">
          <View style={styles.taskCardHeader}>
            <View style={styles.taskTitleRow}>
              <IconCompass color={colors.primary} size={17} />
              <Text style={[styles.taskCardTitle, { color: colors.text }]}>
                Behavioral Activation
              </Text>
            </View>
            <View style={[styles.orbThemeBadge, { backgroundColor: colors.secondary }]}>
              <IconSparkles color={colors.primary} size={12} style={{ marginRight: 4 }} />
              <Text style={[styles.orbThemeBadgeText, { color: colors.primary }]}>
                {behavioralTasksCompleted >= 6
                  ? 'Deep Ocean'
                  : behavioralTasksCompleted >= 3
                  ? 'Aurora'
                  : 'Violet'}
              </Text>
            </View>
          </View>

          <Text style={[styles.taskPromptText, { color: colors.text }]}>
            {activeBehavioralTask?.task || 'Take a 10-minute walk outside without headphones.'}
          </Text>

          <Text style={[styles.taskRationaleText, { color: colors.textMuted }]}>
            {activeBehavioralTask?.rationale || 'Engages sensory awareness and breaks cyclical rumination patterns.'}
          </Text>

          <View style={styles.taskFooterRow}>
            {activeBehavioralTask?.isCompleted ? (
              <View style={[styles.completedBadge, { borderColor: colors.success }]}>
                <IconCheckCircle2 color={colors.success} size={15} style={{ marginRight: 6 }} />
                <Text style={[styles.completedBadgeText, { color: colors.success }]}>
                  Completed
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleCompleteTask}
                style={[styles.completeTaskBtn, { backgroundColor: colors.primary }]}
              >
                <IconCheckCircle2 color="#FFFFFF" size={15} style={{ marginRight: 6 }} />
                <Text style={styles.completeTaskBtnText}>Mark Complete</Text>
              </TouchableOpacity>
            )}
            <Text style={[styles.taskCounterText, { color: colors.textMuted }]}>
              {behavioralTasksCompleted} {behavioralTasksCompleted === 1 ? 'step' : 'steps'} done
            </Text>
          </View>
        </Card>

        {/* Quick Secondary Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick reflections</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleWritePress}
              style={[
                styles.actionCard,
                { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow },
              ]}
            >
              <IconMessageSquare color={colors.primary} size={22} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>Write something</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleVoiceNotePress}
              style={[
                styles.actionCard,
                { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow },
              ]}
            >
              <IconMic color={colors.primary} size={22} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>Send a voice note</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Reflections */}
        {conversations.length > 0 && (
          <View style={styles.recentContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent reflections</Text>
            {conversations.slice(0, 2).map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() =>
                  router.push(item.type === 'text' ? `/chat/${item.id}` : '/(tabs)/history')
                }
                style={[
                  styles.recentCard,
                  { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow },
                ]}
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
        )}
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
    paddingTop: LAYOUT.spacing.sm,
    paddingBottom: LAYOUT.spacing.xl,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: LAYOUT.borderRadius.full,
    borderWidth: 1,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
  },
  safetyIconBtn: {
    padding: 6,
    borderRadius: LAYOUT.borderRadius.small,
  },
  welcomeSection: {
    marginVertical: LAYOUT.spacing.xs,
  },
  greeting: {
    ...TYPOGRAPHY.hero,
    fontSize: 25,
    fontWeight: '700',
  },
  subtext: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    marginTop: 2,
  },
  mascotSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    position: 'relative',
  },
  radialAuraWrapper: {
    position: 'absolute',
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  mascotBubble: {
    marginTop: -8,
    backgroundColor: '#7C3AED',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    maxWidth: 270,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  mascotBubbleText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  tapHint: {
    fontSize: 12,
    marginTop: 6,
    opacity: 0.65,
  },
  mainCta: {
    marginBottom: LAYOUT.spacing.md,
  },
  questCard: {
    padding: LAYOUT.spacing.md,
    marginBottom: LAYOUT.spacing.md,
  },
  questHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  questHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questTimeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  questTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  questPrompt: {
    ...TYPOGRAPHY.bodySmall,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  questFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  senseChipRow: {
    flex: 1,
    marginRight: 8,
  },
  startQuestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: LAYOUT.borderRadius.full,
  },
  startQuestBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  questCompletedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: LAYOUT.borderRadius.full,
  },
  questCompletedText: {
    fontSize: 12,
    fontWeight: '700',
  },
  moodSection: {
    marginVertical: LAYOUT.spacing.xs,
  },
  sectionTitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: LAYOUT.spacing.sm,
    paddingHorizontal: LAYOUT.spacing.xs,
  },
  moodRow: {
    paddingVertical: 2,
    gap: 8,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: LAYOUT.borderRadius.full,
    borderWidth: 1,
    minHeight: 40,
  },
  moodEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  moodLabel: {
    fontSize: 13,
  },
  taskCard: {
    padding: LAYOUT.spacing.md,
    marginTop: LAYOUT.spacing.sm,
    marginBottom: LAYOUT.spacing.xs,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskCardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  orbThemeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  orbThemeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  taskPromptText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 4,
  },
  taskRationaleText: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  taskFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completeTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: LAYOUT.borderRadius.full,
  },
  completeTaskBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: LAYOUT.borderRadius.full,
    borderWidth: 1,
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskCounterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  quickActionsContainer: {
    marginTop: LAYOUT.spacing.md,
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: LAYOUT.borderRadius.large,
    padding: LAYOUT.spacing.md,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  actionLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  recentContainer: {
    marginTop: LAYOUT.spacing.md,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: LAYOUT.spacing.md,
    borderRadius: LAYOUT.borderRadius.large,
    borderWidth: 1,
    marginBottom: LAYOUT.spacing.sm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
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
