import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MessageSquareText } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import Button from './Button';

const IconMessageSquareText = MessageSquareText as any;

interface EmptyStateProps {
  title?: string;
  message?: string;
  buttonTitle?: string;
  onPress?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Nothing here yet.',
  message = "When you're ready, HavenlyAI is here to listen.",
  buttonTitle,
  onPress,
}) => {
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrapper, { backgroundColor: colors.secondary }]}>
        <IconMessageSquareText color={colors.primary} size={32} />
      </View>
      
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
      
      {buttonTitle && onPress && (
        <Button
          title={buttonTitle}
          onPress={onPress}
          variant="secondary"
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
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 240,
    marginBottom: LAYOUT.spacing.lg,
  },
  btn: {
    alignSelf: 'auto',
    paddingHorizontal: 20,
  },
});
export default EmptyState;
