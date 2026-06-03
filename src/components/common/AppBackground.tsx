import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { useThemeStore } from '../../store/themeStore';
import { DotGrid } from './DotGrid';

// Optional native libs — app still runs (solid bg) if they aren't installed yet.
let LinearGradient: any = null;
let BlurView: any = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch {}
try { BlurView = require('expo-blur').BlurView; } catch {}

const { width, height } = Dimensions.get('window');

// Full-screen backdrop. For the Glass theme: gradient + colored blobs + frosted blur.
// For other themes: just the drifting dot grid over the solid screen bg.
export function AppBackground() {
  const { c, isDark } = useTheme();
  const showDots = useThemeStore(s => s.showDots);

  if (!c.glass) {
    return showDots ? <DotGrid /> : null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {LinearGradient ? (
        <LinearGradient
          colors={c.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.gradient[0] }]} />
      )}

      {/* colored light blobs for depth */}
      <View style={[styles.blob, { backgroundColor: c.accent, top: -60, left: -40, opacity: isDark ? 0.5 : 0.45 }]} />
      <View style={[styles.blob, { backgroundColor: c.blue, top: height * 0.45, right: -70, opacity: isDark ? 0.4 : 0.4 }]} />
      <View style={[styles.blob, { backgroundColor: c.green, bottom: -80, left: width * 0.25, opacity: isDark ? 0.32 : 0.35 }]} />

      {/* frost the whole backdrop so blobs read as soft glass */}
      {BlurView ? (
        <BlurView intensity={isDark ? 55 : 70} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      ) : null}

      {showDots ? <DotGrid opacity={0.35} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
  },
});
