/**
 * GetStartedScreen.js — Expo SDK 54
 * - Migrated from expo-av to expo-video
 * - Video auto-plays, loops smoothly, no flicker
 * - Only "Get Started" button remains
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, StyleSheet, Animated,
  Dimensions, StatusBar, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, SPACING, RADIUS } from '../constants/theme';

let VideoView       = null;
let useVideoPlayer  = null;
let BlurView        = null;

try {
  const expoVideo   = require('expo-video');
  VideoView         = expoVideo.VideoView;
  useVideoPlayer    = expoVideo.useVideoPlayer;
} catch (_) {}

try { BlurView = require('expo-blur').BlurView; } catch (_) {}

let INTRO_VIDEO = null;
try { INTRO_VIDEO = require('../assets/videos/intro.mp4'); } catch (_) {}

const { width, height } = Dimensions.get('window');
const LOGO_W = Math.min(width * 0.82, 340);
const LOGO_H = LOGO_W / (562 / 618);

const WITH_VIDEO = {
  OVERLAY: { delay: 2000, duration: 700 },
  BLUR:    { delay: 2300, duration: 600 },
  LOGO:    { delay: 2600, duration: 900 },
  UI:      { delay: 3200, duration: 800 },
};
const NO_VIDEO = {
  OVERLAY: { delay: 300,  duration: 600 },
  BLUR:    { delay: 500,  duration: 500 },
  LOGO:    { delay: 700,  duration: 900 },
  UI:      { delay: 1200, duration: 800 },
};

export default function GetStartedScreen({ navigation }) {
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const blurAnim    = useRef(new Animated.Value(0)).current;
  const logoAnim    = useRef(new Animated.Value(0)).current;
  const logoScale   = useRef(new Animated.Value(0.87)).current;
  const uiAnim      = useRef(new Animated.Value(0)).current;

  const started      = useRef(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const hasVideo = !!INTRO_VIDEO && !videoFailed && VideoView !== null && useVideoPlayer !== null;

  // expo-video: create the player instance unconditionally (hooks cannot be conditional),
  // but only configure it when video is actually available.
  const player = useVideoPlayer
    ? useVideoPlayer(hasVideo ? INTRO_VIDEO : null, (p) => {
        if (hasVideo) {
          p.loop   = true;
          p.muted  = true;
          p.play();
        }
      })
    : null;

  const runSequence = useCallback((T) => {
    if (started.current) return;
    started.current = true;

    const animate = (value, toValue, delay, duration) =>
      setTimeout(() =>
        Animated.timing(value, { toValue, duration, useNativeDriver: true }).start(), delay);

    animate(overlayAnim, 0.32, T.OVERLAY.delay, T.OVERLAY.duration);
    animate(blurAnim,    1,    T.BLUR.delay,    T.BLUR.duration);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoAnim,  { toValue: 1, duration: T.LOGO.duration, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 8, tension: 55,  useNativeDriver: true }),
      ]).start();
    }, T.LOGO.delay);

    animate(uiAnim, 1, T.UI.delay, T.UI.duration);
  }, [overlayAnim, blurAnim, logoAnim, logoScale, uiAnim]);

  // Start animation sequence immediately if no video; otherwise trigger from player status
  useEffect(() => {
    if (!hasVideo) {
      runSequence(NO_VIDEO);
      return;
    }

    if (!player) return;

    // Listen for first play event to kick off the animation sequence
    const subscription = player.addListener('playingChange', (isPlaying) => {
      if (isPlaying) runSequence(WITH_VIDEO);
    });

    // Fallback: if player errors, degrade gracefully
    const errorSub = player.addListener('statusChange', (status) => {
      if (status === 'error') {
        setVideoFailed(true);
        started.current = false;
        runSequence(NO_VIDEO);
      }
    });

    return () => {
      subscription?.remove();
      errorSub?.remove();
    };
  }, [hasVideo, player, runSequence]);

  return (
    <View style={s.root}>
      <StatusBar hidden />

      {/* ── Background: looping video OR gradient fallback ── */}
      {hasVideo && player ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
      ) : (
        <LinearGradient
          colors={['#0A1020', '#0D1B40', '#0E1A3A', '#071020']}
          locations={[0, 0.35, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.darkOverlay, { opacity: overlayAnim }]} />

      {BlurView ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: blurAnim }]}>
          <BlurView intensity={12} tint="dark" style={StyleSheet.absoluteFill} />
        </Animated.View>
      ) : (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.blurFallback, { opacity: blurAnim }]} />
      )}

      <Animated.View pointerEvents="none" style={[s.glowCircle, { opacity: logoAnim, transform: [{ scale: logoScale }] }]} />

      <Animated.View pointerEvents="none" style={[s.logoWrap, { opacity: logoAnim, transform: [{ scale: logoScale }] }]}>
        <Image source={require('../assets/logo.png')} style={{ width: LOGO_W, height: LOGO_H }} resizeMode="contain" />
      </Animated.View>

      <Animated.View style={[s.uiLayer, { opacity: uiAnim }]}>
        <View style={s.spacerTop} />

        <View style={s.textWrap}>
          <Text style={s.appName}>UniVerse</Text>
          <View style={s.taglineRow}>
            <View style={s.dash} />
            <Text style={s.tagline}>Your University, Connected</Text>
            <View style={s.dash} />
          </View>
          <Text style={s.sub}>ANDHRA UNIVERSITY  ·  VISAKHAPATNAM</Text>
        </View>

        {/* Only "Get Started" — login text & login button removed */}
        <View style={s.btnWrap}>
          <TouchableOpacity onPress={() => navigation.navigate('RoleSelection')} activeOpacity={0.88} style={s.primaryShadow}>
            <LinearGradient
              colors={['#F0C84A', '#C9A84C', '#9A7830']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.primaryGrad}
            >
              <Text style={s.primaryTxt}>Get Started</Text>
              <Ionicons name="arrow-forward-circle" size={22} color="#0A1628" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>Est. 1926  ·  Premier University of Andhra Pradesh</Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#071020' },
  darkOverlay:  { backgroundColor: '#000000' },
  blurFallback: { backgroundColor: 'rgba(5,12,30,0.22)' },
  glowCircle:   { position: 'absolute', width: 380, height: 380, borderRadius: 190, backgroundColor: 'rgba(201,168,76,0.08)', alignSelf: 'center', top: height * 0.08 },
  logoWrap:     { position: 'absolute', top: height * 0.10, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  uiLayer:      { position: 'absolute', bottom: 0, left: 0, right: 0, top: 0, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: SPACING.lg, paddingBottom: 44 },
  spacerTop:    { flex: 1 },
  textWrap:     { alignItems: 'center', gap: 8, marginBottom: SPACING.lg },
  appName:      { fontSize: 44, fontWeight: '900', color: '#FFFFFF', letterSpacing: 3, textShadowColor: 'rgba(201,168,76,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 14 },
  taglineRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dash:         { width: 28, height: 1.5, backgroundColor: 'rgba(201,168,76,0.55)' },
  tagline:      { fontSize: FONTS.sizes.sm, color: '#C9A84C', fontWeight: '600', letterSpacing: 0.4 },
  sub:          { fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2.5, fontWeight: '700', marginTop: 4 },
  btnWrap:      { width: '100%', marginBottom: SPACING.md },
  primaryShadow:{ borderRadius: RADIUS.full, overflow: 'hidden', shadowColor: '#C9A84C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 12, elevation: 8 },
  primaryGrad:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, gap: 10 },
  primaryTxt:   { fontSize: FONTS.sizes.lg, fontWeight: '900', color: '#0A1628', letterSpacing: 0.8 },
  footer:       { fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1.5, textAlign: 'center' },
});