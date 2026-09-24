import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import Button from './Button';

const IconAlertCircle = AlertCircle as any;

interface ErrorStateProps {
  title?: string;
  message?: string;
  buttonTitle?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong.',
  message = "We couldn't connect right now. Your thoughts aren't going anywhere.",
  buttonTitle = 'Try again',
  onRetry,
}) => {
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
        <IconAlertCircle color={colors.error} size={32} />
      </View>
      
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
      
      {onRetry && (
        <Button
          title={buttonTitle}
          onPress={onRetry}
          variant="primary"
          size="medium"
          style={styles.btn}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: LAYOUT.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.spacing.md,
  },
  title: {
    ...TYPOGRAPHY.h2,
    fontWeight: '600',
    marginBottom: LAYOUT.spacing.xs,
    textAlign: 'center',
  },
  message: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
    marginBottom: LAYOUT.spacing.lg,
  },
  btn: {
    alignSelf: 'auto',
    paddingHorizontal: 24,
  },
});
export default ErrorState;
