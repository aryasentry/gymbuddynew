import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { supabase } from '../../lib/supabase';
import { todayISO } from '../../utils/nutrition';
import { TopBar } from '../../components/common/TopBar';
import { Button } from '../../components/common/Button';
import { RestTimer } from '../../components/workout/RestTimer';
import { PlateCalculator } from '../../components/workout/PlateCalculator';
import { PlannerModal } from '../../components/workout/PlannerModal';
import { MuscleMap } from '../../components/workout/MuscleMap';
import { fonts, spacing, radius } from '../../theme';
import { useTheme } from '../../theme/useTheme';
import { epley1RM, bestSet, totalVolume, findLastTime, findPR, formatSets, cardioCalories, strengthCalories } from '../../utils/workout';
import { musclesWorked, musclesForExercise, MUSCLE_LABEL, ALL_MUSCLES } from '../../utils/muscles';
import { classifyMuscles } from '../../lib/groq';
import { haptic } from '../../utils/haptics';
import { WorkoutCategory, CardioActivity, ExerciseKind, Muscle } from '../../types';
import { ActivityIndicator } from 'react-native';

const QUICK_STRENGTH = ['Bench Press', 'Squat', 'Deadlift', 'Pull Up', 'Overhead Press', 'Barbell Row', 'Bicep Curl', 'Tricep Pushdown', 'Lat Pulldown', 'Leg Press'];
const QUICK_CARDIO = ['Treadmill', 'Cycling'];
const CATEGORIES: WorkoutCategory[] = ['push', 'pull', 'legs', 'fullbody', 'cardio', 'custom'];
const CARDIO_ACTS: CardioActivity[] = ['walk', 'run', 'sprint', 'incline', 'cycle'];

export function WorkoutScreen() {
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { profile, updateWeight } = useProfileStore();
  const {
    todayWorkout, workouts, streak, plans,
    fetchToday, fetchWorkouts, fetchStreak, fetchPlans, startPlan, deletePlan,
    createWorkout, updateWorkoutMeta, addExercise, addSet, toggleSet, deleteSet,
    addCardioSegment, deleteCardioSegment, deleteExercise, setExerciseMuscles,
  } = useWorkoutStore();

  const weight = profile?.weight_kg ?? 70;

  const [refreshing, setRefreshing] = useState(false);
  const [showNewWorkout, setShowNewWorkout] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutDesc, setWorkoutDesc] = useState('');
  const [category, setCategory] = useState<WorkoutCategory>('push');
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseKind, setExerciseKind] = useState<ExerciseKind>('strength');
  const [addingSet, setAddingSet] = useState<string | null>(null);
  const [setWeight, setSetWeight] = useState('');
  const [setReps, setSetReps] = useState('');
  const [addingCardio, setAddingCardio] = useState<string | null>(null);
  const [cAct, setCAct] = useState<CardioActivity>('run');
  const [cMin, setCMin] = useState('');
  const [cSpeed, setCSpeed] = useState('');
  const [cIncline, setCIncline] = useState('');
  const [showTimer, setShowTimer] = useState(false);
  const [showPlates, setShowPlates] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [showEditDesc, setShowEditDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [bw, setBw] = useState('');
  const [bwSaved, setBwSaved] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [finishMuscles, setFinishMuscles] = useState<Set<Muscle>>(new Set());
  const [classifying, setClassifying] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [musclePopup, setMusclePopup] = useState<{ name: string; muscles: Set<Muscle> } | null>(null);
  const [popupLoading, setPopupLoading] = useState(false);
  const [viewStart, setViewStart] = useState(false); // show start screen even when a session exists

  const showStartScreen = !todayWorkout || viewStart;

  async function openMuscles(ex: typeof todayWorkout extends null ? never : any) {
    haptic.light();
    const stored = (ex.muscles ?? []) as Muscle[];
    let muscles = stored.length ? stored : musclesForExercise(ex.name);
    setMusclePopup({ name: ex.name, muscles: new Set(muscles) });
    if (muscles.length === 0 && ex.kind !== 'cardio') {
      setPopupLoading(true);
      try {
        const map = await classifyMuscles([ex.name]);
        const found = ((Object.values(map)[0] ?? []) as string[]).filter(m => (ALL_MUSCLES as string[]).includes(m)) as Muscle[];
        if (found.length) {
          await setExerciseMuscles(ex.id, found);
          setMusclePopup({ name: ex.name, muscles: new Set(found) });
        }
      } catch {}
      setPopupLoading(false);
    }
  }

  async function startSavedPlan(p: typeof plans[number]) {
    if (!user) return;
    setShowPlans(false); setViewStart(false);
    await startPlan(user.id, p, weight);
    haptic.success();
  }

  async function logBodyWeight() {
    const w = parseFloat(bw);
    if (!w || !user) return;
    await supabase.from('weight_logs').upsert({ user_id: user.id, logged_at: todayISO(), weight_kg: w }, { onConflict: 'user_id,logged_at' });
    await updateWeight(user.id, w);
    setBw(''); setBwSaved(true); haptic.success();
    setTimeout(() => setBwSaved(false), 2000);
  }

  useFocusEffect(useCallback(() => {
    if (user?.id) { fetchToday(user.id); fetchWorkouts(user.id, 30); fetchStreak(user.id); fetchPlans(user.id); }
  }, [user?.id]));

  async function onRefresh() {
    setRefreshing(true);
    if (user?.id) await Promise.all([fetchToday(user.id), fetchWorkouts(user.id, 30), fetchStreak(user.id)]);
    setRefreshing(false);
  }

  async function handleCreateWorkout() {
    if (!workoutName.trim() || !user) return;
    await createWorkout(user.id, workoutName.trim(), workoutDesc.trim() || undefined, category);
    setWorkoutName(''); setWorkoutDesc(''); setShowNewWorkout(false); setViewStart(false);
  }

  async function handleAddExercise() {
    if (!exerciseName.trim() || !todayWorkout) return;
    await addExercise(todayWorkout.id, exerciseName.trim(), exerciseKind);
    setExerciseName(''); setExerciseKind('strength'); setShowAddExercise(false);
  }

  async function handleAddSet(exerciseId: string) {
    const w = parseFloat(setWeight); const r = parseInt(setReps, 10);
    if (isNaN(w) || !r) return;
    await addSet(exerciseId, w, r, true);
    setSetWeight(''); setSetReps(''); setAddingSet(null);
    setShowTimer(true);
    if (user?.id) fetchStreak(user.id);
  }

  async function handleAddCardio(exerciseId: string) {
    const min = parseFloat(cMin); if (!min) return;
    const speed = cSpeed ? parseFloat(cSpeed) : undefined;
    const incline = cIncline ? parseFloat(cIncline) : undefined;
    const cal = cardioCalories(cAct, min, weight, speed, incline);
    const order = todayWorkout?.exercises?.find(e => e.id === exerciseId)?.cardio_segments?.length ?? 0;
    await addCardioSegment(exerciseId, { activity: cAct, minutes: min, speed_kmh: speed ?? null, incline_pct: incline ?? null, calories: cal, sort_order: order });
    setCMin(''); setCSpeed(''); setCIncline(''); setAddingCardio(null);
  }

  async function saveDesc() {
    if (!todayWorkout) return;
    await updateWorkoutMeta(todayWorkout.id, { description: descDraft.trim() });
    setShowEditDesc(false);
  }

  const previousWorkouts = workouts.filter(w => w.id !== todayWorkout?.id);
  const recentPrevious = previousWorkouts.slice(0, 5);

  const cardioTotal = (todayWorkout?.exercises ?? [])
    .flatMap(e => e.cardio_segments ?? [])
    .reduce((s, seg) => s + (seg.calories || 0), 0);

  const allStrengthSets = (todayWorkout?.exercises ?? []).filter(e => e.kind !== 'cardio').flatMap(e => e.sets);
  const doneSets = allStrengthSets.filter(s => s.completed).length;
  const totalSets = allStrengthSets.length;
  const totalVol = allStrengthSets.filter(s => s.completed).reduce((a, s) => a + s.weight_kg * s.reps, 0);
  const burnSets = allStrengthSets.filter(s => s.completed && s.reps > 1).length;
  const strengthBurn = strengthCalories(burnSets, weight);
  const totalBurn = strengthBurn + cardioTotal;

  async function finishSession() {
    haptic.success();
    // local muscle map from completed exercises
    const local = musclesWorked(todayWorkout);
    setFinishMuscles(local);
    setShowFinish(true);
    // unknown completed exercises → let AI classify their muscles (generates the red regions)
    const unknown = (todayWorkout?.exercises ?? []).filter(e => {
      const done = e.kind === 'cardio' ? (e.cardio_segments ?? []).length > 0 : e.sets.some(s => s.completed);
      return done && e.kind !== 'cardio' && musclesForExercise(e.name).length === 0;
    }).map(e => e.name);
    if (unknown.length === 0) return;
    setClassifying(true);
    try {
      const map = await classifyMuscles(unknown);
      const merged = new Set<Muscle>(local);
      Object.values(map).flat().forEach(m => { if (m && (ALL_MUSCLES as string[]).includes(m)) merged.add(m as Muscle); });
      setFinishMuscles(merged);
    } catch { /* keep local */ }
    setClassifying(false);
  }

  function inputStyle() {
    return { backgroundColor: c.surface, borderColor: c.border, color: c.text, fontFamily: fonts.body };
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TopBar logo right={
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setShowPlans(true)}><Text style={{ fontSize: 17, color: c.text }}>📋</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setShowPlanner(true)}><Text style={{ fontSize: 16, color: c.text }}>✨</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setShowPlates(true)}><Text style={{ fontSize: 17, color: c.text }}>🏋</Text></TouchableOpacity>
          {showStartScreen
            ? <TouchableOpacity onPress={() => setShowNewWorkout(true)}><Text style={{ fontSize: 22, color: c.accent }}>+</Text></TouchableOpacity>
            : (
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                <TouchableOpacity onPress={() => setShowAddExercise(true)}><Text style={{ fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1, color: c.accent }}>+ EXERCISE</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setViewStart(true)}><Text style={{ fontSize: 18, color: c.textMuted }}>✕</Text></TouchableOpacity>
              </View>
            )}
        </View>
      } />

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}>

        {streak.current > 0 && (
          <View style={[styles.streakBanner, { borderBottomColor: c.border }]}>
            <Text style={[styles.streakFlame, { color: c.accent }]}>🔥</Text>
            <Text style={[styles.streakText, { color: c.text, fontFamily: fonts.body }]}>
              <Text style={{ color: c.accent, fontWeight: '700' }}>{streak.current} day</Text> workout streak
            </Text>
            <Text style={[styles.streakBest, { color: c.textMuted, fontFamily: fonts.sans }]}>best {streak.longest}</Text>
          </View>
        )}

        {showStartScreen ? (
          <View style={styles.emptyWrap}>
            {todayWorkout && (
              <Button label={`▸ Resume ${todayWorkout.name}`} onPress={() => setViewStart(false)} style={{ marginBottom: spacing.md, alignSelf: 'stretch' }} />
            )}
            <Text style={[styles.emptyTitle, { color: c.text, fontFamily: fonts.headingLoaded }]}>{todayWorkout ? 'Start another' : 'No workout today'}</Text>
            <Text style={[styles.emptySub, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>Plan one with AI, browse 📋 plans, or start an empty session.</Text>
            <Button label="✨ Plan with AI" onPress={() => setShowPlanner(true)} style={{ marginTop: spacing.lg }} />
            <Button label="Start empty session" onPress={() => setShowNewWorkout(true)} variant="outline" style={{ marginTop: spacing.sm }} />
          </View>
        ) : (
          <>
            <View style={[styles.workoutHero, { borderBottomColor: c.border }]}>
              <View style={styles.heroTop}>
                <Text style={[styles.workoutSub, { color: c.textMuted, fontFamily: fonts.sans }]}>
                  Today{todayWorkout.category ? ` · ${todayWorkout.category}` : ''}
                </Text>
                {totalBurn > 0 && <Text style={[styles.cardioTotal, { color: c.accent, fontFamily: fonts.sans }]}>~{totalBurn} kcal burned</Text>}
              </View>
              <Text style={[styles.workoutTitle, { color: c.text, fontFamily: fonts.headingLoaded }]}>{todayWorkout.name}</Text>
              <TouchableOpacity onPress={() => { setDescDraft(todayWorkout.description ?? ''); setShowEditDesc(true); }}>
                <Text style={[styles.workoutDesc, { color: todayWorkout.description ? c.textMuted : c.accent, fontFamily: fonts.bodyItalic }]}>
                  {todayWorkout.description || '+ Add a note / mini-description'}
                </Text>
              </TouchableOpacity>
              {totalSets > 0 && (
                <View style={styles.progWrap}>
                  <View style={[styles.progTrack, { backgroundColor: c.border }]}>
                    <View style={[styles.progFill, { backgroundColor: c.accent, width: `${(doneSets / totalSets) * 100}%` }]} />
                  </View>
                  <Text style={[styles.progText, { color: c.textMuted, fontFamily: fonts.sans }]}>{doneSets}/{totalSets} sets done</Text>
                </View>
              )}
            </View>

            {(todayWorkout.exercises ?? []).map(ex => {
              const isCardio = ex.kind === 'cardio';
              // strength stats
              const last = !isCardio ? findLastTime(workouts, ex.name, todayWorkout.id) : null;
              const prevPR = !isCardio ? findPR(previousWorkouts, ex.name) : null;
              const today = !isCardio ? bestSet(ex.sets) : null;
              const est1RM = today ? epley1RM(today.weight_kg, today.reps) : null;
              const completedSets = ex.sets.filter(s => s.completed);
              const isNewPR = today && today.completed && (!prevPR || today.weight_kg > prevPR.weight_kg) && completedSets.length > 0;
              const segs = ex.cardio_segments ?? [];
              const exCal = segs.reduce((s, x) => s + (x.calories || 0), 0);

              return (
                <View key={ex.id} style={[styles.exerciseBlock, { borderBottomColor: c.border }]}>
                  <View style={styles.exHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.exNameRow}>
                        <TouchableOpacity onPress={() => openMuscles(ex)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                          <Text style={[styles.exName, { color: c.text, fontFamily: fonts.headingLoaded }]}>{ex.name} <Text style={{ color: c.accent, fontSize: 13 }}>◗</Text></Text>
                        </TouchableOpacity>
                        {isCardio && <Text style={[styles.kindTag, { color: c.water, borderColor: c.border }]}>CARDIO</Text>}
                        {!isCardio && ex.sets.length > 0 && (
                          <Text style={[styles.setProgress, { color: completedSets.length === ex.sets.length ? c.green : c.textMuted, fontFamily: fonts.sans }]}>
                            {completedSets.length}/{ex.sets.length}
                          </Text>
                        )}
                        {isNewPR && <View style={[styles.prBadge, { backgroundColor: c.accentBg, borderColor: c.accent }]}><Text style={[styles.prText, { color: c.accent }]}>🏆 PR</Text></View>}
                      </View>
                      {!isCardio && (last
                        ? <Text style={[styles.lastTime, { color: c.textMuted, fontFamily: fonts.sans }]}>Last ({new Date(last.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}): {formatSets(last.sets)}</Text>
                        : <Text style={[styles.lastTime, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>First time logging this</Text>)}
                      {isCardio && exCal > 0 && <Text style={[styles.lastTime, { color: c.accent, fontFamily: fonts.sans }]}>~{exCal} kcal burned</Text>}
                    </View>
                    <TouchableOpacity onPress={() => Alert.alert('Delete exercise', `Remove ${ex.name}?`, [
                      { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteExercise(ex.id!) },
                    ])}><Text style={{ color: c.textMuted, fontSize: 16 }}>✕</Text></TouchableOpacity>
                  </View>

                  {/* STRENGTH */}
                  {!isCardio && (
                    <>
                      {ex.sets.map((s, idx) => (
                        <TouchableOpacity
                          key={s.id ?? idx}
                          onPress={() => toggleSet(s.id!, ex.id!, !s.completed)}
                          onLongPress={() => Alert.alert('Delete set', undefined, [
                            { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteSet(s.id!, ex.id!) },
                          ])}
                          style={[styles.setRow, {
                            backgroundColor: s.completed ? c.accentBg : 'transparent',
                            borderColor: s.completed ? c.accentBorder : c.border,
                          }]}
                        >
                          <View style={styles.setLeft}>
                            <Text style={[styles.checkbox, { color: s.completed ? c.accent : c.textMuted }]}>{s.completed ? '✓' : '○'}</Text>
                            <Text style={[styles.setIndex, { color: c.textMuted, fontFamily: fonts.sans }]}>Set {idx + 1}</Text>
                          </View>
                          <Text style={[styles.setData, { color: s.completed ? c.text : c.textMuted, fontFamily: fonts.mono }]}>{s.weight_kg} kg × {s.reps}</Text>
                        </TouchableOpacity>
                      ))}

                      {completedSets.length > 0 && (
                        <View style={styles.statsRow}>
                          {est1RM ? <Text style={[styles.statChip, { color: c.textMuted, fontFamily: fonts.sans }]}>est 1RM <Text style={{ color: c.accent, fontWeight: '700' }}>{est1RM} kg</Text></Text> : null}
                          <Text style={[styles.statChip, { color: c.textMuted, fontFamily: fonts.sans }]}>volume <Text style={{ color: c.text }}>{totalVolume(completedSets)} kg</Text></Text>
                        </View>
                      )}

                      {addingSet === ex.id ? (
                        <View style={styles.addSetRow}>
                          <TextInput style={[styles.miniInput, inputStyle()]} placeholder="kg" placeholderTextColor={c.textMuted} value={setWeight} onChangeText={setSetWeight} keyboardType="decimal-pad" autoFocus />
                          <TextInput style={[styles.miniInput, inputStyle()]} placeholder="reps" placeholderTextColor={c.textMuted} value={setReps} onChangeText={setSetReps} keyboardType="number-pad" />
                          <TouchableOpacity onPress={() => handleAddSet(ex.id!)} style={[styles.iconBtn, { backgroundColor: c.accent }]}><Text style={{ color: c.onAccent, fontSize: 14 }}>✓</Text></TouchableOpacity>
                          <TouchableOpacity onPress={() => setAddingSet(null)} style={[styles.iconBtn, { backgroundColor: c.border }]}><Text style={{ color: c.text, fontSize: 14 }}>✕</Text></TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity onPress={() => {
                          const lastSet = ex.sets[ex.sets.length - 1] ?? last?.sets[last.sets.length - 1];
                          if (lastSet) { setSetWeight(String(lastSet.weight_kg)); setSetReps(String(lastSet.reps)); }
                          setAddingSet(ex.id!);
                        }} style={[styles.dashBtn, { borderColor: c.border }]}>
                          <Text style={[styles.dashLabel, { color: c.accent }]}>+ Add set</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}

                  {/* CARDIO */}
                  {isCardio && (
                    <>
                      {segs.map((seg, idx) => (
                        <TouchableOpacity key={seg.id ?? idx}
                          onLongPress={() => Alert.alert('Delete segment', undefined, [
                            { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteCardioSegment(seg.id!, ex.id!) },
                          ])}
                          style={[styles.setRow, { backgroundColor: c.accentBg, borderColor: c.accentBorder }]}>
                          <Text style={[styles.setData, { color: c.text, fontFamily: fonts.mono, flex: 1 }]}>
                            {seg.activity} · {seg.minutes}min{seg.speed_kmh ? ` @${seg.speed_kmh}km/h` : ''}{seg.incline_pct ? ` ${seg.incline_pct}%` : ''}
                          </Text>
                          <Text style={[styles.segCal, { color: c.accent, fontFamily: fonts.sans }]}>{seg.calories} kcal</Text>
                        </TouchableOpacity>
                      ))}

                      {addingCardio === ex.id ? (
                        <View style={styles.cardioForm}>
                          <View style={styles.actRow}>
                            {CARDIO_ACTS.map(a => (
                              <TouchableOpacity key={a} onPress={() => setCAct(a)} style={[styles.actChip, { borderColor: cAct === a ? c.accent : c.border, backgroundColor: cAct === a ? c.accentBg : 'transparent' }]}>
                                <Text style={[styles.actText, { color: cAct === a ? c.accent : c.textMuted }]}>{a}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          <View style={styles.cardioInputs}>
                            <TextInput style={[styles.miniInput, inputStyle()]} placeholder="min" placeholderTextColor={c.textMuted} value={cMin} onChangeText={setCMin} keyboardType="decimal-pad" autoFocus />
                            <TextInput style={[styles.miniInput, inputStyle()]} placeholder="km/h" placeholderTextColor={c.textMuted} value={cSpeed} onChangeText={setCSpeed} keyboardType="decimal-pad" />
                            {cAct !== 'cycle' && <TextInput style={[styles.miniInput, inputStyle()]} placeholder="slope%" placeholderTextColor={c.textMuted} value={cIncline} onChangeText={setCIncline} keyboardType="decimal-pad" />}
                            <TouchableOpacity onPress={() => handleAddCardio(ex.id!)} style={[styles.iconBtn, { backgroundColor: c.accent }]}><Text style={{ color: c.onAccent, fontSize: 14 }}>✓</Text></TouchableOpacity>
                          </View>
                          {cMin ? <Text style={[styles.estCal, { color: c.textMuted, fontFamily: fonts.sans }]}>≈ {cardioCalories(cAct, parseFloat(cMin) || 0, weight, cSpeed ? parseFloat(cSpeed) : undefined, cIncline ? parseFloat(cIncline) : undefined)} kcal</Text> : null}
                        </View>
                      ) : (
                        <TouchableOpacity onPress={() => { setCAct(ex.name.toLowerCase().includes('cycl') ? 'cycle' : 'run'); setAddingCardio(ex.id!); }} style={[styles.dashBtn, { borderColor: c.border }]}>
                          <Text style={[styles.dashLabel, { color: c.accent }]}>+ Add segment</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              );
            })}

            {(todayWorkout.exercises ?? []).length === 0 ? (
              <Text style={[styles.noExText, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>No exercises yet — tap "+ Exercise" or plan with AI.</Text>
            ) : (
              <View style={{ padding: spacing.lg, gap: spacing.md }}>
                {/* Post-gym bodyweight (you weigh at the gym) */}
                <View style={[styles.bwCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bwTitle, { color: c.text, fontFamily: fonts.body }]}>Bodyweight today</Text>
                    <Text style={[styles.bwSub, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>
                      {bwSaved ? 'Saved ✓' : `Weigh in after your session${profile?.weight_kg ? ` · last ${profile.weight_kg}kg` : ''}`}
                    </Text>
                  </View>
                  <TextInput
                    style={[styles.bwInput, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text, fontFamily: fonts.body }]}
                    placeholder="kg" placeholderTextColor={c.textMuted} value={bw} onChangeText={setBw} keyboardType="decimal-pad"
                  />
                  <TouchableOpacity onPress={logBodyWeight} style={[styles.bwBtn, { backgroundColor: c.accent }]}>
                    <Text style={{ color: c.onAccent, fontFamily: fonts.sans, fontSize: 12 }}>Log</Text>
                  </TouchableOpacity>
                </View>
                <Button label="Finish session" onPress={finishSession} variant="outline" />
              </View>
            )}
          </>
        )}

        {recentPrevious.length > 0 && (
          <>
            <Text style={[styles.prevLabel, { color: c.textMuted, fontFamily: fonts.sans, borderBottomColor: c.border, marginTop: spacing.lg }]}>Previous workouts</Text>
            {recentPrevious.map(w => (
              <View key={w.id} style={[styles.prevWorkout, { borderBottomColor: c.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.prevName, { color: c.text, fontFamily: fonts.body }]}>{w.name}{w.category ? ` · ${w.category}` : ''}</Text>
                  <Text style={[styles.prevDate, { color: c.textMuted, fontFamily: fonts.sans }]}>{new Date(w.logged_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
                </View>
                <Text style={[styles.prevExCount, { color: c.textMuted, fontFamily: fonts.sans }]}>{w.exercises?.length ?? 0} exercises</Text>
              </View>
            ))}
          </>
        )}

        <View style={{ height: insets.bottom + (showTimer ? 180 : spacing.xl) }} />
      </ScrollView>

      {showTimer && <RestTimer seconds={90} onDismiss={() => setShowTimer(false)} />}
      <PlateCalculator visible={showPlates} onClose={() => setShowPlates(false)} />
      <PlannerModal visible={showPlanner} onClose={() => setShowPlanner(false)} onStarted={() => { setShowPlanner(false); setViewStart(false); }} />

      {/* Saved plans */}
      <Modal visible={showPlans} transparent animationType="slide" onRequestClose={() => setShowPlans(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.modalTitle, { color: c.text, fontFamily: fonts.headingLoaded }]}>My plans</Text>
              <TouchableOpacity onPress={() => { setShowPlans(false); setShowPlanner(true); }}>
                <Text style={{ color: c.accent, fontFamily: fonts.sans, fontSize: 12, letterSpacing: 1 }}>+ NEW (AI)</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {plans.length === 0 ? (
                <Text style={[styles.noExText, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>No saved plans. Make one with ✨ Plan with AI → Save plan.</Text>
              ) : plans.map(p => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => startSavedPlan(p)}
                  onLongPress={() => Alert.alert('Delete plan', p.name, [
                    { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deletePlan(p.id) },
                  ])}
                  style={[styles.planRow, { borderColor: c.border, backgroundColor: c.surface }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planRowName, { color: c.text, fontFamily: fonts.body }]}>{p.name}{p.category ? ` · ${p.category}` : ''}</Text>
                    <Text style={[styles.planRowMeta, { color: c.textMuted, fontFamily: fonts.sans }]}>
                      {(p.plan.exercises ?? []).length} exercises{p.use_count ? ` · used ${p.use_count}×` : ''}
                    </Text>
                  </View>
                  <Text style={{ color: c.accent, fontSize: 16 }}>▶</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button label="Close" onPress={() => setShowPlans(false)} variant="ghost" />
          </View>
        </View>
      </Modal>

      {/* Per-exercise muscle popup */}
      <Modal visible={!!musclePopup} transparent animationType="fade" onRequestClose={() => setMusclePopup(null)}>
        <TouchableOpacity style={styles.popOverlay} activeOpacity={1} onPress={() => setMusclePopup(null)}>
          <View style={[styles.popCard, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.text, fontFamily: fonts.headingLoaded }]}>{musclePopup?.name}</Text>
            {musclePopup && <MuscleMap active={musclePopup.muscles} width={260} />}
            {popupLoading && (
              <View style={styles.classifyRow}><ActivityIndicator size="small" color={c.accent} /><Text style={[styles.finishStats, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>AI mapping…</Text></View>
            )}
            <View style={styles.muscleChips}>
              {musclePopup && [...musclePopup.muscles].map(m => (
                <View key={m} style={[styles.muscleChip, { backgroundColor: c.accentBg, borderColor: c.accentBorder }]}>
                  <Text style={[styles.muscleChipText, { color: c.accent, fontFamily: fonts.sans }]}>{MUSCLE_LABEL[m]}</Text>
                </View>
              ))}
              {musclePopup && musclePopup.muscles.size === 0 && !popupLoading && (
                <Text style={[styles.finishStats, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>Cardio / no specific muscle</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Finish analysis — muscle map of what was worked */}
      <Modal visible={showFinish} transparent animationType="slide" onRequestClose={() => setShowFinish(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: c.text, fontFamily: fonts.headingLoaded }]}>Workout complete ✓</Text>
              <Text style={[styles.finishStats, { color: c.textMuted, fontFamily: fonts.sans }]}>
                {doneSets}/{totalSets} sets{totalVol > 0 ? ` · ${totalVol} kg volume` : ''}{totalBurn > 0 ? ` · ~${totalBurn} kcal burned` : ''}
              </Text>

              <MuscleMap active={finishMuscles} />

              {classifying && (
                <View style={styles.classifyRow}>
                  <ActivityIndicator size="small" color={c.accent} />
                  <Text style={[styles.finishStats, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>AI mapping new exercises…</Text>
                </View>
              )}

              <View style={styles.muscleChips}>
                {[...finishMuscles].map(m => (
                  <View key={m} style={[styles.muscleChip, { backgroundColor: c.accentBg, borderColor: c.accentBorder }]}>
                    <Text style={[styles.muscleChipText, { color: c.accent, fontFamily: fonts.sans }]}>{MUSCLE_LABEL[m]}</Text>
                  </View>
                ))}
                {finishMuscles.size === 0 && !classifying && (
                  <Text style={[styles.finishStats, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>Complete some sets to map muscles.</Text>
                )}
              </View>

              <Text style={[styles.finishNote, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>
                Saved to your history & PRs. Reopen anytime to keep editing.
              </Text>
              <Button label="Done" onPress={() => setShowFinish(false)} style={{ marginTop: spacing.sm }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* New workout modal */}
      <Modal visible={showNewWorkout} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.text, fontFamily: fonts.headingLoaded }]}>New workout</Text>
            <View style={styles.quickNames}>
              {['Push Day', 'Pull Day', 'Leg Day', 'Full Body', 'Cardio'].map(n => (
                <TouchableOpacity key={n} onPress={() => setWorkoutName(n)} style={[styles.quickChip, { borderColor: workoutName === n ? c.accent : c.border }]}>
                  <Text style={{ color: workoutName === n ? c.accent : c.textMuted, fontFamily: fonts.sans, fontSize: 12 }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Category</Text>
            <View style={styles.quickNames}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity key={cat} onPress={() => setCategory(cat)} style={[styles.quickChip, { borderColor: category === cat ? c.accent : c.border, backgroundColor: category === cat ? c.accentBg : 'transparent' }]}>
                  <Text style={{ color: category === cat ? c.accent : c.textMuted, fontFamily: fonts.sans, fontSize: 12 }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[styles.modalInput, inputStyle()]} placeholder="Name..." placeholderTextColor={c.textMuted} value={workoutName} onChangeText={setWorkoutName} />
            <TextInput style={[styles.modalInput, inputStyle()]} placeholder="Mini-description (optional)" placeholderTextColor={c.textMuted} value={workoutDesc} onChangeText={setWorkoutDesc} />
            <View style={styles.modalBtns}>
              <Button label="Cancel" onPress={() => setShowNewWorkout(false)} variant="ghost" style={{ flex: 1 }} />
              <Button label="Start" onPress={handleCreateWorkout} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add exercise modal */}
      <Modal visible={showAddExercise} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.text, fontFamily: fonts.headingLoaded }]}>Add exercise</Text>
            <View style={styles.segToggle}>
              {(['strength', 'cardio'] as ExerciseKind[]).map(k => (
                <TouchableOpacity key={k} onPress={() => { setExerciseKind(k); setExerciseName(''); }} style={[styles.segBtn, { borderColor: exerciseKind === k ? c.accent : c.border, backgroundColor: exerciseKind === k ? c.accentBg : 'transparent' }]}>
                  <Text style={{ color: exerciseKind === k ? c.accent : c.textMuted, fontFamily: fonts.sans, fontSize: 13, textTransform: 'capitalize' }}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
              {(exerciseKind === 'cardio' ? QUICK_CARDIO : QUICK_STRENGTH).map(n => (
                <TouchableOpacity key={n} onPress={() => setExerciseName(n)} style={[styles.quickChip, { borderColor: exerciseName === n ? c.accent : c.border, marginRight: 8 }]}>
                  <Text style={{ color: exerciseName === n ? c.accent : c.textMuted, fontFamily: fonts.sans, fontSize: 12 }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput style={[styles.modalInput, inputStyle()]} placeholder="Or type a name..." placeholderTextColor={c.textMuted} value={exerciseName} onChangeText={setExerciseName} />
            <View style={styles.modalBtns}>
              <Button label="Cancel" onPress={() => setShowAddExercise(false)} variant="ghost" style={{ flex: 1 }} />
              <Button label="Add" onPress={handleAddExercise} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit description modal */}
      <Modal visible={showEditDesc} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.text, fontFamily: fonts.headingLoaded }]}>Workout note</Text>
            <TextInput style={[styles.modalInput, inputStyle(), { minHeight: 70, textAlignVertical: 'top' }]} placeholder="e.g. felt strong, bumped bench." placeholderTextColor={c.textMuted} value={descDraft} onChangeText={setDescDraft} multiline />
            <View style={styles.modalBtns}>
              <Button label="Cancel" onPress={() => setShowEditDesc(false)} variant="ghost" style={{ flex: 1 }} />
              <Button label="Save" onPress={saveDesc} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  streakBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.lg, paddingVertical: 10, borderBottomWidth: 1 },
  streakFlame: { fontSize: 16 },
  streakText: { fontSize: 14, flex: 1 },
  streakBest: { fontSize: 11, letterSpacing: 0.5 },
  emptyWrap: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyTitle: { fontSize: 22 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  workoutHero: { padding: spacing.lg, paddingBottom: 12, borderBottomWidth: 1 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workoutSub: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  cardioTotal: { fontSize: 11, letterSpacing: 0.3 },
  workoutTitle: { fontSize: 24, letterSpacing: -0.3 },
  workoutDesc: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  progWrap: { marginTop: 10, gap: 4 },
  progTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progFill: { height: '100%', borderRadius: 2 },
  progText: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  setProgress: { fontSize: 12, fontWeight: '700' },
  bwCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, padding: 12, gap: 10 },
  bwTitle: { fontSize: 14 },
  bwSub: { fontSize: 11, marginTop: 2 },
  bwInput: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, width: 70, textAlign: 'center' },
  bwBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.sm },
  exerciseBlock: { padding: spacing.lg, borderBottomWidth: 1, gap: 8 },
  exHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  exNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  exName: { fontSize: 17 },
  kindTag: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 1, borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  prBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  prText: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 0.5, fontWeight: '700' },
  lastTime: { fontSize: 11, marginTop: 2, letterSpacing: 0.2 },
  setRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, borderWidth: 1 },
  setLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { fontSize: 14, width: 16 },
  setIndex: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  setData: { fontSize: 14 },
  segCal: { fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 2 },
  statChip: { fontSize: 11, letterSpacing: 0.3 },
  addSetRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  cardioForm: { gap: 8 },
  actRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  actText: { fontFamily: fonts.sans, fontSize: 12, textTransform: 'capitalize' },
  cardioInputs: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  estCal: { fontSize: 11 },
  miniInput: { flex: 1, borderWidth: 1, borderRadius: radius.sm, padding: 8, fontSize: 14, textAlign: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  dashBtn: { borderWidth: 1, borderRadius: 8, padding: 8, alignItems: 'center', borderStyle: 'dashed' },
  dashLabel: { fontFamily: fonts.sans, fontSize: 12, letterSpacing: 0.5 },
  noExText: { padding: spacing.lg, textAlign: 'center', fontSize: 14 },
  prevLabel: { paddingHorizontal: spacing.lg, paddingVertical: 8, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', borderBottomWidth: 1 },
  prevWorkout: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 12, borderBottomWidth: 1 },
  prevName: { fontSize: 14, textTransform: 'capitalize' },
  prevDate: { fontSize: 11, marginTop: 2 },
  prevExCount: { fontSize: 12 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { padding: spacing.lg, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, gap: spacing.sm },
  modalTitle: { fontSize: 20, marginBottom: 2 },
  fieldLabel: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 },
  quickNames: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  quickScroll: { flexGrow: 0 },
  segToggle: { flexDirection: 'row', gap: 8 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  modalInput: { borderWidth: 1, borderRadius: radius.md, padding: 12, fontSize: 15 },
  modalBtns: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  finishStats: { fontSize: 12, letterSpacing: 0.3, marginBottom: spacing.md },
  classifyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 8 },
  muscleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md, justifyContent: 'center' },
  muscleChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  muscleChipText: { fontSize: 11, letterSpacing: 0.3 },
  finishNote: { fontSize: 12, textAlign: 'center', marginTop: spacing.md },
  planRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, padding: 14, gap: 10, marginBottom: 8 },
  planRowName: { fontSize: 15, textTransform: 'capitalize' },
  planRowMeta: { fontSize: 11, marginTop: 2 },
  popOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: spacing.lg },
  popCard: { width: '100%', maxWidth: 340, borderWidth: 1, borderRadius: 20, padding: spacing.lg, gap: spacing.sm, alignItems: 'center' },
});
