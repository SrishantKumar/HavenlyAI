import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';
const IconMail = Mail as any;

import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { authService } from '../../services/auth/authService';
import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    setError('');
    setSuccess(false);
    if (!email) {
      setError('Please enter your email.');
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError('Could not request password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header title="Reset Password" showBackButton />
      
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.formContainer}>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {!success 
              ? "We'll send a password recovery link to your inbox." 
              : "Check your email."}
          </Text>

          {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}

          {!success ? (
            <>
              {/* Email input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Email Address</Text>
                <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <IconMail color={colors.textMuted} size={18} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <Button
                title="Send Recovery Link"
                onPress={handleReset}
                loading={loading}
                style={styles.actionBtn}
              />
            </>
          ) : (
            <View style={styles.successWrapper}>
              <Text style={[styles.successText, { color: colors.text }]}>
                We've sent a link to <Text style={{ fontWeight: '700' }}>{email}</Text>. Please follow the instructions to restore your account.
              </Text>
              
              <Button
                title="Back to Log In"
                onPress={() => router.replace('/(auth)/login')}
                variant="primary"
                size="large"
                style={styles.successBtn}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: LAYOUT.spacing.lg,
    paddingTop: LAYOUT.spacing.md,
    paddingBottom: LAYOUT.spacing.xl,
  },
  formContainer: {
    flex: 1,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    marginBottom: LAYOUT.spacing.lg,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
    marginBottom: LAYOUT.spacing.md,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: LAYOUT.spacing.lg,
  },
  inputLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: LAYOUT.borderRadius.medium,
    paddingHorizontal: 12,
    height: 52,
  },
  inputIcon: {
    marginRight: LAYOUT.spacing.sm,
  },
  textInput: {
    flex: 1,
    height: '100%',
    ...TYPOGRAPHY.body,
    fontSize: 15,
  },
  actionBtn: {
    marginTop: LAYOUT.spacing.md,
  },
  successWrapper: {
    marginTop: LAYOUT.spacing.md,
  },
  successText: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: LAYOUT.spacing.xl,
  },
  successBtn: {
    width: '100%',
  },
});
