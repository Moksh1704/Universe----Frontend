// src/screens/faculty/ProfileScreen.js

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { fetchProfile } from '../../services/profileService';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../../constants/theme';
import { LoadingScreen, InfoRow } from '../../../components/UIComponents';
import { SettingsModal, PrivacyModal, HelpModal, AboutModal } from '../../components/common/ProfileModals';

export default function FacultyProfileScreen({ navigation }) {
  const { user: ctxUser, logout, updateUser } = useAuth();
  const [profile,      setProfile]  = useState(ctxUser);
  const [showSettings, setSettings] = useState(false);
  const [showPrivacy,  setPrivacy]  = useState(false);
  const [showHelp,     setHelp]     = useState(false);
  const [showAbout,    setAbout]    = useState(false);

  useEffect(() => {
    // ✅ FIX: pass role='faculty' so fetchProfile hits /faculty/profile,
    // not /student/profile (which caused "Student not found" warning).
    fetchProfile('faculty')
      .then(data => { setProfile(data); updateUser(data); })
      .catch(e => console.warn('Profile fetch:', e.message));
  }, []);

  const handleLogout = () =>
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await logout();
      }},
    ]);

  const p        = profile || ctxUser || {};
  const initials = (p.name || 'F').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const menuItems = [
    { icon: 'settings-outline',           label: 'Settings',           action: () => setSettings(true) },
    { icon: 'shield-checkmark-outline',   label: 'Privacy & Security', action: () => setPrivacy(true) },
    { icon: 'lock-closed-outline',        label: 'Change Password',    action: () => navigation.navigate('ChangePassword', { role: 'faculty' }) },
    { icon: 'help-circle-outline',        label: 'Help & Support',     action: () => setHelp(true) },
    { icon: 'information-circle-outline', label: 'About UniVerse',     action: () => setAbout(true) },
    { icon: 'log-out-outline',            label: 'Logout',             action: handleLogout, danger: true },
  ];

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={s.headerBg}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </View>
          <Text style={s.name}>{p.name || p.full_name || 'Faculty'}</Text>
          <Text style={s.sub}>{p.designation || 'Faculty'}{p.department ? ` · ${p.department}` : ''}</Text>
          <View style={s.badge}>
            <Ionicons name="person" size={11} color={COLORS.primary} />
            <Text style={s.badgeTxt}>Faculty</Text>
          </View>
        </LinearGradient>

        <View style={s.body}>
          <View style={s.section}>
            <Text style={s.secLabel}>Profile Information</Text>
            <InfoRow icon="person-outline"    label="Full Name"   value={p.name || p.full_name} />
            <InfoRow icon="mail-outline"      label="Email"       value={p.email} />
            <InfoRow icon="business-outline"  label="Department"  value={p.department} />
            <InfoRow icon="briefcase-outline" label="Designation" value={p.designation} />
          </View>

          <View style={s.section}>
            <Text style={s.secLabel}>Account</Text>
            {menuItems.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[s.menuRow, i < menuItems.length - 1 && s.menuBorder]}
                onPress={item.action}
                activeOpacity={0.7}
              >
                <View style={[s.menuIcon, item.danger && { backgroundColor: COLORS.danger + '15' }]}>
                  <Ionicons name={item.icon} size={19} color={item.danger ? COLORS.danger : COLORS.primary} />
                </View>
                <Text style={[s.menuLabel, item.danger && { color: COLORS.danger }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <SettingsModal visible={showSettings} onClose={() => setSettings(false)} />
      <PrivacyModal  visible={showPrivacy}  onClose={() => setPrivacy(false)} />
      <HelpModal     visible={showHelp}     onClose={() => setHelp(false)} />
      <AboutModal    visible={showAbout}    onClose={() => setAbout(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.bgLight },
  headerBg:   { paddingTop: 70, paddingBottom: SPACING.xl, alignItems: 'center', gap: 6 },
  avatar:     { width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarTxt:  { fontSize: FONTS.sizes.xxl, fontWeight: '900', color: COLORS.primary },
  name:       { fontSize: FONTS.sizes.xl, fontWeight: '900', color: COLORS.secondary },
  sub:        { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.7)' },
  badge:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.accent, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 4, marginTop: 4 },
  badgeTxt:   { fontSize: FONTS.sizes.xs, fontWeight: '800', color: COLORS.primary },
  body:       { padding: SPACING.md, gap: SPACING.md },
  section:    { backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, padding: SPACING.md, ...SHADOWS.card, borderWidth: 1, borderColor: COLORS.cardBorder },
  secLabel:   { fontSize: FONTS.sizes.xs, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm },
  menuRow:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 13 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  menuIcon:   { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.bgLight, justifyContent: 'center', alignItems: 'center' },
  menuLabel:  { flex: 1, fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textPrimary },
});