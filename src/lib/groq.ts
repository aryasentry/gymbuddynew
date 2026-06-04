import { FoodItem, GroqFoodResult, Profile, WorkoutPlan } from '../types';
import { goalLabel } from '../utils/nutrition';

const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions';
// llama-3.2 vision previews were decommissioned by Groq — llama-4-scout is the current vision model
const VLM_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
export const CHAT_MODEL = 'llama-3.3-70b-versatile';

// Curated chat/reasoning models the user can pick for the AI Coach.
export const GROQ_MODELS: { id: string; label: string; blurb: string }[] = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', blurb: 'Balanced default · fast & reliable' },
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', blurb: 'Most capable · reasoning' },
  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B', blurb: 'Quick reasoning · lighter' },
  { id: 'moonshotai/kimi-k2-instruct-0905', label: 'Kimi K2', blurb: 'Large context window' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout', blurb: 'Multimodal · newest' },
];

const keys = [
  process.env.EXPO_PUBLIC_GROQ_KEY_1,
  process.env.EXPO_PUBLIC_GROQ_KEY_2,
  process.env.EXPO_PUBLIC_GROQ_KEY_3,
  process.env.EXPO_PUBLIC_GROQ_KEY_4,
  process.env.EXPO_PUBLIC_GROQ_KEY_5,
].filter(Boolean) as string[];

let keyIndex = 0;

async function callOnce(body: object, key: string): Promise<Response> {
  return fetch(GROQ_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

// Rotates through all keys. On 429 (rate limit), tries the next key. Other errors throw immediately.
export async function groqRequest(body: object): Promise<any> {
  if (keys.length === 0) throw new Error('No Groq API keys configured');
  let lastErr = '';
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const key = keys[keyIndex % keys.length];
    keyIndex++;
    const res = await callOnce(body, key);
    if (res.ok) return res.json();
    const errText = await res.text();
    lastErr = `Groq ${res.status}: ${errText}`;
    // Only rotate on rate limit; fail fast on auth/model errors
    if (res.status !== 429) throw new Error(lastErr);
  }
  throw new Error(`All keys rate-limited. ${lastErr}`);
}

export async function analyzeFoodImage(
  images: string[],            // [topView, sideView?] — base64
  caption: string,
  profile: Pick<Profile, 'height_cm' | 'weight_kg' | 'goal'>
): Promise<GroqFoodResult> {
  const base64s = images.filter(Boolean);
  const multi = base64s.length > 1;
  const prompt = `You are a precise nutrition analyst specializing in Indian and global cuisine.

User describes: "${caption}"
User profile: ${profile.height_cm}cm, ${profile.weight_kg}kg, goal: ${goalLabel(profile.goal)}
${multi ? 'You are given TWO photos of the SAME meal: Image 1 = TOP view (shows footprint/area), Image 2 = SIDE view (shows HEIGHT/thickness). Use BOTH to estimate volume far more accurately — area from top, height from side.' : 'You are given ONE top-down photo.'}

PORTION ESTIMATION — reason through these steps SILENTLY (do not print the reasoning), this is the hardest part:
1. Identify a SCALE REFERENCE: a dinner plate (~26cm), spoon (~15cm), fork, a hand/fingers, a standard katori/bowl (~150ml), or a phone.
2. ${multi ? 'Get the food footprint from the TOP image and its HEIGHT/thickness from the SIDE image' : 'Judge footprint and estimate height'} relative to that reference — a heaped serving is far heavier than a flat one.
3. Convert volume to grams using typical food densities, then to calories/macros.
4. If no reference object is visible, assume a standard 26cm dinner plate and say confidence is "low".
5. Use standard Indian portion sizes for Indian dishes (1 roti ~40g, 1 katori dal ~150g, 1 idli ~40g, 1 dosa ~80g).

Also estimate key micronutrients per item and in the total: fiber_g, sugar_g, sodium_mg, potassium_mg, calcium_mg, iron_mg, vitamin_c_mg.

Set "confidence": high if a clear reference object was visible${multi ? ' AND you used both views' : ''}; medium if portions were inferred from a plate; low if it was a rough guess.
Put your scale reference + key assumptions in "notes" (one short sentence).

Return ONLY valid JSON — no markdown, no extra text:
{
  "items": [
    {"name": "string", "quantity": number, "unit": "g or ml or pieces", "calories": number, "protein": number, "carbs": number, "fat": number, "fiber_g": number, "sugar_g": number, "sodium_mg": number, "potassium_mg": number, "calcium_mg": number, "iron_mg": number, "vitamin_c_mg": number}
  ],
  "total": {"calories": number, "protein": number, "carbs": number, "fat": number, "fiber_g": number, "sugar_g": number, "sodium_mg": number, "potassium_mg": number, "calcium_mg": number, "iron_mg": number, "vitamin_c_mg": number},
  "confidence": "low|medium|high",
  "notes": "optional brief note about estimation"
}`;

  const data = await groqRequest({
    model: VLM_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          ...base64s.map(b => ({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b}` } })),
          { type: 'text', text: prompt },
        ],
      },
    ],
    max_tokens: 1024,
    temperature: 0.1,
  });

  const raw = data.choices[0].message.content.trim();
  // Strip code fences and grab the outermost JSON object
  let jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const first = jsonStr.indexOf('{');
  const last = jsonStr.lastIndexOf('}');
  if (first !== -1 && last !== -1) jsonStr = jsonStr.slice(first, last + 1);
  return JSON.parse(jsonStr) as GroqFoodResult;
}

export async function generateWorkoutPlan(
  thoughts: string,
  profile: Pick<Profile, 'height_cm' | 'weight_kg' | 'goal'>
): Promise<WorkoutPlan> {
  const bmi = profile.weight_kg / Math.pow(profile.height_cm / 100, 2);
  const prompt = `Turn the user's free-form workout idea into a structured, ordered plan.

User wrote: "${thoughts}"
User: ${profile.height_cm}cm, ${profile.weight_kg}kg, BMI ${bmi.toFixed(1)}, goal ${goalLabel(profile.goal)}.

Rules:
- Pick category: push, pull, legs, fullbody, cardio, or custom.
- For strength exercises: give "sets" with a sensible starting weight_kg (use 0 for bodyweight) and reps.
- For cardio exercises: give "segments" with activity (run/sprint/walk/incline/cycle/row/stairs), minutes, speed_kmh, incline_pct, and an estimated calories for THIS user's weight.
- Keep it realistic and ordered the way it should be performed.

Return ONLY valid JSON, no markdown:
{
  "category": "push|pull|legs|fullbody|cardio|custom",
  "name": "short workout name",
  "description": "one-line summary",
  "exercises": [
    {"name": "Bench Press", "kind": "strength", "sets": [{"weight_kg": 60, "reps": 8}, {"weight_kg": 60, "reps": 8}]},
    {"name": "Treadmill", "kind": "cardio", "segments": [{"activity": "run", "minutes": 15, "speed_kmh": 10, "incline_pct": 1, "calories": 160}]}
  ]
}`;

  const data = await groqRequest({
    model: CHAT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1200,
    temperature: 0.4,
  });

  let raw = (data.choices[0].message.content ?? '').trim();
  raw = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first !== -1 && last !== -1) raw = raw.slice(first, last + 1);
  return JSON.parse(raw) as WorkoutPlan;
}

export async function askCoach(
  question: string,
  profile: Profile,
  recentNutrition: { date: string; calories: number; protein: number }[],
  recentWorkouts: { date: string; name: string; exercises: string[] }[]
): Promise<string> {
  const nutritionSummary = recentNutrition
    .map(d => `${d.date}: ${d.calories} kcal, ${d.protein}g protein`)
    .join('\n') || 'No data yet';

  const workoutSummary = recentWorkouts
    .map(w => `${w.date}: ${w.name} (${w.exercises.join(', ')})`)
    .join('\n') || 'No workouts logged yet';

  const systemPrompt = `You are a personal AI fitness coach. Respond based on the user's actual data.
Be specific, cite their numbers. Encouraging but honest. Max 3 short paragraphs. No markdown headers.

User: ${profile.full_name}, ${profile.age}y, ${profile.gender}, ${profile.height_cm}cm, ${profile.weight_kg}kg
Goal: ${goalLabel(profile.goal)} | Calorie target: ${profile.calorie_target} kcal | Protein: ${profile.protein_target}g

Last 7 days nutrition:
${nutritionSummary}

Last 7 workouts:
${workoutSummary}`;

  const data = await groqRequest({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    max_tokens: 512,
    temperature: 0.7,
  });

  return data.choices[0].message.content.trim();
}

export async function generateWeeklyReport(
  profile: Profile,
  weekNutrition: { date: string; calories: number; protein: number; carbs: number; fat: number }[],
  weekWorkouts: { date: string; name: string }[],
  weightChange: number
): Promise<string> {
  const avgCalories = Math.round(weekNutrition.reduce((s, d) => s + d.calories, 0) / (weekNutrition.length || 1));
  const proteinDaysHit = weekNutrition.filter(d => d.protein >= profile.protein_target).length;

  const systemPrompt = `You are writing a weekly fitness journal entry for the user. Be warm, specific, like a coach summarising their week. 4-5 sentences max.

User: ${profile.full_name}, Goal: ${goalLabel(profile.goal)}
Average calories: ${avgCalories}/${profile.calorie_target} kcal
Protein goal hit: ${proteinDaysHit}/7 days
Workouts completed: ${weekWorkouts.length}
Weight change: ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg`;

  const data = await groqRequest({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Generate my weekly fitness summary.' },
    ],
    max_tokens: 300,
    temperature: 0.8,
  });

  return data.choices[0].message.content.trim();
}
