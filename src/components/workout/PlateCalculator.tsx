import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity } from 'react-native';
import { fonts, spacing, radius } from '../../theme';
import { useTheme } from '../../theme/useTheme';
import { platesPerSide } from '../../utils/workout';
import { Button } from '../common/Button';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const PLATE_COLORS: Record<number, string> = {
  25: '#c0392b', 20: '#2c5fa8', 15: '#c8a02c', 10: '#3a7d3a', 5: '#888', 2.5: '#555', 1.25: '#999',
};

export function PlateCalculator({ visible, onClose }: Props) {
  const { c } = useTheme();
  const [target, setTarget] = useState('60');
  const [bar, setBar] = useState(20);

  const targetNum = parseFloat(target) || 0;
  const plates = platesPerSide(targetNum, bar);
  const achievable = bar + plates.reduce((s, p) => s + p.plate * p.count, 0) * 2;
  const impossible = targetNum > bar && plates.length === 0;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
          <Text style={[styles.title, { color: c.text, fontFamily: fonts.headingLoaded }]}>Plate Calculator</Text>
          <Text style={[styles.sub, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>What to load on each side</Text>

          <View style={styles.inputRow}>
            <Text style={[styles.inputLabel, { color: c.textMuted }]}>Target weight</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text, fontFamily: fonts.body }]}
                value={target} onChangeText={setTarget} keyboardType="decimal-pad"
              />
              <Text style={[styles.unit, { color: c.textMuted }]}>kg</Text>
            </View>
          </View>

          <Text style={[styles.inputLabel, { color: c.textMuted }]}>Bar weight</Text>
          <View style={styles.barRow}>
            {[20, 15, 10, 0].map(b => (
              <TouchableOpacity
                key={b}
                onPress={() => setBar(b)}
                style={[styles.barBtn, { borderColor: bar === b ? c.accent : c.border, backgroundColor: bar === b ? c.accentBg : 'transparent' }]}
              >
                <Text style={[styles.barText, { color: bar === b ? c.accent : c.textMuted }]}>{b === 0 ? 'None' : `${b}kg`}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.result, { borderColor: c.border }]}>
            {impossible ? (
              <Text style={[styles.impossible, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>Can't make {targetNum}kg with standard plates</Text>
            ) : plates.length === 0 ? (
              <Text style={[styles.impossible, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>Just the bar</Text>
            ) : (
              <>
                <Text style={[styles.perSideLabel, { color: c.textMuted }]}>Per side</Text>
                <View style={styles.plateList}>
                  {plates.map(p => (
                    <View key={p.plate} style={[styles.plateChip, { backgroundColor: PLATE_COLORS[p.plate] ?? '#666' }]}>
                      <Text style={styles.plateChipText}>{p.count} × {p.plate}</Text>
                    </View>
                  ))}
                </View>
                {Math.abs(achievable - targetNum) > 0.01 && (
                  <Text style={[styles.closest, { color: c.accent }]}>Closest: {achievable}kg</Text>
                )}
              </>
            )}
          </View>

          <Button label="Close" onPress={onClose} variant="outline" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  card: { padding: spacing.lg, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, gap: spacing.md },
  title: { fontSize: 20 },
  sub: { fontSize: 13, marginTop: -8 },
  inputRow: { gap: 6 },
  inputLabel: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: 12, fontSize: 18, textAlign: 'center' },
  unit: { fontFamily: fonts.sans, fontSize: 14 },
  barRow: { flexDirection: 'row', gap: 8 },
  barBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  barText: { fontFamily: fonts.sans, fontSize: 12 },
  result: { borderWidth: 1, borderRadius: radius.md, padding: 14, gap: 8, minHeight: 80, justifyContent: 'center' },
  perSideLabel: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' },
  plateList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  plateChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  plateChipText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  closest: { fontFamily: fonts.sans, fontSize: 12, marginTop: 2 },
  impossible: { fontSize: 14, textAlign: 'center' },
});
