import { Platform } from 'react-native';
import { Reminder } from '../types';

// expo-notifications is optional until installed — everything degrades gracefully.
let Notifications: any = null;
try { Notifications = require('expo-notifications'); } catch {}

export const notificationsAvailable = () => !!Notifications;

export function initNotifications() {
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensurePermission(): Promise<boolean> {
  if (!Notifications) return false;
  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted;
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.granted;
  }
  if (granted && Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance?.DEFAULT ?? 3,
    });
  }
  return granted;
}

// Schedules one repeating weekly notification per selected weekday. Returns ids.
export async function scheduleReminder(r: Pick<Reminder, 'title' | 'body' | 'hour' | 'minute' | 'days_of_week'>): Promise<string[]> {
  if (!Notifications) return [];
  const ok = await ensurePermission();
  if (!ok) return [];
  const WEEKLY = Notifications.SchedulableTriggerInputTypes?.WEEKLY ?? 'weekly';
  const ids: string[] = [];
  for (const dow of r.days_of_week) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: r.title, body: r.body ?? '' },
        trigger: { type: WEEKLY, weekday: dow + 1, hour: r.hour, minute: r.minute, channelId: 'reminders' }, // expo: 1=Sun..7=Sat
      });
      ids.push(id);
    } catch { /* skip */ }
  }
  return ids;
}

export async function cancelReminder(ids: string[]): Promise<void> {
  if (!Notifications || !ids) return;
  for (const id of ids) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
  }
}

// Fires a one-off notification in a few seconds — lets the user confirm notifications work.
export async function sendTestNotification(): Promise<'ok' | 'denied' | 'unavailable'> {
  if (!Notifications) return 'unavailable';
  const ok = await ensurePermission();
  if (!ok) return 'denied';
  const INTERVAL = Notifications.SchedulableTriggerInputTypes?.TIME_INTERVAL ?? 'timeInterval';
  await Notifications.scheduleNotificationAsync({
    content: { title: 'GymBuddy ✦', body: 'Notifications are working. Time to log a meal!' },
    trigger: { type: INTERVAL, seconds: 5, channelId: 'reminders' },
  });
  return 'ok';
}
