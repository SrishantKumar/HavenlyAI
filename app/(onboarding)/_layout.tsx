import React from 'react';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="text-chat" />
      <Stack.Screen name="voice" />
      <Stack.Screen name="realtime-voice" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="safety" />
    </Stack>
  );
}
