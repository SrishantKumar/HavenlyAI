import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';

interface WaveformProps {
  isPlaying?: boolean;
  color?: string;
  barCount?: number;
  height?: number;
}

export const Waveform: React.FC<WaveformProps> = ({
  isPlaying = false,
  color,
  barCount = 15,
  height = 40,
}) => {
  const isDark = useAppStore((state) => state.theme === 'dark');
  const activeColor = color || (isDark ? COLORS.dark.primary : COLORS.light.primary);
  
  // Create an array of Animated values for each bar
  const animatedHeights = useRef<Animated.Value[]>(
    Array.from({ length: barCount }, () => new Animated.Value(0.2))
  ).current;

  useEffect(() => {
    let animations: Animated.CompositeAnimation[] = [];

    if (isPlaying) {
      // Loop pulse animation with staggered offsets
      animations = animatedHeights.map((anim, index) => {
        const duration = 600 + Math.random() * 800;
        const toValue = 0.4 + Math.random() * 0.6; // Scale of full height
        
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue,
              duration: duration / 2,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 0.2,
              duration: duration / 2,
              useNativeDriver: false,
            }),
          ])
        );
      });

      animations.forEach(anim => anim.start());
    } else {
      // Stop and reset to baseline heights
      animatedHeights.forEach((anim) => {
        Animated.spring(anim, {
          toValue: 0.15,
          useNativeDriver: false,
        }).start();
      });
    }

    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, [isPlaying]);

  return (
    <View style={[styles.container, { height }]}>
      {animatedHeights.map((anim, idx) => {
        const barHeight = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [2, height],
        });

        return (
          <Animated.View
            key={idx}
            style={[
              styles.bar,
              {
                height: barHeight,
                backgroundColor: activeColor,
                width: 3,
                marginHorizontal: 2,
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
    justifyContent: 'center',
  },
  bar: {
    borderRadius: 2,
  },
});
export default Waveform;
