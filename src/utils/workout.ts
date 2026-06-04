import { Workout, Set, CardioActivity } from '../types';

// Approximate calories for a cardio segment (MET method, scaled by body weight).
export function cardioCalories(
  activity: CardioActivity,
  minutes: number,
  weight_kg: number,
  speed_kmh?: number | null,
  incline_pct?: number | null
): number {
  const s = speed_kmh ?? 0;
  let met: number;
  switch (activity) {
    case 'sprint': met = Math.max(11, s * 1.05); break;
    case 'run':    met = Math.max(7, s * 0.95); break;
    case 'cycle':  met = Math.max(4, s * 0.5); break;
    case 'row':    met = 7; break;
    case 'stairs': met = 8; break;
    case 'incline':
    case 'walk':
    default:       met = Math.max(2.8, 2 + s * 0.7); break;
  }
  met += (incline_pct ?? 0) * 0.1; // incline bump
  const w = weight_kg || 70;
  return Math.round(met * w * (minutes / 60));
}

// Epley formula — estimated one-rep max
export function epley1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

// Rough calories burned from resistance training (MET ~5.5, ~3.5 min per set incl rest).
export function strengthCalories(completedSets: number, weightKg: number): number {
  if (completedSets <= 0) return 0;
  const minutes = completedSets * 3.5;
  return Math.round(5.5 * (weightKg || 70) * (minutes / 60));
}

// Best set in a list by estimated 1RM
export function bestSet(sets: Set[]): Set | null {
  if (!sets.length) return null;
  return sets.reduce((best, s) =>
    epley1RM(s.weight_kg, s.reps) > epley1RM(best.weight_kg, best.reps) ? s : best
  );
}

// Total volume = sum(weight × reps)
export function totalVolume(sets: Set[]): number {
  return sets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0);
}

// What plates to load per side of a barbell
const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
export function platesPerSide(target: number, barWeight = 20): { plate: number; count: number }[] {
  let perSide = (target - barWeight) / 2;
  if (perSide <= 0) return [];
  const result: { plate: number; count: number }[] = [];
  for (const p of PLATES) {
    let count = 0;
    while (perSide >= p - 0.001) {
      perSide -= p;
      count++;
    }
    if (count > 0) result.push({ plate: p, count });
  }
  return result;
}

// Find the same exercise in the most recent PREVIOUS workout (for progressive overload)
export function findLastTime(
  workouts: Workout[],
  exerciseName: string,
  currentWorkoutId: string
): { date: string; sets: Set[] } | null {
  const name = exerciseName.trim().toLowerCase();
  const sorted = [...workouts]
    .filter(w => w.id !== currentWorkoutId)
    .sort((a, b) => b.logged_at.localeCompare(a.logged_at));
  for (const w of sorted) {
    const ex = (w.exercises ?? []).find(e => e.name.trim().toLowerCase() === name);
    if (ex && ex.sets.length) return { date: w.logged_at, sets: ex.sets };
  }
  return null;
}

// Best weight ever (within loaded workouts) for an exercise — used for PR badges
export function findPR(workouts: Workout[], exerciseName: string): { weight_kg: number; reps: number } | null {
  const name = exerciseName.trim().toLowerCase();
  let pr: { weight_kg: number; reps: number } | null = null;
  for (const w of workouts) {
    for (const ex of w.exercises ?? []) {
      if (ex.name.trim().toLowerCase() !== name) continue;
      for (const s of ex.sets) {
        if (!pr || s.weight_kg > pr.weight_kg) pr = { weight_kg: s.weight_kg, reps: s.reps };
      }
    }
  }
  return pr;
}

// Format a set list compactly: "60×8  60×8  62.5×7"
export function formatSets(sets: Set[]): string {
  return sets.map(s => `${s.weight_kg}×${s.reps}`).join('  ');
}

// Consecutive-day streak from a list of ISO dates (yyyy-mm-dd)
export function computeStreak(dates: string[]): { current: number; longest: number } {
  if (!dates.length) return { current: 0, longest: 0 };
  const unique = Array.from(new Set(dates)).sort(); // ascending
  let longest = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1]);
    const cur = new Date(unique[i]);
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) { run++; longest = Math.max(longest, run); }
    else if (diff > 1) { run = 1; }
  }
  // Current streak: walk back from today/yesterday
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const set = new Set(unique);
  let current = 0;
  const cursor = new Date(today);
  // allow streak to count if logged today OR yesterday (so it doesn't break mid-day)
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (!set.has(todayStr) && !set.has(yesterday.toISOString().split('T')[0])) {
    return { current: 0, longest };
  }
  if (!set.has(todayStr)) cursor.setDate(cursor.getDate() - 1);
  while (set.has(cursor.toISOString().split('T')[0])) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, longest };
}
