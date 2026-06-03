import React, { useRef } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, Animated, ViewStyle } from 'react-native';
import { fonts, radius, spacing } from '../../theme';
import { useTheme } from '../../theme/useTheme';
import { haptic } from '../../utils/haptics';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', loading, disabled, style }: Props) {
  const { c } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';

  const bg = isPrimary ? c.accent : 'transparent';
  const borderColor = isOutline ? c.accent : 'transparent';
  const textColor = isPrimary ? c.onAccent : c.accent;

  function pressIn() {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  }
  function handlePress() {
    haptic.light();
    onPress();
  }

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled || loading}
        style={[
          styles.btn,
          { backgroundColor: bg, borderColor, opacity: disabled ? 0.5 : 1 },
          isOutline && styles.outlined,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  outlined: { borderWidth: 1 },
  label: { fontFamily: fonts.body, fontSize: 15, letterSpacing: 0.3, fontWeight: '600' },
});
