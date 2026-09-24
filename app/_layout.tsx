import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform, useWindowDimensions } from 'react-native';
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

function MobileShell({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((state) => state.theme);
  const isDark = theme === 'dark';
  const colors = isDark ? COLORS.dark : COLORS.light;
  const { width } = useWindowDimensions();

  // Inject web reset styles and ensure favicon & title are set to HavenlyAI logo
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'HavenlyAI';

      let iconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
      if (!iconLink) {
        iconLink = document.createElement('link');
        iconLink.rel = 'shortcut icon';
        document.head.appendChild(iconLink);
      }
      iconLink.type = 'image/png';
      iconLink.href = '/favicon.png';

      let appleIconLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null;
      if (!appleIconLink) {
        appleIconLink = document.createElement('link');
        appleIconLink.rel = 'apple-touch-icon';
        document.head.appendChild(appleIconLink);
      }
      appleIconLink.href = '/favicon.png';

      const styleId = 'havenly-web-mobile-styles';
      let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = `
        html, body, #root {
          height: 100%;
          height: 100dvh;
          width: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
          background-color: ${colors.background};
        }
        * {
          box-sizing: border-box;
        }
      `;
    }
  }, [colors.background]);

  const isDesktopWeb = Platform.OS === 'web' && width > 480;

  if (!isDesktopWeb) {
    return <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>{children}</View>;
  }

  return (
    <View style={[styles.webBackdrop, { backgroundColor: colors.background }]}>
      <View style={[styles.cleanMobileContainer, { backgroundColor: colors.background }]}>
        {children}
      </View>
    </View>
  );
}

export default function RootLayout() {
  const theme = useAppStore((state) => state.theme);
  const isDark = theme === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <MobileShell>
        <InitialLayout />
      </MobileShell>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  webBackdrop: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cleanMobileContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    height: '100%',
    overflow: 'hidden',
  },
});
