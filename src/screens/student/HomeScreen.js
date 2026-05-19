/**
 * src/screens/student/HomeScreen.js
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, Image,
  TouchableOpacity, StatusBar, RefreshControl, ActivityIndicator,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest, AuthError } from '../../../api/api';
import { getUnreadCount } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../../constants/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const BASE_URL = 'https://universe-mainbackend.onrender.com';

const fixAvatarUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
};

const DEPT_MAP = {
  CSE:   'Computer Science and Systems Engineering',
  ECE:   'Electronics and Communication Engineering',
  EEE:   'Electrical and Electronics Engineering',
  MECH:  'Mechanical Engineering',
  CIVIL: 'Civil Engineering',
};
const formatDepartment = (d) => (!d ? '' : DEPT_MAP[d] || d);
const getInitial = (user) => (user?.name || 'U').trim().charAt(0).toUpperCase();

// ─── Announcement card ────────────────────────────────────────────────────────
const TYPE_META = {
  exam:    { label: 'EXAM',    color: '#C0392B' },
  result:  { label: 'RESULT',  color: '#1E8449' },
  holiday: { label: 'HOLIDAY', color: '#D68910' },
};

const getText = (item) => {
  return item.body || item.content || item.description || '';
};

const renderTextWithLinks = (text, style) => {
  if (!text) return null;
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, index) => {
    if (part.match(/^https?:\/\//)) {
      return (
        <Text
          key={index}
          style={[style, { color: '#007AFF', textDecorationLine: 'underline' }]}
          onPress={() => Linking.openURL(part)}
        >
          {part}
        </Text>
      );
    }
    return (
      <Text key={index} style={style}>
        {part}
      </Text>
    );
  });
};

const AnnouncementCard = ({ item }) => {
  const meta = TYPE_META[item.type] || { label: 'UPDATE', color: COLORS.primary };
  return (
    <View style={s.card}>
      <View style={[s.cardAccent, { backgroundColor: meta.color }]} />
      <View style={s.cardInner}>
        <View style={s.cardHead}>
          <View style={[s.iconBox, { backgroundColor: meta.color + '15' }]}>
            <Ionicons name="notifications-outline" size={20} color={meta.color} />
          </View>
          <View style={[s.typePill, { backgroundColor: meta.color + '15' }]}>
            <Text style={[s.typePillTxt, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        <Text style={s.cardTitle}>{item.title}</Text>
        <View style={{ marginTop: 6 }}>
          {renderTextWithLinks(getText(item), s.cardBody)}
        </View>
        <View style={s.cardFooter}>
          <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
          <Text style={s.cardDate}>{item.date}</Text>
        </View>
      </View>
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function StudentHomeScreen({ navigation }) {
  const rootNav          = useNavigation();
  const { user, logout } = useAuth();

  const [announcements, setAnnouncements] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [hasUnread,     setHasUnread]     = useState(false);
  const [avatarUri,     setAvatarUri]     = useState(null);
  const [fetchError,    setFetchError]    = useState(null);

  const hour = new Date().getHours();
  const greeting =
    hour >= 5  && hour < 12 ? 'Good morning'   :
    hour >= 12 && hour < 17 ? 'Good afternoon' :
    hour >= 17 && hour < 21 ? 'Good evening'   : 'Good night';

  const capitalize = (str) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

  const firstName = user?.nickname?.trim()
    ? capitalize(user.nickname.trim())
    : user?.name
      ? capitalize(user.name.trim().split(' ')[0])
      : 'Student';

  // ── Avatar — always resolve to absolute URL ────────────────────────────────
  useEffect(() => {
    const resolved = fixAvatarUrl(user?.avatar_url);
    if (resolved) {
      setAvatarUri(resolved);
      return;
    }
    // Fallback: check AsyncStorage (covers newly uploaded avatar before ctx refresh)
    AsyncStorage.getItem('user_avatar_uri')
      .then(v => { if (v) setAvatarUri(fixAvatarUrl(v)); })
      .catch(() => {});
  }, [user?.avatar_url]);

  // ── Data fetch ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setFetchError(null);
    try {
      const [annData, count] = await Promise.all([
        apiRequest('/announcements'),
        getUnreadCount(),
      ]);
      setAnnouncements(Array.isArray(annData) ? annData : []);
      setHasUnread(count > 0);
    } catch (err) {
      console.error('[Home] fetch failed:', err.name, err.message);
      if (err instanceof AuthError || err?.name === 'AuthError') {
        setFetchError('Session expired. Logging you out…');
        setTimeout(() => logout(), 1500);
      } else {
        setFetchError(err.message || 'Could not load updates.');
      }
    }
  }, [logout]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: COLORS.textMuted, marginTop: 12 }}>Loading updates…</Text>
      </View>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={[COLORS.primary, COLORS.primaryMid]} style={s.header}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{greeting}, {firstName}</Text>
            <Text style={s.headerSub}>{formatDepartment(user?.department) || 'Andhra University'}</Text>
          </View>
          <TouchableOpacity style={s.profileBtn} onPress={() => navigation.navigate('Profile')}>
            {avatarUri
              ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={s.avatarImg}
                  onError={() => setAvatarUri(null)}
                />
              )
              : (
                <View style={s.initialAvatar}>
                  <Text style={s.initialText}>{getInitial(user)}</Text>
                </View>
              )
            }
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={s.body}>
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Latest Updates</Text>
          <TouchableOpacity
            style={s.notifBtn}
            onPress={() => { setHasUnread(false); rootNav.navigate('Notifications'); }}
          >
            <Ionicons name="notifications-outline" size={20} color={COLORS.primary} />
            {hasUnread && <View style={s.unreadDot} />}
          </TouchableOpacity>
        </View>

        <FlatList
          data={announcements}
          keyExtractor={i => String(i.id)}
          renderItem={({ item }) => <AnnouncementCard item={item} />}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            fetchError ? (
              <View style={s.emptyWrap}>
                <Ionicons name="alert-circle-outline" size={44} color="#C0392B" />
                <Text style={[s.emptyTxt, { color: '#C0392B', fontWeight: '700', marginTop: 10 }]}>
                  Failed to load
                </Text>
                <Text style={[s.emptyTxt, { textAlign: 'center', marginTop: 4 }]}>{fetchError}</Text>
                {!fetchError.includes('Logging') && (
                  <TouchableOpacity
                    onPress={loadData}
                    style={{
                      marginTop: 16, paddingVertical: 10, paddingHorizontal: 28,
                      backgroundColor: COLORS.primary, borderRadius: 99,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={s.emptyWrap}>
                <Ionicons name="newspaper-outline" size={40} color={COLORS.textMuted} />
                <Text style={s.emptyTxt}>No updates yet.</Text>
              </View>
            )
          }
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.bgLight },
  header:        { paddingTop: (StatusBar.currentHeight || 44) + 45, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.lg },
  headerRow:     { flexDirection: 'row', alignItems: 'flex-start' },
  greeting:      { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.secondary },
  headerSub:     { fontSize: FONTS.sizes.xs, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  profileBtn:    { padding: 2 },
  avatarImg:     { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  initialAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFD54F', justifyContent: 'center', alignItems: 'center' },
  initialText:   { fontSize: 18, fontWeight: 'bold', color: '#000' },
  body:          { flex: 1, paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  sectionRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  sectionTitle:  { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.textPrimary },
  notifBtn:      { padding: 7, backgroundColor: COLORS.primary + '12', borderRadius: RADIUS.md },
  unreadDot:     { position: 'absolute', top: 5, right: 5, width: 8, height: 8, borderRadius: 4, backgroundColor: '#F4C430' },
  list:          { paddingBottom: 110 },
  emptyWrap:     { alignItems: 'center', paddingTop: 50, paddingHorizontal: 24 },
  emptyTxt:      { color: COLORS.textMuted, marginTop: 8 },
  card:          { flexDirection: 'row', backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, marginBottom: SPACING.sm, overflow: 'hidden', ...SHADOWS.card },
  cardAccent:    { width: 4 },
  cardInner:     { flex: 1, padding: SPACING.md },
  cardHead:      { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  iconBox:       { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  typePill:      { borderRadius: RADIUS.full, paddingHorizontal: 9, paddingVertical: 3 },
  typePillTxt:   { fontSize: 10, fontWeight: '800' },
  cardTitle:     { fontWeight: '800', marginBottom: 4 },
  cardBody:      { marginBottom: 8 },
  cardFooter:    { flexDirection: 'row', alignItems: 'center' },
  cardDate:      { fontSize: 12, color: COLORS.textMuted },
});