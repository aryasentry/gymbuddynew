import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, useColorScheme, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
// SDK 56: readAsStringAsync/EncodingType live in the legacy module
import * as FileSystem from 'expo-file-system/legacy';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import { useFoodStore } from '../../store/foodStore';
import { TopBar } from '../../components/common/TopBar';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { analyzeFoodImage } from '../../lib/groq';
import { uploadFoodImage } from '../../lib/storage';
import { MacroBars } from '../../components/food/MacroBars';
import { haptic } from '../../utils/haptics';
import { fonts, spacing, radius } from '../../theme';
import { useTheme } from '../../theme/useTheme';
import { MealType, QuantityFeedback, GroqFoodResult, FoodItem, Food } from '../../types';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'];

export function LogMealScreen() {
  const { c, isDark } = useTheme();
  const dark = isDark;
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const { saveLog, searchFoods } = useFoodStore();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<GroqFoodResult | null>(null);
  const [feedback, setFeedback] = useState<QuantityFeedback | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [foodQuery, setFoodQuery] = useState('');
  const [foodResults, setFoodResults] = useState<Food[]>([]);
  const [showFoodSearch, setShowFoodSearch] = useState(false);

  async function runFoodSearch(q: string) {
    setFoodQuery(q);
    if (!user) return;
    setFoodResults(await searchFoods(user.id, q));
  }

  function emptyTotal() {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0, potassium_mg: 0, calcium_mg: 0, iron_mg: 0, vitamin_c_mg: 0 };
  }

  function addFromLibrary(f: Food) {
    const item: FoodItem = {
      name: f.name, quantity: f.ref_qty, unit: f.unit,
      calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat,
      fiber_g: f.fiber_g, sugar_g: f.sugar_g, sodium_mg: f.sodium_mg, potassium_mg: f.potassium_mg, calcium_mg: f.calcium_mg, iron_mg: f.iron_mg, vitamin_c_mg: f.vitamin_c_mg,
    };
    setResult(prev => {
      const items = [...(prev?.items ?? []), item];
      const total: any = prev ? { ...prev.total } : emptyTotal();
      for (const k of ['calories', 'protein', 'carbs', 'fat', 'fiber_g', 'sugar_g', 'sodium_mg', 'potassium_mg', 'calcium_mg', 'iron_mg', 'vitamin_c_mg'] as const) {
        total[k] = (total[k] ?? 0) + ((item as any)[k] ?? 0);
      }
      return { items, total, confidence: prev?.confidence ?? 'high', notes: prev?.notes };
    });
    haptic.light();
  }

  const bg = c.bg;
  const textColor = c.text;
  const mutedColor = c.textMuted;
  const borderColor = c.border;
  const accentColor = c.accent;
  const surface = c.surface;
  const resultBg = c.accentBg;
  const resultBorder = c.accentBorder;

  async function pickImage(fromCamera: boolean) {
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { setError('Camera permission denied'); return; }
    }
    const fn = fromCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await fn({ mediaTypes: ['images'], quality: 0.6, base64: false });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  async function analyze() {
    if (!imageUri) { setError('Add a photo first'); return; }
    if (!profile) { setError('Profile not loaded'); return; }
    setError('');
    setAnalyzing(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
      const r = await analyzeFoodImage(base64, caption || 'food in image', profile);
      setResult(r);
    } catch (e: any) {
      setError(e.message ?? 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }

  async function logMeal() {
    if (!result || !user) return;
    setSaving(true);
    // upload the photo (best-effort; logs still save if storage isn't set up)
    let image_url: string | undefined;
    if (imageUri) {
      const url = await uploadFoodImage(user.id, imageUri);
      if (url) image_url = url;
    }
    // apply the user's portion correction: nudge totals ±15% so the saved log reflects reality
    const factor = feedback === 'too_high' ? 0.85 : feedback === 'too_low' ? 1.15 : 1;
    const items = result.items.map(it => ({
      ...it,
      quantity: Math.round(it.quantity * factor),
      calories: Math.round(it.calories * factor),
      protein: Math.round(it.protein * factor),
      carbs: Math.round(it.carbs * factor),
      fat: Math.round(it.fat * factor),
    }));
    const total = {
      calories: Math.round(result.total.calories * factor),
      protein: Math.round(result.total.protein * factor),
      carbs: Math.round(result.total.carbs * factor),
      fat: Math.round(result.total.fat * factor),
    };
    const err = await saveLog(user.id, {
      meal_type: mealType,
      caption,
      image_url,
      user_correction: feedback ?? undefined,
      items,
      total,
    });
    setSaving(false);
    if (err) { setError(err); return; }
    navigation.goBack();
  }

  if (analyzing) return <LoadingScreen message="Analysing your meal…" />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, backgroundColor: bg }}>
        <TopBar showBack onBack={() => navigation.goBack()} title="Log a meal" />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Photo */}
          {imageUri ? (
            <TouchableOpacity onPress={() => setImageUri(null)}>
              <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
              <Text style={[styles.retakeText, { color: accentColor, fontFamily: fonts.sans }]}>Tap to retake</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.photoRow}>
              <TouchableOpacity onPress={() => pickImage(true)} style={[styles.photoBtn, { borderColor, backgroundColor: surface }]}>
                <Text style={styles.photoIcon}>📷</Text>
                <Text style={[styles.photoBtnLabel, { color: mutedColor, fontFamily: fonts.sans }]}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => pickImage(false)} style={[styles.photoBtn, { borderColor, backgroundColor: surface }]}>
                <Text style={styles.photoIcon}>🖼</Text>
                <Text style={[styles.photoBtnLabel, { color: mutedColor, fontFamily: fonts.sans }]}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Caption */}
          <Input
            label="Describe your meal (optional)"
            value={caption}
            onChangeText={setCaption}
            placeholder="e.g. 2 homemade dosas with peanut chutney"
            multiline
          />

          {/* Tip */}
          <View style={[styles.tip, { backgroundColor: surface, borderColor }]}>
            <Text style={[styles.tipText, { color: mutedColor, fontFamily: fonts.bodyItalic }]}>
              Tip: Include a spoon, plate, or hand in frame — it helps AI estimate portions more accurately
            </Text>
          </View>

          {/* Search your own food library */}
          <TouchableOpacity
            onPress={() => { const v = !showFoodSearch; setShowFoodSearch(v); if (v) runFoodSearch(''); }}
            style={[styles.searchToggle, { borderColor }]}
          >
            <Text style={[styles.searchToggleText, { color: accentColor, fontFamily: fonts.sans }]}>
              {showFoodSearch ? '✕ Close food search' : '🔍 Add from your foods'}
            </Text>
          </TouchableOpacity>
          {showFoodSearch && (
            <View style={{ gap: 8 }}>
              <Input placeholder="Search your logged foods…" value={foodQuery} onChangeText={runFoodSearch} />
              {foodResults.length === 0 ? (
                <Text style={[styles.searchEmpty, { color: mutedColor, fontFamily: fonts.bodyItalic }]}>
                  {foodQuery ? 'No match. Log it once with a photo and it joins your library.' : 'Your logged foods will appear here.'}
                </Text>
              ) : foodResults.map(f => (
                <TouchableOpacity key={f.id} onPress={() => addFromLibrary(f)} style={[styles.foodHit, { borderColor, backgroundColor: surface }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.foodHitName, { color: textColor, fontFamily: fonts.body }]} numberOfLines={1}>{f.name}</Text>
                    <Text style={[styles.foodHitMeta, { color: mutedColor, fontFamily: fonts.sans }]}>{Math.round(f.calories)} kcal · {f.ref_qty}{f.unit} · P{Math.round(f.protein)} C{Math.round(f.carbs)} F{Math.round(f.fat)}</Text>
                  </View>
                  <Text style={{ color: accentColor, fontSize: 18 }}>＋</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Meal type */}
          <View>
            <Text style={[styles.fieldLabel, { color: mutedColor, fontFamily: fonts.sans }]}>Meal type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {MEAL_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setMealType(type)}
                  style={[styles.chip, { borderColor: mealType === type ? accentColor : borderColor, backgroundColor: mealType === type ? c.accentBg : 'transparent' }]}
                >
                  <Text style={[styles.chipText, { color: mealType === type ? accentColor : mutedColor, fontFamily: fonts.sans }]}>
                    {type.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {error ? <Text style={[styles.error, { fontFamily: fonts.sans }]}>{error}</Text> : null}

          {/* Analyse button */}
          {!result && (
            <Button label="Analyse with AI" onPress={analyze} disabled={!imageUri} />
          )}

          {/* Result */}
          {result && (
            <View style={[styles.resultCard, { backgroundColor: resultBg, borderColor: resultBorder }]}>
              <Text style={[styles.resultTitle, { color: accentColor, fontFamily: fonts.sans }]}>
                AI Estimate · {result.confidence} confidence
              </Text>

              {result.items.map((item, i) => (
                <View key={i} style={[styles.resultRow, { borderBottomColor: resultBorder }]}>
                  <Text style={[styles.resultName, { color: textColor, fontFamily: fonts.body }]}>{item.name}</Text>
                  <Text style={[styles.resultQty, { color: mutedColor, fontFamily: fonts.sans }]}>{item.quantity}{item.unit}</Text>
                </View>
              ))}

              {/* Animated macro + micro breakdown */}
              <View style={[styles.macroWrap, { borderTopColor: resultBorder }]}>
                <MacroBars key={JSON.stringify(result.total)} total={result.total} />
              </View>

              {result.notes && (
                <Text style={[styles.notes, { color: mutedColor, fontFamily: fonts.bodyItalic }]}>{result.notes}</Text>
              )}

              {/* Quantity feedback */}
              <Text style={[styles.feedbackLabel, { color: mutedColor, fontFamily: fonts.sans }]}>How accurate are the portions?</Text>
              <View style={styles.feedbackRow}>
                {(['too_low', 'accurate', 'too_high'] as QuantityFeedback[]).map(f => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFeedback(f)}
                    style={[
                      styles.feedbackBtn,
                      {
                        borderColor: feedback === f ? accentColor : borderColor,
                        backgroundColor: feedback === f ? c.accentBg : 'transparent',
                      },
                    ]}
                  >
                    <Text style={[styles.feedbackText, { color: feedback === f ? accentColor : mutedColor, fontFamily: fonts.sans }]}>
                      {f === 'too_low' ? 'Too low' : f === 'accurate' ? 'Accurate ✓' : 'Too high'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.actionRow}>
                <Button label="Re-analyse" onPress={() => setResult(null)} variant="outline" style={{ flex: 1 }} />
                <Button label="Log meal" onPress={logMeal} loading={saving} style={{ flex: 1 }} />
              </View>
            </View>
          )}

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  preview: { width: '100%', height: 200, borderRadius: radius.md },
  retakeText: { fontSize: 12, textAlign: 'center', marginTop: 6, letterSpacing: 0.5 },
  photoRow: { flexDirection: 'row', gap: spacing.md },
  photoBtn: { flex: 1, height: 100, borderWidth: 1, borderRadius: radius.md, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoIcon: { fontSize: 24 },
  photoBtnLabel: { fontSize: 12, letterSpacing: 0.5 },
  tip: { padding: 12, borderRadius: radius.md, borderWidth: 1 },
  tipText: { fontSize: 13, lineHeight: 18 },
  fieldLabel: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  chipScroll: { marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, marginRight: 8 },
  chipText: { fontSize: 12, letterSpacing: 0.3 },
  error: { fontSize: 13, color: '#c0392b', textAlign: 'center' },
  resultCard: { padding: 14, borderRadius: radius.md, borderWidth: 1, gap: 8 },
  resultTitle: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1 },
  resultName: { fontSize: 14, flex: 1 },
  resultQty: { fontSize: 13 },
  macroWrap: { paddingTop: 12, borderTopWidth: 1, marginTop: 4 },
  searchToggle: { borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.md, padding: 11, alignItems: 'center' },
  searchToggleText: { fontSize: 13, letterSpacing: 0.3 },
  searchEmpty: { fontSize: 13, textAlign: 'center', paddingVertical: 8, lineHeight: 18 },
  foodHit: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, padding: 11, gap: 10 },
  foodHitName: { fontSize: 14 },
  foodHitMeta: { fontSize: 11, marginTop: 2 },
  notes: { fontSize: 12, lineHeight: 17 },
  feedbackLabel: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 },
  feedbackRow: { flexDirection: 'row', gap: 8 },
  feedbackBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center' },
  feedbackText: { fontSize: 11, letterSpacing: 0.3 },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
});
