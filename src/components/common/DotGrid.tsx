import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, Dimensions } from 'react-native';
import { useTheme } from '../../theme/useTheme';

interface Props {
  spacing?: number;
  dotSize?: number;
  opacity?: number;
}

// Faint grid of dots that drifts slowly as a group — like the Claude/Cowork backdrop.
export function DotGrid({ spacing = 26, dotSize = 2, opacity = 0.5 }: Props) {
  const { c, isDark } = useTheme();
  const { width, height } = Dimensions.get('window');

  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // pad beyond screen so drift never reveals an edge
  const cols = Math.ceil(width / spacing) + 4;
  const rows = Math.ceil(height / spacing) + 4;

  const dotColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)';

  const dots = useMemo(() => {
    const arr: { x: number; y: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        arr.push({ x: col * spacing, y: r * spacing });
      }
    }
    return arr;
  }, [cols, rows, spacing]);

  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [-spacing, 0] });
  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [-spacing * 0.6, spacing * 0.4] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.layer,
          { width: width + spacing * 4, height: height + spacing * 4, opacity, transform: [{ translateX }, { translateY }] },
        ]}
      >
        {dots.map((d, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: d.x,
              top: d.y,
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: dotColor,
            }}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: -26, top: -26 },
});
