import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import { useCoachStore } from '../../store/coachStore';
import { TopBar } from '../../components/common/TopBar';
import { fonts, spacing, radius } from '../../theme';
import { useTheme } from '../../theme/useTheme';
import { haptic } from '../../utils/haptics';

const QUICK_QUESTIONS = [
  "Why isn't my weight dropping?",
  "Am I eating enough protein?",
  "How's my workout consistency this month?",
  "Is my bench press improving?",
  "What should I focus on this week?",
];

export function CoachScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const { messages, sessions, sessionId, thinking, loading, loadSession, openSession, send, endAndSummarize, newChat } = useCoachStore();

  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useFocusEffect(useCallback(() => {
    if (user?.id) loadSession(user.id);
    // on blur: refresh rolling summary (best-effort persistence)
    return () => { if (user?.id) endAndSummarize(user.id); };
  }, [user?.id]));

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages.length, thinking]);

  function handleSend(text?: string) {
    const q = (text ?? input).trim();
    if (!q || thinking || !profile || !user) return;
    setInput('');
    haptic.light();
    send(user.id, profile, q);
  }

  const empty = messages.length === 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <TopBar logo right={
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => { haptic.light(); setShowHistory(true); }}>
              <Text style={{ fontSize: 18, color: c.text }}>☰</Text>
            </TouchableOpacity>
            {!empty && (
              <TouchableOpacity onPress={() => { haptic.medium(); user && newChat(user.id); }}>
                <Text style={{ fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1, color: c.accent }}>NEW</Text>
              </TouchableOpacity>
            )}
          </View>
        } />

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: spacing.md }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {empty && !loading && (
            <View style={[styles.intro, { borderBottomColor: c.border }]}>
              <Text style={[styles.introTitle, { color: c.text, fontFamily: fonts.headingLoaded }]}>AI Coach</Text>
              <Text style={[styles.introSub, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>
                Ask anything. I pull your real logs — meals, workouts, weight, PRs — on demand, and I remember our past chats.
              </Text>
            </View>
          )}

          {empty && !loading && (
            <View style={styles.quickWrap}>
              <Text style={[styles.quickLabel, { color: c.textMuted }]}>Try asking</Text>
              {QUICK_QUESTIONS.map(q => (
                <TouchableOpacity key={q} onPress={() => handleSend(q)} style={[styles.quickBtn, { borderColor: c.border, backgroundColor: c.surface }]}>
                  <Text style={[styles.quickBtnText, { color: c.text, fontFamily: fonts.body }]}>{q}</Text>
                  <Text style={{ color: c.accent, fontSize: 16 }}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {messages.map((msg) => (
            <View key={msg.id} style={[styles.msgWrap, msg.role === 'user' ? styles.msgUser : styles.msgCoach]}>
              {msg.role === 'assistant' && (
                <View style={[styles.coachAvatar, { borderColor: c.border }]}><Text style={{ fontSize: 14 }}>✦</Text></View>
              )}
              <View style={[
                styles.bubble,
                msg.role === 'user'
                  ? { backgroundColor: c.accentBg, borderColor: c.accentBorder }
                  : { backgroundColor: c.surface, borderColor: c.border },
              ]}>
                <Text style={[styles.bubbleText, { color: c.text, fontFamily: fonts.body }]}>{msg.content}</Text>
              </View>
            </View>
          ))}

          {thinking && (
            <View style={[styles.msgWrap, styles.msgCoach]}>
              <View style={[styles.coachAvatar, { borderColor: c.border }]}><Text style={{ fontSize: 14 }}>✦</Text></View>
              <View style={[styles.bubble, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[styles.bubbleText, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>Checking your data…</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputBar, { backgroundColor: c.bg, borderTopColor: c.border, paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={[styles.textInput, { backgroundColor: c.surface, borderColor: c.border, color: c.text, fontFamily: fonts.body }]}
            placeholder="Ask your coach…"
            placeholderTextColor={c.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={() => handleSend()}
            disabled={!input.trim() || thinking}
            style={[styles.sendBtn, { backgroundColor: input.trim() && !thinking ? c.accent : c.border }]}
          >
            <Text style={{ color: input.trim() && !thinking ? c.onAccent : c.textMuted, fontSize: 16 }}>↑</Text>
          </TouchableOpacity>
        </View>

        {/* Chat history drawer */}
        <Modal visible={showHistory} transparent animationType="slide" onRequestClose={() => setShowHistory(false)}>
          <View style={styles.histOverlay}>
            <View style={[styles.histSheet, { backgroundColor: c.surfaceAlt, borderColor: c.border, paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md }]}>
              <View style={styles.histHead}>
                <Text style={[styles.histTitle, { color: c.text, fontFamily: fonts.headingLoaded }]}>Chats</Text>
                <TouchableOpacity onPress={() => setShowHistory(false)}><Text style={{ color: c.textMuted, fontSize: 18 }}>✕</Text></TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => { haptic.medium(); if (user) newChat(user.id); setShowHistory(false); }}
                style={[styles.newChatRow, { borderColor: c.accent, backgroundColor: c.accentBg }]}
              >
                <Text style={[styles.newChatText, { color: c.accent, fontFamily: fonts.body }]}>+ New chat</Text>
              </TouchableOpacity>

              <ScrollView showsVerticalScrollIndicator={false}>
                {sessions.length === 0 ? (
                  <Text style={[styles.histEmpty, { color: c.textMuted, fontFamily: fonts.bodyItalic }]}>No past chats yet</Text>
                ) : sessions.map(sess => (
                  <TouchableOpacity
                    key={sess.id}
                    onPress={() => { if (user) openSession(user.id, sess.id); setShowHistory(false); }}
                    style={[styles.histRow, { borderBottomColor: c.border }, sess.id === sessionId && { backgroundColor: c.accentBg }]}
                  >
                    <Text style={[styles.histRowTitle, { color: c.text, fontFamily: fonts.body }]} numberOfLines={1}>
                      {sess.title || 'Untitled chat'}
                    </Text>
                    <Text style={[styles.histRowMeta, { color: c.textMuted, fontFamily: fonts.sans }]} numberOfLines={1}>
                      {sess.summary ? sess.summary.slice(0, 60) : new Date(sess.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowHistory(false)} />
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  intro: { padding: spacing.lg, gap: spacing.sm, borderBottomWidth: 1 },
  introTitle: { fontSize: 26, letterSpacing: -0.5 },
  introSub: { fontSize: 14, lineHeight: 20 },
  quickWrap: { padding: spacing.lg, gap: 8 },
  quickLabel: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  quickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: radius.md, borderWidth: 1 },
  quickBtnText: { fontSize: 14, flex: 1 },
  msgWrap: { paddingHorizontal: spacing.lg, paddingVertical: 6, gap: 8 },
  msgUser: { flexDirection: 'row-reverse', alignItems: 'flex-end' },
  msgCoach: { flexDirection: 'row', alignItems: 'flex-start' },
  coachAvatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 14, borderWidth: 1 },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  inputBar: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingTop: 10, gap: 8, borderTopWidth: 1, alignItems: 'flex-end' },
  textInput: { flex: 1, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
  histOverlay: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.4)' },
  histSheet: { width: '82%', borderRightWidth: 1, paddingHorizontal: spacing.lg },
  histHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  histTitle: { fontSize: 22 },
  newChatRow: { borderWidth: 1, borderRadius: radius.md, padding: 12, alignItems: 'center', marginBottom: spacing.md },
  newChatText: { fontSize: 14, fontWeight: '600' },
  histEmpty: { fontSize: 14, textAlign: 'center', marginTop: spacing.xl },
  histRow: { paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderRadius: radius.sm, gap: 3 },
  histRowTitle: { fontSize: 14 },
  histRowMeta: { fontSize: 11, letterSpacing: 0.2 },
});

