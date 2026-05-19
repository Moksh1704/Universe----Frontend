// src/screens/faculty/TimetableScreen.js
//
// 2-MODE timetable screen.
// ─ VIEW MODE (default): clean read-only display, no edit/delete controls.
// ─ EDIT MODE (toggled via header button or FAB): inline add/edit/delete.
// ─ FAB in View Mode → switches to Edit Mode.
// ─ Accordion layout: all days visible, one open at a time.
// ─ No navigation to EditTimetableScreen needed; all CRUD is inline.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../../constants/theme';
import {
  fetchFacultyTimetable,
  addTimetableEntry,
  editTimetableEntry,
  deleteTimetableEntry,
} from '../../services/timetableService';

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Tints — match AttendanceScreen patterns exactly ─────────────────────────
const tint12     = COLORS.primary + '12'; // icon bg, chip bg, day header open bg
const tint14     = COLORS.primary + '14'; // badge/pill bg
const tint18     = COLORS.primary + '18'; // edit banner bg
const tint30     = COLORS.primary + '30'; // borders, banner border
const tint35     = COLORS.primary + '35'; // chip border

const CLASS_TIMINGS = ['9:00 - 10:40', '10:40 - 12:20', '1:30 - 3:10'];

const DAY_MAP = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

const DAY_FULL_MAP = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
  Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};

const todayIdx = new Date().getDay();
const todayKey = DAYS[todayIdx === 0 ? 0 : todayIdx - 1] || 'Mon';

// ─── Time sort ────────────────────────────────────────────────────────────────
const parseTime = (slot = '') => {
  try {
    const start = (slot || '').split(' - ')[0].trim();
    let [h, m] = start.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return 0;
    if (h < 8) h += 12;
    return h * 60 + m;
  } catch { return 0; }
};

const sortByTime = (data) =>
  [...data].sort((a, b) =>
    parseTime(a.time_slot || a.time || '') -
    parseTime(b.time_slot || b.time || '')
  );

// ─── Field component (defined outside to avoid remount on keystroke) ──────────
const Field = ({ label, fKey, placeholder, keyboard, form, onChangeText }) => (
  <View style={em.group}>
    <Text style={em.label}>{label}</Text>
    <TextInput
      style={em.input}
      value={form[fKey]}
      onChangeText={v => onChangeText(fKey, v)}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textMuted}
      keyboardType={keyboard || 'default'}
    />
  </View>
);

// ─── Entry Modal (Add / Edit) ─────────────────────────────────────────────────
const EntryModal = ({ visible, onClose, onSave, editData, activeDay }) => {
  const blank = { subject: '', time: '', year: '', section: '' };
  const [form,   setForm]   = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(editData ? {
        subject: editData.subject   || '',
        time:    editData.time_slot || editData.time || '',
        year:    String(editData.year    || ''),
        section: editData.section  || '',
      } : blank);
    }
  }, [editData]); // 'visible' intentionally omitted to avoid wiping mid-type

  const handleChange = useCallback((key, value) => {
    setForm(f => ({ ...f, [key]: value }));
  }, []);

  const save = async () => {
    if (!form.subject.trim() || !form.time.trim()) {
      Alert.alert('Required', 'Subject and time slot are required.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, id: editData?.id, day: DAY_FULL_MAP[activeDay] || activeDay });
      onClose();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to save entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={em.container}>
          <View style={em.head}>
            <TouchableOpacity onPress={onClose}>
              <Text style={em.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={em.title}>{editData ? 'Edit Class' : 'Add Class'}</Text>
            <TouchableOpacity onPress={save} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Text style={em.saveBtn}>Save</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={em.body}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
          >
            <Field
              label="Subject *" fKey="subject"
              placeholder="e.g. Data Structures"
              form={form} onChangeText={handleChange}
            />

            {/* Time slot picker */}
            <View style={em.group}>
              <Text style={em.label}>Time Slot *</Text>
              {CLASS_TIMINGS.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[em.pill, form.time === t && em.pillActive]}
                  onPress={() => setForm(f => ({ ...f, time: t }))}
                >
                  <Text style={[em.pillTxt, form.time === t && em.pillActiveTxt]}>{t}</Text>
                </TouchableOpacity>
              ))}
              <TextInput
                style={[em.input, { marginTop: 8 }]}
                value={form.time}
                onChangeText={v => handleChange('time', v)}
                placeholder="Or type custom slot e.g. 14:00 - 15:40"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <Field label="Year"    fKey="year"    placeholder="e.g. 4"      keyboard="numeric" form={form} onChangeText={handleChange} />
            <Field label="Section" fKey="section" placeholder="e.g. CSE06"                     form={form} onChangeText={handleChange} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Modal Styles ─────────────────────────────────────────────────────────────
const em = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },
  head:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, paddingTop: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  cancel:    { fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  title:     { fontSize: FONTS.sizes.md, fontWeight: '800', color: COLORS.textPrimary },
  saveBtn:   { fontSize: FONTS.sizes.md, color: COLORS.primary, fontWeight: '800' },
  body:      { padding: SPACING.lg, gap: SPACING.sm },
  group:     { gap: 5 },
  label:     { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textPrimary },
  input:     { backgroundColor: COLORS.cardBg, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.cardBorder, paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: FONTS.sizes.md, color: COLORS.textPrimary },
  pill:          { paddingVertical: 10, paddingHorizontal: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.cardBorder, marginBottom: 6, backgroundColor: COLORS.cardBg },
  pillActive:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillTxt:       { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary },
  pillActiveTxt: { color: COLORS.secondary, fontWeight: '700' },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FacultyTimetableScreen({ navigation }) {
  const { user } = useAuth();

  const [openDay,    setOpenDay]    = useState(todayKey);
  const [timetable,  setTimetable]  = useState({});
  const [loading,    setLoading]    = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [entryModal, setEntryModal] = useState(false);
  const [editEntry,  setEditEntry]  = useState(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadTimetable = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFacultyTimetable();
      console.log('[TimetableScreen] response:', data);

      if (data?.days) {
        setTimetable(data.days);
      } else if (Array.isArray(data)) {
        const grouped = {};
        DAYS.forEach(d => { grouped[d] = []; });
        data.forEach(e => {
          const shortDay = DAY_MAP[e.day || ''] || (e.day || '');
          if (!grouped[shortDay]) grouped[shortDay] = [];
          grouped[shortDay].push(e);
        });
        setTimetable(grouped);
      } else {
        setTimetable({});
      }
    } catch (err) {
      console.log('[TimetableScreen] fetch error:', err);
      setTimetable({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTimetable();
    const unsubscribe = navigation.addListener('focus', loadTimetable);
    return unsubscribe;
  }, [navigation, loadTimetable]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async (entry) => {
    const payload = {
      subject:   entry.subject,
      time_slot: entry.time,
      year:      entry.year ? Number(entry.year) : undefined,
      section:   entry.section,
      day:       entry.day,
    };
    if (entry.id) {
      await editTimetableEntry(entry.id, payload);
    } else {
      await addTimetableEntry(payload);
    }
    await loadTimetable();
  }, [loadTimetable]);

  const handleDelete = useCallback((cls) => {
    Alert.alert(
      'Delete Class',
      `Remove "${cls.subject}" from timetable?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTimetableEntry(cls.id);
              await loadTimetable();
            } catch (err) {
              Alert.alert('Error', err?.message || 'Failed to delete.');
            }
          },
        },
      ]
    );
  }, [loadTimetable]);

  return (
    <View style={st.container}>

      {/* ── Header — matches AttendanceScreen exactly ── */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryMid]} style={st.header}>
        <Text style={st.headerTitle}>Timetable</Text>
        <Text style={st.headerSub}>{user?.name || 'My Schedule'}</Text>
      </LinearGradient>

      {/* ── Edit mode banner — matches warnBanner pattern from AttendanceScreen ── */}
      {isEditMode && (
        <View style={st.editBanner}>
          <Ionicons name="create-outline" size={14} color={COLORS.primary} />
          <Text style={st.editBannerTxt}>Editing — tap a card to edit, tap + to add</Text>
        </View>
      )}

      {loading ? (
        <View style={st.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={st.body}
          showsVerticalScrollIndicator={false}
        >
          {DAYS.map(day => {
            const classes = sortByTime(timetable[day] || []);
            const isOpen  = openDay === day;
            const isToday = day === todayKey;

            return (
              <View key={day} style={st.accordionSection}>

                {/* ── Day Header ── */}
                <TouchableOpacity
  style={[st.dayHeader, isOpen && st.dayHeaderOpen]}
  onPress={() => setOpenDay(isOpen ? null : day)}
  activeOpacity={0.8}
>
  <View style={st.dayHeaderLeft}>
    {isOpen && <View style={st.dayIndicator} />}
    <Text style={[st.dayHeaderName, isOpen && st.dayHeaderNameOpen]}>
      {day}
    </Text>
                    {isToday && (
                      <View style={st.todayBadge}>
                        <Text style={st.todayBadgeTxt}>Today</Text>
                      </View>
                    )}
                  </View>
                  <View style={st.dayHeaderRight}>
                    <Text style={st.classCountTxt}>
                      {classes.length} {classes.length === 1 ? 'class' : 'classes'}
                    </Text>
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={isOpen ? COLORS.primary : COLORS.textMuted}
                    />
                  </View>
                </TouchableOpacity>

                {/* ── Expanded Content ── */}
                {isOpen && (
                  <View style={st.accordionBody}>
                    {classes.length === 0 ? (
                      <View style={st.emptyWrap}>
                        <Ionicons name="cafe-outline" size={40} color={COLORS.textMuted} />
                        <Text style={st.emptyTitle}>No Classes</Text>
                        <Text style={st.emptySub}>
                          {isEditMode ? 'Tap + to add a class.' : 'Enjoy your free day!'}
                        </Text>
                      </View>
                    ) : (
                      classes.map((cls, i) => {
                        const displayTime = cls.time_slot || cls.time || '';
                        const displayYear = cls.year != null ? `Year ${cls.year}` : '';
                        const metaParts   = [cls.section, displayYear].filter(Boolean);

                        return (
                          <TouchableOpacity
                            key={cls.id || i}
                            style={[st.card, isEditMode && st.cardEditMode]}
                            activeOpacity={isEditMode ? 0.75 : 1}
                            onPress={
                              isEditMode
                                ? () => { setEditEntry(cls); setEntryModal(true); }
                                : undefined
                            }
                          >
                            {/* Left accent bar */}
                            <View style={st.cardAccent} />

                            <View style={st.cardBody}>

                              {/* TOP: Subject name + optional delete */}
                              <View style={st.cardTopRow}>
                                <View style={{ flex: 1 }}>
                                  <Text style={st.subject} numberOfLines={1}>
                                    {cls.subject}
                                  </Text>
                                  {metaParts.length > 0 && (
                                    <Text style={st.meta}>
                                      {metaParts.join(' · ')}
                                    </Text>
                                  )}
                                </View>
                                {isEditMode && (
                                  <TouchableOpacity
                                    style={st.delIconBtn}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    onPress={() => handleDelete(cls)}
                                  >
                                    <Ionicons name="trash-outline" size={17} color={COLORS.textMuted} />
                                  </TouchableOpacity>
                                )}
                              </View>

                              {/* DIVIDER */}
                              <View style={st.cardDivider} />

                              {/* BOTTOM: Time (left) + Room or hint (right) */}
                              <View style={st.cardBottomRow}>
                                <Text style={st.cardInfoText}>{displayTime}</Text>
                                {cls.room ? (
                                  <Text style={st.cardInfoText}>{cls.room}</Text>
                                ) : isEditMode ? (
                                  <Text style={st.cardHintText}>Tap to edit</Text>
                                ) : null}
                              </View>

                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}

                    {/* Add Class button inside expanded day — edit mode only */}
                    {isEditMode && (
                      <TouchableOpacity
                        style={st.addClassBtn}
                        onPress={() => { setEditEntry(null); setEntryModal(true); }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
                        <Text style={st.addClassTxt}>Add Class</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── FAB: View Mode → enter Edit Mode ── */}
      {!isEditMode && (
        <TouchableOpacity
          style={st.fab}
          onPress={() => setIsEditMode(true)}
          activeOpacity={0.88}
        >
          <Ionicons name="create-outline" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ── FAB: Edit Mode → exit Edit Mode ── */}
      {isEditMode && (
        <TouchableOpacity
          style={[st.fab, st.fabDone]}
          onPress={() => setIsEditMode(false)}
          activeOpacity={0.88}
        >
          <Ionicons name="checkmark" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ── Entry Modal ── */}
      <EntryModal
        visible={entryModal}
        onClose={() => { setEntryModal(false); setEditEntry(null); }}
        onSave={handleSave}
        editData={editEntry}
        activeDay={openDay}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },

  // ── Header — exact match to AttendanceScreen s.header ──
  header:      { paddingTop: 62, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.lg },
  headerTitle: { fontSize: FONTS.sizes.xxxl, fontWeight: '900', color: COLORS.secondary },
  headerSub:   { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.6)', marginTop: 4 },

  // ── Edit mode banner ──
  editBanner:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tint18, borderBottomWidth: 1, borderBottomColor: tint30, paddingHorizontal: SPACING.md, paddingVertical: 8 },
  editBannerTxt: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: COLORS.primary },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body:        { padding: SPACING.md, paddingBottom: 110, gap: SPACING.sm },

  // ── Accordion ──
accordionSection: { marginBottom: 14 },

// Closed day header
dayHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: COLORS.cardBg,
  borderRadius: RADIUS.lg,
  paddingHorizontal: SPACING.md,
  paddingVertical: 14,
  borderWidth: 1,
  borderColor: COLORS.cardBorder,
  ...SHADOWS.card,
},
// Open day header — border only, no background fill
dayHeaderOpen: {
  backgroundColor: COLORS.cardBg,
  borderColor: COLORS.primary,
  borderWidth: 1.5,
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
  borderBottomWidth: 0,
  shadowOpacity: 0.04,
  elevation: 2,
},
// Left indicator bar shown when day is open
dayIndicator: {
  width: 3,
  height: 16,
  borderRadius: 2,
  backgroundColor: COLORS.primary,
  marginRight: 8,
},
dayHeaderLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
dayHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },

// Closed: muted; Open: emphasis via dayHeaderNameOpen
dayHeaderName:     { fontSize: 15, fontWeight: '600', color: COLORS.textMuted },
dayHeaderNameOpen: { color: COLORS.textPrimary, fontWeight: '700' },

  // Today badge
  todayBadge:    { backgroundColor: tint14, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: tint35 },
  todayBadgeTxt: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.primary },

  // Class count text (inline, no chip background)
  classCountTxt: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: COLORS.textMuted },

  // Accordion body
 // Accordion body — clean card bg, no tinted fill
accordionBody: {
  backgroundColor: COLORS.cardBg,
  borderWidth: 1.5,
  borderTopWidth: 0,
  borderColor: COLORS.primary,
  borderBottomLeftRadius: RADIUS.lg,
  borderBottomRightRadius: RADIUS.lg,
  padding: 10,
  gap: 8,
  shadowOpacity: 0.04,
  elevation: 2,
},

  // ── Empty state ──
  emptyWrap:  { alignItems: 'center', paddingVertical: 28, gap: SPACING.sm },
  emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.textPrimary },
  emptySub:   { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, textAlign: 'center' },

  // ── Cards ──
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  cardEditMode: { borderColor: tint30, backgroundColor: tint12 },

  // Left accent bar
  cardAccent: { width: 4, backgroundColor: COLORS.primary },

  // Card body — clean padding, structured layout
  cardBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  // Top row: subject + optional delete icon
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },

  // Hairline divider between primary and secondary info
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 8,
  },

  // Bottom row: time (left) + room (right)
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Level 1 — Subject name
  subject: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.1,
    lineHeight: 21,
  },

  // Level 2 — Section · Year
  meta: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Level 3 — Time, Room
  cardInfoText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },

  // Edit hint in bottom row
  cardHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Delete button
  delIconBtn: { padding: 4 },

  // ── Add Class button ──
  addClassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: tint35,
    backgroundColor: tint12,
    marginTop: 2,
  },
  addClassTxt: { fontSize: FONTS.sizes.sm, fontWeight: '800', color: COLORS.primary },

  // ── FAB ──
  fab:     { position: 'absolute', bottom: 30, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.button },
  fabDone: { backgroundColor: COLORS.textMuted },
});