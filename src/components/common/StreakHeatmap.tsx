import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { fonts } from '../../theme';

interface Props {
  // ISO date (yyyy-mm-dd) -> intensity 1..4 (e.g. number of logs). Missing = empty.
  levels: Record<string, number>;
  weeks?: number;
  title?: string;
}

function isoDay(d: Date): string {
  return d.toISOString().split('T')[0];
}

// GitHub-style contribution grid. Columns = weeks, rows = Mon..Sun.
export function StreakHeatmap({ levels, weeks = 18, title }: Props) {
  const { c } = useTheme();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // start on the Monday `weeks` weeks ago
  const start = new Date(today);
  const dow = (start.getDay() + 6) % 7; // 0 = Monday
  start.setDate(start.getDate() - dow - (weeks - 1) * 7);

  const columns: { date: Date; level: number }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: { date: Date; level: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + w * 7 + d);
      const future = cur > today;
      col.push({ date: cur, level: future ? -1 : (levels[isoDay(cur)] ?? 0) });
    }
    columns.push(col);
  }

  function cellColor(level: number): string {
    if (level < 0) return 'transparent';
    if (level === 0) return c.glass ? 'rgba(255,255,255,0.06)' : c.surface;
    const steps = [0.3, 0.5, 0.75, 1];
    const idx = Math.min(level, 4) - 1;
    return applyAlpha(c.accent, steps[idx]);
  }

  return (
    <View style={styles.container}>
      {title && <Text style={[styles.title, { color: c.textMuted }]}>{title}</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.grid}>
          {columns.map((col, ci) => (
            <View key={ci} style={styles.col}>
              {col.map((cell, ri) => (
                <View
                  key={ri}
                  style={[
                    styles.cell,
                    { backgroundColor: cellColor(cell.level), borderColor: c.border },
                    cell.level < 0 && { borderColor: 'transparent' },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      {/* legend */}
      <View style={styles.legend}>
        <Text style={[styles.legendText, { color: c.textMuted }]}>Less</Text>
        {[0, 1, 2, 3, 4].map(l => (
          <View key={l} style={[styles.legendCell, { backgroundColor: cellColor(l), borderColor: c.border }]} />
        ))}
        <Text style={[styles.legendText, { color: c.textMuted }]}>More</Text>
      </View>
    </View>
  );
}

// hex or rgb -> rgba with alpha
function applyAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full = hex.length === 3 ? hex.split('').map(x => x + x).join('') : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}

const CELL = 13;
const GAP = 3;

const styles = StyleSheet.create({
  container: { gap: 8 },
  title: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', gap: GAP },
  col: { gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 3, borderWidth: 0.5 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  legendText: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 0.5 },
  legendCell: { width: 11, height: 11, borderRadius: 2, borderWidth: 0.5 },
});
