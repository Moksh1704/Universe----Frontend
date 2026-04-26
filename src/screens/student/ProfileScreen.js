import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { fetchProfile, uploadProfilePicture } from '../../services/profileService';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../../constants/theme';
import { LoadingScreen, InfoRow } from '../../../components/UIComponents';
import { SettingsModal, PrivacyModal, HelpModal, AboutModal } from '../../components/common/ProfileModals';

export default function StudentProfileScreen({ navigation }) {
  const { user: ctxUser, logout, updateUser } = useAuth();
  const [profile, setProfile] = useState(ctxUser);
  const [avatarUri, setAvatarUri] = useState(ctxUser?.avatar_url || null);
  const [loading, setLoading] = useState(false);
  const [showSettings, setSettings] = useState(false);
  const [showPrivacy, setPrivacy] = useState(false);
  const [showHelp, setHelp] = useState(false);
  const [showAbout, setAbout] = useState(false);

  // ✅ Year formatter
  const formatYear = (year) => {
    if (!year) return "";
    const y = Number(year);
    if (y === 1) return "1st Year";
    if (y === 2) return "2nd Year";
    if (y === 3) return "3rd Year";
    if (y === 4) return "4th Year";
    return `${y} Year`;
  };

  // ✅ Load user
  const loadUser = useCallback(async () => {
    try {
      const data = await fetchProfile();
      console.log("PROFILE USER:", data);

      setProfile(data);
      updateUser(data);

      await AsyncStorage.setItem('user', JSON.stringify(data)).catch(() => {});

      if (data?.avatar_url) {
        setAvatarUri(data.avatar_url);
        await AsyncStorage.setItem('avatar', data.avatar_url).catch(() => {});
      }
    } catch (e) {
      console.warn('Profile fetch:', e.message);
    }
  }, []);

  // ✅ Load avatar
  const loadAvatar = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('avatar');
      if (stored) setAvatarUri(stored);
    } catch (_) {}
  }, []);

  // ✅ Refresh on focus
  useFocusEffect(
    useCallback(() => {
      loadUser();
      loadAvatar();
    }, [loadUser, loadAvatar])
  );

  // ✅ Image picker
  const handlePickImage = () => {
    Alert.alert('Upload Photo', 'Choose source', [
      { text: 'Camera', onPress: () => pickImage('camera') },
      { text: 'Photo Library', onPress: () => pickImage('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickImage = async (source) => {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (perm.status !== 'granted') {
      Alert.alert('Permission required');
      return;
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });

    if (!result.canceled && result.assets?.[0]) {
      const uri = result.assets[0].uri;

      setAvatarUri(uri);
      await AsyncStorage.setItem('avatar', uri).catch(() => {});

      try {
        await uploadProfilePicture(uri);
      } catch (e) {
        console.warn('Upload:', e.message);
      }
    }
  };

  const handleLogout = () =>
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          await AsyncStorage.multiRemove(['user', 'avatar']).catch(() => {});
          navigation.reset({ index: 0, routes: [{ name: 'GetStarted' }] });
        },
      },
    ]);

  if (!profile && loading) return <LoadingScreen message="Loading profile…" />;

  const p = profile || ctxUser || {};
  const initials = ((p.name || p.fullname || 'U'))
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const menuItems = [
  { icon: 'settings-outline', label: 'Settings', action: () => setSettings(true) },
  { icon: 'shield-checkmark-outline', label: 'Privacy & Security', action: () => setPrivacy(true) },

  // ✅ ADD THIS
  { icon: 'lock-closed-outline', label: 'Change Password', action: () => navigation.navigate("ChangePassword") },

  { icon: 'help-circle-outline', label: 'Help & Support', action: () => setHelp(true) },
  { icon: 'information-circle-outline', label: 'About UniVerse', action: () => setAbout(true) },
  { icon: 'log-out-outline', label: 'Logout', action: handleLogout, danger: true },
];
const formatDepartment = (dept) => {
  if (!dept) return "";

  const map = {
    CSE: "Computer Science and Systems Engineering",
    ECE: "Electronics and Communication Engineering",
    EEE: "Electrical and Electronics Engineering",
    MECH: "Mechanical Engineering",
    CIVIL: "Civil Engineering",
  };

  return map[dept] || dept;
};
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={s.headerBg}>

          {/* ✅ Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ position: 'absolute', top: 70, left: 20, zIndex: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Avatar */}
          <TouchableOpacity style={s.avatarWrap} onPress={handlePickImage} activeOpacity={0.85}>
            {avatarUri
              ? <Image source={{ uri: avatarUri }} style={s.avatarImg} />
              : <View style={s.avatarFallback}><Text style={s.avatarTxt}>{initials}</Text></View>
            }
            <View style={s.cameraOverlay}>
              <Ionicons name="camera" size={14} color={COLORS.primary} />
            </View>
          </TouchableOpacity>

          <Text style={s.name}>{p.fullname || p.name || 'Student'}</Text>

          {/* ✅ Fixed Year Format */}
          <Text style={s.sub}>
  {p.department
    ? formatDepartment(p.department)
    : 'Andhra University'}
</Text>

          <View style={s.badge}>
            <Ionicons name="school" size={11} color={COLORS.primary} />
            <Text style={s.badgeTxt}>Student</Text>
          </View>
        </LinearGradient>

        <View style={s.body}>
          <View style={s.section}>
            <Text style={s.secLabel}>Profile Information</Text>

            <InfoRow icon="person-outline" label="Full Name" value={p.fullname || ''} />
            <InfoRow icon="mail-outline" label="Email" value={p.email || ''} />
            <InfoRow
  icon="card-outline"
  label="Reg No"
  value={p.registrationNumber ? String(p.registrationNumber) : '—'}
/>
            <InfoRow
  icon="business-outline"
  label="Department"
  value={formatDepartment(p.department)}
/>
            <InfoRow icon="book-outline" label="Course" value={p.course || 'B.Tech'} />
            <InfoRow icon="layers-outline" label="Year" value={p.year ? formatYear(p.year) : '—'} />
            <InfoRow icon="grid-outline" label="Section" value={p.section || '—'} />
            <InfoRow icon="ribbon-outline" label="CGPA" value={p.cgpa ? String(p.cgpa) : '—'} />
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

                <Text style={[s.menuLabel, item.danger && { color: COLORS.danger }]}>
                  {item.label}
                </Text>

                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>


        </View>
      </ScrollView>

      <SettingsModal visible={showSettings} onClose={() => setSettings(false)} />
      <PrivacyModal visible={showPrivacy} onClose={() => setPrivacy(false)} />
      <HelpModal visible={showHelp} onClose={() => setHelp(false)} />
      <AboutModal visible={showAbout} onClose={() => setAbout(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },

  headerBg: {
    paddingTop: 70,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
    gap: 6
  },

  avatarWrap: { position: 'relative', marginBottom: SPACING.sm },

  avatarImg: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)'
  },

  avatarFallback: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)'
  },

  avatarTxt: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '900',
    color: COLORS.primary
  },

  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary
  },

  name: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '900',
    color: COLORS.secondary
  },

  sub: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.7)'
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4
  },

  badgeTxt: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
    color: COLORS.primary
  },

  body: {
    padding: SPACING.md,
    gap: SPACING.md
  },

  section: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder
  },

  secLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm
  },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 13
  },

  menuBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder
  },

  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.bgLight,
    justifyContent: 'center',
    alignItems: 'center'
  },

  menuLabel: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.textPrimary
  },

  changePasswordBtn: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: "center",
    backgroundColor: COLORS.primary,
  },

  changePasswordText: {
    color: "#fff",
    fontSize: FONTS.sizes.md,
    fontWeight: "700",
  },
});