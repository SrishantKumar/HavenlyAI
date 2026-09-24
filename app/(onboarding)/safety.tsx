import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { HeartHandshake } from 'lucide-react-native';
const IconHeartHandshake = HeartHandshake as any;

import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import OnboardingShell from '../../components/onboarding/OnboardingShell';

export default function OnboardingSafety() {
  const router = useRouter();
  const { setOnboardingComplete } = useAppStore();
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  const handleFinish = () => {
    // Persist completed onboarding state and redirect to index (Tabs)
    setOnboardingComplete(true);
    router.replace('/(tabs)');
  };

  return (
    <OnboardingShell
      step={6}
      title="HavenlyAI cares about your safety."
      description="HavenlyAI can listen, support, and help you reflect, but it is not a clinical replacement for professional medical care. If you're in immediate danger, please contact local emergency hotlines or a trusted person."
      onContinue={handleFinish}
      continueLabel="Enter HavenlyAI"
    >
      <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <IconHeartHandshake color={colors.error} size={54} />
        <Text style={[styles.disclaimerTitle, { color: colors.text }]}>Safe Companion</Text>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 150,
    height: 150,
    borderRadius: LAYOUT.borderRadius.large,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.spacing.md,
    shadowColor: 'rgba(0,0,0,0.02)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 3,
  },
  disclaimerTitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 14,
    fontWeight: '700',
    marginTop: LAYOUT.spacing.sm,
    textAlign: 'center',
  },
});
