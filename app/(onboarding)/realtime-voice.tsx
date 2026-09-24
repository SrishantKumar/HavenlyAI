import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { PhoneCall, ShieldCheck } from 'lucide-react-native';
const IconPhoneCall = PhoneCall as any;
const IconShieldCheck = ShieldCheck as any;

import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import OnboardingShell from '../../components/onboarding/OnboardingShell';
import HavenlyOrb from '../../components/havenly/HavenlyOrb';

export default function OnboardingRealtimeVoice() {
  const router = useRouter();
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <OnboardingShell
      step={4}
      title="Real-time voice conversation."
      description="Need to hear a voice? Initiate continuous in-app reflections with HavenlyAI. Speak naturally and the AI responds back in real-time."
      onContinue={() => router.push('/(onboarding)/privacy')}
    >
      <View style={styles.container}>
        <HavenlyOrb size={100} state="speaking" />
        <View style={[styles.statusBadge, { backgroundColor: colors.primaryLight }]}>
          <IconPhoneCall color={colors.primary} size={14} style={{ marginRight: 6 }} />
          <Text style={[styles.statusText, { color: colors.primary }]}>Active Voice Session</Text>
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: LAYOUT.borderRadius.medium,
    marginTop: LAYOUT.spacing.lg,
  },
  statusText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    fontWeight: '700',
  },
});
