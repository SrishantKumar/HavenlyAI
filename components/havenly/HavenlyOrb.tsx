import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Easing,
} from 'react-native';
import Svg, { Circle, Ellipse, Path, Defs, RadialGradient, Stop, LinearGradient } from 'react-native-svg';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  Easing as ReanimatedEasing,
} from 'react-native-reanimated';
import { useAppStore } from '../../store/useAppStore';
import { useQuestStore } from '../../store/useQuestStore';
import { OrbState, OrbThemeId } from '../../types';

interface HavenlyOrbProps {
  size?: number;
  state?: OrbState;
  themeId?: OrbThemeId;
  level?: number;
  onPress?: () => void;
}

interface ThemeConfig {
  breathDuration: number;
  bodyGrad: {
    stop0: string;
    stop30: string;
    stop70: string;
    stop100: string;
  };
  edgeGlow: string;
  plasma: {
    start: string;
    mid: string;
    end: string;
  };
  ring: {
    start: string;
    mid: string;
    end: string;
  };
  shadow: string;
}

const THEME_CONFIGS: Record<OrbThemeId, ThemeConfig> = {
  default: {
    breathDuration: 1800,
    bodyGrad: {
      stop0: '#C084FC',
      stop30: '#818CF8',
      stop70: '#4338CA',
      stop100: '#1E1B4B',
    },
    edgeGlow: '#A78BFA',
    plasma: { start: '#38BDF8', mid: '#A78BFA', end: '#F472B6' },
    ring: { start: '#38BDF8', mid: '#A78BFA', end: '#C084FC' },
    shadow: '#6D28D9',
  },
  aurora: {
    breathDuration: 2250,
    bodyGrad: {
      stop0: '#5EEAD4',
      stop30: '#2DD4BF',
      stop70: '#0F766E',
      stop100: '#042F2E',
    },
    edgeGlow: '#2DD4BF',
    plasma: { start: '#99F6E4', mid: '#2DD4BF', end: '#10B981' },
    ring: { start: '#5EEAD4', mid: '#2DD4BF', end: '#14B8A6' },
    shadow: '#0F766E',
  },
  deep_ocean: {
    breathDuration: 2750,
    bodyGrad: {
      stop0: '#38BDF8',
      stop30: '#0284C7',
      stop70: '#075985',
      stop100: '#082F49',
    },
    edgeGlow: '#38BDF8',
    plasma: { start: '#7DD3FC', mid: '#0284C7', end: '#1E3A8A' },
    ring: { start: '#38BDF8', mid: '#0284C7', end: '#0369A1' },
    shadow: '#075985',
  },
  ember: {
    breathDuration: 2000,
    bodyGrad: {
      stop0: '#FDBA74',
      stop30: '#FB923C',
      stop70: '#C2410C',
      stop100: '#431407',
    },
    edgeGlow: '#FB923C',
    plasma: { start: '#FED7AA', mid: '#F97316', end: '#E11D48' },
    ring: { start: '#FDBA74', mid: '#FB923C', end: '#EA580C' },
    shadow: '#9A3412',
  },
};

// All available orbital bubbles across level tiers
const ALL_BUBBLES = [
  { dx: -70, dy: -60, r: 8, delay: 0 },
  { dx: 72, dy: -50, r: 7, delay: 400 },
  { dx: -80, dy: 20, r: 6, delay: 800 },
  { dx: 75, dy: 30, r: 9, delay: 200 },
  { dx: -50, dy: -80, r: 5, delay: 600 },
  { dx: 55, dy: -80, r: 6, delay: 1000 },
  // Level 3+ extra particles
  { dx: -35, dy: 65, r: 5, delay: 350 },
  { dx: 40, dy: 65, r: 6, delay: 750 },
  // Level 5+ extra particles
  { dx: -85, dy: -25, r: 4, delay: 150 },
  { dx: 85, dy: -15, r: 5, delay: 500 },
  // Level 8+ celestial particles
  { dx: 0, dy: -95, r: 4, delay: 900 },
  { dx: 0, dy: 85, r: 5, delay: 250 },
];

// Ring color configurations evolved by level milestones
function getLevelRingColors(level: number, defaultColors: { start: string; mid: string; end: string }) {
  if (level >= 8) {
    // Level 8+: Celestial Starfire (Blue -> Violet -> Gold)
    return { start: '#60A5FA', mid: '#E879F9', end: '#FDE047' };
  }
  if (level >= 5) {
    // Level 5+: Royal Violet & Sunset Amber
    return { start: '#F59E0B', mid: '#EC4899', end: '#8B5CF6' };
  }
  if (level >= 3) {
    // Level 3+: Luminous Aurora Teal & Emerald
    return { start: '#34D399', mid: '#2DD4BF', end: '#5EEAD4' };
  }
  return defaultColors;
}

export const HavenlyOrb: React.FC<HavenlyOrbProps> = ({
  size = 140,
  state: propState,
  themeId: propThemeId,
  level: propLevel,
  onPress,
}) => {
  const storeOrbState = useAppStore((s) => s.orbState);
  const behavioralTasksCompleted = useAppStore((s) => s.behavioralTasksCompleted || 0);
  const questStoreLevel = useQuestStore((s) => s.level);
  
  const effectiveLevel = propLevel ?? questStoreLevel ?? 1;
  const orbState = propState || storeOrbState;

  // Somatic theme unlock
  const activeThemeId: OrbThemeId =
    propThemeId ||
    (behavioralTasksCompleted >= 6
      ? 'deep_ocean'
      : behavioralTasksCompleted >= 3
      ? 'aurora'
      : 'default');

  const themeConfig = THEME_CONFIGS[activeThemeId] || THEME_CONFIGS.default;
  const ringColors = getLevelRingColors(effectiveLevel, themeConfig.ring);

  // Determine active particle count based on level
  const particleCount = effectiveLevel >= 8 ? 12 : effectiveLevel >= 5 ? 10 : effectiveLevel >= 3 ? 8 : 6;
  const activeBubbles = ALL_BUBBLES.slice(0, particleCount);

  // ── Animated Values ──────────────────────────────────────────────────────
  const floatAnim = useRef(new Animated.Value(0)).current;
  const breathAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringRotate = useRef(new Animated.Value(0)).current;
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const squishAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  const bubbleAnims = useRef(ALL_BUBBLES.map(() => new Animated.Value(0))).current;

  // ── Reanimated values for Celebration Burst ───────────────────────────────
  const celebrateScale = useSharedValue(1);
  const celebrateBurst = useSharedValue(0);
  const celebrateOpacity = useSharedValue(0);

  // Trigger celebration on state === 'celebrate'
  useEffect(() => {
    if (orbState === 'celebrate') {
      celebrateScale.value = withSequence(
        withSpring(1.24, { damping: 5, stiffness: 200 }),
        withSpring(1.0, { damping: 8, stiffness: 120 })
      );
      celebrateOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 900, easing: ReanimatedEasing.out(ReanimatedEasing.ease) })
      );
      celebrateBurst.value = 0;
      celebrateBurst.value = withTiming(1, {
        duration: 900,
        easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
      });
    }
  }, [orbState, celebrateScale, celebrateBurst, celebrateOpacity]);

  const celebrateBurstStyle = useAnimatedStyle(() => {
    return {
      opacity: celebrateOpacity.value,
      transform: [{ scale: 0.8 + celebrateBurst.value * 0.7 }],
    };
  });

  const celebrateRootStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: celebrateScale.value }],
    };
  });

  // ── Core Animation Loop ──────────────────────────────────────────────────
  useEffect(() => {
    const anims: Animated.CompositeAnimation[] = [];

    // Float loop
    anims.push(
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -10,
            duration: 2200,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
          Animated.timing(floatAnim, {
            toValue: 10,
            duration: 2200,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
        ])
      )
    );

    // Ring spin (slightly faster at higher levels)
    const ringSpeed = Math.max(3800, 6000 - (effectiveLevel - 1) * 200);
    anims.push(
      Animated.loop(
        Animated.timing(ringRotate, {
          toValue: 1,
          duration: ringSpeed,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      )
    );

    // Aura pulse
    anims.push(
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.35, duration: 1800, useNativeDriver: true }),
        ])
      )
    );

    // Blink loop
    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(3500),
        Animated.timing(blinkAnim, { toValue: 0.05, duration: 80, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 0.05, duration: 80, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ])
    );
    anims.push(blinkLoop);

    // Breathing rhythm
    if (orbState === 'idle' || orbState === 'listening' || orbState === 'celebrate') {
      anims.push(
        Animated.loop(
          Animated.sequence([
            Animated.timing(breathAnim, {
              toValue: 1.06,
              duration: themeConfig.breathDuration,
              useNativeDriver: true,
            }),
            Animated.timing(breathAnim, {
              toValue: 0.96,
              duration: themeConfig.breathDuration,
              useNativeDriver: true,
            }),
          ])
        )
      );
    }

    // Speaking rhythm
    if (orbState === 'speaking') {
      anims.push(
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.14, duration: 160, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 0.92, duration: 200, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1.08, duration: 180, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1.0, duration: 180, useNativeDriver: true }),
          ])
        )
      );
    }

    // Thinking rhythm (gentle wobble)
    if (orbState === 'thinking') {
      anims.push(
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 0.94, duration: 600, useNativeDriver: true }),
          ])
        )
      );
    }

    // Floating bubbles
    activeBubbles.forEach((b, i) => {
      bubbleAnims[i].setValue(0);
      anims.push(
        Animated.loop(
          Animated.sequence([
            Animated.delay(b.delay),
            Animated.timing(bubbleAnims[i], {
              toValue: 1,
              duration: 3000 + i * 180,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.sin),
            }),
            Animated.timing(bubbleAnims[i], {
              toValue: 0,
              duration: 3000 + i * 180,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.sin),
            }),
          ])
        )
      );
    });

    anims.forEach((a) => a.start());
    return () => {
      anims.forEach((a) => a.stop());
    };
  }, [orbState, themeConfig.breathDuration, effectiveLevel]);

  // Tap squish
  const handlePress = useCallback(() => {
    squishAnim.setValue(1);
    Animated.sequence([
      Animated.timing(squishAnim, { toValue: 0.85, duration: 100, useNativeDriver: true }),
      Animated.spring(squishAnim, { toValue: 1.12, useNativeDriver: true, friction: 3 }),
      Animated.spring(squishAnim, { toValue: 1.0, useNativeDriver: true, friction: 5 }),
    ]).start();
    onPress?.();
  }, [onPress, squishAnim]);

  const spin = ringRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const s = size;

  const combinedScale = Animated.multiply(
    orbState === 'speaking' || orbState === 'thinking' ? pulseAnim : breathAnim,
    squishAnim
  );

  return (
    <TouchableWithoutFeedback
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Havenly mascot, level ${effectiveLevel}`}
    >
      <Reanimated.View style={[styles.wrapper, { width: s * 2, height: s * 2 }, celebrateRootStyle]}>
        {/* Celebration Particle Burst Overlay */}
        <Reanimated.View
          style={[
            styles.celebrationOverlay,
            { width: s * 1.8, height: s * 1.8, left: s * 0.1, top: s * 0.1 },
            celebrateBurstStyle,
          ]}
          pointerEvents="none"
        >
          <Svg width={s * 1.8} height={s * 1.8} viewBox="0 0 200 200">
            {/* Radiant Sparkle Burst rays */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, idx) => {
              const rad = (deg * Math.PI) / 180;
              const x1 = 100 + Math.cos(rad) * 65;
              const y1 = 100 + Math.sin(rad) * 65;
              const x2 = 100 + Math.cos(rad) * 92;
              const y2 = 100 + Math.sin(rad) * 92;
              const starX = 100 + Math.cos(rad) * 96;
              const starY = 100 + Math.sin(rad) * 96;
              const starColor = idx % 2 === 0 ? '#FACC15' : '#C084FC';
              return (
                <React.Fragment key={deg}>
                  <Path
                    d={`M ${x1} ${y1} L ${x2} ${y2}`}
                    stroke={starColor}
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                  <Circle cx={starX} cy={starY} r="3" fill={starColor} />
                </React.Fragment>
              );
            })}
          </Svg>
        </Reanimated.View>

        {/* Orbiting particles (bubbles) */}
        {activeBubbles.map((b, i) => {
          const floatY = bubbleAnims[i].interpolate({
            inputRange: [0, 1],
            outputRange: [0, -12],
          });
          const bubbleColor =
            effectiveLevel >= 8
              ? 'rgba(192, 132, 252, 0.65)'
              : effectiveLevel >= 5
              ? 'rgba(251, 191, 36, 0.55)'
              : 'rgba(167, 139, 250, 0.45)';

          return (
            <Animated.View
              key={i}
              style={[
                styles.bubble,
                {
                  width: b.r * 2,
                  height: b.r * 2,
                  borderRadius: b.r,
                  left: s + b.dx - b.r,
                  top: s + b.dy - b.r,
                  backgroundColor: bubbleColor,
                  transform: [{ translateY: floatY }],
                },
              ]}
            />
          );
        })}

        {/* Shadow underneath */}
        <Animated.View
          style={[
            styles.shadow,
            {
              width: s * 0.75,
              bottom: s * 0.08,
              left: s - (s * 0.75) / 2,
              backgroundColor: themeConfig.shadow,
              opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.35] }),
            },
          ]}
        />

        {/* Main mascot body */}
        <Animated.View
          style={[
            styles.mascotRoot,
            {
              width: s,
              height: s,
              left: s / 2,
              top: s / 2,
              transform: [{ translateY: floatAnim }, { scale: combinedScale }],
            },
          ]}
        >
          <Svg width={s} height={s} viewBox="0 0 200 200">
            <Defs>
              <RadialGradient id="bodyGrad" cx="35%" cy="30%" r="75%">
                <Stop offset="0%" stopColor={themeConfig.bodyGrad.stop0} stopOpacity="1" />
                <Stop offset="30%" stopColor={themeConfig.bodyGrad.stop30} stopOpacity="0.9" />
                <Stop offset="70%" stopColor={themeConfig.bodyGrad.stop70} stopOpacity="1" />
                <Stop offset="100%" stopColor={themeConfig.bodyGrad.stop100} stopOpacity="1" />
              </RadialGradient>

              <RadialGradient id="edgeGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="80%" stopColor="#FFFFFF" stopOpacity="0" />
                <Stop offset="98%" stopColor={themeConfig.edgeGlow} stopOpacity="0.4" />
                <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.6" />
              </RadialGradient>

              <LinearGradient id="glassTop" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
                <Stop offset="40%" stopColor="#FFFFFF" stopOpacity="0" />
              </LinearGradient>

              <LinearGradient id="glassBottom" x1="0%" y1="100%" x2="0%" y2="0%">
                <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.5" />
                <Stop offset="40%" stopColor="#38BDF8" stopOpacity="0" />
              </LinearGradient>

              <LinearGradient id="plasmaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={themeConfig.plasma.start} stopOpacity="0.8" />
                <Stop offset="50%" stopColor={themeConfig.plasma.mid} stopOpacity="0.9" />
                <Stop offset="100%" stopColor={themeConfig.plasma.end} stopOpacity="0.6" />
              </LinearGradient>

              <RadialGradient id="blushGrad" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#F472B6" stopOpacity="0.8" />
                <Stop offset="100%" stopColor="#F472B6" stopOpacity="0" />
              </RadialGradient>
            </Defs>

            {/* Main body sphere */}
            <Circle cx="100" cy="100" r="92" fill="url(#bodyGrad)" />
            {/* Inner edge glow */}
            <Circle cx="100" cy="100" r="92" fill="url(#edgeGlow)" />

            {/* Flowing plasma sash */}
            <Path
              d="M 8 115 Q 50 85, 100 110 Q 150 135, 192 105 L 192 135 Q 150 165, 100 140 Q 50 115, 8 145 Z"
              fill="url(#plasmaGrad)"
              opacity="0.85"
            />

            {/* Glassy reflections */}
            <Ellipse cx="100" cy="45" rx="70" ry="25" fill="url(#glassTop)" />
            <Ellipse cx="100" cy="165" rx="75" ry="25" fill="url(#glassBottom)" />

            {/* Blush cheeks */}
            <Ellipse cx="65" cy="130" rx="18" ry="12" fill="url(#blushGrad)" />
            <Ellipse cx="135" cy="130" rx="18" ry="12" fill="url(#blushGrad)" />

            {/* Eyes */}
            <Path
              d="M 68 100 Q 75 88, 82 100"
              stroke="#FFFFFF"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M 118 100 Q 125 88, 132 100"
              stroke="#FFFFFF"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />

            {/* Smile (broadens into happy grin during celebrate) */}
            {orbState === 'celebrate' ? (
              <Path
                d="M 78 116 Q 100 145, 122 116"
                stroke="#FFFFFF"
                strokeWidth="6.5"
                strokeLinecap="round"
                fill="none"
              />
            ) : (
              <Path
                d="M 82 120 Q 100 138, 118 120"
                stroke="#FFFFFF"
                strokeWidth="5.5"
                strokeLinecap="round"
                fill="none"
              />
            )}

            {/* Sparkles */}
            <Path
              d="M 130 55 L 132 48 L 134 55 L 141 57 L 134 59 L 132 66 L 130 59 L 123 57 Z"
              fill="#FFFFFF"
              opacity="0.9"
            />
            <Circle cx="145" cy="45" r="3" fill="#A78BFA" opacity="0.8" />
            <Circle cx="118" cy="40" r="2" fill="#38BDF8" opacity="0.9" />

            {/* Level 5+ crown sparkle */}
            {effectiveLevel >= 5 ? (
              <Circle cx="100" cy="30" r="3" fill="#FACC15" opacity="0.9" />
            ) : null}
          </Svg>
        </Animated.View>

        {/* Orbital ring (Dynamic Level Colors) */}
        <Animated.View
          style={[
            styles.ring,
            {
              width: s * 1.45,
              height: s * 0.45,
              left: s - (s * 1.45) / 2,
              top: s - (s * 0.45) / 2,
              transform: [{ translateY: floatAnim }, { rotateX: '65deg' }, { rotate: spin }],
            },
          ]}
        >
          <Svg width="100%" height="100%" viewBox="0 0 290 90">
            <Defs>
              <LinearGradient id="ringG" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={ringColors.start} stopOpacity="0.85" />
                <Stop offset="30%" stopColor={ringColors.mid} stopOpacity="0.45" />
                <Stop offset="70%" stopColor={ringColors.end} stopOpacity="0.45" />
                <Stop offset="100%" stopColor={ringColors.start} stopOpacity="0.85" />
              </LinearGradient>
            </Defs>
            <Ellipse
              cx="145"
              cy="45"
              rx="140"
              ry="38"
              fill="none"
              stroke="url(#ringG)"
              strokeWidth={effectiveLevel >= 5 ? 7 : 6}
            />
            <Ellipse
              cx="145"
              cy="45"
              rx="140"
              ry="38"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.2"
              strokeOpacity="0.65"
            />
          </Svg>
        </Animated.View>

        {/* Listening ripple rings */}
        {orbState === 'listening' && (
          <>
            <Animated.View
              style={[
                styles.ripple,
                { width: s, height: s, borderRadius: s / 2, left: s / 2, top: s / 2 },
              ]}
            />
            <Animated.View
              style={[
                styles.ripple,
                styles.ripple2,
                { width: s, height: s, borderRadius: s / 2, left: s / 2, top: s / 2 },
              ]}
            />
          </>
        )}
      </Reanimated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignSelf: 'center',
  },
  celebrationOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  mascotRoot: {
    position: 'absolute',
  },
  ring: {
    position: 'absolute',
  },
  bubble: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(199,210,254,0.6)',
  },
  shadow: {
    position: 'absolute',
    height: 18,
    borderRadius: 50,
    backgroundColor: '#6D28D9',
  },
  ripple: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(124,58,237,0.4)',
    backgroundColor: 'transparent',
  },
  ripple2: {
    borderColor: 'rgba(6,182,212,0.3)',
  },
});

export default HavenlyOrb;
