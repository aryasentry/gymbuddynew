import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, useColorScheme } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useFoodStore } from '../../store/foodStore';
import { useProfileStore } from '../../store/profileStore';
import { TopBar } from '../../components/common/TopBar';
import { ProgressBar } from '../../components/common/ProgressBar';
import { SkeletonRow } from '../../components/common/LoadingScreen';
import { colors, fonts, spacing, radius } from '../../theme';
import { useTheme } from '../../theme/useTheme';
import { FoodStackParamList } from '../../types';
import { LogMealScreen } from './LogMealScreen';

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
  const { todayLogs, todayNutrition, loading, fetchToday, deleteLog } = useFoodStore();
  const [refreshing, setRefreshing] = React.useState(false);

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
                  onLongPress={() => confirmDelete(log.id)}
                  style={[styles.logRow, { borderBottomColor: borderColor }]}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.logName, { color: textColor, fontFamily: fonts.body }]} numberOfLines={2}>
                      {log.caption ?? log.food_items?.map(i => i.name).join(', ')}
                    </Text>
                    <View style={styles.macroRow}>
                      <Text style={[styles.macroChip, { color: dark ? colors.darkBlue : colors.blue, fontFamily: fonts.sans }]}>P {Math.round(log.total_protein)}g</Text>
                      <Text style={[styles.macroChip, { color: dark ? colors.darkGreen : colors.green, fontFamily: fonts.sans }]}>C {Math.round(log.total_carbs)}g</Text>
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
  logCal: { fontSize: 18, fontWeight: '700' },
  logCalUnit: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  correctionBadge: { marginTop: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  correctionText: { fontSize: 10 },
});
