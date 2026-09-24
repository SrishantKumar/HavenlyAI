import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Easing,
} from 'react-native';
import Svg, { Circle, Ellipse, Path, Defs, RadialGradient, Stop, LinearGradient } from 'react-native-svg';
import { useAppStore } from '../../store/useAppStore';
import { OrbState } from '../../types';

interface HavenlyOrbProps {
  size?: number;
  state?: OrbState;
  onPress?: () => void;
}

// Floating bubble data (fixed positions relative to mascot center)
const BUBBLES = [
  { dx: -70, dy: -60, r: 9,  delay: 0 },
  { dx: 72,  dy: -50, r: 7,  delay: 400 },
  { dx: -80, dy: 20,  r: 6,  delay: 800 },
  { dx: 75,  dy: 30,  r: 10, delay: 200 },
  { dx: -50, dy: -80, r: 5,  delay: 600 },
  { dx: 55,  dy: -80, r: 6,  delay: 1000 },
];

export const HavenlyOrb: React.FC<HavenlyOrbProps> = ({ size = 140, state: propState, onPress }) => {
  const storeOrbState = useAppStore((s) => s.orbState);
  const orbState = propState || storeOrbState;

  // ── Core animations ──────────────────────────────────────────────────────
  const floatAnim   = useRef(new Animated.Value(0)).current;
  const breathAnim  = useRef(new Animated.Value(1)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const ringRotate  = useRef(new Animated.Value(0)).current;
  const blinkAnim   = useRef(new Animated.Value(1)).current; // 1=open 0=closed
  const squishAnim  = useRef(new Animated.Value(1)).current; // tap squish
  const glowAnim    = useRef(new Animated.Value(0.5)).current;

  // bubble anims
  const bubbleAnims = useRef(BUBBLES.map(() => new Animated.Value(0))).current;

  // ── Idle: float + breathe + ring rotate + blink ──────────────────────────
  useEffect(() => {
    const anims: Animated.CompositeAnimation[] = [];

    // Gentle float up/down
    anims.push(Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: -10, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      Animated.timing(floatAnim, { toValue: 10,  duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
    ])));

    // Ring slow spin
    anims.push(Animated.loop(Animated.timing(ringRotate, {
      toValue: 1, duration: 6000, useNativeDriver: true, easing: Easing.linear,
    })));

    // Glow pulse
    anims.push(Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.4, duration: 1800, useNativeDriver: true }),
    ])));

    // Blink every ~4s
    const scheduleBlink = () => {
      const blinkLoop = Animated.loop(Animated.sequence([
        Animated.delay(3500),
        Animated.timing(blinkAnim, { toValue: 0.05, duration: 80,  useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1,    duration: 80,  useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 0.05, duration: 80,  useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1,    duration: 100, useNativeDriver: true }),
      ]));
      anims.push(blinkLoop);
      blinkLoop.start();
    };
    scheduleBlink();

    // Breathing (idle/listening)
    if (orbState === 'idle' || orbState === 'listening') {
      anims.push(Animated.loop(Animated.sequence([
        Animated.timing(breathAnim, { toValue: 1.06, duration: 2000, useNativeDriver: true }),
        Animated.timing(breathAnim, { toValue: 0.96, duration: 2000, useNativeDriver: true }),
      ])));
    }

    // Speaking pulse
    if (orbState === 'speaking') {
      anims.push(Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.14, duration: 160, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.92, duration: 200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 180, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0,  duration: 180, useNativeDriver: true }),
      ])));
    }

    // Floating bubbles
    bubbleAnims.forEach((b, i) => {
      b.setValue(0);
      anims.push(Animated.loop(Animated.sequence([
        Animated.delay(BUBBLES[i].delay),
        Animated.timing(b, { toValue: 1, duration: 3000 + i * 200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(b, { toValue: 0, duration: 3000 + i * 200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])));
    });

    anims.forEach((a) => a.start());
    return () => { anims.forEach((a) => a.stop()); };
  }, [orbState]);

  // ── Tap: happy squish ─────────────────────────────────────────────────────
  const handlePress = useCallback(() => {
    squishAnim.setValue(1);
    Animated.sequence([
      Animated.timing(squishAnim, { toValue: 0.85, duration: 100, useNativeDriver: true }),
      Animated.spring(squishAnim, { toValue: 1.12, useNativeDriver: true, friction: 3 }),
      Animated.spring(squishAnim, { toValue: 1.0,  useNativeDriver: true, friction: 5 }),
    ]).start();
    onPress?.();
  }, [onPress, squishAnim]);

  const spin = ringRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const s = size; // alias

  // Combined scale: breathing × squish × pulse
  const combinedScale = Animated.multiply(
    orbState === 'speaking' ? pulseAnim : breathAnim,
    squishAnim,
  );

  return (
    <TouchableWithoutFeedback onPress={handlePress} accessibilityRole="button" accessibilityLabel="HavenlyAI mascot">
      <View style={[styles.wrapper, { width: s * 2, height: s * 2 }]}>

        {/* Floating bubbles */}
        {BUBBLES.map((b, i) => {
          const floatY = bubbleAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
          return (
            <Animated.View
              key={i}
              style={[
                styles.bubble,
                {
                  width: b.r * 2, height: b.r * 2, borderRadius: b.r,
                  left: s + b.dx - b.r,
                  top:  s + b.dy - b.r,
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
              transform: [
                { translateY: floatAnim },
                { scale: combinedScale },
              ],
            },
          ]}
        >
          <Svg width={s} height={s} viewBox="0 0 200 200">
            <Defs>
              {/* Deep Space 3D Body Gradient */}
              <RadialGradient id="bodyGrad" cx="35%" cy="30%" r="75%">
                <Stop offset="0%"   stopColor="#C084FC" stopOpacity="1" />
                <Stop offset="30%"  stopColor="#818CF8" stopOpacity="0.9" />
                <Stop offset="70%"  stopColor="#4338CA" stopOpacity="1" />
                <Stop offset="100%" stopColor="#1E1B4B" stopOpacity="1" />
              </RadialGradient>
              
              {/* Frosted Glass Edge / Inner Shadow */}
              <RadialGradient id="edgeGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="80%" stopColor="#FFFFFF" stopOpacity="0" />
                <Stop offset="98%" stopColor="#A78BFA" stopOpacity="0.4" />
                <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.6" />
              </RadialGradient>

              {/* Top Highlight for 3D glassy feel */}
              <LinearGradient id="glassTop" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
                <Stop offset="40%" stopColor="#FFFFFF" stopOpacity="0" />
              </LinearGradient>

              {/* Bottom reflection */}
              <LinearGradient id="glassBottom" x1="0%" y1="100%" x2="0%" y2="0%">
                <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.5" />
                <Stop offset="40%" stopColor="#38BDF8" stopOpacity="0" />
              </LinearGradient>

              {/* Flowing plasma sash */}
              <LinearGradient id="plasmaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%"   stopColor="#38BDF8" stopOpacity="0.8" />
                <Stop offset="50%"  stopColor="#A78BFA" stopOpacity="0.9" />
                <Stop offset="100%" stopColor="#F472B6" stopOpacity="0.6" />
              </LinearGradient>

              {/* Cheek blush */}
              <RadialGradient id="blushGrad" cx="50%" cy="50%" r="50%">
                <Stop offset="0%"   stopColor="#F472B6" stopOpacity="0.8" />
                <Stop offset="100%" stopColor="#F472B6" stopOpacity="0" />
              </RadialGradient>
            </Defs>

            {/* Main body sphere */}
            <Circle cx="100" cy="100" r="92" fill="url(#bodyGrad)" />
            
            {/* Inner edge glow */}
            <Circle cx="100" cy="100" r="92" fill="url(#edgeGlow)" />

            {/* Flowing Plasma sash (layered behind face) */}
            <Path
              d="M 8 115 Q 50 85, 100 110 Q 150 135, 192 105 L 192 135 Q 150 165, 100 140 Q 50 115, 8 145 Z"
              fill="url(#plasmaGrad)"
              opacity="0.85"
            />

            {/* Glassy top highlight */}
            <Ellipse cx="100" cy="45" rx="70" ry="25" fill="url(#glassTop)" />
            
            {/* Glassy bottom reflection */}
            <Ellipse cx="100" cy="165" rx="75" ry="25" fill="url(#glassBottom)" />

            {/* Blush cheeks */}
            <Ellipse cx="65"  cy="130" rx="18" ry="12" fill="url(#blushGrad)" />
            <Ellipse cx="135" cy="130" rx="18" ry="12" fill="url(#blushGrad)" />

            {/* Eyes (Glowing cyan/white) */}
            <Path d="M 68 100 Q 75 88, 82 100" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" fill="none" />
            <Path d="M 118 100 Q 125 88, 132 100" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" fill="none" />

            {/* Cute Smile */}
            <Path d="M 82 120 Q 100 138, 118 120" stroke="#FFFFFF" strokeWidth="5.5" strokeLinecap="round" fill="none" />

            {/* Sparkles */}
            <Path d="M 130 55 L 132 48 L 134 55 L 141 57 L 134 59 L 132 66 L 130 59 L 123 57 Z" fill="#FFFFFF" opacity="0.9" />
            <Circle cx="145" cy="45" r="3" fill="#A78BFA" opacity="0.8" />
            <Circle cx="118" cy="40" r="2" fill="#38BDF8" opacity="0.9" />
          </Svg>
        </Animated.View>

        {/* Orbital ring (separate, so it can rotate independently) */}
        <Animated.View
          style={[
            styles.ring,
            {
              width: s * 1.45,
              height: s * 0.45,
              left: s - (s * 1.45) / 2,
              top:  s - (s * 0.45) / 2,
              transform: [
                { translateY: floatAnim },
                { rotateX: '65deg' },
                { rotate: spin },
              ],
            },
          ]}
        >
          <Svg width="100%" height="100%" viewBox="0 0 290 90">
            <Defs>
              <LinearGradient id="ringG" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%"   stopColor="#38BDF8" stopOpacity="0.8" />
                <Stop offset="30%"  stopColor="#A78BFA" stopOpacity="0.4" />
                <Stop offset="70%"  stopColor="#C084FC" stopOpacity="0.4" />
                <Stop offset="100%" stopColor="#38BDF8" stopOpacity="0.8" />
              </LinearGradient>
            </Defs>
            <Ellipse cx="145" cy="45" rx="140" ry="38"
              fill="none" stroke="url(#ringG)" strokeWidth="6" />
            
            {/* Inner glow on the ring */}
            <Ellipse cx="145" cy="45" rx="140" ry="38"
              fill="none" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.6" />
          </Svg>
        </Animated.View>

        {/* Listening ripple rings */}
        {orbState === 'listening' && (
          <>
            <Animated.View style={[styles.ripple, { width: s, height: s, borderRadius: s / 2, left: s / 2, top: s / 2 }]} />
            <Animated.View style={[styles.ripple, styles.ripple2, { width: s, height: s, borderRadius: s / 2, left: s / 2, top: s / 2 }]} />
          </>
        )}

      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignSelf: 'center',
  },
  mascotRoot: {
    position: 'absolute',
  },
  ring: {
    position: 'absolute',
  },
  bubble: {
    position: 'absolute',
    backgroundColor: 'rgba(167,139,250,0.45)',
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
