import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
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
    const { data } = await supabase.from('progress_photos').select('*').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(120);
    setPhotos((data ?? []) as Photo[]);
  }
  useEffect(() => { if (visible) load(); }, [visible, user?.id]);

  function storagePath(url: string): string | null {
    const marker = '/progress-photos/';
    const i = url.indexOf(marker);
    return i === -1 ? null : url.slice(i + marker.length);
  }

  async function removePhoto(photo: Photo) {
    await supabase.from('progress_photos').delete().eq('id', photo.id);
    const path = storagePath(photo.image_url);
    if (path) { try { await supabase.storage.from('progress-photos').remove([path]); } catch {} }
  }

  async function capture(pose: Pose, fromCamera: boolean) {
    if (!user) return;
    const fn = fromCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const res = await fn({ mediaTypes: ['images'], quality: 0.6 });
    if (res.canceled) return;
    setUploading(pose);
    const url = await uploadProgressPhoto(user.id, res.assets[0].uri, pose);
    if (url) {
      // replace today's photo for this pose if one exists
      const existing = photos.find(p => p.logged_at === todayISO() && p.pose === pose);
      if (existing) await removePhoto(existing);
      await supabase.from('progress_photos').insert({ user_id: user.id, logged_at: todayISO(), pose, image_url: url });
      haptic.success();
      await load();
    }
    setUploading(null);
  }

  function confirmDelete(photo: Photo) {
    Alert.alert('Delete photo', `${photo.pose} · ${new Date(photo.logged_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await removePhoto(photo); await load(); } },
    ]);
  }

  // group by date (full Photo so we can delete)
  const byDate: Record<string, Partial<Record<Pose, Photo>>> = {};
  for (const p of photos) { (byDate[p.logged_at] ??= {})[p.pose] = p; }
  const dates = Object.keys(byDate).sort().reverse();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
        <View style={[styles.head, { borderBottomColor: c.border }]}>
          <Text style={[styles.title, { color: c.text, fontFamily: fonts.headingLoaded }]}>Progress Photos</Text>
          <TouchableOpacity onPress={onClose}><Text style={{ color: c.accent, fontSize: 18 }}>✕</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sub, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>Snap or pick front / side / back. Tap a photo to delete · capture again to replace today's.</Text>
          <View style={styles.captureRow}>
            {POSES.map(p => (
              <View key={p} style={[styles.captureBtn, { borderColor: c.accent, backgroundColor: c.accentBg }]}>
                {uploading === p ? <ActivityIndicator color={c.accent} /> : <>
                  <Text style={[styles.captureLabel, { color: c.accent, fontFamily: fonts.sans }]}>{p}</Text>
                  <View style={styles.captureIcons}>
                    <TouchableOpacity onPress={() => capture(p, true)}><Text style={{ fontSize: 20 }}>📷</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => capture(p, false)}><Text style={{ fontSize: 20 }}>🖼</Text></TouchableOpacity>
                  </View>
                </>}
              </View>
            ))}
          </View>

          {dates.length === 0 ? (
            <Text style={[styles.empty, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>No photos yet</Text>
          ) : dates.map(d => (
            <View key={d} style={styles.dateBlock}>
              <Text style={[styles.date, { color: c.textMuted, fontFamily: fonts.sans }]}>{new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
              <View style={styles.photoRow}>
                {POSES.map(p => {
                  const photo = byDate[d][p];
                  return (
                    <View key={p} style={styles.photoSlot}>
                      {photo
                        ? <TouchableOpacity onPress={() => confirmDelete(photo)}><Image source={{ uri: photo.image_url }} style={[styles.photo, { borderColor: c.border }]} /></TouchableOpacity>
                        : <View style={[styles.photo, styles.photoEmpty, { borderColor: c.border }]}><Text style={{ color: c.textMuted, fontSize: 10 }}>{p}</Text></View>}
                    </View>
                  );
                })}
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
  captureBtn: { flex: 1, borderWidth: 1, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', gap: 8 },
  captureLabel: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  captureIcons: { flexDirection: 'row', gap: 14 },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: spacing.xl },
  dateBlock: { marginBottom: spacing.lg, gap: 8 },
  date: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  photoRow: { flexDirection: 'row', gap: 8 },
  photoSlot: { flex: 1 },
  photo: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, borderWidth: 1 },
  photoEmpty: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
});
