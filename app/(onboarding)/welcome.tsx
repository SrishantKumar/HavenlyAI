import React from 'react';
import { useRouter } from 'expo-router';
import OnboardingShell from '../../components/onboarding/OnboardingShell';
import HavenlyOrb from '../../components/havenly/HavenlyOrb';

export default function OnboardingWelcome() {
  const router = useRouter();

  return (
    <OnboardingShell
      step={1}
      title="You can talk about anything."
      description="Your thoughts don't need to be organized or perfect. Just start where you are."
      onContinue={() => router.push('/(onboarding)/text-chat')}
    >
      {/* Breathy calm visual */}
      <HavenlyOrb size={130} state="idle" />
    </OnboardingShell>
  );
}
