import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';

interface ProgressDotsProps {
  total: number;
  current: number; // 0-indexed count of completed slots
  activeColor?: string;
  inactiveColor?: string;
  size?: number;
}

export const ProgressDots: React.FC<ProgressDotsProps> = ({
  total,
  current,
  activeColor,
  inactiveColor,
  size = 8,
}) => {
  const isDark = useAppStore((s) => s.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  const filledColor = activeColor || colors.primary;
  const emptyColor = inactiveColor || (isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.12)');

  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: current }}>
      {Array.from({ length: total }).map((_, i) => {
        const isFilled = i < current;
        const isCurrent = i === current;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: isCurrent ? size * 2.2 : size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: isFilled ? filledColor : isCurrent ? colors.accent : emptyColor,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    transitionProperty: 'width, background-color',
  } as any,
});

export default ProgressDots;

