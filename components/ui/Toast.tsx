import React, { useEffect, useRef } from 'react';
import { Text, Animated, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, TYPOGRAPHY, LAYOUT } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';

interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  visible,
  onHide,
  type = 'info',
  duration = 3000,
}) => {
  const isDark = useAppStore((state) => state.theme === 'dark');
  const colors = isDark ? COLORS.dark : COLORS.light;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.delay(duration),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onHide();
      });
    }
  }, [visible]);

  if (!visible) return null;

  const getBgColor = (): string => {
    if (type === 'success') return colors.success;
    if (type === 'error') return colors.error;
    return colors.primary;
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: getBgColor(),
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    padding: LAYOUT.spacing.md,
    borderRadius: LAYOUT.borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 999,
  },
  text: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
});
export default Toast;
