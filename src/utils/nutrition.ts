import { ActivityLevel, Gender, Goal } from '../types';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calcBMR(weight_kg: number, height_cm: number, age: number, gender: Gender): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return gender === 'female' ? base - 161 : base + 5;
}

export function calcTDEE(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity]);
}

export function calcTargets(tdee: number, weight_kg: number, goal: Goal) {
  let calorie_target: number;
  switch (goal) {
    case 'fat_loss':    calorie_target = tdee - 400; break;
    case 'muscle_gain': calorie_target = tdee + 250; break;
    case 'recomp':      calorie_target = tdee; break;
    case 'maintenance': calorie_target = tdee; break;
  }
  const protein_target = Math.round(weight_kg * 2.0);
  const fat_target = Math.round(weight_kg * 0.9);
  const protein_kcal = protein_target * 4;
  const fat_kcal = fat_target * 9;
  const carb_kcal = calorie_target - protein_kcal - fat_kcal;
  const carb_target = Math.max(50, Math.round(carb_kcal / 4));
  return { calorie_target, protein_target, fat_target, carb_target };
}

export function goalLabel(goal: Goal): string {
  const map: Record<Goal, string> = {
    fat_loss: 'Fat Loss',
    muscle_gain: 'Muscle Gain',
    recomp: 'Recomposition',
    maintenance: 'Maintenance',
  };
  return map[goal];
}

export function activityLabel(level: ActivityLevel): string {
  const map: Record<ActivityLevel, string> = {
    sedentary: 'Sedentary',
    light: 'Lightly Active',
    moderate: 'Moderately Active',
    active: 'Very Active',
    very_active: 'Extra Active',
  };
  return map[level];
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function pct(value: number, target: number): number {
  if (!target) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}
