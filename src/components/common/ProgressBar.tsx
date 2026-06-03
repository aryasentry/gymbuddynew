import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { fonts } from '../../theme';
import { useTheme } from '../../theme/useTheme';

interface Props {
  label: string;
  value: number;
  target: number;
  unit: string;
  color?: string;
}

export function ProgressBar({ label, value, target, unit, color }: Props) {
  const { c } = useTheme();

  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, { toValue: pct, duration: 600, useNativeDriver: false }).start();
  }, [pct]);

  const barColor = color ?? c.accent;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>
        <Text style={[styles.numbers, { color: c.text }]}>
          <Text style={{ color: barColor, fontWeight: '700' }}>{Math.round(value)}</Text>
          {' / '}{Math.round(target)} {unit}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: c.border }]}>
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: barColor, width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' },
  numbers: { fontFamily: fonts.sans, fontSize: 12 },
  track: { height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
});
