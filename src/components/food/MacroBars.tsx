import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { fonts } from '../../theme';
import { useTheme } from '../../theme/useTheme';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { MICRO_KEYS, MICRO_LABELS } from '../../types';

interface Totals {
  calories: number; protein: number; carbs: number; fat: number;
  fiber_g?: number; sugar_g?: number; sodium_mg?: number; potassium_mg?: number; calcium_mg?: number; iron_mg?: number; vitamin_c_mg?: number;
}

function Bar({ label, grams, kcal, share, color }: { label: string; grams: number; kcal: number; share: number; color: string }) {
  const { c } = useTheme();
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: share, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [share]);
  return (
    <View style={styles.barRow}>
      <View style={styles.barHead}>
        <Text style={[styles.barLabel, { color: c.textSecondary }]}>{label}</Text>
        <Text style={[styles.barVal, { color }]}>
          <AnimatedNumber value={grams} style={[styles.barVal, { color }]} suffix="g" />
          <Text style={[styles.barKcal, { color: c.textMuted }]}>  {Math.round(kcal)} kcal</Text>
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: c.border }]}>
        <Animated.View style={[styles.fill, { backgroundColor: color, width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
    </View>
  );
}

export function MacroBars({ total }: { total: Totals }) {
  const { c } = useTheme();
  const pK = total.protein * 4;
  const cK = total.carbs * 4;
  const fK = total.fat * 9;
  const sum = Math.max(1, pK + cK + fK);

  const micros = MICRO_KEYS
    .map(k => ({ k, v: (total as any)[k] as number | undefined }))
    .filter(m => (m.v ?? 0) > 0);

  return (
    <View style={styles.wrap}>
      {/* Calories headline */}
      <View style={styles.calRow}>
        <AnimatedNumber value={total.calories} style={[styles.calBig, { color: c.accent, fontFamily: fonts.headingLoaded }]} />
        <Text style={[styles.calUnit, { color: c.textMuted, fontFamily: fonts.sans }]}>KCAL</Text>
      </View>

      {/* Macro bars */}
      <Bar label="Protein" grams={total.protein} kcal={pK} share={pK / sum} color={c.blue} />
      <Bar label="Carbs"   grams={total.carbs}   kcal={cK} share={cK / sum} color={c.green} />
      <Bar label="Fat"     grams={total.fat}     kcal={fK} share={fK / sum} color={c.accent} />

      {/* Micros grid */}
      {micros.length > 0 && (
        <>
          <Text style={[styles.microHead, { color: c.textMuted }]}>Micronutrients</Text>
          <View style={styles.microGrid}>
            {micros.map(({ k, v }) => (
              <View key={k} style={[styles.microChip, { borderColor: c.border, backgroundColor: c.surface }]}>
                <AnimatedNumber value={v ?? 0} style={[styles.microVal, { color: c.text, fontFamily: fonts.headingLoaded }]} suffix={MICRO_LABELS[k].unit} />
                <Text style={[styles.microLabel, { color: c.textMuted }]}>{MICRO_LABELS[k].label}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  calRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  calBig: { fontSize: 34, letterSpacing: -1 },
  calUnit: { fontSize: 11, letterSpacing: 2 },
  barRow: { gap: 5 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  barLabel: { fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  barVal: { fontFamily: fonts.headingLoaded, fontSize: 15 },
  barKcal: { fontFamily: fonts.sans, fontSize: 11 },
  track: { height: 7, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  microHead: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 },
  microGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  microChip: { borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, minWidth: 88, alignItems: 'center', gap: 2 },
  microVal: { fontSize: 15 },
  microLabel: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
});
