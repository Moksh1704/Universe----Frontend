import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../../constants/theme';

const Shell = ({ visible, onClose, title, children }) => (
  <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
    <View style={s.root}>
      <View style={s.head}>
        <Text style={s.headTitle}>{title}</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
      {children}
    </View>
  </Modal>
);

export const SettingsModal = ({ visible, onClose }) => {
  const [notif, setNotif]   = useState(true);
  const [email, setEmail]   = useState(true);
  const [dark,  setDark]    = useState(false);
  const Row = ({ label, value, onChange }) => (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: COLORS.cardBorder, true: COLORS.accent }} thumbColor={COLORS.secondary} />
    </View>
  );
  return (
    <Shell visible={visible} onClose={onClose} title="Settings">
      <View style={s.body}>
        <Text style={s.section}>Notifications</Text>
        <Row label="Push Notifications" value={notif} onChange={setNotif} />
        <Row label="Email Updates"      value={email} onChange={setEmail} />
        <Text style={[s.section, { marginTop: SPACING.md }]}>Display</Text>
        <Row label="Dark Mode (soon)"   value={dark}  onChange={setDark} />
      </View>
    </Shell>
  );
};

export const PrivacyModal = ({ visible, onClose }) => (
  <Shell visible={visible} onClose={onClose} title="Privacy & Security">
    <ScrollView contentContainerStyle={s.body}>
      <Text style={s.para}>
        UniVerse collects only the information necessary to provide you with the best university
        experience. Your data is stored securely and never shared with third parties without consent.{'\n\n'}
        Passwords are encrypted and session tokens expire after inactivity.{'\n\n'}
        For data requests contact support@andhrauniversity.edu.in.
      </Text>
    </ScrollView>
  </Shell>
);

export const HelpModal = ({ visible, onClose }) => {
  const faqs = [
    { q: 'How is attendance marked?',      a: 'Your faculty marks attendance via the faculty portal.' },
    { q: 'Where are exam results?',         a: 'Results appear on the Home screen as announcements.' },
    { q: 'How do I register for events?',   a: 'Browse Events tab and tap "Register Now".' },
    { q: 'Forgot password?',               a: 'Use "Forgot Password" on login or login with OTP.' },
    { q: 'How to contact support?',         a: 'Email support@andhrauniversity.edu.in.' },
  ];
  return (
    <Shell visible={visible} onClose={onClose} title="Help & Support">
      <ScrollView contentContainerStyle={s.body}>
        {faqs.map((f, i) => (
          <View key={i} style={s.faq}>
            <Text style={s.faqQ}>{f.q}</Text>
            <Text style={s.faqA}>{f.a}</Text>
          </View>
        ))}
      </ScrollView>
    </Shell>
  );
};

export const AboutModal = ({ visible, onClose }) => (
  <Shell visible={visible} onClose={onClose} title="About UniVerse">
    <View style={[s.body, { alignItems: 'center', paddingTop: SPACING.xl }]}>
      <View style={s.logoRing}><Ionicons name="school" size={44} color={COLORS.accent} /></View>
      <Text style={s.appName}>UniVerse</Text>
      <Text style={s.version}>Version 1.0.0</Text>
      <Text style={s.desc}>
        Official student &amp; faculty companion app for Andhra University College of Engineering.
        One platform for students, faculty, and campus resources.
      </Text>
      <Text style={s.copy}>© 2025 Andhra University · Visakhapatnam</Text>
    </View>
  </Shell>
);

const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: COLORS.bgLight },
  head:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, paddingTop: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  headTitle:{ fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary },
  body:     { padding: SPACING.md },
  section:  { fontSize: FONTS.sizes.xs, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm },
  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  rowLabel: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textPrimary },
  para:     { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 22 },
  faq:      { backgroundColor: COLORS.cardBg, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.card, borderWidth: 1, borderColor: COLORS.cardBorder },
  faqQ:     { fontSize: FONTS.sizes.sm, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 5 },
  faqA:     { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20 },
  logoRing: { width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  appName:  { fontSize: FONTS.sizes.xxl, fontWeight: '900', color: COLORS.textPrimary },
  version:  { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginBottom: SPACING.md },
  desc:     { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: SPACING.md, marginBottom: SPACING.lg },
  copy:     { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
});
