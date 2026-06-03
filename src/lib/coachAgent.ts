import { supabase } from './supabase';
import { groqRequest, CHAT_MODEL } from './groq';
import { Profile } from '../types';
import { goalLabel, todayISO } from '../utils/nutrition';
import { cardioCalories } from '../utils/workout';
import { scheduleReminder } from '../utils/notifications';

// ── Tool definitions (OpenAI/Groq function-calling format) ──
// The LLM decides which to call based on the user's intent — we never feed
// the whole database up front. This is the "fetch what it needs" mechanism.
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_nutrition_range',
      description: 'Daily calories and macros (protein/carbs/fat) the user actually ate between two dates.',
      parameters: {
        type: 'object',
        properties: {
          start: { type: 'string', description: 'start date YYYY-MM-DD' },
          end: { type: 'string', description: 'end date YYYY-MM-DD' },
        },
        required: ['start', 'end'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_workouts_range',
      description: 'Workouts logged between two dates, with exercises and sets (weight x reps).',
      parameters: {
        type: 'object',
        properties: {
          start: { type: 'string', description: 'start date YYYY-MM-DD' },
          end: { type: 'string', description: 'end date YYYY-MM-DD' },
        },
        required: ['start', 'end'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weight_history',
      description: 'Recent body-weight log entries (kg) for the last N days.',
      parameters: {
        type: 'object',
        properties: { days: { type: 'number', description: 'how many days back, default 30' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_personal_records',
      description: 'Best (heaviest) set per exercise across all the user history.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_cardio_range',
      description: 'Cardio segments (treadmill/cycle: activity, minutes, speed, incline, calories burned) between two dates.',
      parameters: {
        type: 'object',
        properties: {
          start: { type: 'string', description: 'start date YYYY-MM-DD' },
          end: { type: 'string', description: 'end date YYYY-MM-DD' },
        },
        required: ['start', 'end'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_workout_streak',
      description: 'Current and longest consecutive-day workout streak.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ── WRITE / ACTION tools — only call these when the user explicitly asks for the action ──
  {
    type: 'function',
    function: {
      name: 'create_reminder',
      description: 'Create a repeating reminder/plan notification (e.g. "remind me to do abs at 7pm daily"). Only when the user asks.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
          hour: { type: 'number', description: '0-23' },
          minute: { type: 'number', description: '0-59' },
          days_of_week: { type: 'array', items: { type: 'number' }, description: '0=Sun..6=Sat; omit for every day' },
          kind: { type: 'string', enum: ['meal', 'workout', 'water', 'weight', 'custom'] },
        },
        required: ['title', 'hour', 'minute'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_workout_session',
      description: 'Create today\'s workout with planned exercises/sets (and cardio) the user can tick off. Only when the user asks for a plan/session.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          category: { type: 'string', enum: ['push', 'pull', 'legs', 'fullbody', 'cardio', 'custom'] },
          description: { type: 'string' },
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                kind: { type: 'string', enum: ['strength', 'cardio'] },
                sets: { type: 'array', items: { type: 'object', properties: { weight_kg: { type: 'number' }, reps: { type: 'number' } } } },
                segments: { type: 'array', items: { type: 'object', properties: { activity: { type: 'string' }, minutes: { type: 'number' }, speed_kmh: { type: 'number' }, incline_pct: { type: 'number' } } } },
              },
              required: ['name', 'kind'],
            },
          },
        },
        required: ['name', 'exercises'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_nutrition_targets',
      description: 'Update the user\'s daily calorie/macro targets. Only when the user asks to change goals.',
      parameters: {
        type: 'object',
        properties: {
          calorie_target: { type: 'number' },
          protein_target: { type: 'number' },
          carb_target: { type: 'number' },
          fat_target: { type: 'number' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_water',
      description: 'Add water intake in ml for today. Only when the user says they drank water.',
      parameters: { type: 'object', properties: { amount_ml: { type: 'number' } }, required: ['amount_ml'] },
    },
  },
];

// ── Tool executors (run scoped to the signed-in user via RLS) ──
async function execTool(name: string, args: any, userId: string, weightKg: number): Promise<string> {
  try {
    if (name === 'get_nutrition_range') {
      const { data } = await supabase
        .from('food_logs')
        .select('logged_at, total_calories, total_protein, total_carbs, total_fat')
        .eq('user_id', userId)
        .gte('logged_at', args.start)
        .lte('logged_at', args.end);
      const byDate: Record<string, any> = {};
      for (const r of data ?? []) {
        byDate[r.logged_at] ??= { date: r.logged_at, calories: 0, protein: 0, carbs: 0, fat: 0 };
        byDate[r.logged_at].calories += r.total_calories;
        byDate[r.logged_at].protein += r.total_protein;
        byDate[r.logged_at].carbs += r.total_carbs;
        byDate[r.logged_at].fat += r.total_fat;
      }
      return JSON.stringify(Object.values(byDate));
    }

    if (name === 'get_workouts_range') {
      const { data } = await supabase
        .from('workouts')
        .select('logged_at, name, exercises(name, sets(weight_kg, reps))')
        .eq('user_id', userId)
        .gte('logged_at', args.start)
        .lte('logged_at', args.end);
      const compact = (data ?? []).map((w: any) => ({
        date: w.logged_at,
        name: w.name,
        exercises: (w.exercises ?? []).map((e: any) => ({
          name: e.name,
          sets: (e.sets ?? []).map((s: any) => `${s.weight_kg}x${s.reps}`),
        })),
      }));
      return JSON.stringify(compact);
    }

    if (name === 'get_weight_history') {
      const days = args.days ?? 30;
      const start = new Date(); start.setDate(start.getDate() - days);
      const { data } = await supabase
        .from('weight_logs')
        .select('logged_at, weight_kg')
        .eq('user_id', userId)
        .gte('logged_at', start.toISOString().split('T')[0])
        .order('logged_at', { ascending: true });
      return JSON.stringify(data ?? []);
    }

    if (name === 'get_cardio_range') {
      const { data } = await supabase
        .from('cardio_segments')
        .select('activity, minutes, speed_kmh, incline_pct, calories, exercises!inner(name, workouts!inner(user_id, logged_at))')
        .eq('exercises.workouts.user_id', userId)
        .gte('exercises.workouts.logged_at', args.start)
        .lte('exercises.workouts.logged_at', args.end);
      const rows = (data ?? []).map((r: any) => ({
        date: r.exercises?.workouts?.logged_at,
        activity: r.activity, minutes: r.minutes, speed_kmh: r.speed_kmh, incline_pct: r.incline_pct, calories: r.calories,
      }));
      return JSON.stringify(rows);
    }

    if (name === 'get_workout_streak') {
      const { data } = await supabase
        .from('workouts').select('logged_at').eq('user_id', userId)
        .order('logged_at', { ascending: false }).limit(365);
      const { computeStreak } = await import('../utils/workout');
      return JSON.stringify(computeStreak((data ?? []).map((r: any) => r.logged_at)));
    }

    if (name === 'get_personal_records') {
      const { data } = await supabase
        .from('exercises')
        .select('name, sets(weight_kg, reps), workouts!inner(user_id)')
        .eq('workouts.user_id', userId);
      const prs: Record<string, { weight_kg: number; reps: number }> = {};
      for (const ex of (data ?? []) as any[]) {
        for (const s of ex.sets ?? []) {
          const k = ex.name.toLowerCase();
          if (!prs[k] || s.weight_kg > prs[k].weight_kg) prs[k] = { weight_kg: s.weight_kg, reps: s.reps };
        }
      }
      return JSON.stringify(prs);
    }

    // ── WRITE actions ──
    if (name === 'create_reminder') {
      const days = Array.isArray(args.days_of_week) && args.days_of_week.length ? args.days_of_week : [0, 1, 2, 3, 4, 5, 6];
      const ids = await scheduleReminder({ title: args.title, body: args.body, hour: args.hour, minute: args.minute, days_of_week: days });
      const { error } = await supabase.from('reminders').insert({
        user_id: userId, kind: args.kind ?? 'custom', title: args.title, body: args.body ?? null,
        hour: args.hour, minute: args.minute, days_of_week: days, enabled: true, notification_ids: ids,
      });
      return JSON.stringify(error ? { ok: false, error: error.message } : { ok: true, scheduled: ids.length });
    }

    if (name === 'create_workout_session') {
      const { data: w, error } = await supabase
        .from('workouts').insert({ user_id: userId, name: args.name, description: args.description ?? null, category: args.category ?? null, logged_at: todayISO() })
        .select().single();
      if (error || !w) return JSON.stringify({ ok: false, error: error?.message });
      for (let i = 0; i < (args.exercises ?? []).length; i++) {
        const pe = args.exercises[i];
        let exRes = await supabase.from('exercises').insert({ workout_id: w.id, name: pe.name, kind: pe.kind, sort_order: i }).select().single();
        if (exRes.error) exRes = await supabase.from('exercises').insert({ workout_id: w.id, name: pe.name, sort_order: i }).select().single();
        const ex = exRes.data;
        if (!ex) continue;
        if (pe.kind === 'strength' && pe.sets?.length) {
          await supabase.from('sets').insert(pe.sets.map((s: any, j: number) => ({ exercise_id: ex.id, weight_kg: s.weight_kg ?? 0, reps: s.reps ?? 0, completed: false, sort_order: j })));
        }
        if (pe.kind === 'cardio' && pe.segments?.length) {
          await supabase.from('cardio_segments').insert(pe.segments.map((s: any, j: number) => ({
            exercise_id: ex.id, activity: s.activity ?? 'run', minutes: s.minutes ?? 0, speed_kmh: s.speed_kmh ?? null, incline_pct: s.incline_pct ?? null,
            calories: cardioCalories(s.activity ?? 'run', s.minutes ?? 0, weightKg, s.speed_kmh, s.incline_pct), sort_order: j,
          }))).then(() => {}, () => {});
        }
      }
      return JSON.stringify({ ok: true, created: args.name, exercises: (args.exercises ?? []).length });
    }

    if (name === 'set_nutrition_targets') {
      const fields: any = {};
      for (const k of ['calorie_target', 'protein_target', 'carb_target', 'fat_target']) if (args[k] != null) fields[k] = args[k];
      if (!Object.keys(fields).length) return JSON.stringify({ ok: false, error: 'no targets given' });
      const { error } = await supabase.from('profiles').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', userId);
      return JSON.stringify(error ? { ok: false, error: error.message } : { ok: true, updated: fields });
    }

    if (name === 'add_water') {
      const today = todayISO();
      const { data: ex } = await supabase.from('water_logs').select('id, amount_ml').eq('user_id', userId).eq('logged_at', today).maybeSingle();
      if (ex) await supabase.from('water_logs').update({ amount_ml: ex.amount_ml + args.amount_ml }).eq('id', ex.id);
      else await supabase.from('water_logs').insert({ user_id: userId, logged_at: today, amount_ml: args.amount_ml });
      return JSON.stringify({ ok: true, added_ml: args.amount_ml });
    }

    return JSON.stringify({ error: 'unknown tool' });
  } catch (e: any) {
    return JSON.stringify({ error: e.message ?? 'tool failed' });
  }
}

interface AgentInput {
  userId: string;
  profile: Profile;
  summary?: string;
  recent: { role: 'user' | 'assistant'; content: string }[];
  question: string;
  model?: string;
}

const today = () => new Date().toISOString().split('T')[0];

// Tool-calling loop. Keeps context small: system(profile+summary) + recent + on-demand tool data.
export async function runCoachAgent({ userId, profile, summary, recent, question, model }: AgentInput): Promise<string> {
  const system = `You are GymBuddy's AI fitness coach. Today is ${today()}.
Answer using the user's REAL data — call read tools to fetch exactly what you need (any date range, e.g. last 10 days). Don't ask for data you can fetch.
You can also TAKE ACTIONS with write tools — create reminders, create today's workout session/plan, set nutrition targets, log water — but ONLY when the user explicitly asks for that action. Never act unprompted. After acting, confirm in one short line what you did.
Be specific, cite numbers, encouraging but honest. Max 3 short paragraphs. No markdown headers.

User: ${profile.full_name}, ${profile.age}y, ${profile.gender}, ${profile.height_cm}cm, ${profile.weight_kg}kg.
Goal: ${goalLabel(profile.goal)}. Targets: ${profile.calorie_target} kcal, ${profile.protein_target}g protein, ${profile.carb_target}g carbs, ${profile.fat_target}g fat.
${summary ? `\nEarlier in this conversation:\n${summary}` : ''}`;

  const messages: any[] = [
    { role: 'system', content: system },
    ...recent.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: question },
  ];

  for (let step = 0; step < 4; step++) {
    const data = await groqRequest({
      model: model || CHAT_MODEL,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      max_tokens: 700,
      temperature: 0.6,
    });

    const msg = data.choices[0].message;

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      messages.push(msg);
      for (const call of msg.tool_calls) {
        let args = {};
        try { args = JSON.parse(call.function.arguments || '{}'); } catch {}
        const result = await execTool(call.function.name, args, userId, profile.weight_kg);
        messages.push({ role: 'tool', tool_call_id: call.id, content: result });
      }
      continue; // let the model read tool results
    }

    return (msg.content ?? '').trim() || 'I could not generate a response. Try rephrasing.';
  }

  return 'That needed too many lookups — try a more specific question.';
}

// Summarise a finished conversation into a compact memory (stored on the session).
export async function summarizeConversation(
  messages: { role: 'user' | 'assistant'; content: string }[],
  prevSummary?: string
): Promise<string> {
  if (messages.length === 0) return prevSummary ?? '';
  const transcript = messages.map(m => `${m.role}: ${m.content}`).join('\n');
  const data = await groqRequest({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: 'Summarise this coaching chat into <=6 terse bullet-free sentences capturing the user\'s goals, concerns, decisions, and advice given. Merge with any prior summary. Keep only durable facts.' },
      { role: 'user', content: `${prevSummary ? `Prior summary:\n${prevSummary}\n\n` : ''}New messages:\n${transcript}` },
    ],
    max_tokens: 300,
    temperature: 0.3,
  });
  return (data.choices[0].message.content ?? '').trim();
}
