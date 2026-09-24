import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Mic } from 'lucide-react-native';
const IconMic = Mic as any;

import { COLORS, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import OnboardingShell from '../../components/onboarding/OnboardingShell';
import Waveform from '../../components/ui/Waveform';

export default function OnboardingVoice() {
  const router = useRouter();
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <OnboardingShell
      step={3}
      title="Sometimes talking is easier."
      description="Record your thoughts instead of typing them. HavenlyAI can listen to your recordings and reply with voice."
      onContinue={() => router.push('/(onboarding)/realtime-voice')}
    >
      <View style={styles.container}>
        {/* Animated wave visual */}
        <Waveform isPlaying barCount={18} height={40} color={colors.primary} />
        
        {/* Glowing microphone layout */}
        <View style={[styles.micWrapper, { backgroundColor: colors.secondary }]}>
          <IconMic color={colors.primary} size={32} />
        </View>

        <Waveform isPlaying barCount={18} height={40} color={colors.primary} />
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  micWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: LAYOUT.spacing.lg,
    shadowColor: 'rgba(0,0,0,0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 3,
  },
});
