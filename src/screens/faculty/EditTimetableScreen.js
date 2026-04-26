// src/screens/faculty/EditTimetableScreen.js
//
// Full CRUD edit screen for the faculty timetable.
// Reached by pressing "Edit" in FacultyTimetableScreen's header.
//
// Features:
//   • Lists all classes grouped by day, sorted chronologically
//   • "Edit" per card   → EntryModal pre-filled  → PUT  /timetable/faculty/{slot_id}
//   • "Delete" per card → confirmation alert      → DELETE /timetable/faculty/{slot_id}
//   • "Add Class" FAB   → EntryModal blank        → POST /timetable/faculty/me
//   • Refreshes list after every successful mutation

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, StatusBar,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../../constants/theme';
import {
  fetchFacultyTimetable,
  addTimetableEntry,
  editTimetableEntry,
  deleteTimetableEntry,
} from '../../services/timetableService';

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PALETTE = ['#3498DB', '#9B59B6', '#27AE60', '#E67E22', '#E74C3C', '#1ABC9C'];
const getColor = (i) => PALETTE[i % PALETTE.length];

const CLASS_TIMINGS = ['9:00 - 10:40', '10:40 - 12:20', '1:30 - 3:10'];

const DAY_MAP = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

const DAY_FULL_MAP = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
  Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};

// ─── Frontend sort – safety layer ─────────────────────────────────────────────
const getTimeInMinutes = (slot = '') => {
  try {
    const start = slot.trim().split(/\s*[-–]\s*/)[0].trim();
    const [h, m] = start.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
  } catch { /* ignore */ }
  return 0;
};

const sortByTime = (data) =>
  [...data].sort((a, b) =>
    getTimeInMinutes(a.time_slot || a.time || '') -
    getTimeInMinutes(b.time_slot || b.time || '')
  );

// ─── Field — defined OUTSIDE EntryModal so it is never re-created on re-render.
// Re-creating it inside the component body causes React to unmount/remount the
// TextInput on every keystroke, which kills focus and closes the keyboard.
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
  // 'duration' removed — not a backend field; was causing 422 errors.
  const blank = { subject: '', time: '', year: '', section: '' };
  const [form, setForm]     = useState(blank);
  const [saving, setSaving] = useState(false);

  // Only reset the form when editData changes (i.e. when a different entry is
  // opened for editing, or when the modal switches between Add and Edit mode).
  // Removing 'visible' from deps prevents the form from being wiped while the
  // modal is already open and the user is actively typing.
  useEffect(() => {
    if (visible) {
      setForm(editData ? {
        subject: editData.subject   || '',
        time:    editData.time_slot || editData.time || '',
        year:    String(editData.year    || ''),
        section: editData.section  || '',
        // 'duration' intentionally excluded — not supported by backend
      } : blank);
    }
  }, [editData]); // ← 'visible' intentionally omitted

  // Stable setter passed down to Field — avoids inline arrow re-creation
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
      {/* KeyboardAvoidingView stops the keyboard from overlapping inputs */}
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

            <Field label="Year"    fKey="year"    placeholder="e.g. 4"     keyboard="numeric" form={form} onChangeText={handleChange} />
            <Field label="Section" fKey="section" placeholder="e.g. CSE06"                    form={form} onChangeText={handleChange} />
            {/* 'Duration' field removed — not a backend-supported field */}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

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
export default function EditTimetableScreen({ navigation }) {
  const [activeDay,  setActiveDay]  = useState(DAYS[0]);
  const [timetable,  setTimetable]  = useState({});
  const [loading,    setLoading]    = useState(true);
  const [entryModal, setEntryModal] = useState(false);
  const [editEntry,  setEditEntry]  = useState(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadTimetable = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFacultyTimetable();
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
      console.log('[EditTimetableScreen] fetch error:', err);
      setTimetable({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTimetable(); }, [loadTimetable]);

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  const handleSave = useCallback(async (entry) => {
    // Build a clean payload matching the backend schema exactly.
    // 'duration' is intentionally omitted — the backend does not accept it
    // and its presence was previously causing 422 Unprocessable Entity errors.
    const payload = {
      subject:   entry.subject,
      time_slot: entry.time,           // UI uses 'time'; backend expects 'time_slot'
      year:      entry.year ? Number(entry.year) : undefined,
      section:   entry.section,
      day:       entry.day,            // full day name e.g. "Monday"
    };

    if (entry.id) {
      // UPDATE — PUT /timetable/faculty/{slot_id}
      // entry.id is the slot PK, not faculty_id
      await editTimetableEntry(entry.id, payload);
    } else {
      // CREATE — POST /timetable/faculty/me
      // backend derives faculty_id from the JWT; no need to pass it
      await addTimetableEntry(payload);
    }

    // Always refetch so the UI reflects the latest server state
    await loadTimetable();
  }, [loadTimetable]);

  const handleDelete = useCallback((entry) => {
    Alert.alert(
      'Delete Class',
      `Remove "${entry.subject}" from timetable?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // DELETE /timetable/faculty/{slot_id}
              // entry.id is the slot PK — NOT entry.faculty_id
              await deleteTimetableEntry(entry.id);
              await loadTimetable();
            } catch (err) {
              Alert.alert('Error', err?.message || 'Failed to delete.');
            }
          },
        },
      ]
    );
  }, [loadTimetable]);

  const classes = sortByTime(timetable[activeDay] || []);

  return (
    <View style={st.container}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={st.header}>
        <View style={st.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.secondary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={st.headerTitle}>Edit Timetable</Text>
            <Text style={st.headerSub}>Add, edit or remove classes</Text>
          </View>
          {/* Add button in header */}
          <TouchableOpacity
            style={st.addHeaderBtn}
            onPress={() => { setEditEntry(null); setEntryModal(true); }}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color={COLORS.primary} />
            <Text style={st.addHeaderBtnTxt}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Day tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.dayRow}
        >
          {DAYS.map(day => (
            <TouchableOpacity
              key={day}
              style={[st.dayChip, activeDay === day && st.dayChipActive]}
              onPress={() => setActiveDay(day)}
            >
              <Text style={[st.dayChipTxt, activeDay === day && st.dayChipActiveTxt]}>
                {day}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* ── Class list ── */}
      {loading ? (
        <View style={st.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={st.body}
          showsVerticalScrollIndicator={false}
        >
          {classes.length === 0 ? (
            <View style={st.emptyWrap}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
              <Text style={st.emptyTitle}>No Classes</Text>
              <Text style={st.emptySub}>Tap "Add" to create a class for this day.</Text>
            </View>
          ) : (
            classes.map((cls, i) => {
              const color       = getColor(i);
              const displayTime = cls.time_slot || cls.time || '';
              const displayYear = cls.year != null ? `Year ${cls.year}` : '';
              return (
                <View key={cls.id || i} style={st.card}>
                  <View style={[st.cardBar, { backgroundColor: color }]} />
                  <View style={st.cardBody}>

                    {/* Info row */}
                    <View style={st.cardRow}>
                      <View style={[st.cardIcon, { backgroundColor: color + '22' }]}>
                        <Ionicons name="book-outline" size={20} color={color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.subject}>{cls.subject}</Text>
                        <Text style={st.meta}>
                          {displayYear}{cls.section ? ` · ${cls.section}` : ''}
                        </Text>
                      </View>
                    </View>

                    {/* Time chip */}
                    <View style={st.chipRow}>
                      <View style={st.chip}>
                        <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
                        <Text style={st.chipTxt}>{displayTime}</Text>
                      </View>
                    </View>

                    {/* Action buttons */}
                    <View style={st.actions}>
                      <TouchableOpacity
                        style={st.editBtn}
                        onPress={() => { setEditEntry(cls); setEntryModal(true); }}
                      >
                        <Ionicons name="create-outline" size={13} color={COLORS.primary} />
                        <Text style={st.editBtnTxt}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={st.delBtn}
                        onPress={() => handleDelete(cls)}
                      >
                        <Ionicons name="trash-outline" size={13} color={COLORS.danger} />
                        <Text style={st.delBtnTxt}>Delete</Text>
                      </TouchableOpacity>
                    </View>

                  </View>
                </View>
              );
            })
          )}

          {/* Add Another footer button */}
          {classes.length > 0 && (
            <TouchableOpacity
              style={st.addBtnBottom}
              onPress={() => { setEditEntry(null); setEntryModal(true); }}
            >
              <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
              <Text style={st.addBtnTxt}>Add Another Class</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Floating Add button */}
      <TouchableOpacity
        style={st.fab}
        onPress={() => { setEditEntry(null); setEntryModal(true); }}
        activeOpacity={0.88}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Entry Modal */}
      <EntryModal
        visible={entryModal}
        onClose={() => { setEntryModal(false); setEditEntry(null); }}
        onSave={handleSave}
        editData={editEntry}
        activeDay={activeDay}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.bgLight },
  header:         { paddingTop: 62, paddingBottom: SPACING.sm, paddingHorizontal: SPACING.lg },
  headerRow:      { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  backBtn:        { width: 38, height: 38, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle:    { fontSize: FONTS.sizes.xl, fontWeight: '900', color: COLORS.secondary },
  headerSub:      { fontSize: FONTS.sizes.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  addHeaderBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.accent, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 9 },
  addHeaderBtnTxt:{ fontSize: FONTS.sizes.sm, fontWeight: '800', color: COLORS.primary },

  dayRow:          { gap: SPACING.sm, paddingBottom: SPACING.md, paddingTop: 4 },
  dayChip:         { paddingHorizontal: 18, paddingVertical: 10, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center' },
  dayChipActive:   { backgroundColor: COLORS.accent },
  dayChipTxt:      { fontSize: FONTS.sizes.sm, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  dayChipActiveTxt:{ color: COLORS.primary },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body:        { padding: SPACING.md, paddingBottom: 120, gap: SPACING.sm },

  emptyWrap:  { alignItems: 'center', paddingTop: 80, gap: SPACING.sm },
  emptyTitle: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.textPrimary },
  emptySub:   { fontSize: FONTS.sizes.md, color: COLORS.textMuted, textAlign: 'center' },

  card:    { backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.card, borderWidth: 1, borderColor: COLORS.cardBorder },
  cardBar: { height: 5 },
  cardBody:{ padding: SPACING.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  cardIcon:{ width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  subject: { fontSize: FONTS.sizes.md, fontWeight: '800', color: COLORS.textPrimary },
  meta:    { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  chipRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.bgLight, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  chipTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontWeight: '600' },

  actions:   { flexDirection: 'row', gap: SPACING.sm },
  editBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.primary },
  editBtnTxt:{ fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.primary },
  delBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.danger },
  delBtnTxt: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.danger },

  addBtnBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 4, paddingVertical: 12, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.primary },
  addBtnTxt:    { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary },

  fab: { position: 'absolute', bottom: 30, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.button },
});