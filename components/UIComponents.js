import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

// ─── Loading Spinner ──────────────────────────────────────────────────────────
export const LoadingScreen = ({ message = 'Loading...' }) => (
  <View style={u.loadingWrap}>
    <ActivityIndicator size="large" color={COLORS.accent} />
    <Text style={u.loadingText}>{message}</Text>
  </View>
);

// ─── Empty State ──────────────────────────────────────────────────────────────
export const EmptyState = ({ icon = 'alert-circle-outline', message = 'Nothing to show.' }) => (
  <View style={u.emptyWrap}>
    <Ionicons name={icon} size={44} color={COLORS.textMuted} />
    <Text style={u.emptyText}>{message}</Text>
  </View>
);

// ─── Screen Header (gradient) ─────────────────────────────────────────────────
export const ScreenHeader = ({ title, subtitle, rightElement }) => {
  const { LinearGradient } = require('expo-linear-gradient');
  return (
    <LinearGradient colors={[COLORS.primary, COLORS.primaryMid]} style={u.header}>
      <View style={u.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={u.headerTitle}>{title}</Text>
          {!!subtitle && <Text style={u.headerSub}>{subtitle}</Text>}
        </View>
        {rightElement && rightElement}
      </View>
    </LinearGradient>
  );
};

// ─── Search Bar ───────────────────────────────────────────────────────────────
export const SearchBar = ({ value, onChangeText, placeholder = 'Search...', style }) => (
  <View style={[u.searchBar, style]}>
    <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
    <TextInput
      style={u.searchInput}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textMuted}
      returnKeyType="search"
    />
    {value.length > 0 && (
      <TouchableOpacity
        onPress={() => onChangeText('')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close-circle" size={17} color={COLORS.textMuted} />
      </TouchableOpacity>
    )}
  </View>
);

// ─── Pill / Filter Button ─────────────────────────────────────────────────────
export const FilterPill = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[u.pill, active && u.pillActive]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Text style={[u.pillText, active && u.pillTextActive]}>{label}</Text>
  </TouchableOpacity>
);

// ─── Info Row (label + value) ─────────────────────────────────────────────────
export const InfoRow = ({ icon, label, value }) => (
  <View style={u.infoRow}>
    <View style={u.infoIconBg}>
      <Ionicons name={icon} size={17} color={COLORS.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={u.infoLabel}>{label}</Text>
      <Text style={u.infoValue}>{value ?? '—'}</Text>
    </View>
  </View>
);

// ─── Card wrapper ─────────────────────────────────────────────────────────────
export const Card = ({ children, style }) => (
  <View style={[u.card, style]}>{children}</View>
);

// ─── Primary Button ───────────────────────────────────────────────────────────
export const PrimaryButton = ({ label, onPress, disabled }) => {
  const { LinearGradient } = require('expo-linear-gradient');
  return (
    <TouchableOpacity
      style={[u.primaryBtn, disabled && { opacity: 0.55 }]}
      onPress={onPress}
      activeOpacity={0.88}
      disabled={disabled}
    >
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={u.primaryBtnGrad}
      >
        <Text style={u.primaryBtnText}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// ─── Post Card (Feed) ─────────────────────────────────────────────────────────
export const PostCard = ({ post, onDelete, onCommentPress }) => {
  const [liked, setLiked]         = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);

  const initials = (post.userName || post.user_name || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={u.postCard}>
      <View style={u.postHeader}>
        <View style={u.avatarCircle}>
          <Text style={u.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={u.postUserName}>{post.userName || post.user_name}</Text>
          <Text style={u.postMeta}>
            {post.userRole || post.role} · {post.timePosted || post.time_posted || ''}
          </Text>
        </View>
        {post.isOwn && (
          <TouchableOpacity
            onPress={() => onDelete && onDelete(post.id)}
            style={u.deleteBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={u.postContent}>{post.content || post.text}</Text>

      <View style={u.postActions}>
        <TouchableOpacity
          style={u.actionBtn}
          onPress={() => {
            setLiked(!liked);
            setLikeCount(liked ? likeCount - 1 : likeCount + 1);
          }}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={20}
            color={liked ? COLORS.danger : COLORS.textSecondary}
          />
          <Text style={[u.actionText, liked && { color: COLORS.danger }]}>{likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={u.actionBtn}
          onPress={() => onCommentPress && onCommentPress(post)}
        >
          <Ionicons name="chatbubble-outline" size={20} color={COLORS.textSecondary} />
          <Text style={u.actionText}>{post.comments || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={u.actionBtn}>
          <Ionicons name="repeat-outline" size={20} color={COLORS.textSecondary} />
          <Text style={u.actionText}>{post.reposts || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={u.actionBtn}>
          <Ionicons name="share-social-outline" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const u = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.bgLight,
  },
  loadingText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textMuted,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 48,
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  header: {
    paddingTop: 62,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xxxl,
    fontWeight: '900',
    color: COLORS.secondary,
  },
  headerSub: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: SPACING.md,
    paddingVertical: 11,
    ...SHADOWS.card,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textPrimary,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  pillTextActive: {
    color: COLORS.secondary,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  infoIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.bgLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginTop: 1,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: SPACING.sm,
  },
  primaryBtn: {
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginTop: SPACING.sm,
    ...SHADOWS.button,
  },
  primaryBtnGrad: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    color: COLORS.secondary,
  },
  postCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.secondary,
    fontWeight: '800',
    fontSize: FONTS.sizes.sm,
  },
  postUserName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  postMeta: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  deleteBtn: { padding: 6 },
  postContent: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  postActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});