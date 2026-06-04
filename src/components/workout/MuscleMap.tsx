import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { fonts } from '../../theme';
import { useTheme } from '../../theme/useTheme';
import { Muscle } from '../../types';

// Anatomy image is front (left) + back (right). Regions are [left%, top%, w%, h%]
// of the whole image, so they scale with any render size.
const IMG_ASPECT = 432 / 230; // ~1.88 (w/h). Front body center ~28.5%, back ~70.5%.
const REGIONS: Record<Muscle, number[][]> = {
  // shoulders
  front_delts:     [[22, 13, 5, 4], [33, 13, 5, 4]],
  side_delts:      [[19, 14, 4, 5], [37, 14, 4, 5]],
  rear_delts:      [[62, 14, 4, 4], [78, 14, 4, 4]],
  // chest
  upper_chest:     [[24, 15, 5, 3], [30, 15, 5, 3]],
  lower_chest:     [[24, 18, 5, 3], [30, 18, 5, 3]],
  // arms (front biceps, back triceps)
  biceps_long:     [[19, 18, 3, 6], [38, 18, 3, 6]],
  biceps_short:    [[21, 19, 3, 6], [36, 19, 3, 6]],
  triceps_long:    [[60, 18, 3, 7], [79, 18, 3, 7]],
  triceps_lateral: [[58, 19, 2, 7], [81, 19, 2, 7]],
  triceps_medial:  [[62, 20, 2, 6], [78, 20, 2, 6]],
  forearms:        [[17, 26, 4, 7], [39, 26, 4, 7], [57, 27, 4, 7], [81, 27, 4, 7]],
  // core
  upper_abs:       [[26, 23, 7, 5]],
  lower_abs:       [[27, 29, 5, 4]],
  obliques:        [[24, 24, 3, 6], [33, 24, 3, 6]],
  // back
  traps_upper:     [[67, 12, 8, 5]],
  traps_mid:       [[65, 17, 12, 5]],
  rhomboids:       [[67, 21, 9, 4]],
  lats:            [[64, 22, 5, 8], [73, 22, 5, 8]],
  lower_back:      [[67, 30, 8, 5]],
  // legs
  glutes:          [[65, 36, 5, 8], [71, 36, 5, 8]],
  quads:           [[25, 40, 4, 16], [31, 40, 4, 16]],
  adductors:       [[28, 37, 4, 8]],
  hamstrings:      [[65, 45, 5, 15], [72, 45, 5, 15]],
  calves:          [[25, 62, 4, 14], [31, 62, 4, 14], [66, 62, 4, 14], [72, 62, 4, 14]],
  soleus:          [[66, 75, 4, 5], [72, 75, 4, 5]],
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
