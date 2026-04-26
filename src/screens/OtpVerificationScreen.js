/**
 * src/screens/OtpVerificationScreen.js
 *
 * OTP Login flow — screen 2 of 2.
 * Receives `email` via route.params from OtpLoginScreen.
 * User enters the 6-digit OTP and taps "Verify & Login".
 *
 * On success → stores session via AuthContext → AppNavigator routes by role.
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, StatusBar, Alert,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { sendOTP, verifyOTP } from '../services/authService';
import { useAuth } from '../context/AuthContext';

export default function OtpVerificationScreen({ navigation, route }) {
  const { login }               = useAuth();
  const email                   = route?.params?.email || '';
  const [otp,        setOtp]    = useState('');
  const [loading,    setLoading] = useState(false);
  const [resending,  setResend]  = useState(false);
  const inputRef                 = useRef(null);

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (!email) return;
    setResend(true);
    try {
      await sendOTP(email);
      Alert.alert('OTP Resent', `A new OTP has been sent to ${email}`);
      setOtp('');
    } catch (e) {
      Alert.alert('Resend Failed', e.message || 'Could not resend OTP. Please try again.');
    } finally {
      setResend(false);
    }
  };

  // ── Verify OTP ────────────────────────────────────────────────────────────
  const handleVerify = async () => {
    const trimmedOtp = otp.trim();
    if (!trimmedOtp || trimmedOtp.length < 4) {
      Alert.alert('Enter OTP', 'Please enter the OTP sent to your email.');
      return;
    }
    setLoading(true);
    try {
      const result = await verifyOTP(email, trimmedOtp);
      const { accessToken, refreshToken, user } = result;

      if (!accessToken) {
        Alert.alert('Error', 'Login incomplete. Please try again.');
        return;
      }
      if (!user?.role) {
        Alert.alert('Error', 'Could not determine user role. Please try again.');
        return;
      }

      await login({ accessToken, refreshToken, user });
      // AppNavigator routes based on role
    } catch (e) {
      Alert.alert('Verification Failed', e.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryMid]}
          style={s.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>

          <View style={s.iconCircle}>
            <Ionicons name="mail-open" size={34} color={COLORS.accent} />
          </View>

          <Text style={s.title}>Check Your Email</Text>
          <Text style={s.subtitle}>
            We sent a 6-digit code to
          </Text>
          <View style={s.emailBadge}>
            <Ionicons name="mail-outline" size={13} color={COLORS.accent} />
            <Text style={s.emailBadgeText} numberOfLines={1}>{email}</Text>
          </View>
        </LinearGradient>

        {/* ── Card ────────────────────────────────────────────────────────── */}
        <View style={s.card}>

          {/* Step indicator */}
          <View style={s.stepRow}>
            <View style={s.stepDot}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
            <View style={[s.stepLine, { backgroundColor: COLORS.primary }]} />
            <View style={[s.stepDot, s.stepDotActive]}>
              <Text style={s.stepDotText}>2</Text>
            </View>
          </View>
          <Text style={s.stepLabel}>Enter the OTP from your email</Text>

          {/* OTP field */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>One-Time Password</Text>
            <TouchableOpacity
              style={s.otpFieldWrap}
              onPress={() => inputRef.current?.focus()}
              activeOpacity={1}
            >
              <Ionicons name="keypad-outline" size={17} color={COLORS.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                ref={inputRef}
                style={s.otpInput}
                value={otp}
                onChangeText={v => setOtp(v.replace(/[^0-9]/g, '').slice(0, 6))}
                placeholder="• • • • • •"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleVerify}
              />
              {otp.length === 6 && (
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              )}
            </TouchableOpacity>
            <Text style={s.fieldHint}>Enter the 6-digit code · Valid for 5 minutes</Text>
          </View>

          {/* Verify button */}
          <TouchableOpacity
            style={[s.verifyBtn, loading && { opacity: 0.7 }]}
            onPress={handleVerify}
            disabled={loading}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={[COLORS.accent, COLORS.accentDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.verifyBtnInner}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.primary} size="small" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primary} />
                  <Text style={s.verifyBtnText}>Verify & Login</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Resend row */}
          <View style={s.resendRow}>
            <Text style={s.resendLabel}>Didn't receive the code?</Text>
            <TouchableOpacity onPress={handleResend} disabled={resending}>
              {resending
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Text style={s.resendBtn}>Resend OTP</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Wrong email link */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.wrongEmailRow}
          >
            <Ionicons name="create-outline" size={13} color={COLORS.primary} />
            <Text style={s.wrongEmailText}>Use a different email</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },
  scroll:    { paddingBottom: 44 },

  // Header
  header: {
    paddingTop: 56,
    paddingBottom: 52,
    paddingHorizontal: SPACING.lg,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconCircle: {
    width: 88, height: 88, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1.5, borderColor: 'rgba(245,197,24,0.35)',
  },
  title:    { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.5)', marginTop: 6 },
  emailBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    maxWidth: '90%',
  },
  emailBadgeText: {
    fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.accent,
  },

  // Card
  card: {
    marginHorizontal: SPACING.md,
    marginTop: -24,
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    ...SHADOWS.card,
  },

  // Steps
  stepRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  stepDot: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.success,
    justifyContent: 'center', alignItems: 'center',
  },
  stepDotActive: { backgroundColor: COLORS.primary },
  stepDotText:   { fontSize: FONTS.sizes.sm, fontWeight: '800', color: '#fff' },
  stepLine:      { flex: 1, height: 2, backgroundColor: COLORS.cardBorder, marginHorizontal: 6 },
  stepLabel:     { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, textAlign: 'center', marginTop: -4 },

  // Field
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textPrimary },
  otpFieldWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 13,
    borderWidth: 1.5, borderColor: COLORS.cardBorder,
  },
  otpInput: {
    flex: 1, fontSize: 22, fontWeight: '800',
    color: COLORS.textPrimary, letterSpacing: 8,
  },
  fieldHint: { fontSize: 10, color: COLORS.textMuted, marginTop: 3, marginLeft: 2 },

  // Verify button (accent gold)
  verifyBtn:      { borderRadius: RADIUS.full, overflow: 'hidden', ...SHADOWS.button },
  verifyBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15,
  },
  verifyBtnText:  { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.3 },

  // Resend
  resendRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, paddingTop: SPACING.xs,
  },
  resendLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
  resendBtn:   { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '700' },

  // Wrong email
  wrongEmailRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4,
  },
  wrongEmailText: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '600' },
});