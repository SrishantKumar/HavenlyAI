import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';

interface BadgeProps {
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'gold' | 'success' | 'subtle' | 'locked';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  icon,
  variant = 'primary',
  style,
}) => {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  const getColors = () => {
    switch (variant) {
      case 'gold':
        return {
          bg: isDark ? 'rgba(251, 191, 36, 0.16)' : 'rgba(245, 158, 11, 0.14)',
          text: colors.xpGold,
          border: isDark ? 'rgba(251, 191, 36, 0.3)' : 'rgba(245, 158, 11, 0.25)',
        };
      case 'success':
        return {
          bg: colors.successLight,
          text: colors.success,
          border: 'transparent',
        };
      case 'locked':
        return {
          bg: isDark ? 'rgba(39, 39, 42, 0.6)' : 'rgba(229, 231, 235, 0.6)',
          text: colors.textMuted,
          border: 'transparent',
        };
      case 'subtle':
        return {
          bg: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
          text: colors.textMuted,
          border: 'transparent',
        };
      case 'primary':
      default:
        return {
          bg: isDark ? 'rgba(129, 140, 248, 0.18)' : 'rgba(99, 102, 241, 0.12)',
          text: colors.primary,
          border: isDark ? 'rgba(129, 140, 248, 0.3)' : 'rgba(99, 102, 241, 0.2)',
        };
    }
  };

  const c = getColors();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: c.bg,
          borderColor: c.border,
        },
        style,
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.text, { color: c.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: LAYOUT.borderRadius.small,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    ...TYPOGRAPHY.captionSmall,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default Badge;

