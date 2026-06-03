import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { fonts, radius, spacing } from '../../theme';
import { useTheme } from '../../theme/useTheme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, containerStyle, ...props }: Props) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? c.danger : focused ? c.accent : c.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>}
      <TextInput
        {...props}
        style={[
          styles.input,
          { backgroundColor: c.surface, borderColor, color: c.text, fontFamily: fonts.body },
          props.style,
        ]}
        placeholderTextColor={c.textMuted}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      />
      {error && <Text style={[styles.error, { color: c.danger }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, minHeight: 48 },
  error: { fontSize: 12, fontFamily: fonts.sans },
});
