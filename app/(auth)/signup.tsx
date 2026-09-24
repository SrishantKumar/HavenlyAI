import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react-native';
const IconEye = Eye as any;
const IconEyeOff = EyeOff as any;
const IconLock = Lock as any;
const IconMail = Mail as any;
const IconUser = User as any;

import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { authService } from '../../services/auth/authService';
import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';

export default function SignupScreen() {
  const router = useRouter();
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;
  const setAuth = useAppStore((state) => state.setAuth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    setError('');
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      setError('You must agree to the Terms and Privacy Policy.');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.signup(name, email, password);
      setAuth(response.user, response.token);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header title="Create Account" showBackButton />
      
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.formContainer}>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Step into your private sanctuary.
          </Text>

          {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}

          {/* Name input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Full Name</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <IconUser color={colors.textMuted} size={18} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Enter your name"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>

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
                placeholder="Create a password"
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

          {/* Confirm Password input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Confirm Password</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <IconLock color={colors.textMuted} size={18} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Confirm your password"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Terms checkbox */}
          <TouchableOpacity 
            style={styles.checkboxRow} 
            onPress={() => setAgreeTerms(!agreeTerms)}
            activeOpacity={0.8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreeTerms }}
          >
            <View 
              style={[
                styles.checkbox, 
                { 
                  borderColor: colors.primary,
                  backgroundColor: agreeTerms ? colors.primary : 'transparent'
                }
              ]}
            >
              {agreeTerms && <View style={styles.checkmark} />}
            </View>
            <Text style={[styles.checkboxLabel, { color: colors.textMuted }]}>
              I agree to the Terms and Privacy Policy.
            </Text>
          </TouchableOpacity>

          {/* Submit Action */}
          <Button
            title="Create Account"
            onPress={handleSignup}
            loading={loading}
            style={styles.signupBtn}
          />
        </View>

        {/* Toggle link */}
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>Log In</Text>
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: LAYOUT.spacing.md,
    paddingVertical: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    width: 8,
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  checkboxLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
    flex: 1,
  },
  signupBtn: {
    marginTop: LAYOUT.spacing.md,
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
