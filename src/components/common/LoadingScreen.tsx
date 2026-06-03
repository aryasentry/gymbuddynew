import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, Text } from 'react-native';
import { fonts } from '../../theme';
import { useTheme } from '../../theme/useTheme';

// Claude-style petal logo: 4 rounded bars at 0/45/90/135 degrees
function ClaudeLogo({ size = 48, color }: { size?: number; color: string }) {
  const bars = [0, 45, 90, 135];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {bars.map((angle) => (
        <View
          key={angle}
          style={{
            width: size * 0.18,
            height: size * 0.52,
            borderRadius: size * 0.09,
            backgroundColor: color,
            position: 'absolute',
            transform: [{ rotate: `${angle}deg` }],
          }}
        />
      ))}
    </View>
  );
}

export function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  const { c } = useTheme();

  const breathe = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0.85, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    const dotAnim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.2, duration: 400, useNativeDriver: true }),
          Animated.delay(800),
        ])
      );

    Animated.parallel([dotAnim(dot1, 0), dotAnim(dot2, 200), dotAnim(dot3, 400)]).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { backgroundColor: c.bg, opacity }]}>
      <Animated.View style={{ transform: [{ scale: breathe }] }}>
        <ClaudeLogo size={52} color={c.accent} />
      </Animated.View>

      <View style={styles.dots}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, { backgroundColor: c.accent, opacity: dot }]} />
        ))}
      </View>

      <Text style={[styles.message, { color: c.textMuted, fontFamily: fonts.body }]}>{message}</Text>
    </Animated.View>
  );
}

// Shimmer skeleton for lazy-loading list rows
export function SkeletonRow({ dark }: { dark?: boolean }) {
  const { c } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });

  return (
    <View style={[styles.skeletonRow, { borderBottomColor: c.border }]}>
      <View style={{ flex: 1, gap: 6 }}>
        <Animated.View style={[styles.skeletonLine, { width: '60%', backgroundColor: c.surface, opacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: '35%', height: 10, backgroundColor: c.surface, opacity }]} />
      </View>
      <Animated.View style={[styles.skeletonLine, { width: 40, backgroundColor: c.surface, opacity }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 4 },
  dot: { width: 5, height: 5, borderRadius: 999 },
  message: { fontSize: 13, letterSpacing: 0.3, marginTop: 4 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingHorizontal: 20, borderBottomWidth: 1, gap: 12 },
  skeletonLine: { height: 14, borderRadius: 4 },
});
