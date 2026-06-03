import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopBar } from '../../components/common/TopBar';
import { AppBackground } from '../../components/common/AppBackground';
import { LineChart, ChartPoint } from '../../components/common/LineChart';
import { ProgressPhotos } from '../../components/progress/ProgressPhotos';
import { useTheme } from '../../theme/useTheme';
import { fonts, spacing, radius } from '../../theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import { haptic } from '../../utils/haptics';
import { todayISO } from '../../utils/nutrition';
import { WeightLog } from '../../types';

interface FoodEntry { caption: string; calories: number; protein: number; carbs: number; fat: number; image_url?: string; }
interface DayData { food: FoodEntry[]; workouts: { name: string; sets: string[] }[]; weight?: number; water?: number; }

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const ymd = (d: Date) => d.toISOString().split('T')[0];

export function ProgressScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { profile, updateWeight } = useProfileStore();

  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [data, setData] = useState<Record<string, DayData>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [newWeight, setNewWeight] = useState('');
  const [showPhotos, setShowPhotos] = useState(false);
  const [wSeries, setWSeries] = useState<ChartPoint[]>([]);
  const [calSeries, setCalSeries] = useState<ChartPoint[]>([]);
  const [proSeries, setProSeries] = useState<ChartPoint[]>([]);

  const fetchAnalytics = useCallback(async () => {
    if (!user?.id) return;
    const DAYS = 30;
    const start = new Date(); start.setDate(start.getDate() - (DAYS - 1));
    const startStr = start.toISOString().split('T')[0];

    const [foods, weights, workouts] = await Promise.all([
      supabase.from('food_logs').select('logged_at, total_calories, total_protein').eq('user_id', user.id).gte('logged_at', startStr),
      supabase.from('weight_logs').select('logged_at, weight_kg').eq('user_id', user.id).gte('logged_at', startStr),
      supabase.from('workouts').select('logged_at').eq('user_id', user.id).gte('logged_at', startStr),
    ]);

    const cal: Record<string, number> = {}, pro: Record<string, number> = {}, wt: Record<string, number> = {};
    for (const f of foods.data ?? []) { cal[f.logged_at] = (cal[f.logged_at] ?? 0) + f.total_calories; pro[f.logged_at] = (pro[f.logged_at] ?? 0) + f.total_protein; }
    for (const w of weights.data ?? []) wt[w.logged_at] = w.weight_kg;
    const gym = new Set((workouts.data ?? []).map((w: any) => w.logged_at));

    const wS: ChartPoint[] = [], cS: ChartPoint[] = [], pS: ChartPoint[] = [];
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const ds = d.toISOString().split('T')[0];
      const marked = gym.has(ds);
      wS.push({ value: wt[ds] ?? 0, marked });
      cS.push({ value: Math.round(cal[ds] ?? 0), marked });
      pS.push({ value: Math.round(pro[ds] ?? 0), marked });
    }
    setWSeries(wS); setCalSeries(cS); setProSeries(pS);
  }, [user?.id]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthLabel = cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const fetchMonth = useCallback(async () => {
    if (!user?.id) return;
    const start = ymd(new Date(year, month, 1));
    const end = ymd(new Date(year, month + 1, 0));

    const [foods, workouts, weights, waters, wlog] = await Promise.all([
      supabase.from('food_logs').select('logged_at, caption, total_calories, total_protein, total_carbs, total_fat, image_url, food_items(name)').eq('user_id', user.id).gte('logged_at', start).lte('logged_at', end),
      supabase.from('workouts').select('logged_at, name, exercises(name, sets(weight_kg, reps))').eq('user_id', user.id).gte('logged_at', start).lte('logged_at', end),
      supabase.from('weight_logs').select('logged_at, weight_kg').eq('user_id', user.id).gte('logged_at', start).lte('logged_at', end),
      supabase.from('water_logs').select('logged_at, amount_ml').eq('user_id', user.id).gte('logged_at', start).lte('logged_at', end),
      supabase.from('weight_logs').select('*').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(14),
    ]);

    const map: Record<string, DayData> = {};
    const ensure = (d: string) => (map[d] ??= { food: [], workouts: [] });
    for (const f of foods.data ?? []) ensure(f.logged_at).food.push({
      caption: f.caption ?? (f as any).food_items?.map((i: any) => i.name).join(', ') ?? 'Meal',
      calories: f.total_calories, protein: f.total_protein, carbs: f.total_carbs, fat: f.total_fat, image_url: f.image_url ?? undefined,
    });
    for (const w of workouts.data ?? []) ensure(w.logged_at).workouts.push({
      name: w.name,
      sets: ((w as any).exercises ?? []).map((e: any) => `${e.name}: ${(e.sets ?? []).map((s: any) => `${s.weight_kg}×${s.reps}`).join(' ')}`),
    });
    for (const wt of weights.data ?? []) ensure(wt.logged_at).weight = wt.weight_kg;
    for (const wa of waters.data ?? []) ensure(wa.logged_at).water = wa.amount_ml;
    setData(map);
    setWeightLogs((wlog.data ?? []) as WeightLog[]);
  }, [user?.id, year, month]);

  useFocusEffect(useCallback(() => { fetchMonth(); fetchAnalytics(); }, [fetchMonth, fetchAnalytics]));

  async function logWeight() {
    const w = parseFloat(newWeight);
    if (!w || !user) return;
    await supabase.from('weight_logs').upsert({ user_id: user.id, logged_at: todayISO(), weight_kg: w }, { onConflict: 'user_id,logged_at' });
    await updateWeight(user.id, w);
    setNewWeight('');
    haptic.success();
    fetchMonth();
    fetchAnalytics();
  }

  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayStr = ymd(new Date());
  const sel = selected ? data[selected] : null;

  const latest = weightLogs[0];
  const prev = weightLogs[7];
  const trend = latest && prev ? latest.weight_kg - prev.weight_kg : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppBackground />
      <TopBar logo transparent right={
        <TouchableOpacity onPress={() => setShowPhotos(true)}><Text style={{ fontSize: 18 }}>📸</Text></TouchableOpacity>
      } />
      <ProgressPhotos visible={showPhotos} onClose={() => setShowPhotos(false)} />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
        {/* Weight tracker */}
        <View style={[styles.weightSection, { borderBottomColor: c.border }]}>
          <Text style={[styles.sectionLabel, { color: c.textMuted }]}>Body Weight</Text>
          <View style={styles.weightRow}>
            <View>
              <Text style={[styles.weightVal, { color: c.text, fontFamily: fonts.headingLoaded }]}>
                {latest?.weight_kg ?? profile?.weight_kg ?? '—'} <Text style={styles.weightUnit}>kg</Text>
              </Text>
              {trend !== null && (
                <Text style={[styles.trend, { color: trend <= 0 ? c.green : c.accent, fontFamily: fonts.sans }]}>
                  {trend > 0 ? '+' : ''}{trend.toFixed(1)} kg / 2wk
                </Text>
              )}
            </View>
            <View style={styles.weightInput}>
              <TextInput
                style={[styles.weightField, { backgroundColor: c.surface, borderColor: c.border, color: c.text, fontFamily: fonts.body }]}
                placeholder="kg" placeholderTextColor={c.textMuted} value={newWeight} onChangeText={setNewWeight} keyboardType="decimal-pad"
              />
              <TouchableOpacity onPress={logWeight} style={[styles.logBtn, { backgroundColor: c.accent }]}>
                <Text style={{ color: c.onAccent, fontFamily: fonts.sans, fontSize: 12 }}>Log</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Trends */}
        <View style={[styles.chartsSection, { borderBottomColor: c.border }]}>
          <Text style={[styles.sectionLabel, { color: c.textMuted }]}>Trends · last 30 days</Text>
          <LineChart title="Weight" points={wSeries} unit="kg" color={c.blue} markerLabel="gym day" />
          <LineChart title="Calories" points={calSeries} unit="kcal" color={c.accent} markerLabel="gym day" />
          <LineChart title="Protein" points={proSeries} unit="g" color={c.green} markerLabel="gym day" />
        </View>

        {/* Month nav */}
        <View style={[styles.monthNav, { borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={() => { haptic.light(); setCursor(new Date(year, month - 1, 1)); }}><Text style={[styles.navArrow, { color: c.accent }]}>‹</Text></TouchableOpacity>
          <Text style={[styles.monthLabel, { color: c.text, fontFamily: fonts.headingLoaded }]}>{monthLabel}</Text>
          <TouchableOpacity onPress={() => { haptic.light(); setCursor(new Date(year, month + 1, 1)); }}><Text style={[styles.navArrow, { color: c.accent }]}>›</Text></TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((w, i) => <Text key={i} style={[styles.weekday, { color: c.textMuted }]}>{w}</Text>)}
        </View>

        <View style={styles.grid}>
          {cells.map((day, i) => {
            if (day === null) return <View key={i} style={styles.cell} />;
            const dateStr = ymd(new Date(year, month, day));
            const dd = data[dateStr];
            const isToday = dateStr === todayStr;
            return (
              <TouchableOpacity key={i} onPress={() => { if (dd) { haptic.light(); setSelected(dateStr); } }} activeOpacity={dd ? 0.6 : 1}
                style={[styles.cell, isToday && { backgroundColor: c.accentBg, borderRadius: radius.sm }]}>
                <Text style={[styles.dayNum, { color: isToday ? c.accent : c.text, fontFamily: fonts.body }]}>{day}</Text>
                <View style={styles.cellDots}>
                  {dd?.workouts.length ? <View style={[styles.cdot, { backgroundColor: c.green }]} /> : null}
                  {dd?.food.length ? <View style={[styles.cdot, { backgroundColor: c.accent }]} /> : null}
                  {dd?.weight ? <View style={[styles.cdot, { backgroundColor: c.blue }]} /> : null}
                  {dd?.water ? <View style={[styles.cdot, { backgroundColor: c.water }]} /> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.legend}>
          {[['Workout', c.green], ['Food', c.accent], ['Weight', c.blue], ['Water', c.water]].map(([l, col]) => (
            <View key={l as string} style={styles.legendItem}><View style={[styles.cdot, { backgroundColor: col as string }]} /><Text style={[styles.legendText, { color: c.textMuted }]}>{l}</Text></View>
          ))}
        </View>
      </ScrollView>

      {/* Day detail */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: c.surfaceAlt, borderColor: c.border, paddingBottom: insets.bottom + spacing.lg }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sheetTitle, { color: c.text, fontFamily: fonts.headingLoaded }]}>
                {selected ? new Date(selected).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
              </Text>

              {/* food images */}
              {sel?.food.some(f => f.image_url) && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                  {sel.food.filter(f => f.image_url).map((f, i) => (
                    <Image key={i} source={{ uri: f.image_url! }} style={[styles.foodImg, { borderColor: c.border }]} />
                  ))}
                </ScrollView>
              )}

              {sel?.food.length ? (
                <View style={styles.block}>
                  <Text style={[styles.blockLabel, { color: c.accent }]}>Diet · {sel.food.reduce((s, f) => s + f.calories, 0)} kcal</Text>
                  {sel.food.map((f, i) => (
                    <View key={i} style={[styles.foodRow, { borderBottomColor: c.border }]}>
                      <Text style={[styles.foodName, { color: c.text, fontFamily: fonts.body }]} numberOfLines={1}>{f.caption}</Text>
                      <Text style={[styles.foodMacros, { color: c.textMuted, fontFamily: fonts.sans }]}>
                        {f.calories} · P{Math.round(f.protein)} C{Math.round(f.carbs)} F{Math.round(f.fat)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {sel?.workouts.length ? (
                <View style={styles.block}>
                  <Text style={[styles.blockLabel, { color: c.green }]}>Workouts</Text>
                  {sel.workouts.map((w, i) => (
                    <View key={i} style={{ marginBottom: 8 }}>
                      <Text style={[styles.workoutName, { color: c.text, fontFamily: fonts.body }]}>{w.name}</Text>
                      {w.sets.map((s, j) => <Text key={j} style={[styles.setLine, { color: c.textMuted, fontFamily: fonts.mono }]}>{s}</Text>)}
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.statRow}>
                {sel?.weight ? <Text style={[styles.statChip, { color: c.blue, fontFamily: fonts.sans }]}>⚖ {sel.weight} kg</Text> : null}
                {sel?.water ? <Text style={[styles.statChip, { color: c.water, fontFamily: fonts.sans }]}>💧 {(sel.water / 1000).toFixed(1)} L</Text> : null}
              </View>

              <TouchableOpacity onPress={() => setSelected(null)} style={[styles.closeBtn, { borderColor: c.border }]}>
                <Text style={[styles.closeText, { color: c.textSecondary, fontFamily: fonts.sans }]}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  chartsSection: { padding: spacing.lg, borderBottomWidth: 1, gap: 10 },
  weightSection: { padding: spacing.lg, borderBottomWidth: 1, gap: 10 },
  sectionLabel: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  weightRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weightVal: { fontSize: 34, letterSpacing: -1 },
  weightUnit: { fontSize: 17 },
  trend: { fontSize: 12, marginTop: 2 },
  weightInput: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  weightField: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, width: 80, textAlign: 'center' },
  logBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.md },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: 12, borderBottomWidth: 1 },
  navArrow: { fontSize: 28, paddingHorizontal: 12 },
  monthLabel: { fontSize: 20, letterSpacing: -0.3 },
  weekRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  weekday: { flex: 1, textAlign: 'center', fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, paddingTop: 4 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dayNum: { fontSize: 14 },
  cellDots: { flexDirection: 'row', gap: 2, height: 5 },
  cdot: { width: 5, height: 5, borderRadius: 3 },
  legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: spacing.md, padding: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontFamily: fonts.sans, fontSize: 11 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: spacing.lg, maxHeight: '82%' },
  sheetTitle: { fontSize: 20, letterSpacing: -0.3, marginBottom: 4 },
  foodImg: { width: 90, height: 90, borderRadius: radius.md, marginRight: 8, borderWidth: 1 },
  block: { marginTop: 10, gap: 4 },
  blockLabel: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  foodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, gap: 10 },
  foodName: { fontSize: 14, flex: 1 },
  foodMacros: { fontSize: 11 },
  workoutName: { fontSize: 14, marginBottom: 2 },
  setLine: { fontSize: 12, lineHeight: 17 },
  statRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
  statChip: { fontSize: 13 },
  closeBtn: { borderWidth: 1, borderRadius: radius.md, padding: 12, alignItems: 'center', marginTop: spacing.md },
  closeText: { fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },
});
