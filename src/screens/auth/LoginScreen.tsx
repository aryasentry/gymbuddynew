import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { AppBackground } from '../../components/common/AppBackground';
import { fonts, spacing } from '../../theme';
import { useTheme } from '../../theme/useTheme';
import { RootStackParamList } from '../../types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Login'> };

export function LoginScreen({ navigation }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, loading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const bg = c.bg;
  const textColor = c.text;
  const mutedColor = c.textMuted;
  const accentColor = c.accent;

  async function handleLogin() {
    setError('');
    if (!email || !password) { setError('Fill in all fields'); return; }
    const err = await signIn(email.trim().toLowerCase(), password);
    if (err) setError(err);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppBackground />
      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Text style={[styles.logo, { color: textColor, fontFamily: fonts.headingLoaded }]}>
            Gym<Text style={{ color: accentColor }}>Buddy</Text>
          </Text>
          <Text style={[styles.tagline, { color: mutedColor, fontFamily: fonts.bodyItalic }]}>
            Track. Train. Transform.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />

          {error ? <Text style={[styles.error, { fontFamily: fonts.sans }]}>{error}</Text> : null}

          <Button label="Sign In" onPress={handleLogin} loading={loading} style={{ marginTop: spacing.sm }} />

          <View style={styles.divider}>
            <View style={[styles.divLine, { backgroundColor: c.border }]} />
            <Text style={[styles.divText, { color: mutedColor, fontFamily: fonts.sans }]}>or</Text>
            <View style={[styles.divLine, { backgroundColor: c.border }]} />
          </View>

          <Button label="Create Account" onPress={() => navigation.navigate('Signup')} variant="outline" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.xl },
  logoWrap: { alignItems: 'center', gap: spacing.sm },
  logo: { fontSize: 38, letterSpacing: -1 },
  tagline: { fontSize: 15 },
  form: { gap: spacing.md },
  error: { fontSize: 13, color: '#c0392b', textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  divLine: { flex: 1, height: 1 },
  divText: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
});
