/**
 * src/screens/NotificationsScreen.js
 * - Auto-marks all notifications as read when screen opens
 * - This clears the yellow dot on HomeScreen (via useFocusEffect re-fetching unread count)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, SafeAreaView, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { fetchNotifications, persistMarkAllRead, applyReadState } from '../services/notificationService';

const TYPE_CONFIG = {
  warning:  { icon: 'alert-circle-outline',       color: COLORS.warning,   bg: '#FEF3E2' },
  success:  { icon: 'checkmark-circle-outline',   color: COLORS.success,   bg: '#E9F7EF' },
  info:     { icon: 'information-circle-outline', color: COLORS.textMuted, bg: COLORS.bgLight },
  calendar: { icon: 'calendar-outline',           color: COLORS.info,      bg: '#EBF5FB' },
};

const NotifCard = ({ item, onPress }) => {
  const cfg      = TYPE_CONFIG[item.type] || TYPE_CONFIG.info;
  const isUnread = !item.read;
  return (
    <TouchableOpacity style={[s.card, isUnread && { borderColor: cfg.color, borderWidth: 1.5 }]} onPress={() => onPress(item.id)} activeOpacity={0.82}>
      <View style={[s.iconWrap, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={22} color={cfg.color} />
      </View>
      <View style={s.content}>
        <View style={s.cardTop}>
          <Text style={[s.cardTitle, isUnread && s.cardTitleUnread]} numberOfLines={1}>{item.title}</Text>
          {isUnread && <View style={[s.dot, { backgroundColor: cfg.color }]} />}
        </View>
        <Text style={s.message} numberOfLines={3}>{item.message || item.body}</Text>
        <Text style={s.time}>{item.time || item.created_at || ''}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);

  const load = useCallback(async (autoMarkRead = false) => {
    try {
      const raw       = await fetchNotifications();
      const withState = await applyReadState(raw);
      setNotifications(withState);

      // Auto-mark all unread as read when screen opens → clears yellow dot on home
      if (autoMarkRead) {
        const unreadIds = withState.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length > 0) {
          await persistMarkAllRead(unreadIds);
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        }
      }
    } catch (e) {
      console.log('Notifications error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(true); }, [load]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const markAsRead  = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = async () => {
    await persistMarkAllRead(notifications.map(n => String(n.id)));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={s.header}>
        <View style={s.headerLeft}>
          {navigation && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color={COLORS.secondary} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={s.headerTitle}>Notifications</Text>
            <Text style={s.headerSub}>{unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}</Text>
          </View>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={s.markAllBtn}>
            <Text style={s.markAllTxt}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={i => String(i.id)}
        renderItem={({ item }) => <NotifCard item={item} onPress={markAsRead} />}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} tintColor={COLORS.accent} />}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}><Ionicons name="notifications-off-outline" size={40} color={COLORS.textMuted} /></View>
            <Text style={s.emptyTitle}>{loading ? 'Loading…' : 'No notifications yet'}</Text>
            <Text style={s.emptyDesc}>{loading ? '' : "You're all caught up!"}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: COLORS.bgLight },
  header:          { backgroundColor: COLORS.primary, paddingTop: SPACING.lg, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.md, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  headerLeft:      { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  backBtn:         { padding: 4 },
  headerTitle:     { fontSize: FONTS.sizes.xxl, fontWeight: '900', color: COLORS.secondary },
  headerSub:       { fontSize: FONTS.sizes.xs, color: 'rgba(255,255,255,0.55)', marginTop: 3 },
  markAllBtn:      { paddingHorizontal: SPACING.sm, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.full },
  markAllTxt:      { fontSize: FONTS.sizes.xs, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  list:            { padding: SPACING.md, paddingBottom: 110, gap: SPACING.sm },
  card:            { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.cardBorder, gap: SPACING.sm, ...SHADOWS.card },
  iconWrap:        { width: 44, height: 44, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  content:         { flex: 1 },
  cardTop:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle:       { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textSecondary, flex: 1, marginRight: 6 },
  cardTitleUnread: { color: COLORS.textPrimary, fontWeight: '700' },
  message:         { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, lineHeight: 19, marginBottom: 5 },
  time:            { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  dot:             { width: 9, height: 9, borderRadius: 5 },
  emptyWrap:       { alignItems: 'center', paddingTop: 60, gap: SPACING.sm },
  emptyIcon:       { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.cardBg, justifyContent: 'center', alignItems: 'center', ...SHADOWS.card },
  emptyTitle:      { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.textPrimary },
  emptyDesc:       { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
});
