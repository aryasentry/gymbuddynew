import { Muscle, Workout } from '../types';

// Keyword → muscles. Order matters (first match wins per keyword scan).
const RULES: { kw: string[]; muscles: Muscle[] }[] = [
  { kw: ['bench', 'chest', 'pec', 'fly', 'dip', 'push up', 'pushup', 'push-up'], muscles: ['chest', 'triceps', 'shoulders'] },
  { kw: ['incline'], muscles: ['chest', 'shoulders'] },
  { kw: ['overhead', 'ohp', 'shoulder press', 'military', 'arnold', 'lateral raise', 'delt', 'shrug'], muscles: ['shoulders'] },
  { kw: ['trap'], muscles: ['traps'] },
  { kw: ['deadlift', 'rdl', 'good morning'], muscles: ['hamstrings', 'glutes', 'back', 'traps'] },
  { kw: ['row', 'pulldown', 'pull down', 'pull-up', 'pullup', 'pull up', 'chin', 'lat'], muscles: ['lats', 'back', 'biceps'] },
  { kw: ['curl'], muscles: ['biceps'] },
  { kw: ['tricep', 'pushdown', 'skull', 'kickback', 'overhead extension'], muscles: ['triceps'] },
  { kw: ['forearm', 'wrist', 'grip'], muscles: ['forearms'] },
  { kw: ['squat', 'leg press', 'lunge', 'leg extension', 'hack'], muscles: ['quads', 'glutes'] },
  { kw: ['leg curl', 'hamstring', 'nordic'], muscles: ['hamstrings'] },
  { kw: ['hip thrust', 'glute'], muscles: ['glutes'] },
  { kw: ['calf', 'raise'], muscles: ['calves'] },
  { kw: ['ab', 'crunch', 'plank', 'core', 'sit up', 'situp', 'leg raise', 'oblique'], muscles: ['abs'] },
];

export function musclesForExercise(name: string): Muscle[] {
  const n = name.toLowerCase();
  const out = new Set<Muscle>();
  for (const r of RULES) {
    if (r.kw.some(k => n.includes(k))) r.muscles.forEach(m => out.add(m));
  }
  return [...out];
}

// Muscles actually worked = those of exercises that have at least one COMPLETED set.
export function musclesWorked(workout: Workout | null): Set<Muscle> {
  const out = new Set<Muscle>();
  if (!workout) return out;
  for (const ex of workout.exercises ?? []) {
    const done = ex.kind === 'cardio'
      ? (ex.cardio_segments ?? []).length > 0
      : ex.sets.some(s => s.completed);
    if (!done) continue;
    const stored = (ex.muscles ?? []) as Muscle[];
    const list = stored.length ? stored : musclesForExercise(ex.name);
    list.forEach(m => out.add(m));
  }
  return out;
}

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: 'Chest', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps',
  forearms: 'Forearms', abs: 'Abs', quads: 'Quads', hamstrings: 'Hamstrings',
  calves: 'Calves', glutes: 'Glutes', back: 'Back', lats: 'Lats', traps: 'Traps',
};
