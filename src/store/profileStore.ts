import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Profile, Gender, ActivityLevel, Goal } from '../types';
import { calcBMR, calcTDEE, calcTargets } from '../utils/nutrition';

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  fetchProfile: (userId: string) => Promise<void>;
  saveProfile: (userId: string, data: {
    full_name: string;
    height_cm: number;
    weight_kg: number;
    age: number;
    gender: Gender;
    activity_level: ActivityLevel;
    goal: Goal;
  }) => Promise<string | null>;
  updateWeight: (userId: string, weight_kg: number) => Promise<void>;
  updateTargets: (userId: string, targets: { calorie_target: number; protein_target: number; carb_target: number; fat_target: number }) => Promise<void>;
  updateGoal: (userId: string, goal: Goal) => Promise<void>;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  loading: false,

  fetchProfile: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    set({ profile: data ?? null, loading: false });
  },

  saveProfile: async (userId, data) => {
    const bmr = Math.round(calcBMR(data.weight_kg, data.height_cm, data.age, data.gender));
    const tdee = calcTDEE(bmr, data.activity_level);
    const targets = calcTargets(tdee, data.weight_kg, data.goal);

    const payload: Omit<Profile, 'created_at' | 'updated_at'> = {
      id: userId,
      ...data,
      bmr,
      tdee,
      ...targets,
    };

    const { data: saved, error } = await supabase
      .from('profiles')
      .upsert(payload)
      .select()
      .single();

    if (error) return error.message;
    set({ profile: saved });
    return null;
  },

  updateWeight: async (userId, weight_kg) => {
    const profile = get().profile;
    if (!profile) return;
    const bmr = Math.round(calcBMR(weight_kg, profile.height_cm, profile.age, profile.gender));
    const tdee = calcTDEE(bmr, profile.activity_level);
    const targets = calcTargets(tdee, weight_kg, profile.goal);
    await supabase.from('profiles').update({ weight_kg, bmr, tdee, ...targets, updated_at: new Date().toISOString() }).eq('id', userId);
    set({ profile: { ...profile, weight_kg, bmr, tdee, ...targets } });
  },

  updateTargets: async (userId, targets) => {
    const profile = get().profile;
    if (!profile) return;
    await supabase.from('profiles').update({ ...targets, updated_at: new Date().toISOString() }).eq('id', userId);
    set({ profile: { ...profile, ...targets } });
  },

  updateGoal: async (userId, goal) => {
    const profile = get().profile;
    if (!profile) return;
    const targets = calcTargets(profile.tdee, profile.weight_kg, goal);
    await supabase.from('profiles').update({ goal, ...targets, updated_at: new Date().toISOString() }).eq('id', userId);
    set({ profile: { ...profile, goal, ...targets } });
  },

  clearProfile: () => set({ profile: null }),
}));
