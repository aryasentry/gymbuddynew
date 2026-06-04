import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { runCoachAgent, summarizeConversation } from '../lib/coachAgent';
import { useThemeStore } from './themeStore';
import { CoachMessage, CoachSession, Profile } from '../types';

const RECENT_WINDOW = 10; // messages sent to the model each turn (older lives in summary)

interface CoachState {
  sessionId: string | null;
  summary: string;
  messages: CoachMessage[];
  sessions: CoachSession[];
  loading: boolean;
  thinking: boolean;
  loadSession: (userId: string) => Promise<void>;
  fetchSessions: (userId: string) => Promise<void>;
  openSession: (userId: string, sessionId: string) => Promise<void>;
  send: (userId: string, profile: Profile, text: string) => Promise<void>;
  endAndSummarize: (userId: string) => Promise<void>;
  newChat: (userId: string) => Promise<void>;
}

export const useCoachStore = create<CoachState>((set, get) => ({
  sessionId: null,
  summary: '',
  messages: [],
  sessions: [],
  loading: false,
  thinking: false,

  fetchSessions: async (userId) => {
    const { data } = await supabase
      .from('coach_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50);
    set({ sessions: (data ?? []) as CoachSession[] });
  },

  openSession: async (userId, sessionId) => {
    set({ loading: true });
    // reopening makes it the active thread again
    await supabase.from('coach_sessions').update({ ended: false }).eq('id', sessionId);
    const { data: session } = await supabase.from('coach_sessions').select('*').eq('id', sessionId).single();
    const { data: msgs } = await supabase
      .from('coach_messages').select('*').eq('session_id', sessionId)
      .order('created_at', { ascending: true }).limit(50);
    set({ sessionId, summary: session?.summary ?? '', messages: (msgs ?? []) as CoachMessage[], loading: false });
    get().fetchSessions(userId);
  },

  loadSession: async (userId) => {
    set({ loading: true });
    // most recent active session, else create one
    let { data: session } = await supabase
      .from('coach_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('ended', false)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      const { data: created } = await supabase
        .from('coach_sessions')
        .insert({ user_id: userId, title: 'Coach chat' })
        .select()
        .single();
      session = created;
    }

    const { data: msgs } = await supabase
      .from('coach_messages')
      .select('*')
      .eq('session_id', session!.id)
      .order('created_at', { ascending: true })
      .limit(50);

    set({ sessionId: session!.id, summary: session!.summary ?? '', messages: (msgs ?? []) as CoachMessage[], loading: false });
    get().fetchSessions(userId);
  },

  send: async (userId, profile, text) => {
    let sessionId = get().sessionId;
    if (!sessionId) { await get().loadSession(userId); sessionId = get().sessionId; }
    if (!sessionId) return;

    const wasFirst = get().messages.length === 0;

    // persist + show user message
    const { data: userMsg } = await supabase
      .from('coach_messages')
      .insert({ session_id: sessionId, user_id: userId, role: 'user', content: text })
      .select().single();
    if (userMsg) set(s => ({ messages: [...s.messages, userMsg as CoachMessage] }));

    // auto-title the chat from the first message (ChatGPT-style)
    if (wasFirst) {
      const title = text.trim().replace(/\s+/g, ' ').slice(0, 42);
      await supabase.from('coach_sessions').update({ title }).eq('id', sessionId);
      set(s => ({ sessions: s.sessions.map(x => x.id === sessionId ? { ...x, title } : x) }));
    }

    set({ thinking: true });
    try {
      const recent = get().messages.slice(-RECENT_WINDOW).map(m => ({ role: m.role, content: m.content }));
      const model = useThemeStore.getState().coachModel;
      const reply = await runCoachAgent({ userId, profile, summary: get().summary, recent, question: text, model });

      const { data: aiMsg } = await supabase
        .from('coach_messages')
        .insert({ session_id: sessionId, user_id: userId, role: 'assistant', content: reply })
        .select().single();
      if (aiMsg) set(s => ({ messages: [...s.messages, aiMsg as CoachMessage] }));

      await supabase.from('coach_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);
    } catch (e: any) {
      const errText = e.message?.includes('429') ? 'All AI keys are rate-limited right now. Try again shortly.' : 'Connection trouble — try again.';
      const { data: aiMsg } = await supabase
        .from('coach_messages')
        .insert({ session_id: sessionId, user_id: userId, role: 'assistant', content: errText })
        .select().single();
      if (aiMsg) set(s => ({ messages: [...s.messages, aiMsg as CoachMessage] }));
    } finally {
      set({ thinking: false });
      get().fetchSessions(userId);
    }
  },

  // Called when leaving the chat / closing app — refresh the rolling summary (overwrite).
  endAndSummarize: async (userId) => {
    const { sessionId, messages, summary } = get();
    if (!sessionId || messages.length < 4) return;
    try {
      const newSummary = await summarizeConversation(
        messages.map(m => ({ role: m.role, content: m.content })),
        summary
      );
      await supabase.from('coach_sessions').update({ summary: newSummary, updated_at: new Date().toISOString() }).eq('id', sessionId);
      set({ summary: newSummary });
    } catch { /* summary is best-effort */ }
  },

  newChat: async (userId) => {
    await get().endAndSummarize(userId); // persist a summary for the chat we're leaving
    const { sessionId } = get();
    if (sessionId) await supabase.from('coach_sessions').update({ ended: true }).eq('id', sessionId);
    set({ sessionId: null, summary: '', messages: [] });
    await get().loadSession(userId);
  },
}));
