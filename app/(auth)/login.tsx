import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
const IconEye = Eye as any;
const IconEyeOff = EyeOff as any;
const IconLock = Lock as any;
const IconMail = Mail as any;

import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { authService } from '../../services/auth/authService';
import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';

export default function LoginScreen() {
  const router = useRouter();
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;
  const setAuth = useAppStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login(email, password);
      setAuth(response.user, response.token);
    } catch (err: any) {
      setError(err.message || 'Log in failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await authService.login('sarah@havenly.ai', 'mock-password');
      setAuth(response.user, response.token);
    } catch (err: any) {
      setError('Google Log in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header title="Log In" showBackButton />
      
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.formContainer}>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Welcome back. Find your quiet space.
          </Text>

          {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}

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

          {/* Password input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Password</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <IconLock color={colors.textMuted} size={18} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Enter your password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                {showPassword ? <IconEyeOff color={colors.textMuted} size={18} /> : <IconEye color={colors.textMuted} size={18} />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity 
            style={styles.forgotBtn}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Submit Action */}
          <Button
            title="Log In"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginBtn}
          />

          <View style={styles.dividerRow}>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
            <Text style={[styles.orText, { color: colors.textMuted }]}>or</Text>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
          </View>

          {/* Google SSO Action */}
          <Button
            title="Continue with Google"
            onPress={handleGoogleLogin}
            variant="secondary"
            style={styles.googleBtn}
          />
        </View>

        {/* Footer Toggle */}
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/signup')}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>Create Account</Text>
          </TouchableOpacity>
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
    justifyContent: 'space-between',
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
    marginBottom: LAYOUT.spacing.md,
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
  eyeIcon: {
    padding: 4,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: LAYOUT.spacing.xl,
  },
  forgotText: {
    ...TYPOGRAPHY.caption,
    fontSize: 14,
    fontWeight: '600',
  },
  loginBtn: {
    marginBottom: LAYOUT.spacing.md,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: LAYOUT.spacing.md,
  },
  line: {
    flex: 1,
    height: 1,
  },
  orText: {
    ...TYPOGRAPHY.caption,
    fontSize: 14,
    marginHorizontal: LAYOUT.spacing.md,
  },
  googleBtn: {
    marginBottom: LAYOUT.spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: LAYOUT.spacing.lg,
  },
  footerText: {
    ...TYPOGRAPHY.caption,
    fontSize: 14,
  },
  footerLink: {
    ...TYPOGRAPHY.caption,
    fontSize: 14,
    fontWeight: '700',
  },
});
