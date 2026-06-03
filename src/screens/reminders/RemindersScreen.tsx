import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Modal, TextInput, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopBar } from '../../components/common/TopBar';
import { Button } from '../../components/common/Button';
import { AppBackground } from '../../components/common/AppBackground';
import { useTheme } from '../../theme/useTheme';
import { fonts, spacing, radius } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useReminderStore } from '../../store/reminderStore';
import { notificationsAvailable, ensurePermission, sendTestNotification } from '../../utils/notifications';
import { haptic } from '../../utils/haptics';
import { ReminderKind } from '../../types';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MINUTES = [0, 15, 30, 45];

function fmt(h: number, m: number) {
  const ampm = h < 12 ? 'AM' : 'PM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function RemindersScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { reminders, fetch, seedDefaults, add, toggle, remove } = useReminderStore();

  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [hour, setHour] = useState(18);
  const [minute, setMinute] = useState(0);
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [kind, setKind] = useState<ReminderKind>('custom');

  useFocusEffect(useCallback(() => { if (user?.id) fetch(user.id); }, [user?.id]));

  function toggleDay(d: number) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  }

  async function testNotify() {
    haptic.light();
    const res = await sendTestNotification();
    if (res === 'unavailable') Alert.alert('Not installed', 'Run: npx expo install expo-notifications, then rebuild the app.');
    else if (res === 'denied') Alert.alert('Permission needed', 'Enable notifications for GymBuddy in your phone settings.');
    else Alert.alert('Sent ✓', 'A test notification will appear in ~5 seconds.');
  }

  async function saveNew() {
    if (!title.trim() || !user || days.length === 0) return;
    await add(user.id, { kind, title: title.trim(), body: body.trim() || undefined, hour, minute, days_of_week: days });
    setTitle(''); setBody(''); setHour(18); setMinute(0); setDays([0,1,2,3,4,5,6]); setKind('custom');
    setShowAdd(false);
    haptic.success();
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppBackground />
      <TopBar showBack onBack={() => navigation.goBack()} title="Reminders & Plans" transparent right={
        <TouchableOpacity onPress={() => { haptic.light(); setShowAdd(true); }}>
          <Text style={{ fontSize: 22, color: c.accent }}>+</Text>
        </TouchableOpacity>
      } />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
        {!notificationsAvailable() && (
          <View style={[styles.warn, { borderColor: c.accentBorder, backgroundColor: c.accentBg }]}>
            <Text style={[styles.warnText, { color: c.text, fontFamily: fonts.bodyItalic }]}>
              Install notifications to activate reminders: run{'\n'}npx expo install expo-notifications
            </Text>
          </View>
        )}

        <Button label="Send test notification" onPress={testNotify} variant="outline" style={{ marginBottom: spacing.sm }} />

        {reminders.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: c.text, fontFamily: fonts.headingLoaded }]}>No reminders yet</Text>
            <Text style={[styles.emptySub, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>Add meal-logging nudges, workout plans, water, anything.</Text>
            <Button label="Add starter reminders" onPress={async () => { if (user) { await ensurePermission(); await seedDefaults(user.id); } }} style={{ marginTop: spacing.md }} />
            <Button label="Create custom" onPress={() => setShowAdd(true)} variant="outline" style={{ marginTop: spacing.sm }} />
          </View>
        ) : (
          reminders.map(r => (
            <View key={r.id} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: c.text, fontFamily: fonts.body }]}>{r.title}</Text>
                <Text style={[styles.cardMeta, { color: c.textMuted, fontFamily: fonts.sans }]}>
                  {fmt(r.hour, r.minute)} · {r.days_of_week.length === 7 ? 'Every day' : r.days_of_week.map(d => DAY_LABELS[d]).join(' ')}
                </Text>
              </View>
              <Switch
                value={r.enabled}
                onValueChange={() => { haptic.light(); user && toggle(user.id, r); }}
                trackColor={{ false: c.border, true: c.accent }}
                thumbColor="#fff"
              />
              <TouchableOpacity onPress={() => Alert.alert('Delete reminder', r.title, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => remove(r) },
              ])} style={{ marginLeft: 10 }}>
                <Text style={{ color: c.textMuted, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView style={{ maxHeight: '85%' }}>
          <View style={[styles.sheet, { backgroundColor: c.surfaceAlt, borderColor: c.border, paddingBottom: insets.bottom + spacing.lg }]}>
            <Text style={[styles.sheetTitle, { color: c.text, fontFamily: fonts.headingLoaded }]}>New reminder</Text>

            <View style={styles.kindRow}>
              {(['meal','workout','water','custom'] as ReminderKind[]).map(k => (
                <TouchableOpacity key={k} onPress={() => setKind(k)} style={[styles.kindChip, { borderColor: kind === k ? c.accent : c.border, backgroundColor: kind === k ? c.accentBg : 'transparent' }]}>
                  <Text style={[styles.kindText, { color: kind === k ? c.accent : c.textMuted }]}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text, fontFamily: fonts.body }]} placeholder="Title (e.g. Hit abs 💪)" placeholderTextColor={c.textMuted} value={title} onChangeText={setTitle} />
            <TextInput style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text, fontFamily: fonts.body }]} placeholder="Note (optional)" placeholderTextColor={c.textMuted} value={body} onChangeText={setBody} />

            {/* time */}
            <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Time — {fmt(hour, minute)}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourScroll}>
              {Array.from({ length: 24 }, (_, h) => (
                <TouchableOpacity key={h} onPress={() => setHour(h)} style={[styles.hourChip, { borderColor: hour === h ? c.accent : c.border, backgroundColor: hour === h ? c.accentBg : 'transparent' }]}>
                  <Text style={[styles.hourText, { color: hour === h ? c.accent : c.textMuted }]}>{h.toString().padStart(2, '0')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.minRow}>
              {MINUTES.map(m => (
                <TouchableOpacity key={m} onPress={() => setMinute(m)} style={[styles.minChip, { borderColor: minute === m ? c.accent : c.border, backgroundColor: minute === m ? c.accentBg : 'transparent' }]}>
                  <Text style={[styles.hourText, { color: minute === m ? c.accent : c.textMuted }]}>:{m.toString().padStart(2, '0')}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* days */}
            <Text style={[styles.fieldLabel, { color: c.textMuted }]}>Days</Text>
            <View style={styles.dayRow}>
              {DAY_LABELS.map((lbl, d) => (
                <TouchableOpacity key={d} onPress={() => toggleDay(d)} style={[styles.dayCircle, { borderColor: days.includes(d) ? c.accent : c.border, backgroundColor: days.includes(d) ? c.accent : 'transparent' }]}>
                  <Text style={[styles.dayText, { color: days.includes(d) ? c.onAccent : c.textMuted }]}>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <Button label="Cancel" onPress={() => setShowAdd(false)} variant="ghost" style={{ flex: 1 }} />
              <Button label="Add" onPress={saveNew} style={{ flex: 1 }} />
            </View>
          </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.sm },
  warn: { borderWidth: 1, borderRadius: radius.md, padding: 12, marginBottom: spacing.sm },
  warnText: { fontSize: 13, lineHeight: 19 },
  empty: { alignItems: 'center', paddingVertical: spacing.xl, gap: 6 },
  emptyTitle: { fontSize: 20 },
  emptySub: { fontSize: 14, textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, padding: 14, gap: 8 },
  cardTitle: { fontSize: 15 },
  cardMeta: { fontSize: 11, letterSpacing: 0.3, marginTop: 2 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  sheetTitle: { fontSize: 20, marginBottom: 2 },
  kindRow: { flexDirection: 'row', gap: 6 },
  kindChip: { flex: 1, paddingVertical: 7, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  kindText: { fontFamily: fonts.sans, fontSize: 11, textTransform: 'capitalize' },
  input: { borderWidth: 1, borderRadius: radius.md, padding: 12, fontSize: 15 },
  fieldLabel: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 6 },
  hourScroll: { flexGrow: 0 },
  hourChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, marginRight: 6 },
  hourText: { fontFamily: fonts.mono, fontSize: 13 },
  minRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  minChip: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontFamily: fonts.sans, fontSize: 13, fontWeight: '600' },
  modalBtns: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
});
