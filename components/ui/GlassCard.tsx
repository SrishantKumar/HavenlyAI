import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  interactive?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  interactive = false,
}) => {
  const themeMode = useAppStore((state) => state.theme);
  const isDark = themeMode === 'dark';
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(24, 24, 27, 0.65)' : 'rgba(255, 255, 255, 0.75)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.6)',
          shadowColor: colors.shadow,
        },
        style,
      ]}
    >
      <View style={[StyleSheet.absoluteFill, styles.glowOverlay, { backgroundColor: isDark ? 'rgba(167, 139, 250, 0.03)' : 'rgba(99, 102, 241, 0.03)' }]} />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: LAYOUT.borderRadius.large,
    borderWidth: 1,
    padding: LAYOUT.spacing.lg, // increased padding for premium feel
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
    overflow: 'hidden', // to contain the glow overlay
  },
  glowOverlay: {
    borderRadius: LAYOUT.borderRadius.large,
  }
});
export default GlassCard;
