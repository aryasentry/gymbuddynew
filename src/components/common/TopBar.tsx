import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../theme';
import { useTheme } from '../../theme/useTheme';

interface Props {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  logo?: boolean;
  transparent?: boolean;
}

export function TopBar({ title, showBack, onBack, right, logo, transparent }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.container,
      { backgroundColor: transparent ? 'transparent' : c.bg, borderBottomColor: c.border, paddingTop: insets.top + 4 },
    ]}>
      <View style={styles.inner}>
        {showBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.backArrow, { color: c.accent }]}>←</Text>
          </TouchableOpacity>
        )}

        <View style={styles.titleWrap}>
          {logo ? (
            <Text style={[styles.logoText, { color: c.text, fontFamily: fonts.headingLoaded }]}>
              Gym<Text style={{ color: c.accent }}>Buddy</Text>
            </Text>
          ) : (
            <Text style={[styles.title, { color: c.text, fontFamily: fonts.headingLoaded }]} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>

        <View style={styles.rightSlot}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderBottomWidth: 1, paddingBottom: 12, paddingHorizontal: 20 },
  inner: { flexDirection: 'row', alignItems: 'center', minHeight: 36 },
  backBtn: { marginRight: 10 },
  backArrow: { fontSize: 20, lineHeight: 24 },
  titleWrap: { flex: 1 },
  title: { fontSize: 18, letterSpacing: -0.2 },
  logoText: { fontSize: 20, letterSpacing: -0.3 },
  rightSlot: { minWidth: 32, alignItems: 'flex-end' },
});
