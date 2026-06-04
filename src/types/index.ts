export type Goal = 'fat_loss' | 'muscle_gain' | 'recomp' | 'maintenance';
export type Gender = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout';
export type QuantityFeedback = 'accurate' | 'too_low' | 'too_high';

export interface Profile {
  id: string;
  full_name: string;
  height_cm: number;
  weight_kg: number;
  age: number;
  gender: Gender;
  activity_level: ActivityLevel;
  goal: Goal;
  bmr: number;
  tdee: number;
  calorie_target: number;
  protein_target: number;
  carb_target: number;
  fat_target: number;
  created_at: string;
  updated_at: string;
}

export interface Micros {
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  potassium_mg: number;
  calcium_mg: number;
  iron_mg: number;
  vitamin_c_mg: number;
}

export const MICRO_KEYS: (keyof Micros)[] = ['fiber_g', 'sugar_g', 'sodium_mg', 'potassium_mg', 'calcium_mg', 'iron_mg', 'vitamin_c_mg'];
export const MICRO_LABELS: Record<keyof Micros, { label: string; unit: string }> = {
  fiber_g: { label: 'Fiber', unit: 'g' },
  sugar_g: { label: 'Sugar', unit: 'g' },
  sodium_mg: { label: 'Sodium', unit: 'mg' },
  potassium_mg: { label: 'Potassium', unit: 'mg' },
  calcium_mg: { label: 'Calcium', unit: 'mg' },
  iron_mg: { label: 'Iron', unit: 'mg' },
  vitamin_c_mg: { label: 'Vitamin C', unit: 'mg' },
};

export interface FoodItem {
  id?: string;
  food_log_id?: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  potassium_mg?: number;
  calcium_mg?: number;
  iron_mg?: number;
  vitamin_c_mg?: number;
}

// A row in the user's own food library
export interface Food {
  id: string;
  user_id: string;
  name: string;
  unit: string;
  ref_qty: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  potassium_mg: number;
  calcium_mg: number;
  iron_mg: number;
  vitamin_c_mg: number;
  use_count: number;
  last_used: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  logged_at: string;
  meal_type: MealType;
  image_url?: string;
  caption?: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_fiber_g?: number;
  total_sugar_g?: number;
  total_sodium_mg?: number;
  total_potassium_mg?: number;
  total_calcium_mg?: number;
  total_iron_mg?: number;
  total_vitamin_c_mg?: number;
  user_correction?: QuantityFeedback;
  created_at: string;
  food_items?: FoodItem[];
}

export interface Set {
  id?: string;
  exercise_id?: string;
  weight_kg: number;
  reps: number;
  completed: boolean;
  sort_order: number;
}

export type WorkoutCategory = 'push' | 'pull' | 'legs' | 'fullbody' | 'cardio' | 'custom';
export type ExerciseKind = 'strength' | 'cardio';
export type CardioActivity = 'run' | 'sprint' | 'walk' | 'incline' | 'cycle' | 'row' | 'stairs';

export interface CardioSegment {
  id?: string;
  exercise_id?: string;
  activity: CardioActivity;
  minutes: number;
  speed_kmh?: number | null;
  incline_pct?: number | null;
  calories: number;
  sort_order: number;
}

export interface Exercise {
  id?: string;
  workout_id?: string;
  name: string;
  kind?: ExerciseKind;
  notes?: string;
  muscles?: string[];
  sort_order: number;
  sets: Set[];
  cardio_segments?: CardioSegment[];
}

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  category?: WorkoutCategory;
  logged_at: string;
  notes?: string;
  duration_minutes?: number;
  created_at: string;
  exercises?: Exercise[];
}

// ── AI workout plan (LLM output) ──
export interface PlanExercise {
  name: string;
  kind: ExerciseKind;
  sets?: { weight_kg: number; reps: number }[];
  segments?: { activity: CardioActivity; minutes: number; speed_kmh?: number; incline_pct?: number; calories?: number }[];
}

export interface WorkoutPlan {
  category: WorkoutCategory;
  name: string;
  description: string;
  exercises: PlanExercise[];
}

// A saved, reusable plan (template) row
export interface SavedPlan {
  id: string;
  user_id: string;
  name: string;
  category?: WorkoutCategory;
  description?: string;
  plan: WorkoutPlan;
  use_count: number;
  last_used?: string;
  created_at: string;
}

export type Muscle =
  // shoulders
  | 'front_delts' | 'side_delts' | 'rear_delts'
  // chest
  | 'upper_chest' | 'lower_chest'
  // arms
  | 'biceps_long' | 'biceps_short'
  | 'triceps_long' | 'triceps_lateral' | 'triceps_medial'
  | 'forearms'
  // core
  | 'upper_abs' | 'lower_abs' | 'obliques'
  // back
  | 'traps_upper' | 'traps_mid' | 'lats' | 'rhomboids' | 'lower_back'
  // legs
  | 'glutes' | 'quads' | 'adductors' | 'hamstrings' | 'calves' | 'soleus';

export type ReminderKind = 'meal' | 'workout' | 'water' | 'weight' | 'custom';

export interface Reminder {
  id: string;
  user_id: string;
  kind: ReminderKind;
  title: string;
  body?: string;
  hour: number;
  minute: number;
  days_of_week: number[];
  enabled: boolean;
  notification_ids: string[];
  created_at: string;
}

export interface CoachSession {
  id: string;
  user_id: string;
  title?: string;
  summary?: string;
  ended: boolean;
  created_at: string;
  updated_at: string;
}

export interface CoachMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  logged_at: string;
  weight_kg: number;
  waist_cm?: number;
  chest_cm?: number;
  arms_cm?: number;
  created_at: string;
}

export interface WaterLog {
  id: string;
  user_id: string;
  logged_at: string;
  amount_ml: number;
  created_at: string;
}

export interface DailyNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water_ml: number;
}

export interface GroqFoodResult {
  items: FoodItem[];
  total: {
    calories: number; protein: number; carbs: number; fat: number;
    fiber_g?: number; sugar_g?: number; sodium_mg?: number; potassium_mg?: number; calcium_mg?: number; iron_mg?: number; vitamin_c_mg?: number;
  };
  confidence: 'low' | 'medium' | 'high';
  notes?: string;
}

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  ProfileSetup: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Food: undefined;
  Workout: undefined;
  Progress: undefined;
  Coach: undefined;
};

export type FoodStackParamList = {
  FoodLog: undefined;
  LogMeal: undefined;
};

export type WorkoutStackParamList = {
  WorkoutList: undefined;
  WorkoutSession: { workoutId?: string };
};
