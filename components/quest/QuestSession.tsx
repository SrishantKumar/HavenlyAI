import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import {
  X,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  ArrowRight,
  Sparkles,
  Flame,
  CheckCircle2,
  RotateCcw,
  Heart,
  Wind,
} from 'lucide-react-native';

import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { useQuestStore, calculateLevel, xpForLevel, xpForNextLevel } from '../../store/useQuestStore';
import { Quest } from '../../types/quest';
import { BADGES, getAvailableQuests } from '../../constants/quests';
import { questService } from '../../services/ai/questService';
import HavenlyOrb from '../havenly/HavenlyOrb';
import ProgressDots from '../ui/ProgressDots';
import ProgressRing from '../ui/ProgressRing';
import Card from '../ui/Card';
import Chip from '../ui/Chip';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import ConfirmationModal from '../ui/ConfirmationModal';

const IconX = X as any;
const IconVolume2 = Volume2 as any;
const IconVolumeX = VolumeX as any;
const IconMic = Mic as any;
const IconMicOff = MicOff as any;
const IconArrowRight = ArrowRight as any;
const IconSparkles = Sparkles as any;
const IconFlame = Flame as any;
const IconCheckCircle2 = CheckCircle2 as any;
const IconRotateCcw = RotateCcw as any;
const IconHeart = Heart as any;
const IconWind = Wind as any;

interface QuestSessionProps {
  quest: Quest;
  onExit?: () => void;
}

type QuestStage = 'answering' | 'thinking' | 'followup' | 'closing' | 'completed';

export const QuestSession: React.FC<QuestSessionProps> = ({ quest, onExit }) => {
  const router = useRouter();
  const theme = useAppStore((s) => s.theme);
  const setShowSafetySupport = useAppStore((s) => s.setShowSafetySupport);
  const isDark = theme === 'dark';
  const colors = isDark ? COLORS.dark : COLORS.light;

  // Quest Store Actions & State
  const { xp, level, streak, completeQuest, unlockedBadgeIds } = useQuestStore();

  // Session Flow State
  const [stage, setStage] = useState<QuestStage>('answering');
  const [answers, setAnswers] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [usedVoice, setUsedVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [aiFollowUp, setAiFollowUp] = useState('');
  const [aiClosing, setAiClosing] = useState('');
  const [userFollowUpReply, setUserFollowUpReply] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [moderateAlert, setModerateAlert] = useState(false);

  // Completion results
  const [completionResults, setCompletionResults] = useState<{
    xpGained: number;
    newBadges: string[];
    streak: number;
    level: number;
  } | null>(null);

  const inputRef = useRef<TextInput>(null);
  const recognitionRef = useRef<any>(null);

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      try {
        Speech.stop();
      } catch (_) {}
      try {
        if (recognitionRef.current) {
          recognitionRef.current.stop?.();
        }
      } catch (_) {}
    };
  }, []);

  // Speak text helper with mute check
  const speakText = useCallback(
    (textToSpeak: string) => {
      if (isMuted || !textToSpeak) return;
      try {
        Speech.stop();
        Speech.speak(textToSpeak, {
          rate: 0.95,
          pitch: 1.05,
        });
      } catch (err) {
        console.warn('Speech read aloud error:', err);
      }
    },
    [isMuted]
  );

  // Read quest intro on initial mount
  useEffect(() => {
    if (!isMuted) {
      speakText(quest.prompt);
    }
  }, [quest.id]);

  // Current slot prompt
  const currentSlotIndex = answers.length;
  const currentSlotPrompt =
    quest.stepPrompts && quest.stepPrompts[currentSlotIndex]
      ? quest.stepPrompts[currentSlotIndex]
      : quest.prompt;

  // Speech Recognition Handling (Native + Web)
  const toggleListening = async () => {
    if (isListening) {
      stopListening();
      return;
    }

    try {
      if (Platform.OS === 'web') {
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
          console.warn('Web SpeechRecognition not supported');
          return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = false;

        recognition.onstart = () => {
          setIsListening(true);
          setUsedVoice(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((r: any) => r[0].transcript)
            .join(' ');
          setInputText(transcript);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } else {
        // Native mobile using expo-speech-recognition
        try {
          const { ExpoSpeechRecognitionModule } = require('expo-speech-recognition');
          const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
          if (!perm.granted) {
            console.warn('Microphone permission not granted for quest');
            return;
          }

          setIsListening(true);
          setUsedVoice(true);

          const sub = ExpoSpeechRecognitionModule.addListener('result', (ev: any) => {
            const transcript = ev.results?.map((r: any) => r.transcript).join(' ');
            if (transcript) {
              setInputText(transcript);
            }
          });

          const endSub = ExpoSpeechRecognitionModule.addListener('end', () => {
            setIsListening(false);
            try {
              sub.remove();
              endSub.remove();
            } catch (_) {}
          });

          ExpoSpeechRecognitionModule.start({ lang: 'en-US' });
          recognitionRef.current = {
            stop: () => {
              try {
                ExpoSpeechRecognitionModule.stop();
              } catch (_) {}
            },
          };
        } catch (nativeErr) {
          console.warn('Native speech recognition fallback error:', nativeErr);
        }
      }
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    try {
      if (recognitionRef.current?.stop) {
        recognitionRef.current.stop();
      }
    } catch (_) {}
    setIsListening(false);
  };

  // Submit Answer to current slot
  const handleSubmitAnswer = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    // Safety check
    const safety = questService.evaluateInputSafety(trimmed);
    if (safety.isCrisis) {
      // High crisis phrase: halt quest immediately and open triage sheet
      try {
        Speech.stop();
      } catch (_) {}
      setShowSafetySupport(true);
      return;
    }

    if (safety.safetyLevel === 'moderate') {
      setModerateAlert(true);
    }

    // Light haptic feedback
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    const nextAnswers = [...answers, trimmed];
    setAnswers(nextAnswers);
    setInputText('');
    stopListening();

    // If all slots are completed, transition to AI follow-up
    if (nextAnswers.length >= quest.slots) {
      triggerAiFollowUp(nextAnswers);
    } else {
      inputRef.current?.focus();
    }
  };

  // Request AI Follow-Up from Haven
  const triggerAiFollowUp = async (completedAnswers: string[]) => {
    setStage('thinking');
    setIsGeneratingAi(true);

    try {
      const res = await questService.getQuestFollowUp(quest, completedAnswers);
      if (res.isCrisis) {
        setShowSafetySupport(true);
        return;
      }

      setAiFollowUp(res.text);
      setStage('followup');
      setIsGeneratingAi(false);
      speakText(res.text);
    } catch (err) {
      console.warn('Error fetching quest follow-up:', err);
      const fallback = questService.evaluateInputSafety('');
      setAiFollowUp("I loved hearing what you noticed. How does taking this moment feel for you?");
      setStage('followup');
      setIsGeneratingAi(false);
    }
  };

  // User submits a reply to Haven's follow-up
  const handleFollowUpReplySubmit = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      handleFinishQuest();
      return;
    }

    // Safety check
    const safety = questService.evaluateInputSafety(trimmed);
    if (safety.isCrisis) {
      setShowSafetySupport(true);
      return;
    }

    setUserFollowUpReply(trimmed);
    setInputText('');
    stopListening();
    setStage('closing');
    setIsGeneratingAi(true);

    try {
      const res = await questService.getClosingTurn(quest, trimmed);
      if (res.isCrisis) {
        setShowSafetySupport(true);
        return;
      }
      setAiClosing(res.text);
      speakText(res.text);
    } catch (_) {
      setAiClosing("Thank you for being here with yourself today.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Complete and save quest
  const handleFinishQuest = async () => {
    try {
      Speech.stop();
    } catch (_) {}

    const results = await completeQuest({
      quest,
      answers,
      usedVoice,
      followUpPrompt: aiFollowUp,
      userFollowUpReply,
    });

    setCompletionResults(results);
    setStage('completed');

    // Celebration haptics
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
  };

  // Exit safely without penalty
  const handleExitPress = () => {
    if (stage === 'completed' || answers.length === 0) {
      onExit ? onExit() : router.back();
    } else {
      setExitModalVisible(true);
    }
  };

  const confirmExit = () => {
    setExitModalVisible(false);
    try {
      Speech.stop();
    } catch (_) {}
    onExit ? onExit() : router.back();
  };

  // Calculate Level XP progress for completion screen
  const currentLevel = completionResults ? completionResults.level : level;
  const currentTotalXp = completionResults ? xp : xp;
  const levelBaseXp = xpForLevel(currentLevel);
  const nextLevelXp = xpForNextLevel(currentLevel);
  const xpIntoCurrentLevel = Math.max(0, currentTotalXp - levelBaseXp);
  const xpSpanForLevel = Math.max(1, nextLevelXp - levelBaseXp);
  const levelProgressRatio = Math.min(1, xpIntoCurrentLevel / xpSpanForLevel);

  // Newly unlocked badge details
  const unlockedBadgesList = (completionResults?.newBadges || [])
    .map((id) => BADGES.find((b) => b.id === id))
    .filter((b): b is (typeof BADGES)[number] => Boolean(b));

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        {/* Top Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleExitPress}
            style={styles.iconButton}
            accessibilityLabel="Exit quest"
            accessibilityRole="button"
          >
            <IconX color={colors.text} size={22} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {quest.title}
            </Text>
            <View style={styles.headerBadgeRow}>
              <Badge label={`${quest.xp} XP`} variant="gold" />
              <Badge label={quest.sense} variant="primary" style={{ marginLeft: 6 }} />
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              if (nextMuted) {
                try {
                  Speech.stop();
                } catch (_) {}
              }
            }}
            style={styles.iconButton}
            accessibilityLabel={isMuted ? 'Unmute voice' : 'Mute voice'}
            accessibilityRole="button"
          >
            {isMuted ? (
              <IconVolumeX color={colors.textMuted} size={22} />
            ) : (
              <IconVolume2 color={colors.primary} size={22} />
            )}
          </TouchableOpacity>
        </View>

        {/* Moderate Safety Banner (non-blocking) */}
        {moderateAlert && (
          <View style={[styles.moderateBanner, { backgroundColor: colors.surface, borderColor: colors.warning }]}>
            <IconHeart color={colors.warning} size={18} style={{ marginRight: 8 }} />
            <Text style={[styles.moderateText, { color: colors.text }]}>
              Notice any heavy emotions? Take all the time you need.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/voice')}
              style={[styles.moderateAction, { backgroundColor: colors.warningLight }]}
            >
              <IconWind color={colors.warning} size={14} style={{ marginRight: 4 }} />
              <Text style={[styles.moderateActionText, { color: colors.warning }]}>Breathe</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* STAGE 1: ANSWERING */}
          {stage === 'answering' && (
            <View style={styles.contentContainer}>
              {/* Orb Mascot */}
              <View style={styles.orbWrapper}>
                <HavenlyOrb
                  size={120}
                  state={isListening ? 'listening' : 'idle'}
                  level={level}
                />
              </View>

              {/* Step Prompt Card */}
              <Card style={styles.promptCard} variant="subtle">
                <Text style={[styles.slotCounter, { color: colors.primary }]}>
                  Observation {currentSlotIndex + 1} of {quest.slots}
                </Text>
                <Text style={[styles.promptText, { color: colors.text }]}>
                  {currentSlotPrompt}
                </Text>
                {quest.helperHint ? (
                  <Text style={[styles.helperHint, { color: colors.textMuted }]}>
                    {quest.helperHint}
                  </Text>
                ) : null}

                <View style={styles.progressRow}>
                  <ProgressDots total={quest.slots} current={answers.length} />
                </View>
              </Card>

              {/* Submitted Answer Chips */}
              {answers.length > 0 && (
                <View style={styles.chipsSection}>
                  <Text style={[styles.chipsHeading, { color: colors.textMuted }]}>
                    Grounding observations:
                  </Text>
                  <View style={styles.chipsWrap}>
                    {answers.map((ans, idx) => (
                      <Chip
                        key={idx}
                        label={`${idx + 1}. ${ans}`}
                        variant="default"
                        size="small"
                        style={styles.answerChip}
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* STAGE 2: THINKING (Waiting for Haven) */}
          {stage === 'thinking' && (
            <View style={styles.thinkingContainer}>
              <HavenlyOrb size={130} state="thinking" level={level} />
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ marginTop: 20, marginBottom: 8 }}
              />
              <Text style={[styles.thinkingText, { color: colors.textMuted }]}>
                Haven is reflecting with you...
              </Text>
            </View>
          )}

          {/* STAGE 3: FOLLOW-UP QUESTION */}
          {stage === 'followup' && (
            <View style={styles.contentContainer}>
              <View style={styles.orbWrapper}>
                <HavenlyOrb size={120} state="speaking" level={level} />
              </View>

              <Card style={styles.havenSpeechBubble} variant="elevated">
                <View style={styles.havenHeader}>
                  <IconSparkles color={colors.primary} size={16} style={{ marginRight: 6 }} />
                  <Text style={[styles.havenName, { color: colors.primary }]}>Haven</Text>
                </View>
                <Text style={[styles.havenBubbleText, { color: colors.text }]}>
                  {aiFollowUp}
                </Text>
              </Card>

              <Text style={[styles.followUpHint, { color: colors.textMuted }]}>
                Share a thought or skip freely — you can proceed either way.
              </Text>
            </View>
          )}

          {/* STAGE 4: CLOSING TURN */}
          {stage === 'closing' && (
            <View style={styles.contentContainer}>
              <View style={styles.orbWrapper}>
                <HavenlyOrb size={120} state="speaking" level={level} />
              </View>

              <Card style={styles.havenSpeechBubble} variant="elevated">
                <View style={styles.havenHeader}>
                  <IconSparkles color={colors.primary} size={16} style={{ marginRight: 6 }} />
                  <Text style={[styles.havenName, { color: colors.primary }]}>Haven</Text>
                </View>
                {isGeneratingAi ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
                ) : (
                  <Text style={[styles.havenBubbleText, { color: colors.text }]}>
                    {aiClosing}
                  </Text>
                )}
              </Card>

              {!isGeneratingAi && (
                <Button
                  title="Complete Quest"
                  onPress={handleFinishQuest}
                  variant="primary"
                  size="large"
                  style={{ marginTop: 24 }}
                />
              )}
            </View>
          )}

          {/* STAGE 5: CELEBRATION / COMPLETION SCREEN */}
          {stage === 'completed' && (
            <View style={styles.completionContainer}>
              <HavenlyOrb size={140} state="celebrate" level={completionResults?.level || level} />

              <Text style={[styles.completionTitle, { color: colors.text }]}>
                Grounding Complete
              </Text>
              <Text style={[styles.completionSubtitle, { color: colors.textMuted }]}>
                You anchored your senses in the present moment. That takes real care.
              </Text>

              {/* Rewards Summary Card */}
              <Card style={styles.rewardsCard} variant="elevated">
                <View style={styles.rewardRow}>
                  {/* XP Gained */}
                  <View style={styles.rewardItem}>
                    <Text style={[styles.rewardValue, { color: colors.xpGold }]}>
                      +{completionResults?.xpGained || quest.xp}
                    </Text>
                    <Text style={[styles.rewardLabel, { color: colors.textMuted }]}>XP Gained</Text>
                  </View>

                  <View style={[styles.rewardDivider, { backgroundColor: colors.border }]} />

                  {/* Day Streak */}
                  <View style={styles.rewardItem}>
                    <View style={styles.streakValueRow}>
                      <IconFlame color={colors.streak} size={18} style={{ marginRight: 4 }} />
                      <Text style={[styles.rewardValue, { color: colors.streak }]}>
                        {completionResults?.streak || streak}
                      </Text>
                    </View>
                    <Text style={[styles.rewardLabel, { color: colors.textMuted }]}>Day Streak</Text>
                  </View>

                  <View style={[styles.rewardDivider, { backgroundColor: colors.border }]} />

                  {/* Current Level Ring */}
                  <View style={styles.rewardItem}>
                    <ProgressRing
                      progress={levelProgressRatio}
                      size={44}
                      strokeWidth={4}
                      label={`L${currentLevel}`}
                    />
                    <Text style={[styles.rewardLabel, { color: colors.textMuted, marginTop: 4 }]}>
                      Level {currentLevel}
                    </Text>
                  </View>
                </View>
              </Card>

              {/* Newly Unlocked Badges */}
              {unlockedBadgesList.length > 0 && (
                <View style={styles.newBadgesSection}>
                  <Text style={[styles.newBadgesHeading, { color: colors.text }]}>
                    New Badge Unlocked! 🎉
                  </Text>
                  {unlockedBadgesList.map((badge) => (
                    <Card key={badge.id} style={styles.newBadgeCard} variant="subtle">
                      <Text style={styles.newBadgeIcon}>{badge.icon}</Text>
                      <View style={styles.newBadgeContent}>
                        <Text style={[styles.newBadgeTitle, { color: colors.text }]}>
                          {badge.name}
                        </Text>
                        <Text style={[styles.newBadgeDesc, { color: colors.textMuted }]}>
                          {badge.description}
                        </Text>
                      </View>
                    </Card>
                  ))}
                </View>
              )}

              {/* Completion Actions */}
              <View style={styles.completionActions}>
                <Button
                  title="Done"
                  onPress={() => (onExit ? onExit() : router.replace('/(tabs)'))}
                  variant="primary"
                  size="large"
                  style={styles.doneBtn}
                />
                <Button
                  title="Take Another Quest"
                  onPress={() => {
                    const { moreQuests } = getAvailableQuests();
                    if (moreQuests.length > 0) {
                      const next = moreQuests[0];
                      router.replace(`/quest/${next.id}` as any);
                    } else {
                      router.replace('/(tabs)');
                    }
                  }}
                  variant="secondary"
                  size="medium"
                  style={styles.nextQuestBtn}
                />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Bar (During Answering & Followup) */}
        {(stage === 'answering' || stage === 'followup') && (
          <View
            style={[
              styles.inputBar,
              { backgroundColor: colors.surface, borderTopColor: colors.border },
            ]}
          >
            {/* Skip button for follow-up */}
            {stage === 'followup' && (
              <TouchableOpacity
                onPress={handleFinishQuest}
                style={[styles.skipBtn, { backgroundColor: colors.secondary }]}
                accessibilityRole="button"
                accessibilityLabel="Skip follow-up"
              >
                <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>Skip</Text>
              </TouchableOpacity>
            )}

            {/* Mic Toggle Button */}
            <TouchableOpacity
              onPress={toggleListening}
              style={[
                styles.micBtn,
                {
                  backgroundColor: isListening
                    ? colors.error
                    : isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : colors.secondary,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? (
                <IconMicOff color="#FFFFFF" size={20} />
              ) : (
                <IconMic color={colors.primary} size={20} />
              )}
            </TouchableOpacity>

            {/* Text Input */}
            <TextInput
              ref={inputRef}
              style={[
                styles.textInput,
                {
                  backgroundColor: isDark ? '#27272A' : '#F3F4F6',
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder={
                isListening
                  ? 'Listening to your voice...'
                  : stage === 'followup'
                  ? 'Reply to Haven (or tap Skip)...'
                  : 'Type what you notice...'
              }
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={stage === 'answering' ? handleSubmitAnswer : handleFollowUpReplySubmit}
              returnKeyType="done"
              editable={!isGeneratingAi}
            />

            {/* Submit Arrow Button */}
            <TouchableOpacity
              onPress={stage === 'answering' ? handleSubmitAnswer : handleFollowUpReplySubmit}
              disabled={!inputText.trim()}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: inputText.trim() ? colors.primary : colors.secondary,
                  opacity: inputText.trim() ? 1 : 0.5,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Submit response"
            >
              <IconArrowRight
                color={inputText.trim() ? '#FFFFFF' : colors.textMuted}
                size={20}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Safe Exit Confirmation Modal */}
        <ConfirmationModal
          visible={exitModalVisible}
          title="Pause Quest?"
          message="Your calm is what matters most. You can return to grounding whenever you're ready — no pressure at all."
          confirmLabel="Leave for Now"
          cancelLabel="Keep Going"
          onConfirm={confirmExit}
          onCancel={() => setExitModalVisible(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: LAYOUT.spacing.sm,
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 16,
    fontWeight: '700',
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  iconButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moderateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: LAYOUT.spacing.sm,
    marginHorizontal: LAYOUT.spacing.md,
    marginTop: LAYOUT.spacing.sm,
    borderRadius: LAYOUT.borderRadius.medium,
    borderWidth: 1,
  },
  moderateText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  moderateAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: LAYOUT.borderRadius.full,
    marginLeft: 8,
  },
  moderateActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: LAYOUT.spacing.lg,
    paddingVertical: LAYOUT.spacing.md,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
  },
  orbWrapper: {
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptCard: {
    width: '100%',
    alignItems: 'center',
    padding: LAYOUT.spacing.lg,
    marginVertical: LAYOUT.spacing.sm,
  },
  slotCounter: {
    ...TYPOGRAPHY.captionSmall,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  promptText: {
    ...TYPOGRAPHY.h2,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 6,
  },
  helperHint: {
    ...TYPOGRAPHY.bodySmall,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  progressRow: {
    marginTop: 8,
  },
  chipsSection: {
    width: '100%',
    marginTop: LAYOUT.spacing.md,
  },
  chipsHeading: {
    ...TYPOGRAPHY.captionSmall,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  answerChip: {
    marginBottom: 4,
  },
  thinkingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  thinkingText: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
  },
  havenSpeechBubble: {
    width: '100%',
    padding: LAYOUT.spacing.lg,
    marginVertical: LAYOUT.spacing.md,
  },
  havenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  havenName: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
    fontWeight: '700',
  },
  havenBubbleText: {
    ...TYPOGRAPHY.body,
    fontSize: 16,
    lineHeight: 24,
  },
  followUpHint: {
    ...TYPOGRAPHY.captionSmall,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  completionContainer: {
    alignItems: 'center',
    paddingVertical: LAYOUT.spacing.lg,
  },
  completionTitle: {
    ...TYPOGRAPHY.h1,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 6,
    textAlign: 'center',
  },
  completionSubtitle: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: LAYOUT.spacing.lg,
  },
  rewardsCard: {
    width: '100%',
    paddingVertical: LAYOUT.spacing.lg,
    paddingHorizontal: LAYOUT.spacing.md,
    marginBottom: LAYOUT.spacing.lg,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  rewardItem: {
    alignItems: 'center',
    flex: 1,
  },
  rewardValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  streakValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardLabel: {
    ...TYPOGRAPHY.captionSmall,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  rewardDivider: {
    width: 1,
    height: 36,
  },
  newBadgesSection: {
    width: '100%',
    marginBottom: LAYOUT.spacing.lg,
  },
  newBadgesHeading: {
    ...TYPOGRAPHY.h3,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  newBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: LAYOUT.spacing.md,
    marginBottom: 8,
  },
  newBadgeIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  newBadgeContent: {
    flex: 1,
  },
  newBadgeTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  newBadgeDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  completionActions: {
    width: '100%',
    gap: 12,
    marginTop: LAYOUT.spacing.sm,
  },
  doneBtn: {
    width: '100%',
  },
  nextQuestBtn: {
    width: '100%',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: LAYOUT.borderRadius.full,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: LAYOUT.borderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default QuestSession;
