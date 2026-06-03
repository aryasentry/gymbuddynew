import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, useColorScheme } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { TopBar } from '../../components/common/TopBar';
import { fonts, spacing } from '../../theme';
import { useTheme } from '../../theme/useTheme';
import { RootStackParamList } from '../../types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Signup'> };

export function SignupScreen({ navigation }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { signUp, loading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const bg = c.bg;
  const textColor = c.text;
  const mutedColor = c.textMuted;

  async function handleSignup() {
    setError('');
    if (!email || !password || !confirm) { setError('Fill in all fields'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    const err = await signUp(email.trim().toLowerCase(), password);
    if (err) { setError(err); return; }
    setDone(true);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, backgroundColor: bg }}>
        <TopBar showBack onBack={() => navigation.goBack()} title="Create Account" />
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          {done ? (
            <View style={styles.done}>
              <Text style={[styles.doneTitle, { color: textColor, fontFamily: fonts.headingLoaded }]}>Check your email</Text>
              <Text style={[styles.doneSub, { color: mutedColor, fontFamily: fonts.bodyItalic }]}>
                We sent a confirmation link to {email}. Click it to activate your account.
              </Text>
              <Button label="Back to Sign In" onPress={() => navigation.navigate('Login')} variant="outline" style={{ marginTop: spacing.lg }} />
            </View>
          ) : (
            <View style={styles.form}>
              <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="you@example.com" />
              <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Min 6 characters" />
              <Input label="Confirm Password" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Repeat password" />
              {error ? <Text style={[styles.error, { fontFamily: fonts.sans }]}>{error}</Text> : null}
              <Button label="Create Account" onPress={handleSignup} loading={loading} style={{ marginTop: spacing.sm }} />
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md },
  form: { gap: spacing.md },
  error: { fontSize: 13, color: '#c0392b', textAlign: 'center' },
  done: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxl },
  doneTitle: { fontSize: 24, letterSpacing: -0.5 },
  doneSub: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
