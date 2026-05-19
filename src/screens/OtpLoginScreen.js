/**
 * src/screens/OtpLoginScreen.js
 *
 * OTP flow — step 1: enter email → send OTP.
 * Header shows the app logo (not a keypad icon).
 * On success → OtpVerificationScreen.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, StatusBar, Alert,
  ActivityIndicator, ScrollView, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { sendOTP } from '../services/authService';

export default function OtpLoginScreen({ navigation }) {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert('Enter Email', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await sendOTP(trimmed);
      navigation.navigate('OtpVerification', { email: trimmed });
    } catch (e) {
      Alert.alert('Failed to Send OTP', e.message || 'Please check your email and try again.');
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

        {/* ── Header with app logo ─────────────────────────────────────────── */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryMid, COLORS.primaryLight]}
          style={s.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>

          {/* App logo — centered, same as LoginScreen */}
          <View style={s.logoRing}>
            <Image
              source={require('../../assets/logo.png')}
              style={s.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={s.title}>Login with OTP</Text>
          <Text style={s.subtitle}>
            Enter your email to receive a one-time code
          </Text>
        </LinearGradient>

        {/* ── Card ──────────────────────────────────────────────────────────── */}
        <View style={s.card}>

          {/* Step pills */}
          <View style={s.stepRow}>
            <View style={[s.stepPill, s.stepPillActive]}>
              <Text style={s.stepPillTextActive}>1  Enter Email</Text>
            </View>
            <View style={s.stepArrow}>
              <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
            </View>
            <View style={s.stepPill}>
              <Text style={s.stepPillText}>2  Verify OTP</Text>
            </View>
          </View>

          {/* Email field */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Email Address</Text>
            <View style={s.fieldWrap}>
              <Ionicons name="mail-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 9 }} />
              <TextInput
                style={s.fieldInput}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                returnKeyType="send"
                onSubmitEditing={handleSendOTP}
              />
            </View>
          </View>

          {/* Send OTP button */}
          <TouchableOpacity
            style={[s.sendBtn, loading && { opacity: 0.7 }]}
            onPress={handleSendOTP}
            disabled={loading}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={[COLORS.accent, COLORS.accentDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.sendBtnInner}
            >
              {loading
                ? <ActivityIndicator color={COLORS.primary} size="small" />
                : (
                  <>
                    <Ionicons name="send-outline" size={17} color={COLORS.primary} />
                    <Text style={s.sendBtnText}>Receive OTP</Text>
                  </>
                )
              }
            </LinearGradient>
          </TouchableOpacity>

          {/* Back link */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backRow}>
            <Ionicons name="arrow-back-outline" size={13} color={COLORS.primary} />
            <Text style={s.backText}>Back to password login</Text>
          </TouchableOpacity>
        </View>

        {/* Info note */}
        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={15} color={COLORS.info} />
          <Text style={s.infoText}>
            OTP is valid for <Text style={{ fontWeight: '700' }}>5 minutes</Text>.
            Check spam if you don't receive it.
          </Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },
  scroll:    { paddingBottom: 32 },

  // Header
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
  // Logo ring — identical to LoginScreen
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
  subtitle: { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.5)', marginTop: 4, textAlign: 'center' },

  // Card
  card: {
    marginHorizontal: SPACING.md,
    marginTop: -20,
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    gap: 12,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    ...SHADOWS.card,
  },

  // Step pills
  stepRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4,
  },
  stepPill: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgLight,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  stepPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stepPillText:       { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  stepPillTextActive: { fontSize: 11, fontWeight: '700', color: '#fff' },
  stepArrow: { paddingHorizontal: 2 },

  // Field
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
  fieldHint:  { fontSize: 10, color: COLORS.textMuted, marginTop: 2, marginLeft: 2 },

  // Send OTP button (gold — matches Login button)
  sendBtn:      { borderRadius: RADIUS.full, overflow: 'hidden', ...SHADOWS.button },
  sendBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
  },
  sendBtnText: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.primary },

  // Back link
  backRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4,
  },
  backText: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '600' },

  // Info
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: SPACING.md, marginTop: SPACING.sm,
    backgroundColor: COLORS.info + '10',
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1, borderColor: COLORS.info + '22',
  },
  infoText: { flex: 1, fontSize: 11, color: COLORS.textSecondary, lineHeight: 17 },
});