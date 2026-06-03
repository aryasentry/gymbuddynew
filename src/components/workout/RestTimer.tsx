import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Vibration } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, radius } from '../../theme';
import { useTheme } from '../../theme/useTheme';

interface Props {
  seconds: number;
  onDismiss: () => void;
}

const PRESETS = [60, 90, 120, 180];

export function RestTimer({ seconds, onDismiss }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const [total, setTotal] = useState(seconds);
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slide = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    start();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  function start() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          Vibration.vibrate([0, 300, 150, 300]);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  }

  function reset(sec: number) { setTotal(sec); setRemaining(sec); start(); }
  function addTime(sec: number) { setTotal(t => t + sec); setRemaining(r => r + sec); }

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const pct = total > 0 ? remaining / total : 0;
  const done = remaining === 0;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: c.surfaceAlt, borderColor: done ? c.accent : c.accentBorder, paddingBottom: insets.bottom + 10, transform: [{ translateY: slide }] },
      ]}
    >
      <View style={[styles.track, { backgroundColor: c.border }]}>
        <View style={[styles.trackFill, { backgroundColor: c.accent, width: `${pct * 100}%` }]} />
      </View>

      <View style={styles.row}>
        <View>
          <Text style={[styles.timeText, { color: done ? c.accent : c.text, fontFamily: fonts.headingLoaded }]}>
            {done ? 'Rest done' : `${mm}:${ss.toString().padStart(2, '0')}`}
          </Text>
          <Text style={[styles.label, { color: c.textMuted }]}>Rest timer</Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity onPress={() => addTime(15)} style={[styles.ctrlBtn, { borderColor: c.border }]}>
            <Text style={[styles.ctrlText, { color: c.text }]}>+15s</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDismiss} style={[styles.ctrlBtn, { backgroundColor: c.accent, borderColor: c.accent }]}>
            <Text style={[styles.ctrlText, { color: c.onAccent }]}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.presets}>
        {PRESETS.map(p => (
          <TouchableOpacity key={p} onPress={() => reset(p)} style={[styles.preset, { borderColor: total === p ? c.accent : c.border }]}>
            <Text style={[styles.presetText, { color: total === p ? c.accent : c.textMuted }]}>
              {p >= 60 ? `${p / 60}m` : `${p}s`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: 16, overflow: 'hidden' },
  track: { height: 3, marginHorizontal: -16, marginBottom: 12 },
  trackFill: { height: '100%' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeText: { fontSize: 28, letterSpacing: -0.5 },
  label: { fontFamily: fonts.sans, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: -2 },
  controls: { flexDirection: 'row', gap: 8 },
  ctrlBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1 },
  ctrlText: { fontFamily: fonts.sans, fontSize: 13, letterSpacing: 0.3 },
  presets: { flexDirection: 'row', gap: 8, marginTop: 10 },
  preset: { flex: 1, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  presetText: { fontFamily: fonts.sans, fontSize: 12, letterSpacing: 0.5 },
});
