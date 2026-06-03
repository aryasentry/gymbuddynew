import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopBar } from '../../components/common/TopBar';
import { Button } from '../../components/common/Button';
import { AppBackground } from '../../components/common/AppBackground';
import { useTheme } from '../../theme/useTheme';
import { fonts, spacing, radius } from '../../theme';
import { supabase } from '../../lib/supabase';
import { generateWeeklyReport } from '../../lib/groq';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';

export function WeeklyReportScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { profile } = useProfileStore();

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState('');
  const [stats, setStats] = useState<{ avgCal: number; proteinDays: number; workouts: number; weightDelta: number } | null>(null);

  async function generate() {
    if (!user || !profile) return;
    setLoading(true); setReport('');
    const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 6);
    const s = start.toISOString().split('T')[0], e = end.toISOString().split('T')[0];

    const [foods, workouts, weights] = await Promise.all([
      supabase.from('food_logs').select('logged_at, total_calories, total_protein, total_carbs, total_fat').eq('user_id', user.id).gte('logged_at', s).lte('logged_at', e),
      supabase.from('workouts').select('logged_at, name').eq('user_id', user.id).gte('logged_at', s).lte('logged_at', e),
      supabase.from('weight_logs').select('logged_at, weight_kg').eq('user_id', user.id).order('logged_at', { ascending: true }).limit(60),
    ]);

    const byDate: Record<string, any> = {};
    for (const f of foods.data ?? []) {
      byDate[f.logged_at] ??= { date: f.logged_at, calories: 0, protein: 0, carbs: 0, fat: 0 };
      byDate[f.logged_at].calories += f.total_calories; byDate[f.logged_at].protein += f.total_protein;
      byDate[f.logged_at].carbs += f.total_carbs; byDate[f.logged_at].fat += f.total_fat;
    }
    const weekNutrition = Object.values(byDate) as any[];
    const weekWorkouts = (workouts.data ?? []).map((w: any) => ({ date: w.logged_at, name: w.name }));
    const wlogs = weights.data ?? [];
    const recent = wlogs.filter((w: any) => w.logged_at >= s);
    const weightDelta = recent.length >= 2 ? recent[recent.length - 1].weight_kg - recent[0].weight_kg : 0;

    const avgCal = Math.round(weekNutrition.reduce((a, d) => a + d.calories, 0) / (weekNutrition.length || 1));
    const proteinDays = weekNutrition.filter(d => d.protein >= profile.protein_target).length;
    setStats({ avgCal, proteinDays, workouts: weekWorkouts.length, weightDelta });

    try {
      const text = await generateWeeklyReport(profile, weekNutrition, weekWorkouts, weightDelta);
      setReport(text);
    } catch (e: any) {
      setReport(e.message?.includes('429') ? 'AI busy (rate limit). Try again shortly.' : 'Could not generate the report. Try again.');
    } finally { setLoading(false); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppBackground />
      <TopBar showBack onBack={() => navigation.goBack()} title="Weekly Report" transparent />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>
          Your last 7 days, summarised by your AI coach using your real logs.
        </Text>

        {stats && (
          <View style={styles.statGrid}>
            {[
              { label: 'Avg calories', value: `${stats.avgCal}`, sub: `/ ${profile?.calorie_target ?? 0}` },
              { label: 'Protein goal', value: `${stats.proteinDays}/7`, sub: 'days hit' },
              { label: 'Workouts', value: `${stats.workouts}`, sub: 'sessions' },
              { label: 'Weight', value: `${stats.weightDelta > 0 ? '+' : ''}${stats.weightDelta.toFixed(1)}`, sub: 'kg this week' },
            ].map(s => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[styles.statValue, { color: c.accent, fontFamily: fonts.headingLoaded }]}>{s.value}</Text>
                <Text style={[styles.statSub, { color: c.textMuted, fontFamily: fonts.sans }]}>{s.sub}</Text>
                <Text style={[styles.statLabel, { color: c.textSecondary, fontFamily: fonts.sans }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {loading && <ActivityIndicator color={c.accent} style={{ marginVertical: spacing.lg }} />}

        {report ? (
          <View style={[styles.reportCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.reportText, { color: c.text, fontFamily: fonts.body }]}>{report}</Text>
          </View>
        ) : null}

        <Button label={report ? 'Regenerate' : 'Generate report'} onPress={generate} loading={loading} style={{ marginTop: spacing.md }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md },
  intro: { fontSize: 14, lineHeight: 20 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { width: '47.5%', borderWidth: 1, borderRadius: radius.md, padding: 14, gap: 2 },
  statValue: { fontSize: 24, letterSpacing: -0.5 },
  statSub: { fontSize: 11 },
  statLabel: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
  reportCard: { borderWidth: 1, borderRadius: radius.md, padding: 16 },
  reportText: { fontSize: 15, lineHeight: 23 },
});
