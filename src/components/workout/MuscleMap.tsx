import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { fonts } from '../../theme';
import { useTheme } from '../../theme/useTheme';
import { Muscle } from '../../types';

// Anatomy image is front (left) + back (right). Regions are [left%, top%, w%, h%]
// of the whole image, so they scale with any render size.
const IMG_ASPECT = 1740 / 940; // ~1.85 (w/h)
const REGIONS: Record<Muscle, number[][]> = {
  chest:      [[25, 21, 7, 8], [33, 21, 7, 8]],
  shoulders:  [[20, 18, 7, 6], [40, 18, 7, 6], [60, 18, 7, 6], [80, 18, 7, 6]],
  biceps:     [[19, 25, 6, 9], [42, 25, 6, 9]],
  triceps:    [[59, 25, 6, 9], [81, 25, 6, 9]],
  forearms:   [[16, 35, 6, 9], [45, 35, 6, 9], [57, 35, 6, 9], [84, 35, 6, 9]],
  abs:        [[28, 31, 8, 13]],
  traps:      [[64, 17, 12, 6]],
  lats:       [[63, 28, 6, 9], [74, 28, 6, 9]],
  back:       [[65, 30, 10, 13]],
  glutes:     [[64, 45, 6, 8], [72, 45, 6, 8]],
  quads:      [[25, 50, 7, 15], [34, 50, 7, 15]],
  hamstrings: [[64, 53, 7, 14], [73, 53, 7, 14]],
  calves:     [[26, 68, 6, 13], [35, 68, 6, 13], [65, 69, 6, 13], [74, 69, 6, 13]],
};

export function MuscleMap({ active, width }: { active: Set<Muscle>; width?: number }) {
  const { c } = useTheme();
  const w = width ?? Dimensions.get('window').width - 72;
  const h = w / IMG_ASPECT;

  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View style={{ width: w, height: h }}>
        <Image
          source={require('../../../assets/muscle-map.png')}
          style={{ width: w, height: h }}
          resizeMode="contain"
        />
        {[...active].flatMap(m => (REGIONS[m] ?? []).map((r, i) => (
          <View
            key={`${m}-${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: (r[0] / 100) * w,
              top: (r[1] / 100) * h,
              width: (r[2] / 100) * w,
              height: (r[3] / 100) * h,
              backgroundColor: 'rgba(229,57,53,0.5)',
              borderRadius: 8,
            }}
          />
        )))}
      </View>
      <View style={styles.legend}>
        <View style={styles.dot} />
        <Text style={[styles.legendText, { color: c.textMuted }]}>Worked today · front & back</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 3, backgroundColor: 'rgba(229,57,53,0.7)' },
  legendText: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 0.5 },
});
