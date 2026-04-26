import React, { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, Image,
  TouchableOpacity, StatusBar, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../../../api/api';
import { getUnreadCount } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../../constants/theme';

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

const getInitial = (user) => {
  const name = user?.name || "U";
  return name.trim().charAt(0).toUpperCase();
};

// ─── Announcement Card ────────────────────────────────────────────────────────
const TYPE_META = {
  exam:    { label: 'EXAM',    color: '#C0392B' },
  result:  { label: 'RESULT',  color: '#1E8449' },
  holiday: { label: 'HOLIDAY', color: '#D68910' },
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
        <Text style={s.cardBody} numberOfLines={3}>{item.body}</Text>

        <View style={s.cardFooter}>
          <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
          <Text style={s.cardDate}>{item.date}</Text>
        </View>
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function StudentHomeScreen({ navigation }) {
  const rootNav = useNavigation();
  const { user } = useAuth();

  const [currentUser, setCurrentUser] = useState(user);
  const [announcements, setAnnouncements] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [avatarUri, setAvatarUri] = useState(null);

 const hour = new Date().getHours();

const greeting =
  hour >= 5 && hour < 12 ? "Good morning" :
  hour >= 12 && hour < 17 ? "Good afternoon" :
  hour >= 17 && hour < 21 ? "Good evening" :
  "Good night";

  // ✅ FIXED NAME LOGIC
  const firstName =
    currentUser?.name ||
    (currentUser?.name
      ? currentUser.name.split(' ')[0]
      : 'Student');

  // ✅ LOAD LATEST USER FROM STORAGE
  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log("HOME USER:", parsed); // debug
          setCurrentUser(parsed);
        }
      } catch (e) {
        console.log("User load error:", e);
      }
    };
    loadUser();
  }, []);

  // ✅ LOAD ANNOUNCEMENTS FROM BACKEND
  const loadData = useCallback(async () => {
    try {
      const [annData, count] = await Promise.all([
        apiRequest('/announcements'),
        getUnreadCount(),
      ]);

      setAnnouncements(Array.isArray(annData) ? annData : []);
      setUnreadCount(count);
      setHasUnread(count > 0);
    } catch (err) {
      console.log('Home load error:', err);
    }
  }, []);

  // Avatar
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('avatar');
        if (stored) setAvatarUri(stored);
      } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: COLORS.textMuted }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={[COLORS.primary, COLORS.primaryMid]} style={s.header}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>
              {greeting}, {firstName}
            </Text>

            <Text style={s.headerSub}>
              {formatDepartment(currentUser?.department) || 'Andhra University'}
            </Text>
          </View>

          <TouchableOpacity
            style={s.profileBtn}
            onPress={() => navigation.navigate('Profile')}
          >
           {avatarUri ? (
  <Image source={{ uri: avatarUri }} style={s.avatarImg} />
) : (
  <View style={s.initialAvatar}>
    <Text style={s.initialText}>
      {getInitial(currentUser)}
    </Text>
  </View>
)}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={s.body}>
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Latest Updates</Text>

          <TouchableOpacity
            style={s.notifBtn}
            onPress={() => {
              setHasUnread(false);
              rootNav.navigate('Notifications');
            }}
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Ionicons name="newspaper-outline" size={40} color={COLORS.textMuted} />
              <Text style={s.emptyTxt}>No updates yet.</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },

  header: { paddingTop: 62, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.lg },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },

  greeting: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.secondary },
  headerSub: { fontSize: FONTS.sizes.xs, color: 'rgba(255,255,255,0.6)', marginTop: 4 },

  profileBtn: { padding: 2 },
  avatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },

  body: { flex: 1, paddingHorizontal: SPACING.md, paddingTop: SPACING.md },

  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },

  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  initialAvatar: {
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: '#FFD54F', // same yellow as profile
  justifyContent: 'center',
  alignItems: 'center',
},

initialText: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#000',
},

  notifBtn: {
    padding: 7,
    backgroundColor: COLORS.primary + '12',
    borderRadius: RADIUS.md,
  },

  unreadDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F4C430',
  },

  list: { paddingBottom: 110 },

  emptyWrap: { alignItems: 'center', paddingTop: 50 },
  emptyTxt: { color: COLORS.textMuted },

  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
    ...SHADOWS.card,
  },

  cardAccent: { width: 4 },
  cardInner: { flex: 1, padding: SPACING.md },

  cardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },

  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  typePill: { borderRadius: RADIUS.full, paddingHorizontal: 9, paddingVertical: 3 },
  typePillTxt: { fontSize: 10, fontWeight: '800' },

  cardTitle: { fontWeight: '800', marginBottom: 4 },
  cardBody: { marginBottom: 8 },

  cardFooter: { flexDirection: 'row', alignItems: 'center' },
  cardDate: { fontSize: 12, color: COLORS.textMuted },
});