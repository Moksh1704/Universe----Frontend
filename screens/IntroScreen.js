/**
 * IntroScreen — Expo SDK 54 compatible
 * Fixed: smooth looping via manual replayAsync() + fade transition to hide glitch
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, Animated, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

let Video    = null;
let BlurView = null;
try { Video    = require('expo-av').Video;      } catch (_) {}
try { BlurView = require('expo-blur').BlurView; } catch (_) {}

let INTRO_VIDEO = null;
try { INTRO_VIDEO = require('../assets/videos/intro.mp4'); } catch (_) {}

const { width, height } = Dimensions.get('window');
const LOGO_W = Math.min(width * 0.68, 290);
const LOGO_H = LOGO_W * (618 / 562);

const T_VIDEO  = { OVERLAY: 2400, BLUR: 2700, LOGO: 3100, TEXT: 3700, NAV: 4900 };
const T_STATIC = { OVERLAY:  200, BLUR:  500, LOGO:  700, TEXT: 1200, NAV: 2800 };

const FADE_DURATION = 200; // ms — short enough to be invisible, long enough to mask the glitch

export default function IntroScreen({ navigation }) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const blurOpacity    = useRef(new Animated.Value(0)).current;
  const logoOpacity    = useRef(new Animated.Value(0)).current;
  const logoScale      = useRef(new Animated.Value(0.86)).current;
  const textOpacity    = useRef(new Animated.Value(0)).current;

  // Dedicated animated value for the video fade — starts fully visible
  const videoOpacity = useRef(new Animated.Value(1)).current;

  const videoRef  = useRef(null);
  const isLooping = useRef(false); // guard against overlapping replay calls
  const started   = useRef(false);
  const [videoError, setVideoError] = useState(false);

  const hasVideo = !!INTRO_VIDEO && !videoError && Video !== null;
  const T        = hasVideo ? T_VIDEO : T_STATIC;

  const startSequence = useCallback(() => {
    if (started.current) return;
    started.current = true;

    const animate = (v, to, delay, dur) =>
      setTimeout(() =>
        Animated.timing(v, { toValue: to, duration: dur, useNativeDriver: true }).start(), delay);

    animate(overlayOpacity, 0.32, T.OVERLAY, 700);
    animate(blurOpacity,    1,    T.BLUR,    600);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 8, tension: 55, useNativeDriver: true }),
      ]).start();
    }, T.LOGO);

    animate(textOpacity, 1, T.TEXT, 700);
    setTimeout(() => navigation.replace('GetStarted'), T.NAV);
  }, [T]); // eslint-disable-line

  useEffect(() => { if (!hasVideo) startSequence(); }, []); // eslint-disable-line

  // Smooth manual loop: fade out → replayAsync() → fade in
  const handleLoop = useCallback(async () => {
    if (isLooping.current || !videoRef.current) return;
    isLooping.current = true;

    await new Promise((resolve) =>
      Animated.timing(videoOpacity, {
        toValue: 0,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }).start(resolve)
    );

    try {
      await videoRef.current.replayAsync();
    } catch (_) {
      // Video may have been unmounted; ignore silently
    }

    Animated.timing(videoOpacity, {
      toValue: 1,
      duration: FADE_DURATION,
      useNativeDriver: true,
    }).start(() => {
      isLooping.current = false;
    });
  }, [videoOpacity]);

  const handleStatus = useCallback((status) => {
    // Trigger animation sequence on first play
    if (status.isLoaded && status.isPlaying) startSequence();

    // Manual loop when video finishes
    if (status.didJustFinish) handleLoop();
  }, [startSequence, handleLoop]);

  return (
    <View style={s.root}>
      <StatusBar hidden />

      {hasVideo ? (
        // Wrap Video in Animated.View so we can fade it independently
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: videoOpacity }]}>
          <Video
            ref={videoRef}
            source={INTRO_VIDEO}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            shouldPlay
            isMuted
            isLooping={false}              // disabled — we handle looping manually
            onPlaybackStatusUpdate={handleStatus}
            onError={() => { setVideoError(true); started.current = false; startSequence(); }}
          />
        </Animated.View>
      ) : (
        <LinearGradient
          colors={['#0A1020', '#0D1B40', '#0E1A3A', '#071020']}
          locations={[0, 0.35, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.darkOverlay, { opacity: overlayOpacity }]} />

      {BlurView ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: blurOpacity }]}>
          <BlurView intensity={14} tint="dark" style={StyleSheet.absoluteFill} />
        </Animated.View>
      ) : (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.blurFallback, { opacity: blurOpacity }]} />
      )}

      <Animated.View pointerEvents="none" style={[s.glowCircle, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]} />

      <Animated.View pointerEvents="none" style={[s.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Image source={require('../assets/logo.png')} style={{ width: LOGO_W, height: LOGO_H }} resizeMode="contain" />
      </Animated.View>

      <Animated.View pointerEvents="none" style={[s.textBlock, { opacity: textOpacity }]}>
        <Text style={s.appName}>UniVerse</Text>
        <View style={s.taglineRow}>
          <View style={s.dash} />
          <Text style={s.tagline}>Your University, Connected</Text>
          <View style={s.dash} />
        </View>
        <Text style={s.sub}>ANDHRA UNIVERSITY  ·  VISAKHAPATNAM</Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#071020', alignItems: 'center', justifyContent: 'center' },
  darkOverlay: { backgroundColor: '#000000' },
  blurFallback:{ backgroundColor: 'rgba(5,12,30,0.25)' },
  glowCircle:  { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: 'rgba(201,168,76,0.08)', alignSelf: 'center', top: height * 0.5 - 300 },
  logoWrap:    { alignItems: 'center', justifyContent: 'center', marginTop: -height * 0.06 },
  textBlock:   { position: 'absolute', bottom: height * 0.20, left: 0, right: 0, alignItems: 'center', gap: 8 },
  appName:     { fontSize: 44, fontWeight: '900', color: '#FFFFFF', letterSpacing: 3, textShadowColor: 'rgba(201,168,76,0.55)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 14 },
  taglineRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dash:        { width: 28, height: 1.5, backgroundColor: 'rgba(201,168,76,0.55)' },
  tagline:     { fontSize: 13, color: '#C9A84C', fontWeight: '600', letterSpacing: 0.4 },
  sub:         { fontSize: 9, color: 'rgba(255,255,255,0.30)', letterSpacing: 2.5, fontWeight: '700', marginTop: 4 },
});