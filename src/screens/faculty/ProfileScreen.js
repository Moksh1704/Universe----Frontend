// src/screens/faculty/ProfileScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { STORAGE_KEYS } from '../../context/AuthContext';
import { fetchProfile, uploadProfilePicture } from '../../services/profileService';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../../constants/theme';
import { LoadingScreen, InfoRow } from '../../../components/UIComponents';
import { SettingsModal, PrivacyModal, HelpModal, AboutModal } from '../../components/common/ProfileModals';

export default function FacultyProfileScreen({ navigation }) {
  const { user: ctxUser, logout, updateUser } = useAuth();

  const [profile,      setProfile]  = useState(ctxUser);
  const [avatarUri,    setAvatarUri] = useState(ctxUser?.avatar_url || null);
  const [showSettings, setSettings] = useState(false);
  const [showPrivacy,  setPrivacy]  = useState(false);
  const [showHelp,     setHelp]     = useState(false);
  const [showAbout,    setAbout]    = useState(false);

  // ── Sync avatar from context whenever user object updates ──────────────────
  // This is the critical persistence fix: backend is source of truth.
  // After login, AuthContext fetches /users/me and calls updateUser(),
  // which flows down here via ctxUser.
  useEffect(() => {
    if (ctxUser?.avatar_url) {
      setAvatarUri(ctxUser.avatar_url);
    }
  }, [ctxUser?.avatar_url]);

  // ── Fetch full faculty profile on mount ────────────────────────────────────
  useEffect(() => {
    fetchProfile('faculty')
      .then(data => {
        setProfile(data);
        updateUser(data);
        if (data?.avatar_url) setAvatarUri(data.avatar_url);
      })
      .catch(e => console.warn('Profile fetch:', e.message));
  }, []);

  // ── Avatar: pick from gallery ──────────────────────────────────────────────
  const handlePickGallery = useCallback(async () => {
    console.log('[Avatar] Opening gallery…');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log('[Avatar] Media library permission:', status);
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    let result;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images, // ✅ MediaTypeOptions.Images is deprecated
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    } catch (e) {
      // Catches crashes inside the native picker module (e.g. OOM, OS-level denial)
      // If you see this log, the issue is with the ImagePicker module itself,
      // not permission or upload logic. Try a real device instead of an emulator.
      console.log('[Avatar] PICKER THREW:', e?.message || e);
      Alert.alert('Picker error', 'Could not open the photo library. Try on a real device.');
      return;
    }

    // ✅ Log the full raw result — if this never prints, the picker is hanging
    //    (common on emulators). Switch to a real device for reliable testing.
    console.log('[Avatar] FULL RESULT:', JSON.stringify(result, null, 2));

    if (result?.assets?.length > 0) {
      const uri = result.assets[0].uri;
      console.log('[Avatar] Selected URI:', uri);
      await processAvatarUpload(uri);
    } else {
      console.log('[Avatar] No image selected (cancelled or empty assets).');
    }
  }, []);

  // ── Avatar: take a new photo ───────────────────────────────────────────────
  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access.');
      return;
    }
    let result;
    try {
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    } catch (e) {
      console.log('[Avatar] CAMERA PICKER THREW:', e?.message || e);
      Alert.alert('Camera error', 'Could not open the camera. Try on a real device.');
      return;
    }

    console.log('[Avatar] Camera result:', JSON.stringify(result, null, 2));

    if (result?.assets?.length > 0) {
      const uri = result.assets[0].uri;
      console.log('[Avatar] Captured URI:', uri);
      await processAvatarUpload(uri);
    } else {
      console.log('[Avatar] No photo taken (cancelled or empty assets).');
    }
  }, []);

  // ── Avatar: upload to backend, update context + cache ─────────────────────
  //
  // 🔧 DEBUG MODE — set TEST_MODE = true to bypass the upload and confirm the
  //    picker itself works. If the avatar updates in the UI, the picker is fine
  //    and the backend upload is the problem. Flip back to false when done.
  const TEST_MODE = false;

  const processAvatarUpload = async (localUri) => {
    console.log('[Avatar] processAvatarUpload called with URI:', localUri);

    // ── TEST MODE: skip upload, just render the local image ────────────────
    if (TEST_MODE) {
      console.log('[Avatar] TEST MODE — skipping upload, setting URI directly');
      setAvatarUri(localUri);
      return;
    }

    // Show local image immediately for responsiveness; do NOT revert on error
    // unless the upload fully succeeds (we keep the local preview visible).
    setAvatarUri(localUri);

    try {
      console.log('[Avatar] Uploading to backend…');
      const uploadedUrl = await uploadProfilePicture(localUri);
      console.log('[Avatar] Upload response:', JSON.stringify(uploadedUrl));

      // ✅ Safely extract a plain string URL — API may return an object or a
      //    bare string. We never pass an object to AsyncStorage.
      const finalUrl =
        typeof uploadedUrl === 'string'
          ? uploadedUrl
          : uploadedUrl?.avatar_url || uploadedUrl?.url || null;

      if (!finalUrl) {
        // Upload returned an unexpected shape — local preview stays visible,
        // but we warn and skip the cache update so state stays consistent.
        console.warn('[Avatar] Unexpected upload response shape:', uploadedUrl);
        Alert.alert('Upload issue', 'Photo updated locally but could not be saved to server.');
        return;
      }

      console.log('[Avatar] Resolved final URL:', finalUrl);
      setAvatarUri(finalUrl);
      updateUser({ avatar_url: finalUrl });
      // ✅ finalUrl is always a string — no "Value is not a string" warning
      await AsyncStorage.setItem(STORAGE_KEYS.AVATAR, finalUrl).catch(() => {});
    } catch (err) {
      // ✅ Fixed: keep local preview on failure instead of reverting to nothing.
      //    The user can see their selection; a retry won't blank their avatar.
      console.warn('[Avatar] Upload failed:', err.message);
      Alert.alert('Upload failed', 'Your photo is shown locally but could not be saved. Please try again.');
    }
  };

  // ── Avatar: remove photo ───────────────────────────────────────────────────
  const handleRemoveAvatar = useCallback(async () => {
    setAvatarUri(null);
    updateUser({ avatar_url: null });
    await AsyncStorage.removeItem(STORAGE_KEYS.AVATAR).catch(() => {});
    // Optional: call backend to delete avatar
    // try { await deleteProfilePicture(); } catch (e) { console.warn(e); }
  }, [updateUser]);

  // ── Avatar action sheet ────────────────────────────────────────────────────
  const handleAvatarPress = useCallback(() => {
    const options = [
      { text: 'Take Photo',          onPress: handleTakePhoto },
      { text: 'Choose from Gallery', onPress: handlePickGallery },
      ...(avatarUri ? [{ text: 'Remove Photo', style: 'destructive', onPress: () =>
        Alert.alert('Remove Photo', 'Are you sure you want to remove your profile photo?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: handleRemoveAvatar },
        ])
      }] : []),
      { text: 'Cancel', style: 'cancel' },
    ];
    Alert.alert('Profile Photo', 'Choose an option', options);
  }, [avatarUri, handleTakePhoto, handlePickGallery, handleRemoveAvatar]);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = () =>
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); } },
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

        <View style={[s.headerBg, { backgroundColor: COLORS.primary }]}>

          {/* ── Avatar with upload overlay ─────────────────────────────────── */}
          <TouchableOpacity onPress={handleAvatarPress} style={s.avatarWrapper} activeOpacity={0.85}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={s.avatarImg} />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarTxt}>{initials}</Text>
              </View>
            )}
            {/* Overlay icon: camera if no avatar, pencil if avatar exists */}
            <View style={s.avatarOverlay}>
              <Ionicons
                name={avatarUri ? 'create-outline' : 'camera'}
                size={14}
                color={COLORS.primary}
              />
            </View>
          </TouchableOpacity>

          <Text style={s.name}>{p.name || p.full_name || 'Faculty'}</Text>
          <Text style={s.sub}>{p.designation || 'Faculty'}</Text>
        </View>

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
  container:     { flex: 1, backgroundColor: COLORS.bgLight },
  headerBg:      { paddingTop: 70, paddingBottom: SPACING.xl, alignItems: 'center', gap: 6 },

  // Avatar wrapper positions the overlay icon absolutely
  avatarWrapper: { marginBottom: SPACING.sm },
  avatar:        { width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarImg:     { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarTxt:     { fontSize: FONTS.sizes.xxl, fontWeight: '900', color: COLORS.primary },

  // Pill badge anchored to bottom-right of the 84px avatar
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  name:       { fontSize: FONTS.sizes.xl,  fontWeight: '900', color: COLORS.secondary },
  sub:        { fontSize: FONTS.sizes.sm,  color: 'rgba(255,255,255,0.7)' },
  body:       { padding: SPACING.md, gap: SPACING.md },
  section:    { backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, padding: SPACING.md, ...SHADOWS.card, borderWidth: 1, borderColor: COLORS.cardBorder },
  secLabel:   { fontSize: FONTS.sizes.xs, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm },
  menuRow:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 13 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  menuIcon:   { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.bgLight, justifyContent: 'center', alignItems: 'center' },
  menuLabel:  { flex: 1, fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textPrimary },
});