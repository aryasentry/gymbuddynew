import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, spacing, radius } from '../../theme';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../common/Button';
import { generateWorkoutPlan } from '../../lib/groq';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { WorkoutPlan, Muscle } from '../../types';
import { haptic } from '../../utils/haptics';
import { musclesForExercise } from '../../utils/muscles';
import { MuscleMap } from './MuscleMap';

interface Props {
  visible: boolean;
  onClose: () => void;
  onStarted: () => void;
}

const EXAMPLES = [
  'heavy push day — bench, overhead press, dips, then 15 min treadmill incline walk',
  'leg day: squats 4x8, leg press, calf raises',
  '20 min treadmill run then 10 min cycling cooldown',
];

export function PlannerModal({ visible, onClose, onStarted }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const { createFromPlan, savePlan } = useWorkoutStore();
  const [saved, setSaved] = useState(false);

  const [text, setText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [error, setError] = useState('');

  async function generate() {
    if (!text.trim() || !profile) return;
    setError(''); setGenerating(true);
    try {
      const p = await generateWorkoutPlan(text.trim(), profile);
      setPlan(p);
    } catch (e: any) {
      setError(e.message?.includes('429') ? 'AI busy (rate limit). Try again.' : 'Could not parse a plan. Rephrase and retry.');
    } finally { setGenerating(false); }
  }

  async function start() {
    if (!plan || !user || !profile) return;
    setStarting(true);
    await createFromPlan(user.id, plan, profile.weight_kg);
    setStarting(false);
    haptic.success();
    reset();
    onStarted();
  }

  async function savePlanHandler() {
    if (!plan || !user) return;
    await savePlan(user.id, plan);
    setSaved(true);
    haptic.success();
  }

  function reset() { setText(''); setPlan(null); setError(''); setSaved(false); }

  const planMuscles = new Set<Muscle>();
  plan?.exercises.forEach(e => musclesForExercise(e.name).forEach(m => planMuscles.add(m)));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: c.surfaceAlt, borderColor: c.border, paddingBottom: insets.bottom + spacing.lg }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.headRow}>
              <Text style={[styles.title, { color: c.text, fontFamily: fonts.headingLoaded }]}>Plan with AI ✨</Text>
              <TouchableOpacity onPress={() => { reset(); onClose(); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={{ color: c.textMuted, fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.sub, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>
              Dump your workout idea — AI structures it into sets you can start and tick off.
            </Text>

            {!plan ? (
              <>
                <TextInput
                  style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text, fontFamily: fonts.body }]}
                  placeholder="e.g. push day: bench 4x8, incline DB press, dips, then 15 min treadmill incline walk"
                  placeholderTextColor={c.textMuted}
                  value={text}
                  onChangeText={setText}
                  multiline
                />
                <View style={styles.examples}>
                  {EXAMPLES.map(ex => (
                    <TouchableOpacity key={ex} onPress={() => setText(ex)} style={[styles.exChip, { borderColor: c.border }]}>
                      <Text style={[styles.exText, { color: c.textMuted, fontFamily: fonts.sans }]} numberOfLines={1}>{ex}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}
                <View style={styles.btns}>
                  <Button label="Cancel" onPress={() => { reset(); onClose(); }} variant="ghost" style={{ flex: 1 }} />
                  <Button label={generating ? 'Thinking…' : 'Generate'} onPress={generate} loading={generating} disabled={!text.trim()} style={{ flex: 1 }} />
                </View>
              </>
            ) : (
              <>
                <View style={[styles.planHead, { borderColor: c.border, backgroundColor: c.surface }]}>
                  <Text style={[styles.planCat, { color: c.accent }]}>{plan.category?.toUpperCase()}</Text>
                  <Text style={[styles.planName, { color: c.text, fontFamily: fonts.headingLoaded }]}>{plan.name}</Text>
                  <Text style={[styles.planDesc, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>{plan.description}</Text>
                </View>

                {plan.exercises.map((ex, i) => (
                  <View key={i} style={[styles.exRow, { borderBottomColor: c.border }]}>
                    <Text style={[styles.exName, { color: c.text, fontFamily: fonts.body }]}>{ex.name}</Text>
                    {ex.kind === 'cardio'
                      ? (ex.segments ?? []).map((s, j) => (
                        <Text key={j} style={[styles.exDetail, { color: c.textMuted, fontFamily: fonts.mono }]}>
                          {s.activity} {s.minutes}min{s.speed_kmh ? ` @${s.speed_kmh}km/h` : ''}{s.incline_pct ? ` ${s.incline_pct}%` : ''}{s.calories ? ` · ${s.calories} kcal` : ''}
                        </Text>
                      ))
                      : <Text style={[styles.exDetail, { color: c.textMuted, fontFamily: fonts.mono }]}>
                          {(ex.sets ?? []).map(s => `${s.weight_kg}×${s.reps}`).join('  ')}
                        </Text>
                    }
                  </View>
                ))}

                {/* muscle map preview of the whole plan */}
                <View style={{ marginTop: spacing.sm }}>
                  <MuscleMap active={planMuscles} />
                </View>

                <View style={styles.btns}>
                  <Button label="Redo" onPress={() => setPlan(null)} variant="ghost" style={{ flex: 1 }} />
                  <Button label={saved ? 'Saved ✓' : 'Save plan'} onPress={savePlanHandler} variant="outline" style={{ flex: 1 }} />
                  <Button label="Start" onPress={start} loading={starting} style={{ flex: 1 }} />
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: spacing.lg, maxHeight: '88%' },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22 },
  sub: { fontSize: 13, marginTop: 2, marginBottom: spacing.md, lineHeight: 18 },
  input: { borderWidth: 1, borderRadius: radius.md, padding: 14, fontSize: 15, minHeight: 90, textAlignVertical: 'top' },
  examples: { gap: 6, marginTop: 10 },
  exChip: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 7 },
  exText: { fontSize: 11 },
  error: { fontSize: 13, textAlign: 'center', marginTop: 8 },
  btns: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  planHead: { borderWidth: 1, borderRadius: radius.md, padding: 12, gap: 2, marginBottom: spacing.sm },
  planCat: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2 },
  planName: { fontSize: 18 },
  planDesc: { fontSize: 13 },
  exRow: { paddingVertical: 10, borderBottomWidth: 1, gap: 3 },
  exName: { fontSize: 15 },
  exDetail: { fontSize: 12, lineHeight: 17 },
});
