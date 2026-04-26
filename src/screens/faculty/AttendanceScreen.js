/**
 * src/screens/faculty/AttendanceScreen.js
 *
 * ══════════════════════════════════════════════════════════════════
 * FLOW (3-state machine per selected slot):
 *
 *  CASE 1 – Attendance NOT yet marked   (!attendanceExists)
 *    → Student list with present/absent toggle
 *    → Submit → CASE 2 summary
 *
 *  CASE 2 – Attendance ALREADY marked   (attendanceExists && !isEditMode)
 *    → Read-only SummaryView:
 *        Subject · Date · Time slot info card
 *        Total / Present / Absent / Present% stat boxes
 *        Scrollable absent-student list (or "full attendance" banner)
 *        "Edit Attendance" button → opens PasswordModal
 *
 *  CASE 3 – Edit mode                   (attendanceExists && isEditMode)
 *    → Same student-list UI, pre-filled statuses, unlocked for changes
 *    → Submit → PUT update → back to CASE 2 summary
 *
 * PASSWORD CHECK:
 *   PasswordModal is an isolated component that calls unlockAttendance()
 *   (POST /attendance/unlock — JWT-based, no faculty_id in body).
 *   Shows inline error on wrong password; never closes on failure.
 *   Internal state resets every time the modal opens.
 *
 * SORTING:
 *   Sorting is handled entirely by the backend (ORDER BY day CASE + time_slot
 *   arithmetic). Frontend preserves backend order — no re-sort applied.
 * ══════════════════════════════════════════════════════════════════
 */

import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Animated,
  Modal, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../../constants/theme';
import {
  fetchMyTimetable,
  fetchStudentsForSection,
  submitAttendance,
  checkAttendance,
  unlockAttendance,
  updateAttendance,
} from '../../services/attendanceService';
import CalendarModal from '../../components/faculty/CalendarModal';

// ─── Pure helpers ──────────────────────────────────────────────────────────────

const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const todayStr = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
};

const dateToDayName = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return DAY_ORDER[dow === 0 ? 6 : dow - 1] ?? 'Monday';
};

const formatDisplayDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
};

// Strips spaces and dashes, uppercases — applied before every API call.
const normalizeSection = (section = '') => {
  const n = section.replace(/[\s\-]/g, '').toUpperCase();
  console.log(`[Attendance] section: "${section}" → "${n}"`);
  return n;
};

// Handles "9:00 - 10:40", "9:00-10:40", "9:00 AM" formats
const timeSlotToMinutes = (slot = '') => {
  if (!slot) return 0;

  let start = slot.split('-')[0].trim();
  start = start.replace(/\s+/g, ' ');

  const ampm = start.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const p = ampm[3].toUpperCase();

    if (p === 'PM' && h !== 12) h += 12;
    if (p === 'AM' && h === 12) h = 0;

    return h * 60 + m;
  }

  const match24 = start.match(/(\d{1,2}):(\d{2})/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    return h * 60 + m;
  }

  return 0;
};

const resolveDisplayName = (s) =>
  ((s?.fullname || s?.name || 'Student') + '').toUpperCase();

const resolveInitial = (s) =>
  (s?.fullname || s?.name || '?')[0].toUpperCase();

// Converts numeric year to ordinal string: 1 → "1st Year", 4 → "4th Year"
const formatYear = (year) => {
  if (!year) return '';
  const suffixes = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' };
  return `${suffixes[year] || `${year}th`} Year`;
};

// ─── DateBanner ────────────────────────────────────────────────────────────────
const DateBanner = React.memo(({ selectedDate, onOpenCalendar }) => {
  const isToday   = selectedDate === todayStr();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulse = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200 }),
    ]).start();
  };
  return (
    <View style={b.container}>
      <View style={b.dateRow}>
        <View style={b.calIcon}>
          <Ionicons name="calendar" size={18} color={COLORS.primary} />
        </View>
        <View style={b.dateTextWrap}>
          <Text style={b.dateLabel}>SELECTED DATE</Text>
          <Text style={b.dateValue}>{formatDisplayDate(selectedDate)}</Text>
        </View>
        {isToday && (
          <View style={b.todayChip}><Text style={b.todayChipTxt}>Today</Text></View>
        )}
      </View>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={b.selectBtn}
          onPress={() => { pulse(); onOpenCalendar(); }}
          activeOpacity={0.85}
        >
          <Ionicons name="calendar-outline" size={15} color={COLORS.accent} />
          <Text style={b.selectBtnTxt}>Select Date</Text>
          <Ionicons name="chevron-down" size={13} color={COLORS.accent} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

// ─── StuRow — memoized student toggle row ──────────────────────────────────────
const StuRow = React.memo(({ item, index, onToggle, isLocked }) => {
  const isP = item.present === true;
  const isA = item.present === false;
  const isU = item.present === null;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const bump = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 60, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200 }),
    ]).start();
  };

  const handlePress = () => {
    if (isLocked) return;
    if (isU)      onToggle(item.id, true);
    else if (isP) onToggle(item.id, false);
    else          onToggle(item.id, null);
  };

  return (
    <Animated.View style={[s.stuCard, { transform: [{ scale: scaleAnim }] }]}>
      <View style={[
        s.stuStatusBar,
        isP && { backgroundColor: COLORS.success },
        isA && { backgroundColor: COLORS.danger  },
        isU && { backgroundColor: COLORS.cardBorder },
      ]} />
      <View style={s.stuLeft}>
        <View style={s.stuInfo}>
          <Text style={s.stuRoll}>{item.regnum || `#${index + 1}`}</Text>
          <Text style={s.stuName}>{(item.fullname || item.name || 'Student').toUpperCase()}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[s.tag, isP && s.tagPresent, isA && s.tagAbsent, isU && s.tagUnmarked, isLocked && { opacity: 0.55 }]}
        onPress={() => { if (!isLocked) { bump(); handlePress(); } }}
        activeOpacity={isLocked ? 1 : 0.8}
        disabled={isLocked}
      >
        <Text style={[s.tagText, isP && s.tagTextPresent, isA && s.tagTextAbsent, isU && s.tagTextUnmarked]}>
          {isP ? 'Present' : isA ? 'Absent' : 'Mark'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── PasswordModal — isolated, self-contained ──────────────────────────────────
// Calls POST /attendance/unlock. Resets all internal state each time it opens.
const PasswordModal = React.memo(({ visible, onClose, onUnlock }) => {
  const [pwInput,   setPwInput]   = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError,   setPwError]   = useState('');

  useEffect(() => {
    if (visible) { setPwInput(''); setPwError(''); }
  }, [visible]);

  const handleSubmit = useCallback(async () => {
    if (!pwInput.trim()) { setPwError('Please enter your password.'); return; }
    setPwLoading(true); setPwError('');
    try {
      await unlockAttendance(pwInput.trim());
      onUnlock();   // success: caller sets isEditMode
      onClose();
    } catch (err) {
      // Keep modal open; show error inline
      setPwError(err?.message || JSON.stringify(err) || 'Invalid password. Please try again.');
    } finally {
      setPwLoading(false);
    }
  }, [pwInput, onUnlock, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={pw.overlay}>
        <View style={pw.sheet}>
          <Text style={pw.title}>Verify Identity</Text>
          <Text style={pw.sub}>Enter your password to unlock editing</Text>
          <TextInput
            style={pw.input}
            placeholder="Password"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={pwInput}
            onChangeText={v => { setPwInput(v); setPwError(''); }}
            autoFocus
          />
          {!!pwError && <Text style={pw.error}>{pwError}</Text>}
          <View style={pw.btnRow}>
            <TouchableOpacity style={pw.cancelBtn} onPress={onClose}>
              <Text style={pw.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[pw.confirmBtn, pwLoading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={pwLoading}
            >
              {pwLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={pw.confirmTxt}>Unlock</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

// ─── SummaryView ────────────────────────────────────────────────────────────────
// Used for CASE 2 (existing) and after any submission (CASE 1 → 2 or CASE 3 → 2).
const SummaryView = React.memo(({ summaryData, onEditPress, onMarkAnother }) => {
  const { subject, section, time_slot, displayDate,
          present, absent, total, absentList, wasEdited } = summaryData;
  const pct = total > 0 ? Math.round(present / total * 100) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bgLight }}>

      <LinearGradient colors={[COLORS.primary, COLORS.primaryMid]} style={s.header}>
        <Text style={s.headerTitle}>Attendance</Text>
        <Text style={s.headerSub}>{wasEdited ? 'Updated ✓' : 'Submitted ✓'}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={sv.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={sv.heroBadge}>
          <View style={sv.heroCircle}>
            <Ionicons name="checkmark-circle" size={52} color={COLORS.success} />
          </View>
          <Text style={sv.heroTitle}>
            {wasEdited ? 'Attendance Updated' : 'Attendance Recorded'}
          </Text>
          <Text style={[sv.heroSub, { fontWeight: '800', fontSize: 14 }]}>{section}</Text>
        </View>

        <Text style={{
          fontSize: FONTS.sizes.md,
          fontWeight: '800',
          color: COLORS.textPrimary,
          marginBottom: SPACING.sm
        }}>
          Attendance Updates
        </Text>

        {/* ── Info rows: Subject / Date / Time ── */}
        <View style={sv.infoCard}>
          {[
            { icon: 'book-outline',     label: 'Subject',   val: subject     },
            { icon: 'calendar-outline', label: 'Date',      val: displayDate },
            { icon: 'time-outline',     label: 'Time Slot', val: time_slot   },
          ].map((row, i, arr) => (
            <View key={row.label} style={[sv.infoRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={sv.infoIconWrap}>
                <Ionicons name={row.icon} size={15} color={COLORS.primary} />
              </View>
              <Text style={sv.infoLabel}>{row.label}</Text>
              <Text style={sv.infoVal} numberOfLines={1}>{row.val}</Text>
            </View>
          ))}
        </View>

        {/* ── Stat boxes ── */}
        <View style={sv.statsRow}>
          {[
            { label: 'Present',  val: present,   color: COLORS.success },
            { label: 'Absent',   val: absent,    color: COLORS.danger  },
            { label: 'Present%', val: `${pct}%`, color: COLORS.primary },
          ].map(item => (
            <View key={item.label} style={[sv.statBox, { borderColor: item.color + '50' }]}>
              <Text style={[sv.statVal, { color: item.color }]}>{item.val}</Text>
              <Text style={sv.statLbl}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Absent students ── */}
        {absentList.length > 0 ? (
          <View style={sv.absentCard}>
            <View style={sv.absentHeader}>
              <Ionicons name="person-remove-outline" size={16} color={COLORS.danger} />
              <Text style={sv.absentTitle}>Absent Students</Text>
            </View>
            {absentList.map((st, i) => (
              <StuRow
                key={st.id || i}
                item={{ ...st, present: false }}
                index={i}
                onToggle={() => {}}
                isLocked={true}
              />
            ))}
          </View>
        ) : (
          <View style={sv.allPresentCard}>
            <Ionicons name="trophy-outline" size={28} color={COLORS.success} />
            <Text style={sv.allPresentTxt}>Full attendance — everyone present!</Text>
          </View>
        )}

        {/* ── Actions ── */}
        <TouchableOpacity
          style={[sv.actionBtn, { backgroundColor: COLORS.warning, marginBottom: SPACING.sm }]}
          onPress={onEditPress}
          activeOpacity={0.88}
        >
          <Ionicons name="create-outline" size={20} color={COLORS.accent} />
          <Text style={sv.actionBtnTxt}>Edit Attendance</Text>
        </TouchableOpacity>

        <TouchableOpacity style={sv.actionBtn} onPress={onMarkAnother} activeOpacity={0.88}>
          <Ionicons name="arrow-back-circle-outline" size={20} color={COLORS.accent} />
          <Text style={sv.actionBtnTxt}>Mark Another Class</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// Main Screen
// ══════════════════════════════════════════════════════════════════════════════
export default function FacultyAttendanceScreen() {

  // ── Date / calendar ────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [calendarOpen, setCalendarOpen] = useState(false);

  // ── Timetable ──────────────────────────────────────────────────────────────
  const [timetable, setTimetable] = useState([]);
  const [ttLoading, setTtLoading] = useState(true);
  const [ttError,   setTtError]   = useState(null);

  // ── Slot + students ────────────────────────────────────────────────────────
  const [selSlot,     setSelSlot]     = useState(null);
  const [studentsArr, setStudentsArr] = useState([]);
  const [stuLoading,  setStuLoading]  = useState(false);

  // ── 3-state machine ────────────────────────────────────────────────────────
  const [attendanceExists, setAttendanceExists] = useState(false);
  const [isEditMode,       setIsEditMode]       = useState(false);

  // ── Summary ────────────────────────────────────────────────────────────────
  const [submitting,  setSubmitting]  = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  // ── Password modal ─────────────────────────────────────────────────────────
  const [pwModalVisible, setPwModalVisible] = useState(false);

  // ── Load full timetable once ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setTtLoading(true); setTtError(null);
    fetchMyTimetable()
      .then(data => { if (!cancelled) setTimetable(Array.isArray(data) ? data : []); })
      .catch(err  => { if (!cancelled) setTtError(err?.message || 'Failed to load timetable'); })
      .finally(()  => { if (!cancelled) setTtLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // ── Sorted slots for active day ────────────────────────────────────────────
  const activeDayName = useMemo(() => dateToDayName(selectedDate), [selectedDate]);

  // Backend already returns slots sorted by day + chronological time — no re-sort needed.
  const slotsForDay = useMemo(() =>
    timetable.filter(e => e.day === activeDayName),
    [timetable, activeDayName]
  );

  // DEBUG — verify backend order is preserved (remove once confirmed)
  useEffect(() => {
    console.log("Timetable received from backend:", timetable);
  }, [timetable]);

  // ── Load students + check attendance when slot selected ────────────────────
  useEffect(() => {
    if (!selSlot) {
      setStudentsArr([]); setAttendanceExists(false); setIsEditMode(false);
      return;
    }
    let cancelled = false;
    setStuLoading(true);
    setStudentsArr([]); setAttendanceExists(false); setIsEditMode(false);

    const section = normalizeSection(selSlot.section);

    const normalizeStudents = (rawList, presentSet = null) =>
      rawList
        .map(st => ({
          ...st,
          present: presentSet
            ? (presentSet.has(st.regnum || st.registration_number || st.id)
                ? presentSet.get(st.regnum || st.registration_number || st.id) : null)
            : null,
          regnum:   (st.regnum || st.registration_number || '').trim(),
          fullname: st.fullname,
        }))
        .sort((a, b) => {
          const rA = a.regnum.toUpperCase(), rB = b.regnum.toUpperCase();
          const numA = rA.match(/(\d+)$/)?.[1], numB = rB.match(/(\d+)$/)?.[1];
          if (numA && numB) {
            const pA = rA.slice(0, rA.length - numA.length);
            const pB = rB.slice(0, rB.length - numB.length);
            if (pA === pB) return parseInt(numA, 10) - parseInt(numB, 10);
          }
          return rA.localeCompare(rB);
        });

    Promise.all([
      fetchStudentsForSection(section, selSlot.year),
      checkAttendance(section, selSlot.subject, selectedDate, selSlot.time_slot)
        .catch(() => ({ exists: false })),
    ])
      .then(([stuData, checkData]) => {
        if (cancelled) return;
        const rawStudents = Array.isArray(stuData) ? stuData : [];

        if (checkData?.exists && Array.isArray(checkData.data) && checkData.data.length > 0) {
          // ── CASE 2: already marked ────────────────────────────────────────
          const presentSet = new Map(
            checkData.data.map(r => [r.student_id, r.status === 'present'])
          );
          setStudentsArr(normalizeStudents(rawStudents, presentSet));
          setAttendanceExists(true);
          setIsEditMode(false);
        } else {
          // ── CASE 1: not yet marked ────────────────────────────────────────
          setStudentsArr(normalizeStudents(rawStudents));
          setAttendanceExists(false);
          setIsEditMode(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          Alert.alert('Error', err?.message || 'Failed to load students');
          setStudentsArr([]);
        }
      })
      .finally(() => { if (!cancelled) setStuLoading(false); });

    return () => { cancelled = true; };
  }, [selSlot, selectedDate]);

  // ── Derived counts ─────────────────────────────────────────────────────────
  const presentCount  = studentsArr.filter(s => s.present === true).length;
  const absentCount   = studentsArr.filter(s => s.present === false).length;
  const unmarkedCount = studentsArr.filter(s => s.present === null).length;
  const allMarked     = studentsArr.length > 0 && unmarkedCount === 0;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDateSelect = useCallback((dateStr) => {
    setSelectedDate(dateStr);
    setSelSlot(null);
    setShowSummary(false); setSummaryData(null);
    setCalendarOpen(false);
  }, []);

  const handleToggle = useCallback((id, val) => {
    setStudentsArr(prev =>
      prev.map(st => st.id === id ? { ...st, present: st.present === val ? null : val } : st)
    );
  }, []);

  // Called by PasswordModal on success — enters edit mode
  const handleUnlocked = useCallback(() => {
    setIsEditMode(true);
    setShowSummary(false);
    setSummaryData(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!allMarked) {
      Alert.alert('Incomplete',
        `${unmarkedCount} student(s) not marked. Please mark all before submitting.`);
      return;
    }
    setSubmitting(true);
    const section = normalizeSection(selSlot.section);
    try {
      if (isEditMode) {
        // CASE 3 → PUT /attendance/update
        await updateAttendance(
          selSlot.subject, section, selSlot.year,
          selectedDate, selSlot.time_slot, selSlot.faculty_id, studentsArr,
        );
      } else {
        // CASE 1 → POST /attendance/mark
        await submitAttendance(
          selSlot.subject, section, selSlot.year,
          selectedDate, selSlot.time_slot, selSlot.faculty_id, studentsArr,
        );
      }
      // Build summary then transition to CASE 2
      setSummaryData({
        subject: selSlot.subject, section,
        time_slot:   selSlot.time_slot,
        date:        selectedDate,
        displayDate: formatDisplayDate(selectedDate),
        present:     presentCount,
        absent:      absentCount,
        total:       studentsArr.length,
        absentList:  studentsArr.filter(s => s.present === false),
        wasEdited:   isEditMode,
      });
      setAttendanceExists(true);
      setIsEditMode(false);
      setShowSummary(true);
    } catch (e) {
      Alert.alert('Submit Failed', e?.message || 'Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [allMarked, studentsArr, selSlot, selectedDate, presentCount, absentCount, unmarkedCount, isEditMode]);

  const resetAll = useCallback(() => {
    setSelSlot(null); setStudentsArr([]);
    setShowSummary(false); setSummaryData(null);
    setAttendanceExists(false); setIsEditMode(false);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // RENDER BRANCH 1: Summary view (after submit OR re-entering marked slot)
  // ═══════════════════════════════════════════════════════════════
  if (showSummary && summaryData) {
    return (
      <>
        <PasswordModal
          visible={pwModalVisible}
          onClose={() => setPwModalVisible(false)}
          onUnlock={handleUnlocked}
        />
        <SummaryView
          summaryData={summaryData}
          onEditPress={() => setPwModalVisible(true)}
          onMarkAnother={resetAll}
        />
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER BRANCH 2: Slot selected
  // ═══════════════════════════════════════════════════════════════
  if (selSlot) {

    // Loading
    if (stuLoading) {
      return (
        <View style={{ flex: 1, backgroundColor: COLORS.bgLight }}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryMid]} style={s.header}>
            <Text style={s.headerTitle}>Attendance</Text>
            <Text style={s.headerSub}>{formatDisplayDate(selectedDate)}</Text>
          </LinearGradient>
          <View style={s.centerWrap}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={s.loadTxt}>Loading students…</Text>
          </View>
        </View>
      );
    }

    // No students
    if (studentsArr.length === 0) {
      return (
        <View style={{ flex: 1, backgroundColor: COLORS.bgLight }}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryMid]} style={s.header}>
            <Text style={s.headerTitle}>Attendance</Text>
            <Text style={s.headerSub}>{formatDisplayDate(selectedDate)}</Text>
          </LinearGradient>
          <View style={s.centerWrap}>
            <Ionicons name="people-outline" size={40} color={COLORS.textMuted} />
            <Text style={s.emptyTxt}>No students found for section {selSlot.section}.</Text>
            <TouchableOpacity onPress={() => setSelSlot(null)}>
              <Text style={{ color: COLORS.primary, fontWeight: '700', marginTop: 8 }}>← Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // ── CASE 2: already marked, not in edit mode → read-only summary ──
    if (attendanceExists && !isEditMode) {
      const previewSummary = {
        subject:     selSlot.subject,
        section:     normalizeSection(selSlot.section),
        time_slot:   selSlot.time_slot,
        date:        selectedDate,
        displayDate: formatDisplayDate(selectedDate),
        present:     presentCount,
        absent:      absentCount,
        total:       studentsArr.length,
        absentList:  studentsArr.filter(s => s.present === false),
        wasEdited:   false,
      };
      return (
        <>
          <PasswordModal
            visible={pwModalVisible}
            onClose={() => setPwModalVisible(false)}
            onUnlock={handleUnlocked}
          />
          <SummaryView
            summaryData={previewSummary}
            onEditPress={() => setPwModalVisible(true)}
            onMarkAnother={resetAll}
          />
        </>
      );
    }

    // ── CASE 1 / CASE 3: marking UI ──────────────────────────────────
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bgLight }}>

        <PasswordModal
          visible={pwModalVisible}
          onClose={() => setPwModalVisible(false)}
          onUnlock={handleUnlocked}
        />

        <LinearGradient colors={[COLORS.primary, COLORS.primaryMid]} style={s.header}>
          <Text style={s.headerTitle}>
            {isEditMode ? 'Edit Attendance' : 'Mark Attendance'}
          </Text>
          <Text style={s.headerSub}>{formatDisplayDate(selectedDate)}</Text>
        </LinearGradient>

        {/* Class sub-header */}
        <View style={s.classHead}>
          <TouchableOpacity onPress={() => setSelSlot(null)} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.classHeadTitle}>{selSlot.subject}</Text>
            <Text style={s.classHeadMeta}>
              {selSlot.section}{selSlot.year ? ` · Year ${selSlot.year}` : ''} · {selSlot.time_slot}
            </Text>
          </View>
          <View style={s.presPill}>
            <Text style={s.presPillTxt}>{presentCount}/{studentsArr.length}</Text>
          </View>
        </View>

        {/* Edit-mode banner */}
        {isEditMode && (
          <View style={[s.warnBanner, { backgroundColor: COLORS.warning + '18', borderBottomColor: COLORS.warning + '30' }]}>
            <Ionicons name="create-outline" size={14} color={COLORS.warning} />
            <Text style={[s.warnTxt, { color: COLORS.warning }]}>
              Edit mode — changes will update the existing record
            </Text>
          </View>
        )}

        {/* Unmarked warning */}
        {!isEditMode && unmarkedCount > 0 && (
          <View style={s.warnBanner}>
            <Ionicons name="warning-outline" size={14} color={COLORS.warning} />
            <Text style={s.warnTxt}>
              {unmarkedCount} student{unmarkedCount > 1 ? 's' : ''} not yet marked
            </Text>
          </View>
        )}

        {/* Live stats */}
        <View style={s.strip}>
          {[
            { label: 'Present',  count: presentCount,  color: COLORS.success   },
            { label: 'Absent',   count: absentCount,   color: COLORS.danger    },
            { label: 'Unmarked', count: unmarkedCount, color: COLORS.textMuted },
          ].map((item, i) => (
            <React.Fragment key={item.label}>
              {i > 0 && <View style={s.stripSep} />}
              <View style={s.stripItem}>
                <View style={[s.stripDot, { backgroundColor: item.color }]} />
                <Text style={s.stripLbl}>{item.label}</Text>
                <Text style={[s.stripVal, { color: item.color }]}>{item.count}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Student list */}
        <FlatList
          data={studentsArr}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          renderItem={({ item, index }) => (
            <StuRow item={item} index={index} onToggle={handleToggle} isLocked={false} />
          )}
        />

        {/* Submit footer */}
        <View style={s.submitFooter}>
          <TouchableOpacity
            style={[s.submitBtn, (!allMarked || submitting) && s.submitBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={allMarked ? 0.88 : 1}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={s.submitTxt}>
              {submitting
                ? (isEditMode ? 'Updating…' : 'Submitting…')
                : isEditMode
                  ? `Update · ${studentsArr.length} students`
                  : allMarked
                    ? `Submit · ${studentsArr.length} students`
                    : `${unmarkedCount} unmarked — cannot submit`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER BRANCH 3: Main slot-list screen
  // ═══════════════════════════════════════════════════════════════
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bgLight }}>

      <CalendarModal
        visible={calendarOpen}
        selectedDate={selectedDate}
        onSelect={handleDateSelect}
        onClose={() => setCalendarOpen(false)}
        maxDate={todayStr()}
      />

      <LinearGradient colors={[COLORS.primary, COLORS.primaryMid]} style={s.header}>
        <Text style={s.headerTitle}>Attendance</Text>
        <Text style={s.headerSub}>Select a class to mark</Text>
      </LinearGradient>

      <DateBanner selectedDate={selectedDate} onOpenCalendar={() => setCalendarOpen(true)} />

      {ttLoading && (
        <View style={s.centerWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={s.loadTxt}>Loading timetable…</Text>
        </View>
      )}
      {!ttLoading && ttError && (
        <View style={s.centerWrap}>
          <Ionicons name="alert-circle-outline" size={40} color={COLORS.danger} />
          <Text style={[s.emptyTxt, { color: COLORS.danger }]}>{ttError}</Text>
        </View>
      )}
      {!ttLoading && !ttError && timetable.length === 0 && (
        <View style={s.centerWrap}>
          <Ionicons name="calendar-outline" size={40} color={COLORS.textMuted} />
          <Text style={s.emptyTxt}>No timetable entries found.</Text>
        </View>
      )}

      {!ttLoading && !ttError && timetable.length > 0 && (
        <ScrollView
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.dayRow}>
            <View style={s.dayDot} />
            <Text style={s.dayTitle}>{activeDayName} classes</Text>
            {slotsForDay.length > 0 && (
              <View style={s.dayCountChip}>
                <Text style={s.dayCountTxt}>
                  {slotsForDay.length} class{slotsForDay.length !== 1 ? 'es' : ''}
                </Text>
              </View>
            )}
          </View>

          {slotsForDay.length === 0 ? (
            <View style={s.noClassCard}>
              <Ionicons name="time-outline" size={44} color={COLORS.textMuted} />
              <Text style={s.noClassTitle}>No classes scheduled</Text>
              <Text style={s.noClassSub}>
                No classes on {activeDayName} ({formatDisplayDate(selectedDate)}).{'\n'}
                Try selecting a different date.
              </Text>
              <TouchableOpacity style={s.changeDateBtn} onPress={() => setCalendarOpen(true)}>
                <Ionicons name="calendar-outline" size={15} color={COLORS.accent} />
                <Text style={s.changeDateTxt}>Change Date</Text>
              </TouchableOpacity>
            </View>
          ) : (
            slotsForDay.map(slot => (
              <TouchableOpacity
                key={slot.id}
                style={s.schedCard}
                onPress={() => setSelSlot(slot)}
                activeOpacity={0.85}
              >
                {/* LEFT: time badge */}
                <View style={s.schedBadge}>
                  <Ionicons name="time-outline" size={13} color={COLORS.accent} style={{ marginBottom: 4 }} />
                  <Text style={s.schedBadgeTxt}>{slot.time_slot}</Text>
                </View>

                {/* CENTER: subject + section chip */}
                <View style={{ flex: 1 }}>
                  <Text style={s.schedSubject}>{slot.subject}</Text>
                  {(slot.section || slot.year) && (
                    <View style={s.classChip}>
                      <Text style={s.classChipText}>
                        {[slot.section, formatYear(slot.year)].filter(Boolean).join(' • ')}
                      </Text>
                    </View>
                  )}
                </View>

                {/* RIGHT: arrow */}
                <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles: DateBanner ───────────────────────────────────────────────────────
const b = StyleSheet.create({
  container:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.cardBg, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2, gap: SPACING.sm, ...SHADOWS.card, shadowOpacity: 0.04, elevation: 2 },
  dateRow:      { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.sm },
  calIcon:      { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: COLORS.primary + '12', alignItems: 'center', justifyContent: 'center' },
  dateTextWrap: { flex: 1 },
  dateLabel:    { fontSize: FONTS.sizes.xs - 1, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  dateValue:    { fontSize: FONTS.sizes.sm, fontWeight: '800', color: COLORS.textPrimary, marginTop: 1 },
  todayChip:    { backgroundColor: COLORS.success + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.success + '40' },
  todayChipTxt: { fontSize: 10, fontWeight: '800', color: COLORS.success, letterSpacing: 0.3 },
  selectBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.primary, paddingHorizontal: 11, paddingVertical: 9, borderRadius: RADIUS.md, ...SHADOWS.button, shadowOpacity: 0.2 },
  selectBtnTxt: { fontSize: FONTS.sizes.xs, fontWeight: '800', color: COLORS.accent, letterSpacing: 0.3 },
});

// ─── Styles: SummaryView ─────────────────────────────────────────────────────
const sv = StyleSheet.create({
  scroll: { padding: SPACING.lg, paddingBottom: 100 },

  heroBadge:  { alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: RADIUS.xl, padding: SPACING.xl, marginBottom: SPACING.lg, ...SHADOWS.card, borderWidth: 1, borderColor: COLORS.cardBorder },
  heroCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.success + '14', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  heroTitle:  { fontSize: FONTS.sizes.xl, fontWeight: '900', color: COLORS.textPrimary, textAlign: 'center' },
  heroSub:    { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },
  heroSub2:   { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },
  dateChip:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.primary + '12', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, marginTop: SPACING.sm },
  dateChipTxt:{ fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.primary },

  infoCard: { backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, marginBottom: SPACING.lg, ...SHADOWS.card, borderWidth: 1, borderColor: COLORS.cardBorder, overflow: 'hidden' },
  infoRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder + '80', gap: SPACING.sm },
  infoIconWrap: { width: 28, height: 28, borderRadius: RADIUS.sm, backgroundColor: COLORS.primary + '12', alignItems: 'center', justifyContent: 'center' },
  infoLabel:{ fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.textMuted, width: 70 },
  infoVal:  { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textPrimary, flex: 1, textAlign: 'right' },

  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  statBox:  { flex: 1, alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, paddingHorizontal: 4, borderWidth: 1.5, ...SHADOWS.card },
  statVal:  { fontSize: FONTS.sizes.xl, fontWeight: '900' },
  statLbl:  { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginTop: 2, textAlign: 'center' },

  absentCard:      { backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.lg, ...SHADOWS.card, borderWidth: 1, borderColor: COLORS.cardBorder },
  absentHeader:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm },
  absentTitle:     { fontSize: FONTS.sizes.md, fontWeight: '800', color: COLORS.textPrimary },
  absentRow:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  absentAvatar:    { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.danger + '14', alignItems: 'center', justifyContent: 'center' },
  absentAvatarTxt: { fontSize: FONTS.sizes.sm, fontWeight: '800', color: COLORS.danger },
  absentRoll:      { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.primary },
  absentName:      { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textPrimary },
  absentBadge:     { backgroundColor: COLORS.danger + '14', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  absentBadgeTxt:  { fontSize: 10, fontWeight: '800', color: COLORS.danger },

  allPresentCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.success + '12', borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.success + '30' },
  allPresentTxt:  { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.success },

  actionBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 15 },
  actionBtnTxt: { fontSize: FONTS.sizes.md, fontWeight: '800', color: COLORS.accent },
});

// ─── Styles: Main screen ──────────────────────────────────────────────────────
const s = StyleSheet.create({
  header:      { paddingTop: 62, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.lg },
  headerTitle: { fontSize: FONTS.sizes.xxxl, fontWeight: '900', color: COLORS.secondary },
  headerSub:   { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.6)', marginTop: 4 },

  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  loadTxt:    { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
  emptyTxt:   { fontSize: FONTS.sizes.md, color: COLORS.textMuted, textAlign: 'center' },

  dayRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  dayDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  dayTitle:     { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.textPrimary, flex: 1 },
  dayCountChip: { backgroundColor: COLORS.primary + '12', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  dayCountTxt:  { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.primary },

  schedCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.card, borderWidth: 1, borderColor: COLORS.cardBorder, gap: 14 },
  schedBadge:    { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 10, minWidth: 90, alignItems: 'center', justifyContent: 'center' },
  schedBadgeTxt: { fontSize: 11, fontWeight: '800', color: COLORS.accent, textAlign: 'center', lineHeight: 16 },
  schedSubject:  { fontSize: FONTS.sizes.md + 1, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: 0.1 },
  schedMeta:     { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 3 },
  schedArrow:    {},

  stuCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: RADIUS.md, paddingVertical: 11, paddingHorizontal: SPACING.md, ...SHADOWS.card, borderWidth: 0.5, borderColor: COLORS.cardBorder, overflow: 'hidden' },
  stuStatusBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: RADIUS.md, borderBottomLeftRadius: RADIUS.md },
  stuLeft:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  stuInfo:      { flex: 1 },
  stuRoll:      { fontSize: FONTS.sizes.xs, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.5 },
  stuName:      { fontSize: FONTS.sizes.xs, fontWeight: '500', color: COLORS.textMuted, marginTop: 1 },

  tag:             { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tagPresent:      { backgroundColor: '#22C55E' },
  tagAbsent:       { backgroundColor: '#EF4444' },
  tagUnmarked:     { borderWidth: 1.5, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' },
  tagText:         { fontSize: 12, fontWeight: '700' },
  tagTextPresent:  { color: '#fff' },
  tagTextAbsent:   { color: '#fff' },
  tagTextUnmarked: { color: '#94A3B8' },

  classHead:      { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2, backgroundColor: COLORS.cardBg, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder, ...SHADOWS.card, shadowOpacity: 0.04, elevation: 2 },
  backBtn:        { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: COLORS.bgLight, alignItems: 'center', justifyContent: 'center' },
  classHeadTitle: { fontSize: FONTS.sizes.md, fontWeight: '800', color: COLORS.textPrimary },
  classHeadMeta:  { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  presPill:       { backgroundColor: COLORS.primary + '14', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  presPillTxt:    { fontSize: FONTS.sizes.xs, fontWeight: '800', color: COLORS.primary },

  warnBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.warning + '18', paddingHorizontal: SPACING.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.warning + '30' },
  warnTxt:    { fontSize: FONTS.sizes.xs, fontWeight: '600', color: COLORS.warning },

  strip:     { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },
  stripSep:  { width: 1, height: 24, backgroundColor: COLORS.cardBorder, marginHorizontal: SPACING.sm },
  stripItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  stripDot:  { width: 7, height: 7, borderRadius: 4 },
  stripLbl:  { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: '600', flex: 1 },
  stripVal:  { fontSize: FONTS.sizes.sm, fontWeight: '800' },

  submitFooter:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.cardBg, borderTopWidth: 1, borderTopColor: COLORS.cardBorder, padding: SPACING.md },
  submitBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 15 },
  submitBtnDisabled: { backgroundColor: COLORS.textMuted, opacity: 0.6 },
  submitTxt:         { fontSize: FONTS.sizes.md, fontWeight: '800', color: COLORS.accent },

  noClassCard:   { alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: RADIUS.xl, padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.cardBorder, ...SHADOWS.card, gap: SPACING.sm },
  noClassTitle:  { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.textPrimary },
  noClassSub:    { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  changeDateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.lg, marginTop: SPACING.sm },
  changeDateTxt: { fontSize: FONTS.sizes.sm, fontWeight: '800', color: COLORS.accent },

  classChip: {
    marginTop: 7,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary + '13',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '35',
  },
  classChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
});

// ─── Styles: PasswordModal ────────────────────────────────────────────────────
const pw = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.lg },
  sheet:      { width: '100%', backgroundColor: COLORS.cardBg, borderRadius: RADIUS.xl, padding: SPACING.lg, ...SHADOWS.card },
  title:      { fontSize: FONTS.sizes.lg, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 4 },
  sub:        { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginBottom: SPACING.md },
  input:      { borderWidth: 1.5, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: FONTS.sizes.md, color: COLORS.textPrimary, backgroundColor: COLORS.bgLight, marginBottom: SPACING.sm },
  error:      { fontSize: FONTS.sizes.xs, color: COLORS.danger, fontWeight: '600', marginBottom: SPACING.sm },
  btnRow:     { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  cancelBtn:  { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.cardBorder, alignItems: 'center', justifyContent: 'center' },
  cancelTxt:  { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textMuted },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  confirmTxt: { fontSize: FONTS.sizes.sm, fontWeight: '800', color: COLORS.accent },
});