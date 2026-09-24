import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { authService } from '../services/auth/authService';
import { COLORS } from '../constants/theme';
import SafetySupportCard from '../components/safety/SafetySupportCard';
import { notificationService } from '../services/notifications/notificationService';

function InitialLayout() {
  const { 
    isAuthenticated, 
    onboardingComplete, 
    isAuthLoading, 
    setAuth, 
    setAuthLoading,
    theme 
  } = useAppStore();
  const router = useRouter();
  const segments = useSegments();
  const colors = theme === 'dark' ? COLORS.dark : COLORS.light;
  
  const [appReady, setAppReady] = useState(false);

  // 1. Recover auth session on launch
  useEffect(() => {
    async function initSession() {
      try {
        await useAppStore.getState().initStore();
        const session = await authService.getCurrentSession();
        if (session) {
          setAuth(session.user, session.token);
        } else {
          setAuth(null, null);
        }
      } catch (e) {
        console.warn('Auth initialization error:', e);
        setAuth(null, null);
      } finally {
        setAuthLoading(false);
        setAppReady(true);
        // Initialize notifications in the background
        notificationService.init().catch(console.warn);
      }
    }
    initSession();
  }, []);

  // 2. Routing guards based on auth state
  useEffect(() => {
    if (!appReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!isAuthenticated) {
      // Redirect to welcome screen if not authenticated
      if (!inAuthGroup) {
        router.replace('/(auth)/welcome');
      }
    } else if (!onboardingComplete) {
      // Redirect to onboarding welcome if onboarding is incomplete
      if (!inOnboardingGroup) {
        router.replace('/(onboarding)/welcome');
      }
    } else {
      // Authenticated and Onboarding Complete -> go to Home Tab
      if (inAuthGroup || inOnboardingGroup || (segments.length as number) === 0) {
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, onboardingComplete, appReady, segments]);

  if (isAuthLoading || !appReady) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[conversationId]" options={{ headerShown: false }} />
        <Stack.Screen name="voice/session" options={{ headerShown: false, presentation: 'modal' }} />
        {/* Compat call stack redirecting to voice/session */}
        <Stack.Screen name="call/index" options={{ headerShown: false }} />
        <Stack.Screen name="call/status" options={{ headerShown: false }} />
        <Stack.Screen name="settings/index" options={{ headerShown: false }} />
      </Stack>
      <SafetySupportCard />
    </>
  );
}

export default function RootLayout() {
  const theme = useAppStore((state) => state.theme);
  const isDark = theme === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <InitialLayout />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
