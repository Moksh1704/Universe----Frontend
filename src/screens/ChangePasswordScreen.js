/**
 * src/screens/ChangePasswordScreen.js  [NEW FILE]
 * Change password for logged-in users.
 * Navigate to this from ProfileScreen → "Change Password" menu item.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { apiRequest } from '../../api/api';

const Field = ({ label, icon, value, onChange, placeholder, secure }) => {
  const [show, setShow] = useState(false);
  return (
    <View style={s.fieldGroup}>
      {label ? <Text style={s.fieldLabel}>{label}</Text> : null}
      <View style={s.fieldWrap}>
        <Ionicons name={icon} size={17} color={COLORS.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={s.fieldInput} value={value} onChangeText={onChange}
          placeholder={placeholder} placeholderTextColor={COLORS.textMuted}
          secureTextEntry={secure && !show} autoCapitalize="none" autoCorrect={false}
        />
        {secure && (
          <TouchableOpacity onPress={() => setShow(v => !v)}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={17} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function ChangePasswordScreen({ navigation }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading,     setLoading]     = useState(false);

  const handleChange = async () => {
    if (!oldPassword.trim()) { Alert.alert('Missing Field', 'Please enter your current password.'); return; }
    if (newPassword.length < 6) { Alert.alert('Weak Password', 'New password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPass) { Alert.alert('Mismatch', 'New passwords do not match.'); return; }
    if (oldPassword === newPassword) { Alert.alert('Same Password', 'New password must differ from current.'); return; }

    setLoading(true);
    try {
      await apiRequest('/auth/change-password', 'POST', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      Alert.alert('Success', 'Password changed successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
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
            <Ionicons name="key-outline" size={30} color={COLORS.primary} />
          </View>
          <Text style={s.title}>Change Password</Text>
          <Text style={s.subtitle}>Update your account password</Text>
        </LinearGradient>

        <View style={s.form}>
          <Field label="Current Password"  icon="lock-closed-outline" value={oldPassword} onChange={setOldPassword} placeholder="Enter current password" secure />
          <Field label="New Password"      icon="lock-open-outline"   value={newPassword} onChange={setNewPassword} placeholder="Min 6 characters" secure />
          <Field label="Confirm New Password" icon="lock-open-outline" value={confirmPass} onChange={setConfirmPass} placeholder="Re-enter new password" secure />

          <TouchableOpacity
            style={[s.primaryBtn, loading && { opacity: 0.6 }]}
            onPress={handleChange} activeOpacity={0.88} disabled={loading}
          >
            <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.primaryBtnGrad}>
              <Text style={s.primaryBtnText}>{loading ? 'Updating…' : 'Change Password'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.bgLight },
  scroll:         { paddingBottom: 48 },
  header:         { paddingTop: 56, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.lg, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, alignItems: 'center' },
  backBtn:        { alignSelf: 'flex-start', width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  iconCircle:     { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm },
  title:          { fontSize: FONTS.sizes.xxl, fontWeight: '900', color: COLORS.secondary },
  subtitle:       { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.6)', marginTop: 3 },
  form:           { padding: SPACING.lg, gap: SPACING.sm },
  fieldGroup:     { gap: 5 },
  fieldLabel:     { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textPrimary },
  fieldWrap:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 13, borderWidth: 1.5, borderColor: COLORS.cardBorder },
  fieldInput:     { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.textPrimary },
  primaryBtn:     { borderRadius: RADIUS.full, overflow: 'hidden', marginTop: SPACING.sm, ...SHADOWS.card },
  primaryBtnGrad: { paddingVertical: 15, alignItems: 'center' },
  primaryBtnText: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.secondary },
});
