/**
 * src/screens/LoginScreen.js
 *
 * Clean, compact login screen.
 *  – No tab-based UI
 *  – No register link
 *  – No decorative dots
 *  – OTP button is visually prominent (primary outlined)
 *  – Forgot Password navigates to ForgotPasswordScreen
 *  – Email placeholder is simply "Enter your email"
 *  – Reduced vertical spacing throughout
 *  – Google Sign-In via expo-auth-session (Expo SDK 54)
 *
 * CRASH PREVENTION:
 *  - buildGoogleConfig() only includes keys whose env vars are non-empty.
 *  - On Android, useAuthRequest requires androidClientId. If it is absent,
 *    the hook must NOT be called at all — calling it with an empty config
 *    crashes the native layer on APK builds.
 *  - GoogleAuthProvider is a thin inner component that is only rendered
 *    (and therefore only calls the hook) when androidClientId is present
 *    on Android, or when webClientId is present on other platforms.
 *  - If the required ID is missing the Google button is rendered in a
 *    disabled "not configured" state with no hook call anywhere.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, StatusBar,
  Alert, Image, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import axios from 'axios';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { loginWithPassword } from '../services/authService';
import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const BACKEND_URL = 'https://universe-mainbackend.onrender.com';

// ─── Safe config builder ──────────────────────────────────────────────────────
// Never passes undefined — only includes a key when the env var has a value.
const buildGoogleConfig = () => {
  const config = {};
  const webClientId     = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const iosClientId     = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (webClientId)     config.webClientId     = webClientId;
  if (androidClientId) config.androidClientId = androidClientId;
  if (iosClientId)     config.iosClientId     = iosClientId;
  return config;
};

const GOOGLE_CONFIG = buildGoogleConfig();

// True when this platform can safely call useAuthRequest without crashing.
// Android APK requires androidClientId; web/iOS can fall back to webClientId.
const GOOGLE_SUPPORTED =
  Platform.OS === 'android'
    ? !!GOOGLE_CONFIG.androidClientId
    : !!(GOOGLE_CONFIG.webClientId || GOOGLE_CONFIG.iosClientId);

// ─── Reusable field ───────────────────────────────────────────────────────────
const Field = ({ label, icon, value, onChange, placeholder, secure, keyboard }) => {
  const [show, setShow] = useState(false);
  return (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.fieldWrap}>
        <Ionicons name={icon} size={16} color={COLORS.textMuted} style={{ marginRight: 9 }} />
        <TextInput
          style={s.fieldInput}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={secure && !show}
          keyboardType={keyboard || 'default'}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {secure && (
          <TouchableOpacity
            onPress={() => setShow(v => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={show ? 'eye-off-outline' : 'eye-outline'}
              size={16}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ─── Slim OR divider ──────────────────────────────────────────────────────────
const OrDivider = () => (
  <View style={s.orRow}>
    <View style={s.orLine} />
    <Text style={s.orText}>OR</Text>
    <View style={s.orLine} />
  </View>
);

// ─── Inner component that owns the Google hook ────────────────────────────────
// Rendered ONLY when GOOGLE_SUPPORTED is true, guaranteeing the hook is never
// called on a platform where the required client ID is absent.
const GoogleAuthProvider = ({ onAuthReady, onResponse }) => {
  const [request, response, promptAsync] = Google.useAuthRequest(GOOGLE_CONFIG);

  useEffect(() => {
    onAuthReady({ request, promptAsync });
  }, [request]); // eslint-disable-line

  useEffect(() => {
    if (response) onResponse(response);
  }, [response]); // eslint-disable-line

  return null; // renders nothing — side-effects only
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function LoginScreen({ navigation }) {
  const { login } = useAuth();

  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [loading,         setLoading]         = useState(false);
  const [googleLoading,   setGoogleLoading]   = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);

  // Populated by GoogleAuthProvider via callbacks (null when not supported)
  const [googleRequest,    setGoogleRequest]    = useState(null);
  const [googlePromptAsync, setGooglePromptAsync] = useState(null);

  // ── Callback: GoogleAuthProvider reports its hook state up ───────────────
  const handleAuthReady = useCallback(({ request, promptAsync }) => {
    setGoogleRequest(request);
    // useState setter must receive the function wrapped to avoid React
    // interpreting the async function itself as a state updater callback.
    setGooglePromptAsync(() => promptAsync);
  }, []);

  // ── Callback: GoogleAuthProvider forwards responses up ───────────────────
  const handleResponse = useCallback((response) => {
    if (response?.type === 'success') {
      const accessToken = response.authentication?.accessToken;
      if (accessToken) {
        handleGoogleBackendAuth(accessToken);
      } else {
        console.error('Google auth succeeded but no accessToken found:', response);
        Alert.alert('Google Login Failed', 'Could not retrieve Google access token.');
      }
    } else if (response?.type === 'error') {
      console.error('Google auth error:', response.error);
      Alert.alert('Google Login Failed', response.error?.message || 'An error occurred with Google Sign-In.');
    }
  }, []); // eslint-disable-line

  // ── Backend call after successful Google token exchange ──────────────────
  const handleGoogleBackendAuth = async (accessToken) => {
    setGoogleLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/auth/google-login`, {
        id_token: accessToken,
      });
      const { accessToken: backendToken, refreshToken, user, forcePasswordChange } = res.data;

      if (!backendToken) {
        Alert.alert('Login Failed', 'Google login incomplete. Please try again.');
        return;
      }
      if (!user?.role) {
        Alert.alert('Error', 'Could not determine user role. Please try again.');
        return;
      }
      await login({ accessToken: backendToken, refreshToken, user });
      if (forcePasswordChange) setShowChangeModal(true);
    } catch (e) {
      console.error('Google backend auth error:', e.response?.data || e.message);
      const message = e?.response?.data?.message || e.message || 'An error occurred during Google login.';
      Alert.alert('Google Login Failed', message);
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Password login ───────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const cleanPassword = String(password).trim();
      const result = await loginWithPassword(
        email.trim().toLowerCase(),
        cleanPassword,
      );
      const { accessToken, refreshToken, user, forcePasswordChange } = result;

      if (!accessToken) {
        Alert.alert('Login Failed', 'Login incomplete. Please try again.');
        return;
      }
      if (!user?.role) {
        Alert.alert('Error', 'Could not determine user role. Please try again.');
        return;
      }
      await login({ accessToken, refreshToken, user });
      if (forcePasswordChange) setShowChangeModal(true);
    } catch (e) {
      Alert.alert('Login Failed', e.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Google button press ──────────────────────────────────────────────────
  const handleGooglePress = () => {
    if (!GOOGLE_SUPPORTED) {
      Alert.alert(
        'Google Sign-In Not Configured',
        'Google authentication is not available on this build. Please contact support.',
      );
      return;
    }
    if (!googleRequest || !googlePromptAsync) {
      Alert.alert(
        'Google Sign-In Unavailable',
        'Google authentication is still initialising. Please try again in a moment.',
      );
      return;
    }
    googlePromptAsync();
  };

  const isGoogleBusy = googleLoading;

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />

      {/* Mount GoogleAuthProvider only when the platform has the required ID */}
      {GOOGLE_SUPPORTED && (
        <GoogleAuthProvider
          onAuthReady={handleAuthReady}
          onResponse={handleResponse}
        />
      )}

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryMid, COLORS.primaryLight]}
          style={s.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>

          <View style={s.logoRing}>
            <Image
              source={require('../../assets/logo.png')}
              style={s.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={s.title}>Welcome Back</Text>
          <Text style={s.subtitle}>Sign in to your UniVerse account</Text>
        </LinearGradient>

        {/* ── Card ────────────────────────────────────────────────────────── */}
        <View style={s.card}>

          <Field
            label="Email"
            icon="mail-outline"
            value={email}
            onChange={setEmail}
            placeholder="Enter your email"
            keyboard="email-address"
          />

          <Field
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChange={setPassword}
            placeholder="Enter your password"
            secure
          />

          <TouchableOpacity
            style={s.forgotRow}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={s.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login button */}
          <TouchableOpacity
            style={[s.loginBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={[COLORS.accent, COLORS.accentDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.loginBtnInner}
            >
              {loading
                ? <ActivityIndicator color={COLORS.primary} size="small" />
                : <Text style={s.loginBtnText}>Login</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          <OrDivider />

          {/* OTP button */}
          <TouchableOpacity
            style={s.otpBtn}
            onPress={() => navigation.navigate('OtpLogin')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.otpBtnInner}
            >
              <Ionicons name="mail-open-outline" size={17} color={COLORS.accent} />
              <Text style={s.otpBtnText}>Verify and Login with OTP</Text>
            </LinearGradient>
          </TouchableOpacity>

          <OrDivider />

          {/* Google button */}
          <TouchableOpacity
            style={[s.googleBtn, (isGoogleBusy || !GOOGLE_SUPPORTED) && { opacity: 0.5 }]}
            onPress={handleGooglePress}
            disabled={isGoogleBusy}
            activeOpacity={0.85}
          >
            {googleLoading
              ? <ActivityIndicator color="#DB4437" size="small" />
              : <Ionicons name="logo-google" size={17} color={GOOGLE_SUPPORTED ? '#DB4437' : COLORS.textMuted} />
            }
            <Text style={[s.googleBtnText, !GOOGLE_SUPPORTED && { color: COLORS.textMuted }]}>
              {googleLoading
                ? 'Signing in...'
                : GOOGLE_SUPPORTED
                  ? 'Continue with Google'
                  : 'Google Sign-In Not Configured'}
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* ── Password-change modal ────────────────────────────────────────────── */}
      {showChangeModal && (
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Ionicons name="shield-checkmark-outline" size={36} color={COLORS.primary} style={{ marginBottom: 10 }} />
            <Text style={s.modalTitle}>Set a Personal Password</Text>
            <Text style={s.modalBody}>
              You're currently using your default password. We recommend setting a personal one for better security.
            </Text>
            <TouchableOpacity
              style={s.modalPrimaryBtn}
              onPress={() => { setShowChangeModal(false); navigation.navigate('ChangePassword'); }}
            >
              <Text style={s.modalPrimaryBtnText}>Change Password Now</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowChangeModal(false)} style={s.modalSkipBtn}>
              <Text style={s.modalSkipText}>Skip for Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },
  scroll:    { paddingBottom: 32 },

  header: {
    paddingTop: 52,
    paddingBottom: 44,
    paddingHorizontal: SPACING.lg,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.md,
  },
  logoRing: {
    width: 84, height: 84, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(245,197,24,0.3)',
  },
  logo:     { width: 70, height: 70 },
  title:    { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.4 },
  subtitle: { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.5)', marginTop: 4 },

  card: {
    marginHorizontal: SPACING.md,
    marginTop: -20,
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...SHADOWS.card,
  },

  fieldGroup: { gap: 5 },
  fieldLabel: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textPrimary },
  fieldWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1.5, borderColor: COLORS.cardBorder,
  },
  fieldInput: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.textPrimary },

  forgotRow:  { alignSelf: 'flex-end', marginTop: -2 },
  forgotText: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '600' },

  loginBtn:      { borderRadius: RADIUS.full, overflow: 'hidden', ...SHADOWS.button },
  loginBtnInner: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  loginBtnText:  { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.primary },

  orRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orLine: { flex: 1, height: 1, backgroundColor: COLORS.cardBorder },
  orText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.5 },

  otpBtn:      { borderRadius: RADIUS.full, overflow: 'hidden', ...SHADOWS.card },
  otpBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
  },
  otpBtnText: { fontSize: FONTS.sizes.md, fontWeight: '800', color: '#fff' },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1.5, borderColor: COLORS.cardBorder,
    ...SHADOWS.card,
  },
  googleBtnText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary },

  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.cardBorder,
    ...SHADOWS.card,
    width: '100%',
  },
  modalTitle:          { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8, textAlign: 'center' },
  modalBody:           { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  modalPrimaryBtn:     { borderRadius: RADIUS.full, overflow: 'hidden', backgroundColor: COLORS.primary, paddingVertical: 13, paddingHorizontal: 28, width: '100%', alignItems: 'center', marginBottom: 10, ...SHADOWS.button },
  modalPrimaryBtnText: { fontSize: FONTS.sizes.md, fontWeight: '800', color: COLORS.accent },
  modalSkipBtn:        { paddingVertical: 8 },
  modalSkipText:       { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, fontWeight: '600' },
});