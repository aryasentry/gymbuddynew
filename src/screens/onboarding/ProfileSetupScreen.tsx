import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { AppBackground } from '../../components/common/AppBackground';
import { fonts, spacing, radius } from '../../theme';
import { useTheme } from '../../theme/useTheme';
import { Gender, ActivityLevel, Goal } from '../../types';

const GOALS: { key: Goal; label: string; desc: string }[] = [
  { key: 'fat_loss',    label: 'Fat Loss',     desc: 'Calorie deficit · lean out' },
  { key: 'muscle_gain', label: 'Muscle Gain',  desc: 'Calorie surplus · build mass' },
  { key: 'recomp',      label: 'Recomp',       desc: 'Lose fat, gain muscle together' },
  { key: 'maintenance', label: 'Maintenance',  desc: 'Stay at current weight' },
];

const ACTIVITY: { key: ActivityLevel; label: string }[] = [
  { key: 'sedentary',   label: 'Sedentary (desk job, no exercise)' },
  { key: 'light',       label: 'Light (1–2 workouts/week)' },
  { key: 'moderate',    label: 'Moderate (3–4 workouts/week)' },
  { key: 'active',      label: 'Active (5+ workouts/week)' },
  { key: 'very_active', label: 'Very Active (athlete/labor)' },
];

export function ProfileSetupScreen() {
  const { c, isDark } = useTheme();
  const dark = isDark;
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { saveProfile, loading } = useProfileStore();

  const [step, setStep] = useState(0);
  const [name, setName]         = useState('');
  const [height, setHeight]     = useState('');
  const [weight, setWeight]     = useState('');
  const [age, setAge]           = useState('');
  const [gender, setGender]     = useState<Gender>('male');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [goal, setGoal]         = useState<Goal>('fat_loss');
  const [error, setError]       = useState('');

  const bg = c.bg;
  const textColor = c.text;
  const mutedColor = c.textMuted;
  const accentColor = c.accent;
  const borderColor = c.border;

  function chip(label: string, active: boolean, onPress: () => void) {
    return (
      <TouchableOpacity
        key={label}
        onPress={onPress}
        style={[
          styles.chip,
          {
            borderColor: active ? accentColor : borderColor,
            backgroundColor: active ? c.accentBg : 'transparent',
          },
        ]}
      >
        <Text style={[styles.chipText, { color: active ? accentColor : mutedColor, fontFamily: fonts.sans }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  async function finish() {
    setError('');
    if (!name || !height || !weight || !age) { setError('Fill in all fields'); return; }
    const err = await saveProfile(user!.id, {
      full_name: name,
      height_cm: parseFloat(height),
      weight_kg: parseFloat(weight),
      age: parseInt(age, 10),
      gender,
      activity_level: activity,
      goal,
    });
    if (err) setError(err);
  }

  const steps = [
    // Step 0 — basics
    <View key="basics" style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: textColor, fontFamily: fonts.headingLoaded }]}>Tell us about you</Text>
      <Text style={[styles.stepSub, { color: mutedColor, fontFamily: fonts.bodyItalic }]}>Used to calculate your exact calorie targets</Text>
      <Input label="Full Name" value={name} onChangeText={setName} placeholder="Your name" />
      <View style={styles.row}>
        <Input label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="175" containerStyle={{ flex: 1 }} />
        <Input label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="72" containerStyle={{ flex: 1 }} />
      </View>
      <Input label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="25" />
      <Text style={[styles.fieldLabel, { color: mutedColor, fontFamily: fonts.sans }]}>Gender</Text>
      <View style={styles.chipRow}>
        {(['male', 'female', 'other'] as Gender[]).map(g => chip(g.charAt(0).toUpperCase() + g.slice(1), gender === g, () => setGender(g)))}
      </View>
    </View>,

    // Step 1 — activity
    <View key="activity" style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: textColor, fontFamily: fonts.headingLoaded }]}>Activity level</Text>
      <Text style={[styles.stepSub, { color: mutedColor, fontFamily: fonts.bodyItalic }]}>How active are you day to day?</Text>
      {ACTIVITY.map(a => (
        <TouchableOpacity
          key={a.key}
          onPress={() => setActivity(a.key)}
          style={[styles.optionRow, { borderColor: activity === a.key ? accentColor : borderColor, backgroundColor: activity === a.key ? c.accentBg : 'transparent' }]}
        >
          <View style={[styles.radio, { borderColor: activity === a.key ? accentColor : mutedColor }]}>
            {activity === a.key && <View style={[styles.radioDot, { backgroundColor: accentColor }]} />}
          </View>
          <Text style={[styles.optionText, { color: textColor, fontFamily: fonts.body }]}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>,

    // Step 2 — goal
    <View key="goal" style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: textColor, fontFamily: fonts.headingLoaded }]}>Your goal</Text>
      <Text style={[styles.stepSub, { color: mutedColor, fontFamily: fonts.bodyItalic }]}>We'll set your calories and macros accordingly</Text>
      {GOALS.map(g => (
        <TouchableOpacity
          key={g.key}
          onPress={() => setGoal(g.key)}
          style={[styles.goalCard, { borderColor: goal === g.key ? accentColor : borderColor, backgroundColor: goal === g.key ? c.accentBg : 'transparent' }]}
        >
          <Text style={[styles.goalLabel, { color: goal === g.key ? accentColor : textColor, fontFamily: fonts.headingLoaded }]}>{g.label}</Text>
          <Text style={[styles.goalDesc, { color: mutedColor, fontFamily: fonts.sans }]}>{g.desc}</Text>
        </TouchableOpacity>
      ))}
    </View>,
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, backgroundColor: bg }}>
        <AppBackground />
        {/* Progress dots */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: borderColor }]}>
          <Text style={[styles.logoText, { color: textColor, fontFamily: fonts.headingLoaded }]}>
            Gym<Text style={{ color: accentColor }}>Buddy</Text>
          </Text>
          <View style={styles.dotRow}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[styles.progressDot, { backgroundColor: i <= step ? accentColor : borderColor }]} />
            ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
          {steps[step]}
          {error ? <Text style={[styles.error, { fontFamily: fonts.sans }]}>{error}</Text> : null}
          <View style={styles.navRow}>
            {step > 0 && <Button label="Back" onPress={() => setStep(s => s - 1)} variant="ghost" style={{ flex: 1 }} />}
            {step < 2
              ? <Button label="Continue" onPress={() => setStep(s => s + 1)} style={{ flex: 1 }} />
              : <Button label="Let's go" onPress={finish} loading={loading} style={{ flex: 1 }} />
            }
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: spacing.lg, paddingBottom: 12, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoText: { fontSize: 20 },
  dotRow: { flexDirection: 'row', gap: 6 },
  progressDot: { width: 8, height: 8, borderRadius: 4 },
  scroll: { padding: spacing.lg, gap: spacing.md },
  stepContent: { gap: spacing.md },
  stepTitle: { fontSize: 26, letterSpacing: -0.5 },
  stepSub: { fontSize: 15, marginBottom: 4 },
  row: { flexDirection: 'row', gap: spacing.md },
  fieldLabel: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: -4 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10, borderWidth: 1 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 9, height: 9, borderRadius: 4.5 },
  optionText: { fontSize: 14, flex: 1 },
  goalCard: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 4 },
  goalLabel: { fontSize: 18 },
  goalDesc: { fontSize: 12, letterSpacing: 0.3 },
  navRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  error: { fontSize: 13, color: '#c0392b', textAlign: 'center' },
});
