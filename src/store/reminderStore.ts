import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Reminder, ReminderKind } from '../types';
import { scheduleReminder, cancelReminder } from '../utils/notifications';

type NewReminder = {
  kind: ReminderKind;
  title: string;
  body?: string;
  hour: number;
  minute: number;
  days_of_week: number[];
};

const DEFAULTS: NewReminder[] = [
  { kind: 'meal', title: 'Log breakfast 🍳', body: 'Snap your breakfast in GymBuddy', hour: 9,  minute: 0,  days_of_week: [0,1,2,3,4,5,6] },
  { kind: 'meal', title: 'Log lunch 🍱',     body: 'Don\'t forget to log lunch',      hour: 13, minute: 30, days_of_week: [0,1,2,3,4,5,6] },
  { kind: 'meal', title: 'Log dinner 🍽',     body: 'Log dinner to close your day',    hour: 20, minute: 30, days_of_week: [0,1,2,3,4,5,6] },
  { kind: 'water', title: 'Hydrate 💧',       body: 'Top up your water intake',         hour: 16, minute: 0,  days_of_week: [0,1,2,3,4,5,6] },
];

interface ReminderState {
  reminders: Reminder[];
  loading: boolean;
  fetch: (userId: string) => Promise<void>;
  seedDefaults: (userId: string) => Promise<void>;
  add: (userId: string, r: NewReminder) => Promise<void>;
  toggle: (userId: string, r: Reminder) => Promise<void>;
  remove: (r: Reminder) => Promise<void>;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],
  loading: false,

  fetch: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('hour', { ascending: true });
    set({ reminders: (data ?? []) as Reminder[], loading: false });
  },

  seedDefaults: async (userId) => {
    const { count } = await supabase.from('reminders').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    if ((count ?? 0) > 0) return;
    for (const d of DEFAULTS) await get().add(userId, d);
  },

  add: async (userId, r) => {
    const ids = await scheduleReminder(r);
    const { data } = await supabase
      .from('reminders')
      .insert({ user_id: userId, ...r, enabled: true, notification_ids: ids })
      .select().single();
    if (data) set(s => ({ reminders: [...s.reminders, data as Reminder].sort((a, b) => a.hour - b.hour) }));
  },

  toggle: async (userId, r) => {
    if (r.enabled) {
      await cancelReminder(r.notification_ids);
      await supabase.from('reminders').update({ enabled: false, notification_ids: [] }).eq('id', r.id);
      set(s => ({ reminders: s.reminders.map(x => x.id === r.id ? { ...x, enabled: false, notification_ids: [] } : x) }));
    } else {
      const ids = await scheduleReminder(r);
      await supabase.from('reminders').update({ enabled: true, notification_ids: ids }).eq('id', r.id);
      set(s => ({ reminders: s.reminders.map(x => x.id === r.id ? { ...x, enabled: true, notification_ids: ids } : x) }));
    }
  },

  remove: async (r) => {
    await cancelReminder(r.notification_ids);
    await supabase.from('reminders').delete().eq('id', r.id);
    set(s => ({ reminders: s.reminders.filter(x => x.id !== r.id) }));
  },
}));
