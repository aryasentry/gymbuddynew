import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { fonts } from '../../theme';
import { useTheme } from '../../theme/useTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  value: number;
  target: number;
  color: string;
  size?: number;
  stroke?: number;
  label?: string;
  unit?: string;
  big?: boolean;
}

// Cal-AI style circular progress ring with a count-up center value.
export function MacroRing({ value, target, color, size = 72, stroke = 7, label, unit = '', big }: Props) {
  const { c } = useTheme();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, value / target) : 0;

  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = React.useState(0);

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(v));
    Animated.timing(anim, { toValue: pct, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [pct]);

  const dashoffset = anim.interpolate({ inputRange: [0, 1], outputRange: [circ, circ * (1 - pct)] });
  const shownValue = Math.round(display * (pct > 0 ? value / pct : 0)) || (pct === 0 ? 0 : value);

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.border} strokeWidth={stroke} fill="none" />
          <AnimatedCircle
            cx={size / 2} cy={size / 2} r={r}
            stroke={color} strokeWidth={stroke} fill="none"
            strokeDasharray={`${circ} ${circ}`}
            strokeDashoffset={dashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.center}>
          <Text style={[big ? styles.bigVal : styles.val, { color: c.text, fontFamily: fonts.headingLoaded }]}>
            {Math.round(value)}
          </Text>
          {unit ? <Text style={[styles.unit, { color: c.textMuted, fontFamily: fonts.sans }]}>{unit}</Text> : null}
        </View>
      </View>
      {label ? <Text style={[styles.label, { color: c.textMuted, fontFamily: fonts.sans }]}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6 },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  val: { fontSize: 15, letterSpacing: -0.3 },
  bigVal: { fontSize: 26, letterSpacing: -0.5 },
  unit: { fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', marginTop: -1 },
  label: { fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
});
