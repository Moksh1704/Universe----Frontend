import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, StatusBar, Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../api/api';
import { useAuth } from '../src/context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import AppHeader from '../components/AppHeader';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * normalizeTS(raw) → always returns a UTC-anchored ISO string.
 *
 * Problem solved: FastAPI may return naive UTC strings without a timezone
 * suffix (e.g. "2026-04-27T05:00:00").  JavaScript's Date constructor
 * treats those as LOCAL time, so an IST device reads 05:00 IST instead of
 * 05:00 UTC — a silent +5:30 error.  Appending "Z" tells the parser it is
 * UTC, which is what the backend always means.
 *
 * new Date().toISOString() already includes "Z", so optimistic messages are
 * unaffected by this guard.
 */
const normalizeTS = (raw) =>
  raw && !/[Z+\-]\d*$/.test(raw) ? `${raw}Z` : raw;

/**
 * formatTime(timestamp) — single reusable display function.
 *
 * • Accepts any ISO string (with or without timezone suffix).
 * • Never does manual hour arithmetic — JavaScript Date + Intl handles it.
 * • Returns WhatsApp-style time: "10:30 AM" for today,
 *   "27 Apr, 10:30 AM" for older messages.
 */
const formatTime = (raw) => {
  if (!raw) return '';
  const ts = normalizeTS(raw);
  const d  = new Date(ts);
  if (isNaN(d.getTime())) return '';

  const now     = new Date();
  const isToday =
    d.getDate()     === now.getDate()  &&
    d.getMonth()    === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  // Let JS/Intl resolve the user's local timezone automatically — no manual offset.
  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  // Older message: "27 Apr, 10:30 AM"
  return d.toLocaleString([], {
    day:    '2-digit',
    month:  'short',
    hour:   '2-digit',
    minute: '2-digit',
  });
};

const IST = 'Asia/Kolkata';

const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';

// Deterministic pastel colour from username so each avatar has its own colour
const AVATAR_PALETTE = [
  '#4F8EF7', '#E05C8A', '#2EC4B6', '#F4A261', '#9B59B6',
  '#27AE60', '#E67E22', '#2980B9', '#C0392B', '#16A085',
];
const avatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

// ── DateSeparator ─────────────────────────────────────────────────────────────

const DateSeparator = ({ label }) => (
  <View style={s.dateSep}>
    <View style={s.dateLine} />
    <Text style={s.dateLabel}>{label}</Text>
    <View style={s.dateLine} />
  </View>
);

const dateSepLabel = (raw) => {
  if (!raw) return '';
  const d = new Date(normalizeTS(raw));
  if (isNaN(d.getTime())) return '';

  // Compare calendar dates in IST, not UTC.
  const msgIST = d.toLocaleDateString('en-IN', { timeZone: IST });
  const nowIST = new Date().toLocaleDateString('en-IN', { timeZone: IST });

  const toMidnight = (s) => { const [dd, mm, yyyy] = s.split('/'); return new Date(`${yyyy}-${mm}-${dd}`); };
  const diff = Math.floor((toMidnight(nowIST) - toMidnight(msgIST)) / 86400000);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { timeZone: IST, day: 'numeric', month: 'long', year: 'numeric' });
};

// ── MessageBubble ─────────────────────────────────────────────────────────────

const MessageBubble = ({ msg, isMine, showAvatar, onLongPress }) => {
  const color = avatarColor(msg.user_name);
  const isDeleted = !!msg.is_deleted;

  return (
    <View style={[s.msgRow, isMine && s.msgRowMine]}>
      {/* Avatar (other side) */}
      {!isMine && (
        <View style={[
          s.avatar,
          { backgroundColor: isDeleted ? '#C0C0C0' : color },
          !showAvatar && s.avatarHidden,
          isDeleted && s.avatarDeleted,
        ]}>
          {showAvatar && <Text style={s.avatarTxt}>{getInitials(msg.user_name)}</Text>}
        </View>
      )}

      <View style={[
        s.bubble,
        isMine ? s.bubbleMine : s.bubbleOther,
        isDeleted && (isMine ? s.bubbleMineDeleted : s.bubbleOtherDeleted),
      ]}>
        {/* Username — only for others, only when top of cluster */}
        {!isMine && showAvatar && (
          <Text style={[s.bubbleName, { color: isDeleted ? '#A0A0A0' : color }]}>
            {msg.user_name}
          </Text>
        )}

        {/* ── Deleted message: no long-press, italic grey text with ban icon ── */}
        {isDeleted ? (
          <View style={s.deletedRow}>
            <Ionicons name="ban-outline" size={13} color="#A0A0A0" style={{ marginTop: 1 }} />
            <Text style={s.deletedText}>{msg.message}</Text>
          </View>
        ) : (
          <TouchableOpacity onLongPress={() => onLongPress && onLongPress(msg)} activeOpacity={0.85}>
            <Text style={[s.bubbleText, isMine && s.bubbleTextMine]}>{msg.message}</Text>
          </TouchableOpacity>
        )}

        <Text style={[s.bubbleTime, isMine && s.bubbleTimeMine, isDeleted && s.bubbleTimeDeleted]}>
          {formatTime(msg.created_at)}
        </Text>
      </View>

      {/* Spacer so "mine" bubbles don't need a right avatar */}
      {isMine && <View style={s.avatarSpacer} />}
    </View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function DiscussionScreen() {
  const { user } = useAuth();
  const currentUserId = String(user?.id || '');
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(true);
  const [sending,    setSending]    = useState(false);
  const [error,      setError]      = useState(null);
  const listRef = useRef(null);

  // Fetch on mount + poll every 3 s for real-time updates
  useEffect(() => {
    fetchMessages();

    const poll = setInterval(async () => {
      try {
        const data = await apiRequest('/posts');
        if (!Array.isArray(data)) return;
        setMessages((prev) => {
          // Skip re-render if length and every id+is_deleted are identical
          if (
            prev.length === data.length &&
            prev.every((m, i) => m.id === data[i].id && m.is_deleted === data[i].is_deleted)
          ) return prev;
          return data;
        });
      } catch {
        // Silent — polling errors don't interrupt the UI
      }
    }, 3000);

    return () => clearInterval(poll); // cleanup on unmount
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/posts');
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Could not load messages.');
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const optimistic = {
      id:         `tmp_${Date.now()}`,
      user_id:    user?.id,
      user_name:  user?.name || 'You',
      message:    text,
      created_at: new Date().toISOString(),
      _pending:   true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    setSending(true);

    try {
      console.log('Sending message:', text);
      const saved = await apiRequest('/posts', 'POST', {
        message: text,           // only field backend expects
      });
      // Replace optimistic with real record
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? { ...saved, _pending: false } : m))
      );
    } catch (e) {
      console.log('API ERROR:', e.message);
      Alert.alert('Send Failed', e.message || 'Message could not be sent.');
      // Remove the optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(text); // restore input
    } finally {
      setSending(false);
    }
  };

  const handleLongPress = (msg) => {
    // Do not allow deletion of already-deleted messages
    if (msg.is_deleted) return;

    // Use currentUserId (already normalised to String) for consistent comparison
    const isMine = currentUserId && String(msg.user_id) === currentUserId;
    if (!isMine) return;

    Alert.alert(
      'Delete Message',
      'Delete this message for everyone?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMessage(msg.id),
        },
      ]
    );
  };

  const deleteMessage = async (id) => {
    // Optimistic soft-delete — update UI immediately without removing the row
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, is_deleted: true, deleted_by: 'user', message: 'This message was deleted' }
          : m
      )
    );
    try {
      await apiRequest(`/posts/${id}`, 'DELETE');
    } catch (err) {
      console.log('Delete error:', err.message || err);
      // Re-fetch so the correct server state is reflected if the call failed
      fetchMessages();
    }
  };

  // Build render list with date separators injected
  const renderList = [];
  let lastDate = null;
  messages.forEach((msg, idx) => {
    const msgDate = msg.created_at
      ? new Date(normalizeTS(msg.created_at))
          .toLocaleDateString('en-IN', { timeZone: IST })
      : null;
    if (msgDate && msgDate !== lastDate) {
      renderList.push({ _type: 'separator', id: `sep_${msgDate}`, label: dateSepLabel(msg.created_at) });
      lastDate = msgDate;
    }
    const prev = messages[idx - 1];
    const showAvatar = !prev || prev.user_name !== msg.user_name ||
      (msg.created_at && prev.created_at &&
        new Date(normalizeTS(msg.created_at)) - new Date(normalizeTS(prev.created_at)) > 5 * 60 * 1000);
    renderList.push({ ...msg, _type: 'message', _showAvatar: showAvatar });
  });

  const myName = String(user?.name || '');

  const renderItem = ({ item }) => {
    if (item._type === 'separator') {
      return <DateSeparator key={item.id} label={item.label} />;
    }
    // Strict UUID comparison — name-based fallback removed (unsafe for delete guard)
    const isMyMessage = currentUserId && String(item.user_id) === currentUserId;

    return (
      <MessageBubble
        key={item.id}
        msg={item}
        isMine={isMyMessage}
        showAvatar={item._showAvatar}
        onLongPress={handleLongPress}
      />
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <AppHeader
        title="Discussion"
        subtitle="Connect with students across campus"
        
      />

      {/* ── Content area ── */}
      <KeyboardAvoidingView
        style={s.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loading ? (
          <View style={s.centerWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={s.loadTxt}>Loading messages…</Text>
          </View>
        ) : error ? (
          <View style={s.centerWrap}>
            <Ionicons name="cloud-offline-outline" size={40} color={COLORS.textMuted} />
            <Text style={s.errorTxt}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={fetchMessages}>
              <Text style={s.retryTxt}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={renderList}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={s.msgList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} />
                <Text style={s.emptyTitle}>Start the conversation</Text>
                <Text style={s.emptyBody}>
                  Ask for previous year papers, notes, or anything study-related!
                </Text>
              </View>
            }
          />
        )}

        {/* ── Input bar ── */}
        <View style={s.inputBar}>
          <View style={[s.inputWrap, sending && { opacity: 0.7 }]}>
            <TextInput
              style={s.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type a message…"
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={1000}
              editable={!sending}
              returnKeyType="default"
            />
          </View>
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || sending) && s.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
            activeOpacity={0.85}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.secondary} />
            ) : (
              <Ionicons name="send" size={18} color={COLORS.secondary} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.bgLight },

  // Header badge (passed as rightComponent)
  headerBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  headerBadgeTxt:  { fontSize: FONTS.sizes.xs, color: COLORS.secondary, fontWeight: '700' },

  // Chat area
  chatArea:        { flex: 1 },
  msgList:         { paddingHorizontal: SPACING.sm, paddingTop: SPACING.sm, paddingBottom: 12 },

  // Loading / error states
  centerWrap:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.sm, padding: SPACING.xl },
  loadTxt:         { color: COLORS.textMuted, fontSize: FONTS.sizes.md, marginTop: SPACING.sm },
  errorTxt:        { color: COLORS.danger, fontSize: FONTS.sizes.md, textAlign: 'center' },
  retryBtn:        { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: 10, marginTop: SPACING.sm },
  retryTxt:        { color: COLORS.secondary, fontWeight: '700' },

  // Empty state
  emptyWrap:       { alignItems: 'center', paddingTop: 60, gap: SPACING.sm, paddingHorizontal: SPACING.xl },
  emptyTitle:      { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.textPrimary },
  emptyBody:       { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },

  // Date separator
  dateSep:         { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.md, gap: SPACING.sm },
  dateLine:        { flex: 1, height: 1, backgroundColor: COLORS.cardBorder },
  dateLabel:       { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', paddingHorizontal: 4 },

  // Message row
  msgRow:          { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4, paddingHorizontal: 4 },
  msgRowMine:      { flexDirection: 'row-reverse' },

  // Avatar
  avatar:          { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 2, marginRight: 6 },
  avatarHidden:    { opacity: 0 },
  avatarTxt:       { color: '#fff', fontWeight: '800', fontSize: 12 },
  avatarSpacer:    { width: 38 },

  // Bubble
  bubble:          { maxWidth: '76%', borderRadius: 16, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6, ...SHADOWS.card },
  bubbleOther:     { backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.cardBorder, borderBottomLeftRadius: 4 },
  bubbleMine:      { backgroundColor: COLORS.primary, borderBottomRightRadius: 4, marginRight: 6 },
  bubbleName:      { fontSize: 11, fontWeight: '800', marginBottom: 3, letterSpacing: 0.2 },
  bubbleText:      { fontSize: FONTS.sizes.md, color: COLORS.textPrimary, lineHeight: 20 },
  bubbleTextMine:  { color: COLORS.secondary },
  bubbleTime:      { fontSize: 10, color: COLORS.textMuted, marginTop: 4, textAlign: 'right' },
  bubbleTimeMine:  { color: 'rgba(255,255,255,0.6)' },

  // ── Deleted message styles ─────────────────────────────────────────────────
  bubbleOtherDeleted: { backgroundColor: '#F3F3F3', borderColor: '#E0E0E0' },
  bubbleMineDeleted:  { backgroundColor: '#C8C8C8' },
  avatarDeleted:      { opacity: 0.4 },
  deletedRow:         { flexDirection: 'row', alignItems: 'center', gap: 5 },
  deletedText:        { fontSize: FONTS.sizes.sm, color: '#A0A0A0', fontStyle: 'italic', lineHeight: 18, flex: 1 },
  bubbleTimeDeleted:  { color: '#B0B0B0' },
  // ──────────────────────────────────────────────────────────────────────────

  // Input bar
  inputBar:        { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, paddingBottom: Platform.OS === 'ios' ? 24 : SPACING.sm, backgroundColor: COLORS.cardBg, borderTopWidth: 1, borderTopColor: COLORS.cardBorder },
  inputWrap:       { flex: 1, backgroundColor: COLORS.bgLight, borderRadius: 22, borderWidth: 1, borderColor: COLORS.cardBorder, paddingHorizontal: SPACING.md, paddingVertical: Platform.OS === 'ios' ? 10 : 8, minHeight: 44, justifyContent: 'center' },
  input:           { fontSize: FONTS.sizes.md, color: COLORS.textPrimary, maxHeight: 100, lineHeight: 20 },
  sendBtn:         { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', ...SHADOWS.button },
  sendBtnDisabled: { opacity: 0.45 },
});