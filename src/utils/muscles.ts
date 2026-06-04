import { Muscle, Workout } from '../types';

// Keyword → granular muscles.
const PUSH_TRI: Muscle[] = ['triceps_long', 'triceps_lateral', 'triceps_medial'];
const BI: Muscle[] = ['biceps_long', 'biceps_short'];

const RULES: { kw: string[]; muscles: Muscle[] }[] = [
  { kw: ['incline bench', 'incline press', 'incline'], muscles: ['upper_chest', 'front_delts', ...PUSH_TRI] },
  { kw: ['decline'], muscles: ['lower_chest', ...PUSH_TRI] },
  { kw: ['bench', 'chest press', 'pec', 'fly', 'push up', 'pushup', 'push-up', 'dip'], muscles: ['upper_chest', 'lower_chest', 'front_delts', ...PUSH_TRI] },
  { kw: ['lateral raise', 'side raise', 'side delt'], muscles: ['side_delts'] },
  { kw: ['rear delt', 'reverse fly', 'face pull', 'rear fly'], muscles: ['rear_delts'] },
  { kw: ['overhead press', 'ohp', 'shoulder press', 'military', 'arnold'], muscles: ['front_delts', 'side_delts', ...PUSH_TRI] },
  { kw: ['shrug'], muscles: ['traps_upper'] },
  { kw: ['deadlift', 'rdl', 'romanian', 'good morning'], muscles: ['lower_back', 'glutes', 'hamstrings', 'traps_upper'] },
  { kw: ['hammer curl'], muscles: ['biceps_short', 'forearms'] },
  { kw: ['curl'], muscles: BI },
  { kw: ['pushdown', 'tricep', 'skull', 'kickback', 'overhead extension'], muscles: PUSH_TRI },
  { kw: ['pull up', 'pull-up', 'pullup', 'chin', 'pulldown', 'pull down', 'lat '], muscles: ['lats', ...BI] },
  { kw: ['row', 'rowing'], muscles: ['lats', 'rhomboids', 'traps_mid', 'rear_delts', ...BI] },
  { kw: ['forearm', 'wrist', 'grip'], muscles: ['forearms'] },
  { kw: ['leg extension'], muscles: ['quads'] },
  { kw: ['leg curl', 'hamstring', 'nordic'], muscles: ['hamstrings'] },
  { kw: ['squat', 'leg press', 'lunge', 'hack', 'bulgarian'], muscles: ['quads', 'glutes', 'adductors'] },
  { kw: ['adductor', 'inner thigh'], muscles: ['adductors'] },
  { kw: ['hip thrust', 'glute', 'kickback glute'], muscles: ['glutes'] },
  { kw: ['calf', 'calves'], muscles: ['calves', 'soleus'] },
  { kw: ['leg raise', 'knee raise', 'hanging'], muscles: ['lower_abs'] },
  { kw: ['oblique', 'side bend', 'russian twist', 'woodchop'], muscles: ['obliques'] },
  { kw: ['crunch', 'sit up', 'situp', 'ab '], muscles: ['upper_abs', 'lower_abs'] },
  { kw: ['plank', 'core'], muscles: ['upper_abs', 'lower_abs', 'obliques'] },
];

export function musclesForExercise(name: string): Muscle[] {
  const n = ` ${name.toLowerCase()} `;
  const out = new Set<Muscle>();
  for (const r of RULES) {
    if (r.kw.some(k => n.includes(k))) { r.muscles.forEach(m => out.add(m)); break; }
  }
  // also scan remaining rules for compound names (e.g. "incline bench + curl")
  for (const r of RULES) {
    if (r.kw.some(k => n.includes(k))) r.muscles.forEach(m => out.add(m));
  }
  return [...out];
}

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
  front_delts: 'Front Delts', side_delts: 'Side Delts', rear_delts: 'Rear Delts',
  upper_chest: 'Upper Chest', lower_chest: 'Lower Chest',
  biceps_long: 'Biceps (long)', biceps_short: 'Biceps (short)',
  triceps_long: 'Triceps (long)', triceps_lateral: 'Triceps (lateral)', triceps_medial: 'Triceps (medial)',
  forearms: 'Forearms',
  upper_abs: 'Upper Abs', lower_abs: 'Lower Abs', obliques: 'Obliques',
  traps_upper: 'Upper Traps', traps_mid: 'Mid Traps', lats: 'Lats', rhomboids: 'Rhomboids', lower_back: 'Lower Back',
  glutes: 'Glutes', quads: 'Quads', adductors: 'Adductors', hamstrings: 'Hamstrings', calves: 'Calves', soleus: 'Soleus',
};

export const ALL_MUSCLES: Muscle[] = Object.keys(MUSCLE_LABEL) as Muscle[];
