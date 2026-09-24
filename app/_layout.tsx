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
  const { width, height } = useWindowDimensions();

  // Inject web reset styles for seamless mobile-in-desktop presentation
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
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
          width: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
          background-color: ${isDark ? '#070A12' : '#EFF2F7'};
        }
        * {
          box-sizing: border-box;
        }
      `;
    }
  }, [isDark]);

  const isDesktopWeb = Platform.OS === 'web' && width > 480;

  if (!isDesktopWeb) {
    return <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>{children}</View>;
  }

  // Adaptive dimensions for desktop screens
  const frameHeight = Math.min(Math.max(height * 0.94, 600), 880);
  const frameWidth = Math.min(420, width - 32);

  return (
    <View style={[styles.webBackdrop, { backgroundColor: isDark ? '#070A12' : '#EFF2F7' }]}>
      {/* Ambient background lighting */}
      <View 
        style={[
          styles.ambientGlow, 
          { 
            backgroundColor: isDark ? '#6366F1' : '#A5B4FC',
            opacity: isDark ? 0.08 : 0.12,
          }
        ]} 
      />

      {/* Realistic Mobile Device Mockup Frame */}
      <View 
        style={[
          styles.phoneFrame, 
          { 
            width: frameWidth,
            height: frameHeight,
            backgroundColor: colors.background,
            borderColor: isDark ? '#1E293B' : '#CBD5E1',
          }
        ]}
      >
        {/* Dynamic Island / Hardware Speaker Bezel */}
        <View style={[styles.phoneTopBezel, { backgroundColor: colors.background }]}>
          <View style={[styles.dynamicIsland, { backgroundColor: isDark ? '#000000' : '#18181B' }]}>
            <View style={styles.cameraLens} />
          </View>
        </View>

        {/* Mobile Viewport Screen */}
        <View style={styles.phoneScreen}>
          {children}
        </View>

        {/* Bottom Hardware Home Bar Indicator */}
        <View style={[styles.phoneBottomBezel, { backgroundColor: colors.background }]}>
          <View 
            style={[
              styles.homeIndicatorPill, 
              { backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.22)' }
            ]} 
          />
        </View>
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
    position: 'relative',
    overflow: 'hidden',
  },
  ambientGlow: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
    ...Platform.select({
      web: {
        filter: 'blur(100px)',
      },
    }),
  },
  phoneFrame: {
    borderRadius: 44,
    borderWidth: 8,
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    ...Platform.select({
      web: {
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 28,
        elevation: 16,
      },
    }),
  },
  phoneTopBezel: {
    height: 28,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  dynamicIsland: {
    width: 96,
    height: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 10,
  },
  cameraLens: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#374151',
  },
  phoneScreen: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  phoneBottomBezel: {
    height: 18,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  homeIndicatorPill: {
    width: 120,
    height: 4,
    borderRadius: 2,
  },
});
