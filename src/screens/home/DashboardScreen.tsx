import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import { useFoodStore } from '../../store/foodStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { TopBar } from '../../components/common/TopBar';
import { ProgressBar } from '../../components/common/ProgressBar';
import { SkeletonRow } from '../../components/common/LoadingScreen';
import { AnimatedNumber } from '../../components/common/AnimatedNumber';
import { FadeInView } from '../../components/common/FadeInView';
import { AppBackground } from '../../components/common/AppBackground';
import { StreakHeatmap } from '../../components/common/StreakHeatmap';
import { MacroRing } from '../../components/common/MacroRing';
import { fonts, spacing } from '../../theme';
import { useTheme } from '../../theme/useTheme';
import { supabase } from '../../lib/supabase';
import { haptic } from '../../utils/haptics';

export function DashboardScreen() {
  const { c, isDark } = useTheme();
  const dark = isDark;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const { todayLogs, todayNutrition, loading: foodLoading, fetchToday, addWater } = useFoodStore();
  const { todayWorkout, streak, fetchToday: fetchWorkout, fetchStreak } = useWorkoutStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activity, setActivity] = useState<Record<string, number>>({});

  const bg = c.bg;
  const surface = c.surface;
  const textColor = c.text;
  const mutedColor = c.textMuted;
  const borderColor = c.border;
  const accentColor = c.accent;

  async function loadActivity() {
    if (!user?.id) return;
    const start = new Date(); start.setDate(start.getDate() - 130);
    const { data } = await supabase
      .from('food_logs')
      .select('logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', start.toISOString().split('T')[0]);
    const counts: Record<string, number> = {};
    for (const r of data ?? []) counts[r.logged_at] = (counts[r.logged_at] ?? 0) + 1;
    setActivity(counts);
  }

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchToday(user.id);
        fetchWorkout(user.id);
        fetchStreak(user.id);
        loadActivity();
      }
    }, [user?.id])
  );

  async function onRefresh() {
    setRefreshing(true);
    if (user?.id) { await Promise.all([fetchToday(user.id), fetchWorkout(user.id), fetchStreak(user.id), loadActivity()]); }
    setRefreshing(false);
  }

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const waterLiters = (todayNutrition.water_ml / 1000).toFixed(1);

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <AppBackground />
      <TopBar logo transparent right={
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.navigate('Progress')}>
            <Text style={{ fontSize: 18 }}>🗓</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Text style={{ fontSize: 18 }}>⚙︎</Text>
          </TouchableOpacity>
        </View>
      } />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
      >
        {/* Hero */}
        <FadeInView delay={0}>
        <View style={[styles.hero, { borderBottomColor: borderColor }]}>
          <Text style={[styles.dayText, { color: mutedColor, fontFamily: fonts.sans }]}>{greeting}</Text>
          <Text style={[styles.nameText, { color: textColor, fontFamily: fonts.headingLoaded }]}>
            {profile?.full_name?.split(' ')[0] ?? 'Hey'}
          </Text>
          <Text style={[styles.dateText, { color: mutedColor, fontFamily: fonts.bodyItalic }]}>{dateStr}</Text>

          {/* Macro rings (Cal-AI style) */}
          <View style={[styles.ringsRow, { borderTopColor: borderColor }]}>
            <MacroRing big value={todayNutrition.calories} target={profile?.calorie_target ?? 2000} color={accentColor} size={92} stroke={8} unit="kcal" label="Calories" />
            <View style={styles.smallRings}>
              <MacroRing value={todayNutrition.protein} target={profile?.protein_target ?? 150} color={c.blue} size={64} stroke={6} label="Protein" />
              <MacroRing value={todayNutrition.carbs} target={profile?.carb_target ?? 250} color={c.green} size={64} stroke={6} label="Carbs" />
              <MacroRing value={todayNutrition.fat} target={profile?.fat_target ?? 70} color={mutedColor} size={64} stroke={6} label="Fat" />
            </View>
          </View>
        </View>
        </FadeInView>

        {/* Progress bars */}
        <FadeInView delay={80}>
        <View style={[styles.section, { borderBottomColor: borderColor }]}>
          <ProgressBar label="Calories" value={todayNutrition.calories} target={profile?.calorie_target ?? 2000} unit="kcal" />
          <ProgressBar label="Protein" value={todayNutrition.protein} target={profile?.protein_target ?? 150} unit="g" color={c.blue} />
          <ProgressBar label="Carbs" value={todayNutrition.carbs} target={profile?.carb_target ?? 250} unit="g" color={c.green} />
          <ProgressBar label="Water" value={todayNutrition.water_ml} target={3000} unit="ml" color={c.water} />
        </View>
        </FadeInView>

        {/* Water quick-add */}
        <FadeInView delay={160}>
        <View style={[styles.section, { borderBottomColor: borderColor }]}>
          <Text style={[styles.sectionTitle, { color: mutedColor, fontFamily: fonts.sans }]}>Water — {waterLiters} / 3.0 L</Text>
          <View style={styles.waterRow}>
            {[250, 500, 750, 1000].map(ml => (
              <TouchableOpacity
                key={ml}
                onPress={() => { haptic.light(); addWater(user!.id, ml); }}
                activeOpacity={0.6}
                style={[styles.waterBtn, { borderColor, backgroundColor: surface }]}
              >
                <Text style={[styles.waterBtnText, { color: textColor, fontFamily: fonts.sans }]}>
                  {ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        </FadeInView>

        {/* Streak + activity heatmap */}
        <FadeInView delay={240}>
        <View style={[styles.section, { borderBottomColor: borderColor }]}>
          <View style={styles.streakRow}>
            <Text style={styles.streakFlame}>🔥</Text>
            <Text style={[styles.streakText, { color: textColor, fontFamily: fonts.body }]}>
              <Text style={{ color: accentColor, fontWeight: '700' }}>{streak.current} day</Text> workout streak
            </Text>
            <Text style={[styles.streakBest, { color: mutedColor, fontFamily: fonts.sans }]}>best {streak.longest}</Text>
          </View>
          <StreakHeatmap levels={activity} title="Food logging — last 18 weeks" />
          <TouchableOpacity onPress={() => navigation.navigate('WeeklyReport')} style={[styles.reportLink, { borderColor }]}>
            <Text style={[styles.reportLinkText, { color: accentColor, fontFamily: fonts.body }]}>✦ Weekly AI report</Text>
            <Text style={{ color: accentColor, fontSize: 16 }}>→</Text>
          </TouchableOpacity>
        </View>
        </FadeInView>

        {/* Today's meals */}
        <View style={[styles.sectionHeader, { borderBottomColor: borderColor }]}>
          <Text style={[styles.sectionTitle, { color: mutedColor, fontFamily: fonts.sans }]}>Meals today</Text>
        </View>
        {foodLoading
          ? [1, 2, 3].map(i => <SkeletonRow key={i} dark={dark} />)
          : todayLogs.length === 0
          ? <Text style={[styles.emptyText, { color: mutedColor, fontFamily: fonts.bodyItalic }]}>No meals logged yet</Text>
          : todayLogs.map(log => (
            <View key={log.id} style={[styles.foodRow, { borderBottomColor: borderColor }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.foodName, { color: textColor, fontFamily: fonts.body }]} numberOfLines={1}>
                  {log.caption ?? log.food_items?.map(i => i.name).join(', ') ?? 'Meal'}
                </Text>
                <Text style={[styles.foodTime, { color: mutedColor, fontFamily: fonts.sans }]}>
                  {log.meal_type.replace('_', ' ')} · {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <Text style={[styles.foodCal, { color: accentColor, fontFamily: fonts.sans }]}>
                {log.total_calories}
              </Text>
            </View>
          ))
        }

        {/* Today's workout */}
        {todayWorkout && (
          <>
            <View style={[styles.sectionHeader, { borderBottomColor: borderColor, marginTop: spacing.md }]}>
              <Text style={[styles.sectionTitle, { color: mutedColor, fontFamily: fonts.sans }]}>Today's workout</Text>
            </View>
            <View style={[styles.workoutCard, { backgroundColor: surface, borderColor }]}>
              <Text style={[styles.workoutName, { color: textColor, fontFamily: fonts.headingLoaded }]}>{todayWorkout.name}</Text>
              {todayWorkout.exercises?.map(ex => (
                <View key={ex.id} style={styles.exRow}>
                  <Text style={[styles.exName, { color: mutedColor, fontFamily: fonts.sans }]}>{ex.name}</Text>
                  <Text style={[styles.exSets, { color: textColor, fontFamily: fonts.mono }]}>
                    {ex.sets.map(s => `${s.weight_kg}×${s.reps}`).join('  ')}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: insets.bottom + spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: spacing.lg, paddingBottom: 0, borderBottomWidth: 1 },
  dayText: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  nameText: { fontSize: 30, letterSpacing: -0.5, lineHeight: 36 },
  dateText: { fontSize: 13, marginTop: 2, marginBottom: spacing.md },
  ringsRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, marginTop: spacing.sm, paddingTop: spacing.md, gap: spacing.md },
  smallRings: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  section: { padding: spacing.lg, gap: spacing.md, borderBottomWidth: 1 },
  sectionHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 6, borderBottomWidth: 1 },
  sectionTitle: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  waterRow: { flexDirection: 'row', gap: 8 },
  waterBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  waterBtnText: { fontSize: 12, letterSpacing: 0.5 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakFlame: { fontSize: 16 },
  streakText: { fontSize: 14, flex: 1 },
  streakBest: { fontSize: 11, letterSpacing: 0.5 },
  reportLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 4 },
  reportLinkText: { fontSize: 14 },
  foodRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 10, borderBottomWidth: 1, gap: 12 },
  foodName: { fontSize: 14 },
  foodTime: { fontSize: 11, marginTop: 2, letterSpacing: 0.3 },
  foodCal: { fontSize: 13, fontWeight: '700' },
  emptyText: { fontSize: 14, padding: spacing.lg, textAlign: 'center' },
  workoutCard: { margin: spacing.lg, marginTop: spacing.sm, padding: 14, borderRadius: 12, borderWidth: 1, gap: 8 },
  workoutName: { fontSize: 16, marginBottom: 4 },
  exRow: { gap: 2 },
  exName: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  exSets: { fontSize: 13 },
});
