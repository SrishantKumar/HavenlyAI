import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';

interface OnboardingProgressProps {
  currentStep: number; // 1 to 6
  totalSteps?: number;
}

export const OnboardingProgress = ({
  currentStep,
  totalSteps = 6,
}: OnboardingProgressProps) => {
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;

  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }).map((_, idx) => {
        const stepNum = idx + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;

        return (
          <View
            key={idx}
            style={[
              styles.dot,
              {
                backgroundColor: isCompleted
                  ? colors.primary
                  : isActive
                  ? colors.primary
                  : colors.border,
                width: isActive ? 24 : 8,
                opacity: isActive ? 1 : isCompleted ? 0.6 : 0.3,
              },
            ] as any}
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
    justifyContent: 'center',
    height: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
  },
});
export default OnboardingProgress;
