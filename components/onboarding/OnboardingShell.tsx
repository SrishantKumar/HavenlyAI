import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import Button from '../ui/Button';
import OnboardingProgress from './OnboardingProgress';

interface OnboardingShellProps {
  step: number;
  title: string;
  description: string;
  children: React.ReactNode;
  onContinue: () => void;
  continueLabel?: string;
}

export const OnboardingShell: React.FC<OnboardingShellProps> = ({
  step,
  title,
  description,
  children,
  onContinue,
  continueLabel = 'Continue',
}) => {
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View style={styles.progressHeader}>
          <OnboardingProgress currentStep={step} />
        </View>

        <View style={styles.illustrationWrapper}>
          {children}
        </View>

        <View style={styles.textWrapper}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>
        </View>

        <View style={styles.footer}>
          <Button
            title={continueLabel}
            onPress={onContinue}
            variant="primary"
            size="large"
            style={styles.continueBtn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: LAYOUT.spacing.lg,
    justifyContent: 'space-between',
    paddingVertical: LAYOUT.spacing.md,
  },
  progressHeader: {
    alignItems: 'center',
    marginTop: LAYOUT.spacing.sm,
  },
  illustrationWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: LAYOUT.spacing.lg,
  },
  textWrapper: {
    alignItems: 'center',
    paddingHorizontal: LAYOUT.spacing.sm,
    marginBottom: LAYOUT.spacing.md,
  },
  title: {
    ...TYPOGRAPHY.h1,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: LAYOUT.spacing.sm,
  },
  description: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    width: '100%',
    paddingBottom: LAYOUT.spacing.md,
  },
  continueBtn: {
    width: '100%',
  },
});
export default OnboardingShell;
