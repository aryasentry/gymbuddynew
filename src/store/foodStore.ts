import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { FoodLog, FoodItem, Food, MealType, QuantityFeedback, DailyNutrition } from '../types';
import { todayISO } from '../utils/nutrition';

// Upsert each logged item into the user's own food library (best-effort, no external DB).
async function saveToLibrary(userId: string, items: FoodItem[]) {
  for (const it of items) {
    if (!it.name?.trim()) continue;
    const { data: existing } = await supabase
      .from('foods').select('id, use_count').eq('user_id', userId).ilike('name', it.name.trim()).limit(1).maybeSingle();
    const row = {
      unit: it.unit || 'g', ref_qty: it.quantity || 100,
      calories: it.calories, protein: it.protein, carbs: it.carbs, fat: it.fat,
      fiber_g: it.fiber_g ?? 0, sugar_g: it.sugar_g ?? 0, sodium_mg: it.sodium_mg ?? 0,
      potassium_mg: it.potassium_mg ?? 0, calcium_mg: it.calcium_mg ?? 0, iron_mg: it.iron_mg ?? 0, vitamin_c_mg: it.vitamin_c_mg ?? 0,
      last_used: new Date().toISOString(),
    };
    if (existing) {
      await supabase.from('foods').update({ ...row, use_count: (existing.use_count ?? 1) + 1 }).eq('id', existing.id);
    } else {
      await supabase.from('foods').insert({ user_id: userId, name: it.name.trim(), use_count: 1, ...row });
    }
  }
}

interface FoodState {
  todayLogs: FoodLog[];
  todayNutrition: DailyNutrition;
  weekNutrition: { date: string; calories: number; protein: number; carbs: number; fat: number }[];
  loading: boolean;
  fetchToday: (userId: string) => Promise<void>;
  fetchWeek: (userId: string) => Promise<void>;
  searchFoods: (userId: string, q: string) => Promise<Food[]>;
  saveLog: (userId: string, params: {
    meal_type: MealType;
    caption?: string;
    image_url?: string;
    user_correction?: QuantityFeedback;
    items: FoodItem[];
    total: { calories: number; protein: number; carbs: number; fat: number; [k: string]: number };
  }) => Promise<string | null>;
  updateCorrection: (logId: string, correction: QuantityFeedback) => Promise<void>;
  deleteLog: (logId: string) => Promise<void>;
  fetchWater: (userId: string) => Promise<number>;
  addWater: (userId: string, amount_ml: number) => Promise<void>;
}

function sumNutrition(logs: FoodLog[]): DailyNutrition {
  return logs.reduce(
    (acc, l) => ({
      calories: acc.calories + l.total_calories,
      protein: acc.protein + l.total_protein,
      carbs: acc.carbs + l.total_carbs,
      fat: acc.fat + l.total_fat,
      water_ml: acc.water_ml,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, water_ml: 0 }
  );
}

export const useFoodStore = create<FoodState>((set, get) => ({
  todayLogs: [],
  todayNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, water_ml: 0 },
  weekNutrition: [],
  loading: false,

  fetchToday: async (userId) => {
    set({ loading: true });
    const today = todayISO();
    const { data } = await supabase
      .from('food_logs')
      .select('*, food_items(*)')
      .eq('user_id', userId)
      .eq('logged_at', today)
      .order('created_at', { ascending: false });

    const logs = (data ?? []) as FoodLog[];
    const water = await get().fetchWater(userId);
    const nutrition = sumNutrition(logs);
    nutrition.water_ml = water;
    set({ todayLogs: logs, todayNutrition: nutrition, loading: false });
  },

  searchFoods: async (userId, q) => {
    if (!q.trim()) {
      const { data } = await supabase.from('foods').select('*').eq('user_id', userId).order('use_count', { ascending: false }).limit(12);
      return (data ?? []) as Food[];
    }
    const { data } = await supabase.from('foods').select('*').eq('user_id', userId).ilike('name', `%${q.trim()}%`).order('use_count', { ascending: false }).limit(12);
    return (data ?? []) as Food[];
  },

  fetchWeek: async (userId) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    const { data } = await supabase
      .from('food_logs')
      .select('logged_at, total_calories, total_protein, total_carbs, total_fat')
      .eq('user_id', userId)
      .gte('logged_at', start.toISOString().split('T')[0])
      .lte('logged_at', end.toISOString().split('T')[0]);

    const byDate: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};
    for (const row of data ?? []) {
      if (!byDate[row.logged_at]) byDate[row.logged_at] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      byDate[row.logged_at].calories += row.total_calories;
      byDate[row.logged_at].protein += row.total_protein;
      byDate[row.logged_at].carbs += row.total_carbs;
      byDate[row.logged_at].fat += row.total_fat;
    }
    set({ weekNutrition: Object.entries(byDate).map(([date, v]) => ({ date, ...v })) });
  },

  saveLog: async (userId, { meal_type, caption, image_url, user_correction, items, total }) => {
    const { data: log, error } = await supabase
      .from('food_logs')
      .insert({
        user_id: userId,
        logged_at: todayISO(),
        meal_type,
        caption,
        image_url,
        user_correction: user_correction ?? null,
        total_calories: total.calories,
        total_protein: total.protein,
        total_carbs: total.carbs,
        total_fat: total.fat,
        total_fiber_g: total.fiber_g ?? 0,
        total_sugar_g: total.sugar_g ?? 0,
        total_sodium_mg: total.sodium_mg ?? 0,
        total_potassium_mg: total.potassium_mg ?? 0,
        total_calcium_mg: total.calcium_mg ?? 0,
        total_iron_mg: total.iron_mg ?? 0,
        total_vitamin_c_mg: total.vitamin_c_mg ?? 0,
      })
      .select()
      .single();

    if (error || !log) return error?.message ?? 'Failed to save';

    if (items.length > 0) {
      await supabase.from('food_items').insert(
        items.map(item => ({
          food_log_id: log.id,
          name: item.name, quantity: item.quantity, unit: item.unit,
          calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat,
          fiber_g: item.fiber_g ?? 0, sugar_g: item.sugar_g ?? 0, sodium_mg: item.sodium_mg ?? 0,
          potassium_mg: item.potassium_mg ?? 0, calcium_mg: item.calcium_mg ?? 0, iron_mg: item.iron_mg ?? 0, vitamin_c_mg: item.vitamin_c_mg ?? 0,
        }))
      );
      // build the user's own food library (best-effort)
      saveToLibrary(userId, items).catch(() => {});
    }

    const fullLog = { ...log, food_items: items } as FoodLog;
    const current = get().todayLogs;
    const logs = [fullLog, ...current];
    const water = get().todayNutrition.water_ml;
    const nutrition = sumNutrition(logs);
    nutrition.water_ml = water;
    set({ todayLogs: logs, todayNutrition: nutrition });
    return null;
  },

  updateCorrection: async (logId, correction) => {
    await supabase.from('food_logs').update({ user_correction: correction }).eq('id', logId);
    set(s => ({
      todayLogs: s.todayLogs.map(l => l.id === logId ? { ...l, user_correction: correction } : l),
    }));
  },

  deleteLog: async (logId) => {
    await supabase.from('food_logs').delete().eq('id', logId);
    const logs = get().todayLogs.filter(l => l.id !== logId);
    const water = get().todayNutrition.water_ml;
    const nutrition = sumNutrition(logs);
    nutrition.water_ml = water;
    set({ todayLogs: logs, todayNutrition: nutrition });
  },

  fetchWater: async (userId) => {
    const today = todayISO();
    const { data } = await supabase
      .from('water_logs')
      .select('amount_ml')
      .eq('user_id', userId)
      .eq('logged_at', today)
      .single();
    const ml = data?.amount_ml ?? 0;
    set(s => ({ todayNutrition: { ...s.todayNutrition, water_ml: ml } }));
    return ml;
  },

  addWater: async (userId, amount_ml) => {
    const today = todayISO();
    const { data: existing } = await supabase
      .from('water_logs')
      .select('id, amount_ml')
      .eq('user_id', userId)
      .eq('logged_at', today)
      .single();

    if (existing) {
      const newTotal = existing.amount_ml + amount_ml;
      await supabase.from('water_logs').update({ amount_ml: newTotal }).eq('id', existing.id);
      set(s => ({ todayNutrition: { ...s.todayNutrition, water_ml: newTotal } }));
    } else {
      await supabase.from('water_logs').insert({ user_id: userId, logged_at: today, amount_ml });
      set(s => ({ todayNutrition: { ...s.todayNutrition, water_ml: amount_ml } }));
    }
  },
}));
