/**
 * AnimatedSplash — shown while the app is loading auth state.
 *
 * Animation sequence:
 *  1. Icon fades + scales in (0 → 1)  ~400 ms
 *  2. Icon rotates one full 360°       ~800 ms
 *  3. Whole screen fades out           ~350 ms
 *  4. onFinished() is called → app renders
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

export default function AnimatedSplash({ onFinished }: { onFinished: () => void }) {
  const opacity   = useRef(new Animated.Value(0)).current;  // screen opacity
  const scale     = useRef(new Animated.Value(0.6)).current; // icon scale-in
  const rotation  = useRef(new Animated.Value(0)).current;  // 0 → 1 = 360°
  const fadeOut   = useRef(new Animated.Value(1)).current;  // screen fade-out

  useEffect(() => {
    Animated.sequence([
      // 1. Fade + scale the icon in
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      // 2. Rotate one full turn
      Animated.timing(rotation, {
        toValue: 1,
        duration: 800,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      // 3. Small pause so the user sees the final position
      Animated.delay(200),
      // 4. Fade the whole screen out
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 350,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => onFinished());
  }, []);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <Animated.View
        style={{
          opacity,
          transform: [{ scale }, { rotate: spin }],
        }}
      >
        <Image
          source={require('@/assets/images/splash-icon.png')}
          style={styles.icon}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  icon: {
    width: 140,
    height: 140,
  },
});
