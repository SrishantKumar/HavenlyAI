import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shield } from 'lucide-react-native';
const IconShield = Shield as any;

import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import Button from '../../components/ui/Button';
import HavenlyOrb from '../../components/havenly/HavenlyOrb';

export default function WelcomeScreen() {
  const router = useRouter();
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Brand Header */}
        <View style={styles.header}>
          <Text style={[styles.brandName, { color: colors.primary }]}>HavenlyAI</Text>
        </View>

        {/* Ambient Sanctuary Visual */}
        <View style={styles.visualContainer}>
          <HavenlyOrb size={120} state="idle" />
          <View style={[styles.glowBackdrop, { backgroundColor: colors.orbGlow }]} />
        </View>

        {/* Headline and Tagline */}
        <View style={styles.textContainer}>
          <Text style={[styles.headline, { color: colors.text }]}>Welcome to HavenlyAI</Text>
          <Text style={[styles.tagline, { color: colors.textMuted }]}>
            A quiet place to let your thoughts out.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <Button
            title="Get Started"
            onPress={() => router.push('/(auth)/signup')}
            variant="primary"
            size="large"
            style={styles.primaryBtn}
          />
          <Button
            title="I already have an account"
            onPress={() => router.push('/(auth)/login')}
            variant="secondary"
            size="large"
          />
        </View>

        {/* Secure Note */}
        <View style={styles.footer}>
          <IconShield color={colors.textMuted} size={14} style={{ marginRight: 6 }} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Your conversations are private and secure.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: LAYOUT.spacing.lg,
    justifyContent: 'space-between',
    paddingVertical: LAYOUT.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: LAYOUT.spacing.md,
  },
  brandName: {
    ...TYPOGRAPHY.h2,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  visualContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: LAYOUT.spacing.xl,
    position: 'relative',
  },
  glowBackdrop: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.15,
    zIndex: -1,
  },
  textContainer: {
    alignItems: 'center',
    marginVertical: LAYOUT.spacing.md,
  },
  headline: {
    ...TYPOGRAPHY.hero,
    fontSize: 30,
    textAlign: 'center',
    marginBottom: LAYOUT.spacing.sm,
  },
  tagline: {
    ...TYPOGRAPHY.body,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 260,
  },
  actionContainer: {
    width: '100%',
  },
  primaryBtn: {
    marginBottom: LAYOUT.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: LAYOUT.spacing.md,
  },
  footerText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
  },
});
