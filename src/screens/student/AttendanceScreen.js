/**
 * Student Attendance Screen
 * ─────────────────────────
 * Tabs: Overview (ring + subject cards) | Day-wise (calendar + detail)
 * All data from API — zero mock data.
 *
 * Path: screens/AttendanceScreen.js  (student branch)
 * Also used as: src/screens/student/AttendanceScreen.js
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../../constants/theme';

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_HEADERS = ['S','M','T','W','T','F','S'];
const CAL_COLORS  = {
  present: '#A7F3D0',
  partial:  '#FEF08A',
  absent:   '#FECACA',
  none:     '#E5E7EB',
};
const TIME_SLOT_LABELS = {
  '9:00-10:40':   '9:00 – 10:40',
  '10:40-12:20':  '10:40 – 12:20',
  '1:10-2:50':    '1:10 – 2:50',
  '2:50-4:30':    '2:50 – 4:30',
};

// ── SVG Progress Ring ─────────────────────────────────────────────────────────
const RING_SIZE   = 160;
const RING_STROKE = 14;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC   = 2 * Math.PI * RING_RADIUS;
const RING_CENTER = RING_SIZE / 2;

const ringColor = (pct) => {
  if (pct >= 75) return '#22C55E';
  if (pct >= 65) return '#FACC15';
  return '#EF4444';
};

const AttendanceRing = ({ percentage }) => {
  const pct    = Math.min(100, Math.max(0, percentage ?? 0));
  const offset = RING_CIRC * (1 - pct / 100);
  const color  = ringColor(pct);
  return (
    <View style={s.ringWrapper}>
      <View style={s.ringContainer}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: 'absolute' }}>
          <Circle cx={RING_CENTER} cy={RING_CENTER} r={RING_RADIUS}
            stroke="#E5E7EB" strokeWidth={RING_STROKE} fill="none" />
          <Circle cx={RING_CENTER} cy={RING_CENTER} r={RING_RADIUS}
            stroke={color} strokeWidth={RING_STROKE} fill="none"
            strokeDasharray={`${RING_CIRC} ${RING_CIRC}`}
            strokeDashoffset={offset} strokeLinecap="round"
            rotation="-90" origin={`${RING_CENTER}, ${RING_CENTER}`} />
        </Svg>
        <View style={s.ringInnerDisc} />
        <View style={s.ringTextWrap}>
          <Text style={[s.ringPct, { color }]}>{pct}%</Text>
          <Text style={s.ringLabel}>Overall</Text>
        </View>
      </View>
    </View>
  );
};

// ── Subject Card ──────────────────────────────────────────────────────────────
const pctColor = (p) => p >= 75 ? COLORS.success : p >= 65 ? COLORS.warning : COLORS.danger;

const SubjectCard = ({ item }) => {
  const color = pctColor(item.percentage);
  return (
    <View style={s.subCard}>
      <View style={s.subTop}>
        <Text style={s.subName} numberOfLines={2}>{item.subject}</Text>
        <Text style={[s.subPct, { color }]}>{item.percentage}%</Text>
      </View>
      <Text style={s.subClasses}>{item.present} / {item.total} classes attended</Text>
      <View style={s.subBar}>
        <View style={[s.subBarFill, { width: `${item.percentage}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

// ── Calendar View ─────────────────────────────────────────────────────────────
const CalendarView = ({ dailyData }) => {
  const today    = new Date();
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedKey, setSelectedKey] = useState(null);

  // Build a map: "YYYY-MM-DD" → "present" | "partial" | "absent" | "none"
  const dateMap = React.useMemo(() => {
    const map = {};
    if (!dailyData) return map;
    dailyData.forEach(entry => {
      const key     = entry.date; // already "YYYY-MM-DD"
      const classes = entry.classes || [];
      if (classes.length === 0) { map[key] = 'none'; return; }
      const presentCount = classes.filter(c => (c.status || '').toLowerCase() === 'present').length;
      if (presentCount === classes.length) map[key] = 'present';
      else if (presentCount === 0) map[key] = 'absent';
      else map[key] = 'partial';
    });
    return map;
  }, [dailyData]);

  const selectedEntry = selectedKey
    ? (dailyData || []).find(e => e.date === selectedKey)
    : null;

  const isFutureMonth =
    calYear > today.getFullYear() ||
    (calYear === today.getFullYear() && calMonth > today.getMonth());

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
    setSelectedKey(null);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
    setSelectedKey(null);
  };

  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const cells       = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <View>
      {/* Month nav */}
      <View style={s.calNavRow}>
        <TouchableOpacity onPress={prevMonth} style={s.calNavBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.calNavTitle}>{MONTH_NAMES[calMonth]} {calYear}</Text>
        <TouchableOpacity onPress={nextMonth} style={s.calNavBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={s.calHeaderRow}>
        {DAY_HEADERS.map((d, i) => (
          <Text key={i} style={s.calHeaderCell}>{d}</Text>
        ))}
      </View>

      {/* Date grid */}
      <View style={s.calGrid}>
        {cells.map((day, idx) => {
          if (day === null) return <View key={`e${idx}`} style={s.calCell} />;
          const key    = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const status = isFutureMonth ? 'none' : (dateMap[key] || 'none');
          const bg     = CAL_COLORS[status];
          const isSel  = selectedKey === key;
          return (
            <TouchableOpacity
              key={key}
              style={[s.calCell, { backgroundColor: bg }, isSel && s.calCellSelected]}
              onPress={() => setSelectedKey(isSel ? null : key)}
              activeOpacity={0.75}
            >
              <Text style={[s.calCellTxt, isSel && s.calCellTxtSelected]}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={s.calLegend}>
        {[['Present','#A7F3D0'],['Partial','#FEF08A'],['Absent','#FECACA'],['No data','#E5E7EB']].map(([lbl, col]) => (
          <View key={lbl} style={s.calLegendItem}>
            <View style={[s.calLegendDot, { backgroundColor: col }]} />
            <Text style={s.calLegendTxt}>{lbl}</Text>
          </View>
        ))}
      </View>

      {/* Day detail */}
      {selectedKey ? (
        <View style={s.dayDetailBox}>
          <Text style={s.dayDetailDate}>
            {new Date(selectedKey + 'T00:00:00').toLocaleDateString('en-IN', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </Text>
          {!selectedEntry || (selectedEntry.classes || []).length === 0 ? (
            <View style={s.emptyClasses}>
              <Ionicons name="calendar-outline" size={28} color={COLORS.textMuted} />
              <Text style={s.emptyClassesTxt}>No classes recorded</Text>
            </View>
          ) : (
            selectedEntry.classes.map((cls, i) => (
              <View key={i} style={s.classRow}>
                <View style={[
                  s.classStatusIcon,
                  { backgroundColor: (cls.status || '').toLowerCase() === 'present' ? '#D1FAE5' : '#FEE2E2' },
                ]}>
                  <Ionicons
                    name={(cls.status || '').toLowerCase() === 'present' ? 'checkmark-circle' : 'close-circle'}
                    size={22}
                    color={(cls.status || '').toLowerCase() === 'present' ? COLORS.success : COLORS.danger}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.classSubject}>{cls.subject}</Text>
                  <Text style={s.classSlot}>
                    {TIME_SLOT_LABELS[cls.time_slot] || cls.time_slot || '—'}
                  </Text>
                </View>
                <Text style={[
                  s.classStatus,
                  { color: (cls.status || '').toLowerCase() === 'present' ? COLORS.success : COLORS.danger },
                ]}>
                  {(cls.status || '').toLowerCase() === 'present' ? 'Present' : 'Absent'}
                </Text>
              </View>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
};

// ── Overview Tab ──────────────────────────────────────────────────────────────
const OverviewTab = ({ overall, subjects, loading, refreshing, onRefresh }) => {
  if (loading) {
    return (
      <View style={s.centeredLoader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={s.loadingTxt}>Loading attendance…</Text>
      </View>
    );
  }
  return (
    <ScrollView
      contentContainerStyle={s.scrollBody}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Ring */}
      <AttendanceRing percentage={overall?.percentage ?? 0} />

      {/* Stats row */}
      <View style={s.statsRow}>
        <View style={s.statBox}>
          <Text style={s.statVal}>{overall?.attended_classes ?? 0}</Text>
          <Text style={s.statLbl}>Attended</Text>
        </View>
        <View style={[s.statBox, s.statBoxMid]}>
          <Text style={s.statVal}>{overall?.total_classes ?? 0}</Text>
          <Text style={s.statLbl}>Total</Text>
        </View>
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: pctColor(overall?.percentage ?? 0) }]}>
            {overall?.percentage ?? 0}%
          </Text>
          <Text style={s.statLbl}>Overall</Text>
        </View>
      </View>

      {/* Shortage warning */}
      {(overall?.total_classes ?? 0) > 0 && (overall?.percentage ?? 0) < 75 && (
        <View style={s.warningCard}>
          <Ionicons name="warning-outline" size={18} color={COLORS.danger} />
          <Text style={s.warningTxt}>
            Your attendance is below 75%. You need to attend more classes to avoid detainment.
          </Text>
        </View>
      )}

      {/* Subject cards */}
      <Text style={s.secTitle}>Subject-wise Attendance</Text>
      {subjects.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="school-outline" size={36} color={COLORS.textMuted} />
          <Text style={s.emptyTxt}>No subjects found for your section.</Text>
        </View>
      ) : (
        subjects.map((sub, i) => <SubjectCard key={i} item={sub} />)
      )}
    </ScrollView>
  );
};

// ── Day-wise Tab ──────────────────────────────────────────────────────────────
const DayWiseTab = ({ dailyData, loading, refreshing, onRefresh }) => {
  if (loading) {
    return (
      <View style={s.centeredLoader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={s.loadingTxt}>Loading calendar…</Text>
      </View>
    );
  }
  return (
    <ScrollView
      contentContainerStyle={[s.scrollBody, { paddingBottom: 60 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <CalendarView dailyData={dailyData} />
    </ScrollView>
  );
};

// ── Root Export ───────────────────────────────────────────────────────────────
export default function StudentAttendanceScreen() {
  const [tab,        setTab]        = useState('Overview');
  const [overall,    setOverall]    = useState(null);
  const [subjects,   setSubjects]   = useState([]);
  const [daily,      setDaily]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Resolve studentId — always use registration_number (snake_case only) ────
  const { user }  = useAuth();
  const studentId = user?.registration_number;

  const loadAll = useCallback(async (isRefresh = false) => {
    // FIX 1: /attendance/me/overview uses JWT — no studentId needed in URL.
    //         Avoids hitting the privileged /attendance/student/{id} endpoint
    //         which requires faculty/admin role and returns 403 for students.
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { fetchOverallAttendance } = require('../../services/attendanceService');
      const data = await fetchOverallAttendance();

      // FIX 2: /me/overview returns `percentage` (not `overall_percentage`).
      setOverall({
        percentage:       data.percentage       ?? 0,
        attended_classes: data.attended_classes ?? 0,
        total_classes:    data.total_classes    ?? 0,
      });

      // Subjects: [{ subject, present, total, percentage }] — shape unchanged.
      // With the backend fix, zero-attendance timetable subjects are included.
      setSubjects(Array.isArray(data.subjects) ? data.subjects : []);

      // FIX 3: /me/overview returns `days` (pre-grouped by date), not `records`.
      //         Old code read data.records and re-grouped — always produced [] here.
      //         data.days shape: [{ date: "YYYY-MM-DD", classes: [{ subject, status, time_slot }] }]
      //         CalendarView expects exactly this shape — pass it directly.
      setDaily(Array.isArray(data.days) ? data.days : []);

    } catch (err) {
      console.warn('[Attendance] load error:', err?.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[COLORS.primary, COLORS.primaryMid]} style={s.header}>
        <Text style={s.headerTitle}>Attendance</Text>
        <Text style={s.headerSub}>Track your attendance records</Text>
      </LinearGradient>

      {/* Tab switcher */}
      <View style={s.tabSwitcher}>
        {['Overview', 'Day-wise'].map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tabBtn, tab === t && s.tabBtnActive]}
            onPress={() => setTab(t)}
            activeOpacity={0.8}
          >
            <Text style={[s.tabBtnTxt, tab === t && s.tabBtnTxtActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'Overview' ? (
        <OverviewTab
          overall={overall}
          subjects={subjects}
          loading={loading}
          refreshing={refreshing}
          onRefresh={() => loadAll(true)}
        />
      ) : (
        <DayWiseTab
          dailyData={daily}
          loading={loading}
          refreshing={refreshing}
          onRefresh={() => loadAll(true)}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: COLORS.bgLight },
  header:     { paddingTop: 62, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.lg },
  headerTitle:{ fontSize: FONTS.sizes.xxxl, fontWeight: '900', color: COLORS.secondary },
  headerSub:  { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.6)', marginTop: 4 },

  // Tabs
  tabSwitcher:     { flexDirection: 'row', margin: SPACING.md, backgroundColor: COLORS.cardBg, borderRadius: RADIUS.full, padding: 3, borderWidth: 1, borderColor: COLORS.cardBorder },
  tabBtn:          { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: RADIUS.full },
  tabBtnActive:    { backgroundColor: COLORS.primary },
  tabBtnTxt:       { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textSecondary },
  tabBtnTxtActive: { color: COLORS.secondary },

  scrollBody: { padding: SPACING.md, paddingBottom: 110 },
  secTitle:   { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.sm, marginTop: SPACING.sm },

  // Ring
  ringWrapper:   { alignItems: 'center', justifyContent: 'center', marginVertical: SPACING.lg },
  ringContainer: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringInnerDisc: { position: 'absolute', width: RING_SIZE - RING_STROKE * 2, height: RING_SIZE - RING_STROKE * 2, borderRadius: (RING_SIZE - RING_STROKE * 2) / 2, backgroundColor: '#FFFFFF' },
  ringTextWrap:  { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringPct:       { fontSize: 38, fontWeight: '900', lineHeight: 42 },
  ringLabel:     { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, marginTop: 2 },

  // Stats row
  statsRow:   { flexDirection: 'row', marginBottom: SPACING.md, gap: SPACING.sm },
  statBox:    { flex: 1, backgroundColor: COLORS.cardBg, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.cardBorder, ...SHADOWS.card },
  statBoxMid: { borderLeftWidth: 0, borderRightWidth: 0 },
  statVal:    { fontSize: FONTS.sizes.xl, fontWeight: '900', color: COLORS.textPrimary },
  statLbl:    { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: '600', marginTop: 2 },

  // Warning
  warningCard: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, backgroundColor: COLORS.danger + '10', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.danger + '20' },
  warningTxt:  { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.danger, fontWeight: '600', lineHeight: 19 },

  // Subject card
  subCard:    { backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.card, borderWidth: 1, borderColor: COLORS.cardBorder },
  subTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  subName:    { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary, flex: 1, marginRight: SPACING.sm },
  subPct:     { fontSize: FONTS.sizes.xl, fontWeight: '900' },
  subClasses: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginBottom: 8 },
  subBar:     { height: 4, backgroundColor: COLORS.cardBorder, borderRadius: 2, overflow: 'hidden' },
  subBarFill: { height: 4, borderRadius: 2 },

  // Calendar
  calNavRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm, paddingHorizontal: 4 },
  calNavBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.cardBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },
  calNavTitle:   { fontSize: FONTS.sizes.md, fontWeight: '800', color: COLORS.textPrimary },
  calHeaderRow:  { flexDirection: 'row', marginBottom: 4 },
  calHeaderCell: { flex: 1, textAlign: 'center', fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.textMuted, paddingVertical: 4 },
  calGrid:       { flexDirection: 'row', flexWrap: 'wrap' },
  calCell:       { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 6, marginBottom: 3 },
  calCellSelected:    { borderWidth: 2, borderColor: COLORS.primary },
  calCellTxt:         { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textPrimary },
  calCellTxtSelected: { fontWeight: '900', color: COLORS.primary },
  calLegend:     { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 10, marginTop: SPACING.sm, marginBottom: SPACING.md },
  calLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  calLegendDot:  { width: 11, height: 11, borderRadius: 6 },
  calLegendTxt:  { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: '600' },

  // Day detail
  dayDetailBox:  { backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, padding: SPACING.md, marginTop: SPACING.sm, borderWidth: 1, borderColor: COLORS.cardBorder, ...SHADOWS.card },
  dayDetailDate: { fontSize: FONTS.sizes.md, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.sm },
  classRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder, gap: SPACING.sm },
  classStatusIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  classSubject:  { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textPrimary },
  classSlot:     { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  classStatus:   { fontSize: FONTS.sizes.xs, fontWeight: '800' },
  emptyClasses:  { alignItems: 'center', paddingVertical: SPACING.lg, gap: 8 },
  emptyClassesTxt:{ fontSize: FONTS.sizes.sm, color: COLORS.textMuted },

  // Loader / empty
  centeredLoader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  loadingTxt:     { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, fontWeight: '600' },
  emptyState:     { alignItems: 'center', paddingTop: 40, gap: SPACING.sm },
  emptyTxt:       { fontSize: FONTS.sizes.md, color: COLORS.textMuted },
});