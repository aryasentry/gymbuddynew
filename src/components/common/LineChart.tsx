import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { fonts } from '../../theme';
import { useTheme } from '../../theme/useTheme';

export interface ChartPoint { value: number; label?: string; marked?: boolean }

interface Props {
  title: string;
  points: ChartPoint[];
  color?: string;
  unit?: string;
  markerLabel?: string; // legend for `marked` dots (e.g. "gym day")
  height?: number;
}

const H_PAD = 40; // screen padding (lg*2 + card padding) — rough
const CHART_H = 90;

export function LineChart({ title, points, color, unit = '', markerLabel, height = CHART_H }: Props) {
  const { c } = useTheme();
  const accent = color ?? c.accent;
  const screenW = Dimensions.get('window').width;
  const w = screenW - H_PAD - 28; // minus outer padding + card padding
  const h = height;

  const valid = points.filter(p => p.value > 0);
  if (valid.length < 2) {
    return (
      <View style={styles.card}>
        <Text style={[styles.title, { color: c.textMuted }]}>{title}</Text>
        <Text style={[styles.empty, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>Log a few more days to see the trend</Text>
      </View>
    );
  }

  const values = points.map(p => p.value);
  const max = Math.max(...values);
  const min = Math.min(...values.filter(v => v > 0));
  const range = max - min || 1;
  const n = points.length;
  const dx = n > 1 ? w / (n - 1) : 0;
  const y = (v: number) => h - ((v - min) / range) * (h - 12) - 6;

  const coords = points.map((p, i) => ({ x: i * dx, y: p.value > 0 ? y(p.value) : null as number | null, marked: p.marked, value: p.value }));
  const polyPts = coords.filter(c => c.y !== null).map(c => `${c.x},${c.y}`).join(' ');

  const last = valid[valid.length - 1].value;
  const first = valid[0].value;
  const delta = last - first;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: c.textMuted }]}>{title}</Text>
        <Text style={[styles.last, { color: c.text, fontFamily: fonts.headingLoaded }]}>
          {Math.round(last)}<Text style={[styles.unit, { color: c.textMuted }]}> {unit}</Text>
          <Text style={[styles.delta, { color: delta <= 0 ? c.green : accent }]}>  {delta > 0 ? '+' : ''}{Math.round(delta)}</Text>
        </Text>
      </View>

      <Svg width={w} height={h}>
        <Line x1={0} y1={h - 1} x2={w} y2={h - 1} stroke={c.border} strokeWidth={1} />
        {polyPts ? <Polyline points={polyPts} fill="none" stroke={accent} strokeWidth={2} strokeLinejoin="round" /> : null}
        {coords.map((co, i) => co.y === null ? null : (
          <Circle key={i} cx={co.x} cy={co.y} r={co.marked ? 4 : 2.5}
            fill={co.marked ? accent : c.bg} stroke={accent} strokeWidth={co.marked ? 0 : 1.5} />
        ))}
      </Svg>

      {markerLabel && (
        <View style={styles.legend}>
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <Text style={[styles.legendText, { color: c.textMuted }]}>{markerLabel}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, paddingVertical: 4 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' },
  last: { fontSize: 18 },
  unit: { fontSize: 11, fontFamily: fonts.sans },
  delta: { fontFamily: fonts.sans, fontSize: 12 },
  empty: { fontSize: 13, paddingVertical: 12 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 0.3 },
});
