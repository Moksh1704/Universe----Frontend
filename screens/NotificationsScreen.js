import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, StatusBar, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

// ─── Mock Notification Data ───────────────────────────────────────────────────
const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    title: 'Low Attendance Warning',
    message: 'Your attendance in Software Project Management is below 85%. Attend 2 more classes to be safe.',
    time: '2 hours ago',
    type: 'warning',
    read: false,
  },
  {
    id: '2',
    title: 'Attendance Updated',
    message: 'Your attendance for Data Science has been marked. Current attendance: 96%',
    time: '5 hours ago',
    type: 'success',
    read: false,
  },
  {
    id: '3',
    title: 'Class Rescheduled',
    message: 'Cyber Security class on Friday has been rescheduled to 2:00 PM',
    time: 'Yesterday',
    type: 'info',
    read: true,
  },
  {
    id: '4',
    title: 'Upcoming Class',
    message: 'You have Soft Computing class tomorrow at 9:00 AM',
    time: 'Yesterday',
    type: 'calendar',
    read: true,
  },
  {
    id: '5',
    title: 'Goal Achieved',
    message: 'Congratulations! You have maintained 90%+ attendance for 3 consecutive weeks',
    time: '2 days ago',
    type: 'success',
    read: true,
  },
  {
    id: '6',
    title: 'Holiday Notice',
    message: 'No classes scheduled on Monday due to public holiday',
    time: '3 days ago',
    type: 'info',
    read: true,
  },
  {
    id: '7',
    title: 'Attendance Below Requirement',
    message: 'Your overall attendance has dropped to 88%. Make sure to attend upcoming classes.',
    time: '1 week ago',
    type: 'warning',
    read: true,
  },
];

// ─── Notification type configuration ─────────────────────────────────────────
const TYPE_CONFIG = {
  warning: {
    icon: 'alert-circle-outline',
    iconColor: COLORS.warning,
    bgColor: '#FEF3E2',
    borderColor: COLORS.warning,
  },
  success: {
    icon: 'checkmark-circle-outline',
    iconColor: COLORS.success,
    bgColor: '#E9F7EF',
    borderColor: COLORS.success,
  },
  info: {
    icon: 'information-circle-outline',
    iconColor: COLORS.textMuted,
    bgColor: COLORS.bgLight,
    borderColor: COLORS.cardBorder,
  },
  calendar: {
    icon: 'calendar-outline',
    iconColor: COLORS.info,
    bgColor: '#EBF5FB',
    borderColor: COLORS.info,
  },
};

// ─── Single Notification Card ─────────────────────────────────────────────────
const NotificationCard = ({ item, onPress }) => {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.info;
  const isUnread = !item.read;

  return (
    <TouchableOpacity
      style={[
        s.card,
        isUnread && { borderColor: cfg.borderColor, borderWidth: 1.5 },
      ]}
      onPress={() => onPress(item.id)}
      activeOpacity={0.82}
    >
      {/* Type icon */}
      <View style={[s.iconWrap, { backgroundColor: cfg.bgColor }]}>
        <Ionicons name={cfg.icon} size={22} color={cfg.iconColor} />
      </View>

      {/* Content */}
      <View style={s.cardContent}>
        <View style={s.cardTop}>
          <Text style={[s.cardTitle, isUnread && s.cardTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          {isUnread && <View style={[s.unreadDot, { backgroundColor: cfg.borderColor }]} />}
        </View>
        <Text style={s.cardMessage}>{item.message}</Text>
        <Text style={s.cardTime}>{item.time}</Text>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          {navigation && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color={COLORS.secondary} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={s.headerTitle}>Notifications</Text>
            <Text style={s.headerSub}>
              {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </Text>
          </View>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={s.markAllBtn}>
            <Text style={s.markAllTxt}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notification List */}
      <FlatList
        data={notifications}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <NotificationCard item={item} onPress={markAsRead} />
        )}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyIconBg}>
              <Ionicons name="notifications-off-outline" size={40} color={COLORS.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No notifications yet</Text>
            <Text style={s.emptyDesc}>You're all caught up. Check back later!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
  },

  // Header
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  backBtn: {
    padding: SPACING.xs,
    marginRight: 2,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '900',
    color: COLORS.secondary,
    letterSpacing: 0.2,
  },
  headerSub: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 3,
  },
  markAllBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    backgroundColor: COLORS.overlayLight,
    borderRadius: RADIUS.full,
    marginBottom: 2,
  },
  markAllTxt: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
  },

  // List
  list: {
    padding: SPACING.md,
    paddingBottom: 110,
    gap: SPACING.sm,
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm + 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: SPACING.sm,
    ...SHADOWS.card,
  },

  // Icon container
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  // Card content
  cardContent: {
    flex: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.textSecondary,
    flex: 1,
    marginRight: SPACING.sm,
  },
  cardTitleUnread: {
    color: COLORS.textPrimary,
  },
  cardMessage: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textMuted,
    lineHeight: 19,
    marginBottom: 6,
  },
  cardTime: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  // Unread indicator dot
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: RADIUS.full,
    flexShrink: 0,
  },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    gap: SPACING.sm,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.card,
    marginBottom: SPACING.xs,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  emptyDesc: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textMuted,
  },
});