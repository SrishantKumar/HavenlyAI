import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheck, Lock } from 'lucide-react-native';
const IconShieldCheck = ShieldCheck as any;
const IconLock = Lock as any;

import { COLORS, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import OnboardingShell from '../../components/onboarding/OnboardingShell';

export default function OnboardingPrivacy() {
  const router = useRouter();
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <OnboardingShell
      step={5}
      title="Your space. Your thoughts."
      description="Your reflections are personal. HavenlyAI is designed with safety and data privacy in mind. Your conversations are handled securely and never sold."
      onContinue={() => router.push('/(onboarding)/safety')}
    >
      <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconRing, { backgroundColor: colors.primaryLight }]}>
          <IconLock color={colors.primary} size={40} />
        </View>
        <IconShieldCheck color={colors.cyanAccent} size={28} style={styles.badge} />
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 140,
    height: 140,
    borderRadius: LAYOUT.borderRadius.large,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: 'rgba(0,0,0,0.02)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 4,
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
  },
});
