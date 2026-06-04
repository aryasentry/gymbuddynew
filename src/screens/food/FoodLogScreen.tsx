import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Image, Modal } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuthStore } from '../../store/authStore';
import { useFoodStore } from '../../store/foodStore';
import { useProfileStore } from '../../store/profileStore';
import { TopBar } from '../../components/common/TopBar';
import { ProgressBar } from '../../components/common/ProgressBar';
import { SkeletonRow } from '../../components/common/LoadingScreen';
import { MacroBars } from '../../components/food/MacroBars';
import { Button } from '../../components/common/Button';
import { fonts, spacing, radius } from '../../theme';
import { useTheme } from '../../theme/useTheme';
import { analyzeFoodImage } from '../../lib/groq';
import { FoodStackParamList, FoodLog } from '../../types';
import { LogMealScreen } from './LogMealScreen';

function logTotal(l: FoodLog) {
  return {
    calories: l.total_calories, protein: l.total_protein, carbs: l.total_carbs, fat: l.total_fat,
    fiber_g: l.total_fiber_g ?? 0, sugar_g: l.total_sugar_g ?? 0, sodium_mg: l.total_sodium_mg ?? 0,
    potassium_mg: l.total_potassium_mg ?? 0, calcium_mg: l.total_calcium_mg ?? 0, iron_mg: l.total_iron_mg ?? 0, vitamin_c_mg: l.total_vitamin_c_mg ?? 0,
  };
}

const Stack = createNativeStackNavigator<FoodStackParamList>();

export function FoodStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="FoodLog" component={FoodLogMain} />
      <Stack.Screen name="LogMeal" component={LogMealScreen} />
    </Stack.Navigator>
  );
}

function FoodLogMain() {
  const { c, isDark } = useTheme();
  const dark = isDark;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const { todayLogs, todayNutrition, loading, fetchToday, deleteLog, updateLogAnalysis } = useFoodStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const [selected, setSelected] = useState<FoodLog | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);

  async function reanalyse(log: FoodLog) {
    if (!log.image_url || !profile) { Alert.alert('No photo', 'This log has no saved photo to re-analyse.'); return; }
    setReanalyzing(true);
    try {
      const local = (FileSystem.cacheDirectory ?? '') + `reanalyse-${Date.now()}.jpg`;
      await FileSystem.downloadAsync(log.image_url, local);
      const b64 = await FileSystem.readAsStringAsync(local, { encoding: FileSystem.EncodingType.Base64 });
      const r = await analyzeFoodImage([b64], log.caption || 'food in image', profile);
      await updateLogAnalysis(log.id, r.items, r.total);
      setSelected(prev => prev && prev.id === log.id ? {
        ...prev, food_items: r.items,
        total_calories: r.total.calories, total_protein: r.total.protein, total_carbs: r.total.carbs, total_fat: r.total.fat,
        total_fiber_g: r.total.fiber_g ?? 0, total_sugar_g: r.total.sugar_g ?? 0, total_sodium_mg: r.total.sodium_mg ?? 0,
        total_potassium_mg: r.total.potassium_mg ?? 0, total_calcium_mg: r.total.calcium_mg ?? 0, total_iron_mg: r.total.iron_mg ?? 0, total_vitamin_c_mg: r.total.vitamin_c_mg ?? 0,
      } : prev);
    } catch (e: any) {
      Alert.alert('Re-analyse failed', e.message ?? 'Try again.');
    } finally {
      setReanalyzing(false);
    }
  }

  const bg = c.bg;
  const textColor = c.text;
  const mutedColor = c.textMuted;
  const borderColor = c.border;
  const accentColor = c.accent;
  const surface = c.surface;

  useFocusEffect(useCallback(() => { if (user?.id) fetchToday(user.id); }, [user?.id]));

  async function onRefresh() {
    setRefreshing(true);
    if (user?.id) await fetchToday(user.id);
    setRefreshing(false);
  }

  function confirmDelete(logId: string) {
    Alert.alert('Delete meal', 'Remove this meal from today\'s log?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteLog(logId) },
    ]);
  }

  const mealGroups: Record<string, typeof todayLogs> = {};
  for (const log of todayLogs) {
    if (!mealGroups[log.meal_type]) mealGroups[log.meal_type] = [];
    mealGroups[log.meal_type].push(log);
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <TopBar logo />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
      >
        {/* Macro summary */}
        <View style={[styles.summary, { borderBottomColor: borderColor }]}>
          <View style={styles.summaryRow}>
            {[
              { label: 'Calories', value: todayNutrition.calories, target: profile?.calorie_target ?? 2000 },
              { label: 'Protein', value: todayNutrition.protein, target: profile?.protein_target ?? 150 },
              { label: 'Carbs', value: todayNutrition.carbs, target: profile?.carb_target ?? 250 },
              { label: 'Fat', value: todayNutrition.fat, target: profile?.fat_target ?? 70 },
            ].map((m, i, arr) => (
              <View key={m.label} style={[styles.summaryCell, i < arr.length - 1 && { borderRightColor: borderColor, borderRightWidth: 1 }]}>
                <Text style={[styles.summaryVal, { color: accentColor, fontFamily: fonts.headingLoaded }]}>
                  {Math.round(m.value)}
                </Text>
                <Text style={[styles.summaryTarget, { color: mutedColor, fontFamily: fonts.sans }]}>/ {m.target}</Text>
                <Text style={[styles.summaryLabel, { color: mutedColor, fontFamily: fonts.sans }]}>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Log button */}
        <TouchableOpacity
          onPress={() => navigation.navigate('LogMeal')}
          style={[styles.logBtn, { borderColor: accentColor }]}
        >
          <Text style={[styles.logBtnText, { color: accentColor, fontFamily: fonts.body }]}>+ Log a meal</Text>
        </TouchableOpacity>

        {/* Meals by type */}
        {loading
          ? [1, 2, 3].map(i => <SkeletonRow key={i} dark={dark} />)
          : todayLogs.length === 0
          ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyTitle, { color: textColor, fontFamily: fonts.headingLoaded }]}>Nothing logged yet</Text>
              <Text style={[styles.emptySub, { color: mutedColor, fontFamily: fonts.bodyItalic }]}>
                Take a photo of your meal and let AI do the rest
              </Text>
            </View>
          )
          : Object.entries(mealGroups).map(([type, logs]) => (
            <View key={type}>
              <Text style={[styles.mealTypeLabel, { color: mutedColor, fontFamily: fonts.sans, borderBottomColor: borderColor }]}>
                {type.replace('_', ' ')}
              </Text>
              {logs.map(log => (
                <TouchableOpacity
                  key={log.id}
                  onPress={() => setSelected(log)}
                  onLongPress={() => confirmDelete(log.id)}
                  style={[styles.logRow, { borderBottomColor: borderColor }]}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.logName, { color: textColor, fontFamily: fonts.body }]} numberOfLines={2}>
                      {log.caption ?? log.food_items?.map(i => i.name).join(', ')}
                    </Text>
                    <View style={styles.macroRow}>
                      <Text style={[styles.macroChip, { color: c.blue, fontFamily: fonts.sans }]}>P {Math.round(log.total_protein)}g</Text>
                      <Text style={[styles.macroChip, { color: c.green, fontFamily: fonts.sans }]}>C {Math.round(log.total_carbs)}g</Text>
                      <Text style={[styles.macroChip, { color: mutedColor, fontFamily: fonts.sans }]}>F {Math.round(log.total_fat)}g</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.logCal, { color: accentColor, fontFamily: fonts.sans }]}>{log.total_calories}</Text>
                    <Text style={[styles.logCalUnit, { color: mutedColor, fontFamily: fonts.sans }]}>kcal</Text>
                    {log.user_correction && (
                      <View style={[styles.correctionBadge, { backgroundColor: c.accentBg }]}>
                        <Text style={[styles.correctionText, { color: accentColor, fontFamily: fonts.sans }]}>
                          {log.user_correction === 'accurate' ? '✓' : log.user_correction === 'too_high' ? '↓' : '↑'}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        }

        <View style={{ height: insets.bottom + spacing.xl }} />
      </ScrollView>

      {/* Log detail */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.detailOverlay}>
          <View style={[styles.detailSheet, { backgroundColor: c.surfaceAlt, borderColor: c.border, paddingBottom: insets.bottom + spacing.lg }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.detailHead}>
                <Text style={[styles.detailTitle, { color: c.text, fontFamily: fonts.headingLoaded }]} numberOfLines={2}>
                  {selected?.caption ?? 'Meal'}
                </Text>
                <TouchableOpacity onPress={() => setSelected(null)}><Text style={{ color: c.textMuted, fontSize: 18 }}>✕</Text></TouchableOpacity>
              </View>
              <Text style={[styles.detailMeta, { color: c.textMuted, fontFamily: fonts.sans }]}>
                {selected ? `${selected.meal_type.replace('_', ' ')} · ${new Date(selected.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}
              </Text>

              {selected?.image_url ? (
                <Image source={{ uri: selected.image_url }} style={[styles.detailImg, { borderColor: c.border }]} resizeMode="cover" />
              ) : null}

              {/* per-item breakdown */}
              {(selected?.food_items ?? []).map((it, i) => (
                <View key={i} style={[styles.detailItem, { borderBottomColor: c.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailItemName, { color: c.text, fontFamily: fonts.body }]}>{it.name} <Text style={{ color: c.textMuted, fontSize: 12 }}>· {it.quantity}{it.unit}</Text></Text>
                    <Text style={[styles.detailItemMacros, { color: c.textMuted, fontFamily: fonts.sans }]}>
                      P {Math.round(it.protein)}g · C {Math.round(it.carbs)}g · F {Math.round(it.fat)}g
                      {it.fiber_g ? ` · fiber ${Math.round(it.fiber_g)}g` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.detailItemCal, { color: c.accent, fontFamily: fonts.sans }]}>{Math.round(it.calories)}</Text>
                </View>
              ))}

              {/* macros + micros */}
              <View style={{ marginTop: spacing.md }}>
                {selected && <MacroBars total={logTotal(selected)} />}
              </View>
              {selected && !((selected.total_fiber_g ?? 0) || (selected.total_sodium_mg ?? 0) || (selected.total_iron_mg ?? 0)) && (
                <Text style={[styles.detailMeta, { color: c.textMuted, fontFamily: fonts.bodyItalic, textAlign: 'center', marginTop: 6 }]}>
                  Re-analyse to estimate micronutrients
                </Text>
              )}

              {selected?.user_correction ? (
                <Text style={[styles.detailMeta, { color: c.textMuted, fontFamily: fonts.bodyItalic, marginTop: spacing.sm }]}>
                  Your portion note: {selected.user_correction.replace('_', ' ')}
                </Text>
              ) : null}

              <View style={styles.detailBtns}>
                <Button label="Delete" onPress={() => { if (selected) { confirmDelete(selected.id); setSelected(null); } }} variant="ghost" style={{ flex: 1 }} />
                <Button label={reanalyzing ? 'Re-analysing…' : 'Re-analyse'} onPress={() => selected && reanalyse(selected)} loading={reanalyzing} disabled={!selected?.image_url} style={{ flex: 1 }} />
              </View>
              {!selected?.image_url && (
                <Text style={[styles.detailMeta, { color: c.textMuted, fontFamily: fonts.bodyItalic, textAlign: 'center', marginTop: 6 }]}>No saved photo — can't re-analyse</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { borderBottomWidth: 1 },
  summaryRow: { flexDirection: 'row' },
  summaryCell: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  summaryVal: { fontSize: 20, letterSpacing: -0.3 },
  summaryTarget: { fontSize: 11, marginTop: 1 },
  summaryLabel: { fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 1 },
  logBtn: { margin: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderRadius: radius.md, padding: 13, alignItems: 'center' },
  logBtnText: { fontSize: 15 },
  emptyWrap: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyTitle: { fontSize: 20 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  mealTypeLabel: { paddingHorizontal: spacing.lg, paddingVertical: 8, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', borderBottomWidth: 1 },
  logRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  logName: { fontSize: 14, lineHeight: 20 },
  macroRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  macroChip: { fontSize: 11 },
  detailOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  detailSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: spacing.lg, maxHeight: '88%' },
  detailHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  detailTitle: { fontSize: 20, letterSpacing: -0.3, flex: 1 },
  detailMeta: { fontSize: 12, letterSpacing: 0.3, marginTop: 2 },
  detailImg: { width: '100%', height: 200, borderRadius: radius.md, borderWidth: 1, marginTop: spacing.md },
  detailItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, marginTop: 2, gap: 10 },
  detailItemName: { fontSize: 14 },
  detailItemMacros: { fontSize: 11, marginTop: 3 },
  detailItemCal: { fontSize: 15, fontWeight: '700' },
  detailBtns: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  logCal: { fontSize: 18, fontWeight: '700' },
  logCalUnit: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  correctionBadge: { marginTop: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  correctionText: { fontSize: 10 },
});
