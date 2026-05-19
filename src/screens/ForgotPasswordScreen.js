/**
 * src/screens/ForgotPasswordScreen.js  [NEW FILE]
 * - Step labels replaced with minimal dots
 * - OTP valid for 5 minutes
 * - Calls existing forgotPassword / resetPassword API
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { forgotPassword, resetPassword } from '../services/authService';

const Field = ({ label, icon, value, onChange, placeholder, secure, hint, autoFocus }) => {
  const [show, setShow] = useState(false);
  return (
    <View style={s.fieldGroup}>
      {label ? <Text style={s.fieldLabel}>{label}</Text> : null}
      <View style={s.fieldWrap}>
        <Ionicons name={icon} size={17} color={COLORS.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={s.fieldInput} value={value} onChangeText={onChange}
          placeholder={placeholder} placeholderTextColor={COLORS.textMuted}
          secureTextEntry={secure && !show} autoCapitalize="none"
          autoCorrect={false} autoFocus={autoFocus}
        />
        {secure && (
          <TouchableOpacity onPress={() => setShow(v => !v)}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={17} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {hint ? <Text style={s.fieldHint}>{hint}</Text> : null}
    </View>
  );
};

const PrimaryBtn = ({ label, onPress, loading }) => (
  <TouchableOpacity style={[s.primaryBtn, loading && { opacity: 0.6 }]} onPress={onPress} activeOpacity={0.88} disabled={loading}>
    <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.primaryBtnGrad}>
      <Text style={s.primaryBtnText}>{loading ? 'Please wait…' : label}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

// Minimal dots — replaces "1 Request OTP / 2 New Password"
const StepDots = ({ step }) => (
  <View style={s.dotsRow}>
    <View style={[s.dot, step >= 1 && s.dotActive]} />
    <View style={[s.dot, step >= 2 && s.dotActive]} />
  </View>
);

export default function ForgotPasswordScreen({ navigation }) {
  const [step,        setStep]        = useState(1);
  const [email,       setEmail]       = useState('');
  const [otp,         setOtp]         = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading,     setLoading]     = useState(false);

  const handleSendOTP = async () => {
    if (!email.trim()) { Alert.alert('Enter Email', 'Please enter your university email.'); return; }
    setLoading(true);
    try { await forgotPassword(email.trim().toLowerCase()); setStep(2); }
    catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const handleReset = async () => {
    if (!otp.trim()) { Alert.alert('Enter OTP', 'Please enter the OTP sent to your email.'); return; }
    if (newPassword.length < 6) { Alert.alert('Weak Password', 'Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPass) { Alert.alert('Mismatch', 'Passwords do not match.'); return; }
    setLoading(true);
    try {
      await resetPassword(email.trim().toLowerCase(), otp.trim(), newPassword);
      Alert.alert('Success', 'Password reset successfully!', [
        { text: 'Login', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <LinearGradient colors={[COLORS.primary, COLORS.primaryMid]} style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={21} color={COLORS.secondary} />
          </TouchableOpacity>
          <View style={s.iconCircle}>
            <Ionicons name="lock-open-outline" size={30} color={COLORS.primary} />
          </View>
          <Text style={s.title}>Reset Password</Text>
          <Text style={s.subtitle}>We'll send an OTP to your email</Text>
        </LinearGradient>

        <View style={s.form}>
          {/* Dots only — no verbose step labels */}
          <StepDots step={step} />

          {step === 1 ? (
            <>
              <Field label="Enter Email" icon="mail-outline" value={email} onChange={setEmail}
                placeholder="Enter your email" autoFocus />
              <PrimaryBtn label="Receive OTP" onPress={handleSendOTP} loading={loading} />
            </>
          ) : (
            <>
              <Field label="OTP Code" icon="keypad-outline" value={otp} onChange={setOtp}
                placeholder="Enter 6-digit OTP"
                hint={`OTP valid for 5 minutes · sent to ${email}`} autoFocus />
              <TouchableOpacity style={s.resendBtn} onPress={handleSendOTP} disabled={loading}>
                <Text style={s.resendTxt}>Resend OTP</Text>
              </TouchableOpacity>
              <Field label="New Password" icon="lock-closed-outline" value={newPassword}
                onChange={setNewPassword} placeholder="Min 6 characters" secure />
              <Field label="Confirm Password" icon="lock-closed-outline" value={confirmPass}
                onChange={setConfirmPass} placeholder="Re-enter new password" secure />
              <PrimaryBtn label="Reset Password" onPress={handleReset} loading={loading} />
            </>
          )}

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.loginLink}>
            <Text style={s.loginLinkTxt}>Remember it? <Text style={s.loginLinkBold}>Back to Login</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.bgLight },
  scroll:          { paddingBottom: 48 },
  header:          { paddingTop: 56, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.lg, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, alignItems: 'center' },
  backBtn:         { alignSelf: 'flex-start', width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  iconCircle:      { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm },
  title:           { fontSize: FONTS.sizes.xxl, fontWeight: '900', color: COLORS.secondary },
  subtitle:        { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.6)', marginTop: 3 },
  form:            { padding: SPACING.lg, gap: SPACING.sm },
  dotsRow:         { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 4 },
  dot:             { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.cardBorder },
  dotActive:       { backgroundColor: COLORS.primary, width: 22, borderRadius: 4 },
  fieldGroup:      { gap: 5 },
  fieldLabel:      { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textPrimary },
  fieldWrap:       { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 13, borderWidth: 1.5, borderColor: COLORS.cardBorder },
  fieldInput:      { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.textPrimary },
  fieldHint:       { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  primaryBtn:      { borderRadius: RADIUS.full, overflow: 'hidden', ...SHADOWS.card },
  primaryBtnGrad:  { paddingVertical: 15, alignItems: 'center' },
  primaryBtnText:  { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.secondary },
  resendBtn:       { alignSelf: 'flex-end' },
  resendTxt:       { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '600' },
  loginLink:       { alignItems: 'center', marginTop: SPACING.sm },
  loginLinkTxt:    { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  loginLinkBold:   { color: COLORS.primary, fontWeight: '800' },
});
