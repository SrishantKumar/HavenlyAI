import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Activity, Sparkles, ArrowRight } from 'lucide-react-native';
const IconActivity = Activity as any;
const IconSparkles = Sparkles as any;
const IconArrowRight = ArrowRight as any;

import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import Button from '../../components/ui/Button';

interface Question {
  id: number;
  text: string;
  category: 'anxiety' | 'depression';
}

const PHQ4_QUESTIONS: Question[] = [
  { id: 1, text: 'Feeling nervous, anxious, or on edge', category: 'anxiety' },
  { id: 2, text: 'Not being able to stop or control worrying', category: 'anxiety' },
  { id: 3, text: 'Little interest or pleasure in doing things', category: 'depression' },
  { id: 4, text: 'Feeling down, depressed, or hopeless', category: 'depression' },
];

const OPTIONS = [
  { score: 0, label: 'Not at all' },
  { score: 1, label: 'Several days' },
  { score: 2, label: 'More than half the days' },
  { score: 3, label: 'Nearly every day' },
];

export default function AssessmentScreen() {
  const router = useRouter();
  const { setPhq4Baseline, setOnboardingComplete } = useAppStore();
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [answers, setAnswers] = useState<Record<number, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSelectScore = (questionId: number, score: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: score,
    }));
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const totalScore = Object.values(answers).reduce((acc, curr) => acc + curr, 0);
      await setPhq4Baseline(totalScore);
    } catch (e) {
      console.warn('Failed to save assessment baseline:', e);
    } finally {
      setOnboardingComplete(true);
      setSubmitting(false);
      router.replace('/(tabs)');
    }
  };

  const handleSkip = () => {
    // Acute panic / distress safeguard: allow immediate entry without cognitive barrier
    setOnboardingComplete(true);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={[styles.iconBadge, { backgroundColor: colors.secondary }]}>
            <IconActivity color={colors.primary} size={22} />
          </View>
          <TouchableOpacity
            onPress={handleSkip}
            style={[styles.skipBtn, { borderColor: colors.border }]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Skip assessment for now"
          >
            <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>Skip for Now</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Mindful Baseline (PHQ-4)</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Over the last 2 weeks, how often have you been bothered by the following?
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {PHQ4_QUESTIONS.map((q, index) => {
          const selected = answers[q.id];
          return (
            <View
              key={q.id}
              style={[
                styles.questionCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.questionHeader}>
                <Text style={[styles.questionIndex, { color: colors.primary }]}>
                  {index + 1} of 4
                </Text>
                <Text style={[styles.categoryBadge, { color: colors.textMuted }]}>
                  {q.category === 'anxiety' ? 'Grounding Context' : 'Energy Context'}
                </Text>
              </View>

              <Text style={[styles.questionText, { color: colors.text }]}>{q.text}</Text>

              <View style={styles.optionsGrid}>
                {OPTIONS.map((opt) => {
                  const isChosen = selected === opt.score;
                  return (
                    <TouchableOpacity
                      key={opt.score}
                      activeOpacity={0.7}
                      onPress={() => handleSelectScore(q.id, opt.score)}
                      style={[
                        styles.optionBtn,
                        {
                          backgroundColor: isChosen ? colors.primary : colors.surface,
                          borderColor: isChosen ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color: isChosen ? '#FFFFFF' : colors.text,
                            fontWeight: isChosen ? '700' : '500',
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={styles.disclaimerBox}>
          <IconSparkles color={colors.primary} size={16} style={{ marginRight: 6 }} />
          <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
            Non-Diagnostic: Used solely to tune Haven's emotional tone and somatic pacing.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Button
          title={submitting ? 'Saving...' : 'Complete & Enter Sanctuary'}
          onPress={handleComplete}
          variant="primary"
          size="large"
          disabled={submitting}
        />
        <TouchableOpacity onPress={handleSkip} style={styles.textSkipLink} activeOpacity={0.6}>
          <Text style={[styles.textSkipLinkText, { color: colors.textMuted }]}>
            In distress? Skip directly to Sanctuary
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: LAYOUT.spacing.lg,
    paddingTop: LAYOUT.spacing.md,
    paddingBottom: LAYOUT.spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.spacing.sm,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    ...TYPOGRAPHY.h2,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 14,
    lineHeight: 20,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.spacing.lg,
    paddingBottom: 24,
    paddingTop: 8,
  },
  questionCard: {
    borderRadius: LAYOUT.borderRadius.large,
    borderWidth: 1,
    padding: LAYOUT.spacing.md,
    marginBottom: LAYOUT.spacing.md,
    shadowColor: 'rgba(0,0,0,0.03)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 2,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  questionIndex: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: '500',
  },
  questionText: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 22,
  },
  optionsGrid: {
    gap: 8,
  },
  optionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: LAYOUT.borderRadius.medium,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 13,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: LAYOUT.borderRadius.medium,
    marginVertical: 8,
  },
  disclaimerText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: LAYOUT.spacing.lg,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  textSkipLink: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  textSkipLinkText: {
    fontSize: 13,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
