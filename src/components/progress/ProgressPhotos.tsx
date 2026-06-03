import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { fonts, spacing, radius } from '../../theme';
import { useTheme } from '../../theme/useTheme';
import { supabase } from '../../lib/supabase';
import { uploadProgressPhoto } from '../../lib/storage';
import { useAuthStore } from '../../store/authStore';
import { todayISO } from '../../utils/nutrition';
import { haptic } from '../../utils/haptics';

const POSES = ['front', 'side', 'back'] as const;
type Pose = typeof POSES[number];
interface Photo { id: string; logged_at: string; pose: Pose; image_url: string; }

export function ProgressPhotos({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState<Pose | null>(null);

  async function load() {
    if (!user?.id) return;
    const { data } = await supabase.from('progress_photos').select('*').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(60);
    setPhotos((data ?? []) as Photo[]);
  }
  useEffect(() => { if (visible) load(); }, [visible, user?.id]);

  async function capture(pose: Pose) {
    if (!user) return;
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (res.canceled) return;
    setUploading(pose);
    const url = await uploadProgressPhoto(user.id, res.assets[0].uri, pose);
    if (url) {
      await supabase.from('progress_photos').insert({ user_id: user.id, logged_at: todayISO(), pose, image_url: url });
      haptic.success();
      await load();
    }
    setUploading(null);
  }

  // group by date
  const byDate: Record<string, Partial<Record<Pose, string>>> = {};
  for (const p of photos) { (byDate[p.logged_at] ??= {})[p.pose] = p.image_url; }
  const dates = Object.keys(byDate).sort().reverse();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
        <View style={[styles.head, { borderBottomColor: c.border }]}>
          <Text style={[styles.title, { color: c.text, fontFamily: fonts.headingLoaded }]}>Progress Photos</Text>
          <TouchableOpacity onPress={onClose}><Text style={{ color: c.accent, fontSize: 18 }}>✕</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sub, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>Snap front / side / back. Track the recomp over months.</Text>
          <View style={styles.captureRow}>
            {POSES.map(p => (
              <TouchableOpacity key={p} onPress={() => capture(p)} style={[styles.captureBtn, { borderColor: c.accent, backgroundColor: c.accentBg }]}>
                {uploading === p ? <ActivityIndicator color={c.accent} /> : <>
                  <Text style={{ fontSize: 22 }}>📸</Text>
                  <Text style={[styles.captureLabel, { color: c.accent, fontFamily: fonts.sans }]}>{p}</Text>
                </>}
              </TouchableOpacity>
            ))}
          </View>

          {dates.length === 0 ? (
            <Text style={[styles.empty, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>No photos yet</Text>
          ) : dates.map(d => (
            <View key={d} style={styles.dateBlock}>
              <Text style={[styles.date, { color: c.textMuted, fontFamily: fonts.sans }]}>{new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
              <View style={styles.photoRow}>
                {POSES.map(p => (
                  <View key={p} style={styles.photoSlot}>
                    {byDate[d][p]
                      ? <Image source={{ uri: byDate[d][p]! }} style={[styles.photo, { borderColor: c.border }]} />
                      : <View style={[styles.photo, styles.photoEmpty, { borderColor: c.border }]}><Text style={{ color: c.textMuted, fontSize: 10 }}>{p}</Text></View>}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1 },
  title: { fontSize: 22 },
  sub: { fontSize: 14, marginBottom: spacing.md, lineHeight: 20 },
  captureRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  captureBtn: { flex: 1, borderWidth: 1, borderRadius: radius.md, paddingVertical: 18, alignItems: 'center', gap: 4 },
  captureLabel: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: spacing.xl },
  dateBlock: { marginBottom: spacing.lg, gap: 8 },
  date: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  photoRow: { flexDirection: 'row', gap: 8 },
  photoSlot: { flex: 1 },
  photo: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, borderWidth: 1 },
  photoEmpty: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
});
