// src/screens/faculty/TimetableScreen.js
//
// VIEW-ONLY timetable screen.
// ─ No edit / delete / add controls visible here.
// ─ "Edit" button in the header navigates to EditTimetableScreen.
// ─ sortByTime() applied AFTER day-filtering as a safe fallback.
//   Uses parseTime() with afternoon-hour correction (h < 8 → h + 12).
//
// REMOVED: EntryModal, UploadSheet, handleSave, handleDelete,
//          all "Edit" / "Delete" / "Add Class" card actions.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../../constants/theme';
import { fetchFacultyTimetable } from '../../services/timetableService';

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PALETTE = ['#3498DB', '#9B59B6', '#27AE60', '#E67E22', '#E74C3C', '#1ABC9C'];
const getColor = (i) => PALETTE[i % PALETTE.length];

const DAY_MAP = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

const todayIdx = new Date().getDay();
const todayKey = DAYS[todayIdx === 0 ? 0 : todayIdx - 1] || 'Mon';

// ─── Frontend sort – safe fallback after day-filtering ────────────────────────
// Converts "9:00 - 10:40" → 540  and  "1:30 - 3:10" → 810 (afternoon fix).
// If the backend returns correctly sorted data this is a no-op (stable sort).
const parseTime = (slot = '') => {
  try {
    const start = (slot || '').split(' - ')[0].trim();
    let [h, m] = start.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return 0;
    if (h < 8) h += 12; // treat ambiguous low hours as PM (1→13, 2→14 …)
    return h * 60 + m;
  } catch { return 0; }
};

const sortByTime = (data) =>
  [...data].sort((a, b) =>
    parseTime(a.time_slot || a.time || '') -
    parseTime(b.time_slot || b.time || '')
  );

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FacultyTimetableScreen({ navigation }) {
  const { user } = useAuth();
  const [activeDay, setActiveDay] = useState(todayKey);
  const [timetable, setTimetable] = useState({});
  const [loading,   setLoading]   = useState(true);

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
    // Reload when navigating back from EditTimetableScreen
    const unsubscribe = navigation.addListener('focus', loadTimetable);
    return unsubscribe;
  }, [navigation, loadTimetable]);

  // Apply frontend sort as safety layer on top of backend-sorted data
  const classes = sortByTime(timetable[activeDay] || []);

  return (
    <View style={st.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={st.header}>
        <View style={st.headerRow}>
          <View>
            <Text style={st.headerTitle}>Timetable</Text>
            {user?.name ? <Text style={st.headerSub}>{user.name}</Text> : null}
          </View>

          {/* ── Edit button → navigates to EditTimetableScreen ── */}
          <TouchableOpacity
            style={st.editHeaderBtn}
            onPress={() => navigation.navigate('EditTimetable')}
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={16} color={COLORS.primary} />
            <Text style={st.editHeaderBtnTxt}>Edit</Text>
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
              {day === todayKey && (
                <View style={[st.todayDot, activeDay === day && { backgroundColor: COLORS.primary }]} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

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
              <Ionicons name="cafe-outline" size={52} color={COLORS.textMuted} />
              <Text style={st.emptyTitle}>No Classes</Text>
              <Text style={st.emptySub}>Enjoy your free day!</Text>
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

                    {/* Subject + meta row */}
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
                      {cls.duration ? (
                        <View style={st.durBg}>
                          <Text style={st.durTxt}>{cls.duration}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Chip row – time slot (+ room if present) */}
                    <View style={st.chipRow}>
                      <View style={st.chip}>
                        <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
                        <Text style={st.chipTxt}>{displayTime}</Text>
                      </View>
                      {cls.room ? (
                        <View style={st.chip}>
                          <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
                          <Text style={st.chipTxt}>{cls.room}</Text>
                        </View>
                      ) : null}
                    </View>

                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.bgLight },
  header:           { paddingTop: 62, paddingBottom: SPACING.sm, paddingHorizontal: SPACING.lg },
  headerRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  headerTitle:      { fontSize: FONTS.sizes.xxxl, fontWeight: '900', color: COLORS.secondary },
  headerSub:        { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.6)', marginTop: 3 },

  // Header Edit button – same pill style as old Upload button
  editHeaderBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.accent, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 9 },
  editHeaderBtnTxt: { fontSize: FONTS.sizes.sm, fontWeight: '800', color: COLORS.primary },

  dayRow:           { gap: SPACING.sm, paddingBottom: SPACING.md, paddingTop: 4 },
  dayChip:          { paddingHorizontal: 18, paddingVertical: 10, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', position: 'relative' },
  dayChipActive:    { backgroundColor: COLORS.accent },
  dayChipTxt:       { fontSize: FONTS.sizes.sm, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  dayChipActiveTxt: { color: COLORS.primary },
  todayDot:         { position: 'absolute', bottom: 4, width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.accent },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body:        { padding: SPACING.md, paddingBottom: 110, gap: SPACING.sm },

  emptyWrap:  { alignItems: 'center', paddingTop: 80, gap: SPACING.sm },
  emptyTitle: { fontSize: FONTS.sizes.xl,  fontWeight: '800', color: COLORS.textPrimary },
  emptySub:   { fontSize: FONTS.sizes.md,  color: COLORS.textMuted },

  card:    { backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.card, borderWidth: 1, borderColor: COLORS.cardBorder },
  cardBar: { height: 5 },
  cardBody:{ padding: SPACING.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  cardIcon:{ width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  subject: { fontSize: FONTS.sizes.md, fontWeight: '800', color: COLORS.textPrimary },
  meta:    { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },

  durBg:  { backgroundColor: COLORS.bgLight, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  durTxt: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.textSecondary },

  chipRow: { flexDirection: 'row', gap: SPACING.sm },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.bgLight, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  chipTxt: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontWeight: '600' },
});