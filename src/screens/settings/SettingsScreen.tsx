import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopBar } from '../../components/common/TopBar';
import { Button } from '../../components/common/Button';
import { AppBackground } from '../../components/common/AppBackground';
import { useTheme } from '../../theme/useTheme';
import { fonts, spacing, radius } from '../../theme';
import { THEME_LIST, ThemeMode } from '../../theme/themes';
import { GROQ_MODELS } from '../../lib/groq';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import { haptic } from '../../utils/haptics';
import { goalLabel } from '../../utils/nutrition';

const MODES: { key: ThemeMode; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'auto', label: 'Auto' },
];

export function SettingsScreen() {
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { themeName, mode, showDots, coachModel, setTheme, setMode, setShowDots, setCoachModel } = useThemeStore();
  const { signOut, user } = useAuthStore();
  const { profile, updateTargets, updateGoal } = useProfileStore();

  // editable daily goals
  const [cal, setCal] = useState(String(profile?.calorie_target ?? ''));
  const [pro, setPro] = useState(String(profile?.protein_target ?? ''));
  const [carb, setCarb] = useState(String(profile?.carb_target ?? ''));
  const [fat, setFat] = useState(String(profile?.fat_target ?? ''));
  const [savingGoals, setSavingGoals] = useState(false);
  const [goalsSaved, setGoalsSaved] = useState(false);

  const goalsDirty =
    cal !== String(profile?.calorie_target ?? '') ||
    pro !== String(profile?.protein_target ?? '') ||
    carb !== String(profile?.carb_target ?? '') ||
    fat !== String(profile?.fat_target ?? '');

  async function saveGoals() {
    if (!user || !profile) return;
    setSavingGoals(true);
    await updateTargets(user.id, {
      calorie_target: parseInt(cal, 10) || profile.calorie_target,
      protein_target: parseInt(pro, 10) || profile.protein_target,
      carb_target: parseInt(carb, 10) || profile.carb_target,
      fat_target: parseInt(fat, 10) || profile.fat_target,
    });
    setSavingGoals(false);
    setGoalsSaved(true);
    haptic.success();
    setTimeout(() => setGoalsSaved(false), 1800);
  }

  function confirmSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  }

  const goalFields: { key: string; label: string; value: string; set: (v: string) => void; unit: string }[] = [
    { key: 'cal', label: 'Calories', value: cal, set: setCal, unit: 'kcal' },
    { key: 'pro', label: 'Protein', value: pro, set: setPro, unit: 'g' },
    { key: 'carb', label: 'Carbs', value: carb, set: setCarb, unit: 'g' },
    { key: 'fat', label: 'Fat', value: fat, set: setFat, unit: 'g' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppBackground />
      <TopBar showBack onBack={() => navigation.goBack()} title="Settings" transparent />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>

        {/* Appearance */}
        <Text style={[styles.section, { color: c.textMuted }]}>Appearance</Text>

        {/* Mode segmented */}
        <View style={[styles.segment, { borderColor: c.border, backgroundColor: c.surface }]}>
          {MODES.map(m => (
            <TouchableOpacity
              key={m.key}
              onPress={() => { haptic.light(); setMode(m.key); }}
              style={[styles.segmentBtn, mode === m.key && { backgroundColor: c.accent }]}
            >
              <Text style={[styles.segmentText, { color: mode === m.key ? c.onAccent : c.textSecondary, fontFamily: fonts.sans }]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Theme cards */}
        <Text style={[styles.subLabel, { color: c.textMuted }]}>Theme</Text>
        <View style={styles.themeGrid}>
          {THEME_LIST.map(t => {
            const pal = isDark ? t.dark : t.light;
            const active = themeName === t.name;
            return (
              <TouchableOpacity
                key={t.name}
                onPress={() => { haptic.medium(); setTheme(t.name); }}
                activeOpacity={0.8}
                style={[styles.themeCard, { borderColor: active ? c.accent : c.border, backgroundColor: c.surface }]}
              >
                {/* mini preview */}
                <View style={[styles.preview, { backgroundColor: pal.bg, borderColor: pal.border }]}>
                  <View style={[styles.previewBar, { backgroundColor: pal.accent }]} />
                  <View style={[styles.previewLine, { backgroundColor: pal.text, width: '60%' }]} />
                  <View style={[styles.previewLine, { backgroundColor: pal.textMuted, width: '40%' }]} />
                  <View style={styles.previewDots}>
                    <View style={[styles.previewDot, { backgroundColor: pal.accent }]} />
                    <View style={[styles.previewDot, { backgroundColor: pal.blue }]} />
                    <View style={[styles.previewDot, { backgroundColor: pal.green }]} />
                  </View>
                </View>
                <View style={styles.themeMeta}>
                  <Text style={[styles.themeName, { color: c.text, fontFamily: fonts.headingLoaded }]}>{t.label}</Text>
                  {active && <Text style={[styles.activeTick, { color: c.accent }]}>✓</Text>}
                </View>
                <Text style={[styles.themeBlurb, { color: c.textMuted, fontFamily: fonts.bodyItalic }]} numberOfLines={2}>{t.blurb}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Background dots toggle */}
        <View style={[styles.toggleRow, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleTitle, { color: c.text, fontFamily: fonts.body }]}>Background dots</Text>
            <Text style={[styles.toggleSub, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>Animated drifting grid</Text>
          </View>
          <Switch
            value={showDots}
            onValueChange={(v) => { haptic.light(); setShowDots(v); }}
            trackColor={{ false: c.border, true: c.accent }}
            thumbColor={'#fff'}
          />
        </View>

        {/* AI Coach model */}
        <Text style={[styles.section, { color: c.textMuted, marginTop: spacing.lg }]}>AI Coach Model</Text>
        <Text style={[styles.sectionHint, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>Which Groq model answers your coach</Text>
        <View style={[styles.goalsCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          {GROQ_MODELS.map((m, i) => (
            <TouchableOpacity
              key={m.id}
              onPress={() => { haptic.light(); setCoachModel(m.id); }}
              style={[styles.modelRow, i > 0 && { borderTopColor: c.border, borderTopWidth: 1 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.modelName, { color: c.text, fontFamily: fonts.body }]}>{m.label}</Text>
                <Text style={[styles.modelBlurb, { color: c.textMuted, fontFamily: fonts.sans }]}>{m.blurb}</Text>
              </View>
              <View style={[styles.radio, { borderColor: coachModel === m.id ? c.accent : c.textMuted }]}>
                {coachModel === m.id && <View style={[styles.radioDot, { backgroundColor: c.accent }]} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reminders link */}
        <TouchableOpacity
          onPress={() => { haptic.light(); (navigation as any).navigate('Reminders'); }}
          style={[styles.linkRow, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleTitle, { color: c.text, fontFamily: fonts.body }]}>Reminders & Plans</Text>
            <Text style={[styles.toggleSub, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>Meal nudges, workout plans, water</Text>
          </View>
          <Text style={{ color: c.accent, fontSize: 18 }}>→</Text>
        </TouchableOpacity>

        {/* Goal */}
        <Text style={[styles.section, { color: c.textMuted, marginTop: spacing.lg }]}>Goal</Text>
        <Text style={[styles.sectionHint, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>Changing this recalculates your targets</Text>
        <View style={styles.goalChips}>
          {(['fat_loss', 'muscle_gain', 'recomp', 'maintenance'] as const).map(g => (
            <TouchableOpacity
              key={g}
              onPress={() => { if (user && profile?.goal !== g) { haptic.medium(); updateGoal(user.id, g); } }}
              style={[styles.goalChip, { borderColor: profile?.goal === g ? c.accent : c.border, backgroundColor: profile?.goal === g ? c.accentBg : c.surface }]}
            >
              <Text style={[styles.goalChipText, { color: profile?.goal === g ? c.accent : c.textSecondary, fontFamily: fonts.sans }]}>{goalLabel(g)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Daily Goals */}
        <Text style={[styles.section, { color: c.textMuted, marginTop: spacing.lg }]}>Daily Goals</Text>
        <Text style={[styles.sectionHint, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>Override your auto-calculated targets</Text>
        <View style={[styles.goalsCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          {goalFields.map((g, i) => (
            <View key={g.key} style={[styles.goalRow, i > 0 && { borderTopColor: c.border, borderTopWidth: 1 }]}>
              <Text style={[styles.goalLabel, { color: c.textSecondary, fontFamily: fonts.body }]}>{g.label}</Text>
              <View style={styles.goalInputWrap}>
                <TextInput
                  style={[styles.goalInput, { color: c.text, borderColor: c.border, backgroundColor: c.surfaceAlt, fontFamily: fonts.body }]}
                  value={g.value}
                  onChangeText={g.set}
                  keyboardType="number-pad"
                  placeholder="—"
                  placeholderTextColor={c.textMuted}
                />
                <Text style={[styles.goalUnit, { color: c.textMuted }]}>{g.unit}</Text>
              </View>
            </View>
          ))}
        </View>
        <Button
          label={goalsSaved ? 'Saved ✓' : 'Save goals'}
          onPress={saveGoals}
          loading={savingGoals}
          disabled={!goalsDirty && !goalsSaved}
          style={{ marginTop: spacing.sm }}
        />

        {/* Account */}
        <Text style={[styles.section, { color: c.textMuted, marginTop: spacing.lg }]}>Account</Text>
        <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoKey, { color: c.textMuted }]}>Name</Text>
            <Text style={[styles.infoVal, { color: c.text, fontFamily: fonts.body }]}>{profile?.full_name ?? '—'}</Text>
          </View>
          <View style={[styles.infoRow, { borderTopColor: c.border, borderTopWidth: 1 }]}>
            <Text style={[styles.infoKey, { color: c.textMuted }]}>Email</Text>
            <Text style={[styles.infoVal, { color: c.text, fontFamily: fonts.body }]} numberOfLines={1}>{user?.email ?? '—'}</Text>
          </View>
          <View style={[styles.infoRow, { borderTopColor: c.border, borderTopWidth: 1 }]}>
            <Text style={[styles.infoKey, { color: c.textMuted }]}>Goal</Text>
            <Text style={[styles.infoVal, { color: c.accent, fontFamily: fonts.body }]}>{profile ? goalLabel(profile.goal) : '—'}</Text>
          </View>
          <View style={[styles.infoRow, { borderTopColor: c.border, borderTopWidth: 1 }]}>
            <Text style={[styles.infoKey, { color: c.textMuted }]}>Daily target</Text>
            <Text style={[styles.infoVal, { color: c.text, fontFamily: fonts.body }]}>{profile?.calorie_target ?? '—'} kcal · {profile?.protein_target ?? '—'}g protein</Text>
          </View>
        </View>

        <Button label="Sign out" onPress={confirmSignOut} variant="outline" style={{ marginTop: spacing.md }} />

        <Text style={[styles.version, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>GymBuddy · v1.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.sm },
  section: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  sectionHint: { fontSize: 12, marginTop: -2, marginBottom: 6 },
  goalChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
  goalChipText: { fontSize: 13, letterSpacing: 0.3 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, padding: 14, marginTop: spacing.sm, gap: 12 },
  linkRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, padding: 14, marginTop: spacing.sm, gap: 12 },
  toggleTitle: { fontSize: 14 },
  toggleSub: { fontSize: 12, marginTop: 1 },
  goalsCard: { borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, gap: 12 },
  goalLabel: { fontSize: 14 },
  goalInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalInput: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 7, fontSize: 15, width: 90, textAlign: 'right' },
  goalUnit: { fontFamily: fonts.sans, fontSize: 11, width: 34 },
  modelRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  modelName: { fontSize: 14 },
  modelBlurb: { fontSize: 11, marginTop: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  subLabel: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: spacing.sm, marginBottom: 4 },
  segment: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, padding: 3, gap: 3 },
  segmentBtn: { flex: 1, paddingVertical: 9, borderRadius: radius.sm, alignItems: 'center' },
  segmentText: { fontSize: 13, letterSpacing: 0.5 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  themeCard: { width: '47.5%', borderWidth: 1, borderRadius: radius.md, padding: 10, gap: 6 },
  preview: { height: 76, borderRadius: radius.sm, borderWidth: 1, padding: 8, gap: 5, justifyContent: 'center' },
  previewBar: { height: 8, width: 28, borderRadius: 4 },
  previewLine: { height: 5, borderRadius: 3 },
  previewDots: { flexDirection: 'row', gap: 4, marginTop: 2 },
  previewDot: { width: 8, height: 8, borderRadius: 4 },
  themeMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  themeName: { fontSize: 15 },
  activeTick: { fontSize: 14, fontWeight: '700' },
  themeBlurb: { fontSize: 11, lineHeight: 15 },
  infoCard: { borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, gap: 12 },
  infoKey: { fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  infoVal: { fontSize: 14, flexShrink: 1, textAlign: 'right' },
  version: { fontSize: 12, textAlign: 'center', marginTop: spacing.lg },
});
