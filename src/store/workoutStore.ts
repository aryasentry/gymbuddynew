import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Workout, Exercise, Set, CardioSegment, WorkoutPlan, WorkoutCategory, ExerciseKind } from '../types';
import { todayISO } from '../utils/nutrition';
import { computeStreak, cardioCalories } from '../utils/workout';

const SELECT_FULL = '*, exercises(*, sets(*), cardio_segments(*))';
const SELECT_BASIC = '*, exercises(*, sets(*))';
// Degrades gracefully if schema_v3 (cardio_segments / exercises.kind) isn't applied yet.
let cardioOk = true;
const sel = () => (cardioOk ? SELECT_FULL : SELECT_BASIC);

interface WorkoutState {
  workouts: Workout[];
  todayWorkout: Workout | null;
  loading: boolean;
  streak: { current: number; longest: number };
  fetchWorkouts: (userId: string, limit?: number) => Promise<void>;
  fetchToday: (userId: string) => Promise<void>;
  fetchStreak: (userId: string) => Promise<void>;
  createWorkout: (userId: string, name: string, description?: string, category?: WorkoutCategory) => Promise<Workout | null>;
  createFromPlan: (userId: string, plan: WorkoutPlan, weightKg: number) => Promise<Workout | null>;
  updateWorkoutMeta: (workoutId: string, fields: { name?: string; description?: string; category?: WorkoutCategory }) => Promise<void>;
  addExercise: (workoutId: string, name: string, kind?: ExerciseKind) => Promise<Exercise | null>;
  addSet: (exerciseId: string, weight_kg: number, reps: number, completed?: boolean) => Promise<Set | null>;
  toggleSet: (setId: string, exerciseId: string, completed: boolean) => Promise<void>;
  deleteSet: (setId: string, exerciseId: string) => Promise<void>;
  addCardioSegment: (exerciseId: string, seg: Omit<CardioSegment, 'id' | 'exercise_id'>) => Promise<void>;
  deleteCardioSegment: (segId: string, exerciseId: string) => Promise<void>;
  deleteExercise: (exerciseId: string) => Promise<void>;
  getPRs: (userId: string) => Promise<Record<string, { weight_kg: number; reps: number; date: string }>>;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  workouts: [],
  todayWorkout: null,
  loading: false,
  streak: { current: 0, longest: 0 },

  fetchStreak: async (userId) => {
    const { data } = await supabase
      .from('workouts').select('logged_at')
      .eq('user_id', userId).order('logged_at', { ascending: false }).limit(365);
    set({ streak: computeStreak((data ?? []).map(r => r.logged_at as string)) });
  },

  fetchWorkouts: async (userId, limit = 20) => {
    set({ loading: true });
    let res = await supabase.from('workouts').select(sel())
      .eq('user_id', userId).order('logged_at', { ascending: false }).limit(limit);
    if (res.error && cardioOk) { cardioOk = false; res = await supabase.from('workouts').select(sel())
      .eq('user_id', userId).order('logged_at', { ascending: false }).limit(limit); }
    set({ workouts: (res.data ?? []) as Workout[], loading: false });
  },

  fetchToday: async (userId) => {
    let res = await supabase.from('workouts').select(sel())
      .eq('user_id', userId).eq('logged_at', todayISO())
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (res.error && cardioOk) { cardioOk = false; res = await supabase.from('workouts').select(sel())
      .eq('user_id', userId).eq('logged_at', todayISO())
      .order('created_at', { ascending: false }).limit(1).maybeSingle(); }
    set({ todayWorkout: res.data ? (res.data as Workout) : null });
  },

  createWorkout: async (userId, name, description, category) => {
    const { data, error } = await supabase
      .from('workouts')
      .insert({ user_id: userId, name, description: description || null, category: category || null, logged_at: todayISO() })
      .select(sel()).single();
    if (error || !data) return null;
    const workout = { ...data, exercises: [] } as Workout;
    set(s => ({ workouts: [workout, ...s.workouts], todayWorkout: workout }));
    return workout;
  },

  createFromPlan: async (userId, plan, weightKg) => {
    const { data: w, error } = await supabase
      .from('workouts')
      .insert({ user_id: userId, name: plan.name, description: plan.description || null, category: plan.category || null, logged_at: todayISO() })
      .select().single();
    if (error || !w) return null;

    for (let i = 0; i < plan.exercises.length; i++) {
      const pe = plan.exercises[i];
      let exRes = await supabase
        .from('exercises')
        .insert({ workout_id: w.id, name: pe.name, kind: pe.kind, sort_order: i })
        .select().single();
      if (exRes.error) { // no kind column → retry plain
        exRes = await supabase.from('exercises').insert({ workout_id: w.id, name: pe.name, sort_order: i }).select().single();
      }
      const ex = exRes.data;
      if (!ex) continue;

      if (pe.kind === 'strength' && pe.sets?.length) {
        await supabase.from('sets').insert(
          pe.sets.map((s, j) => ({ exercise_id: ex.id, weight_kg: s.weight_kg, reps: s.reps, completed: false, sort_order: j }))
        );
      }
      if (pe.kind === 'cardio' && pe.segments?.length) {
        await supabase.from('cardio_segments').insert(
          pe.segments.map((s, j) => ({
            exercise_id: ex.id,
            activity: s.activity,
            minutes: s.minutes,
            speed_kmh: s.speed_kmh ?? null,
            incline_pct: s.incline_pct ?? null,
            calories: s.calories ?? cardioCalories(s.activity, s.minutes, weightKg, s.speed_kmh, s.incline_pct),
            sort_order: j,
          }))
        );
      }
    }

    // reload full graph
    const { data: full } = await supabase.from('workouts').select(sel()).eq('id', w.id).single();
    const workout = (full ?? { ...w, exercises: [] }) as Workout;
    set(s => ({ workouts: [workout, ...s.workouts.filter(x => x.id !== workout.id)], todayWorkout: workout }));
    return workout;
  },

  updateWorkoutMeta: async (workoutId, fields) => {
    await supabase.from('workouts').update(fields).eq('id', workoutId);
    const apply = (w: Workout): Workout => w.id === workoutId ? { ...w, ...fields } : w;
    set(s => ({ workouts: s.workouts.map(apply), todayWorkout: s.todayWorkout ? apply(s.todayWorkout) : null }));
  },

  addExercise: async (workoutId, name, kind = 'strength') => {
    const workout = get().workouts.find(w => w.id === workoutId) ?? get().todayWorkout;
    const sort_order = (workout?.exercises?.length ?? 0);
    let { data, error } = await supabase
      .from('exercises').insert({ workout_id: workoutId, name, kind, sort_order }).select().single();
    if (error) { // schema_v3 not applied → retry without kind
      ({ data, error } = await supabase.from('exercises').insert({ workout_id: workoutId, name, sort_order }).select().single());
    }
    if (error || !data) return null;
    const exercise: Exercise = { ...data, sets: [], cardio_segments: [] };
    const upd = (w: Workout): Workout => w.id === workoutId ? { ...w, exercises: [...(w.exercises ?? []), exercise] } : w;
    set(s => ({ workouts: s.workouts.map(upd), todayWorkout: s.todayWorkout ? upd(s.todayWorkout) : null }));
    return exercise;
  },

  addSet: async (exerciseId, weight_kg, reps, completed = true) => {
    const { data, error } = await supabase
      .from('sets').insert({ exercise_id: exerciseId, weight_kg, reps, completed, sort_order: 0 }).select().single();
    if (error || !data) return null;
    const newSet: Set = data;
    const upd = (w: Workout): Workout => ({
      ...w,
      exercises: (w.exercises ?? []).map(e => e.id === exerciseId ? { ...e, sets: [...e.sets, newSet] } : e),
    });
    set(s => ({ workouts: s.workouts.map(upd), todayWorkout: s.todayWorkout ? upd(s.todayWorkout) : null }));
    return newSet;
  },

  toggleSet: async (setId, exerciseId, completed) => {
    await supabase.from('sets').update({ completed }).eq('id', setId);
    const upd = (w: Workout): Workout => ({
      ...w,
      exercises: (w.exercises ?? []).map(e =>
        e.id === exerciseId ? { ...e, sets: e.sets.map(s => s.id === setId ? { ...s, completed } : s) } : e),
    });
    set(s => ({ workouts: s.workouts.map(upd), todayWorkout: s.todayWorkout ? upd(s.todayWorkout) : null }));
  },

  deleteSet: async (setId, exerciseId) => {
    await supabase.from('sets').delete().eq('id', setId);
    const upd = (w: Workout): Workout => ({
      ...w,
      exercises: (w.exercises ?? []).map(e => e.id === exerciseId ? { ...e, sets: e.sets.filter(s => s.id !== setId) } : e),
    });
    set(s => ({ workouts: s.workouts.map(upd), todayWorkout: s.todayWorkout ? upd(s.todayWorkout) : null }));
  },

  addCardioSegment: async (exerciseId, seg) => {
    const { data, error } = await supabase
      .from('cardio_segments').insert({ exercise_id: exerciseId, ...seg }).select().single();
    if (error || !data) return;
    const newSeg = data as CardioSegment;
    const upd = (w: Workout): Workout => ({
      ...w,
      exercises: (w.exercises ?? []).map(e =>
        e.id === exerciseId ? { ...e, cardio_segments: [...(e.cardio_segments ?? []), newSeg] } : e),
    });
    set(s => ({ workouts: s.workouts.map(upd), todayWorkout: s.todayWorkout ? upd(s.todayWorkout) : null }));
  },

  deleteCardioSegment: async (segId, exerciseId) => {
    await supabase.from('cardio_segments').delete().eq('id', segId);
    const upd = (w: Workout): Workout => ({
      ...w,
      exercises: (w.exercises ?? []).map(e =>
        e.id === exerciseId ? { ...e, cardio_segments: (e.cardio_segments ?? []).filter(x => x.id !== segId) } : e),
    });
    set(s => ({ workouts: s.workouts.map(upd), todayWorkout: s.todayWorkout ? upd(s.todayWorkout) : null }));
  },

  deleteExercise: async (exerciseId) => {
    await supabase.from('exercises').delete().eq('id', exerciseId);
    const upd = (w: Workout): Workout => ({ ...w, exercises: (w.exercises ?? []).filter(e => e.id !== exerciseId) });
    set(s => ({ workouts: s.workouts.map(upd), todayWorkout: s.todayWorkout ? upd(s.todayWorkout) : null }));
  },

  getPRs: async (userId) => {
    const { data } = await supabase
      .from('exercises')
      .select('name, sets(weight_kg, reps), workouts!inner(user_id, logged_at)')
      .eq('workouts.user_id', userId);
    const prs: Record<string, { weight_kg: number; reps: number; date: string }> = {};
    for (const ex of data ?? []) {
      for (const s of ex.sets ?? []) {
        const key = ex.name.toLowerCase();
        if (!prs[key] || s.weight_kg > prs[key].weight_kg) {
          prs[key] = { weight_kg: s.weight_kg, reps: s.reps, date: (ex as any).workouts?.logged_at ?? '' };
        }
      }
    }
    return prs;
  },
}));
