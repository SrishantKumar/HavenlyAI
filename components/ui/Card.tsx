import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'elevated' | 'outlined' | 'subtle';
  padding?: keyof typeof LAYOUT.spacing;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'elevated',
  padding = 'md',
}) => {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'subtle':
        return {
          backgroundColor: colors.surfaceSubtle,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
        };
      case 'elevated':
      default:
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.4 : 0.08,
          shadowRadius: 12,
          elevation: 3,
        };
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          borderRadius: LAYOUT.borderRadius.large,
          padding: LAYOUT.spacing[padding],
        },
        getVariantStyles(),
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});

export default Card;

