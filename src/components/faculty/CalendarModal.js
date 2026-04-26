/**
 * src/components/faculty/CalendarModal.js
 *
 * A fully self-contained calendar modal — no external calendar libraries needed.
 * Renders a month-view grid with tap-to-select, month navigation,
 * and elegant animation using React Native's built-in Animated API.
 *
 * Props:
 *   visible       {boolean}   — whether the modal is open
 *   selectedDate  {string}    — currently selected date in "YYYY-MM-DD"
 *   onSelect      {fn(string)}— called when a date is tapped, arg is "YYYY-MM-DD"
 *   onClose       {fn()}      — called when backdrop or close button pressed
 *   maxDate       {string}    — optional "YYYY-MM-DD", dates after this are disabled
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, Dimensions, TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

/** "YYYY-MM-DD" → { year, month (0-based), day } */
const parseDate = (str) => {
  const [y, m, d] = str.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
};

/** Returns "YYYY-MM-DD" */
const toDateStr = (year, month, day) =>
  `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

/** Days in a month */
const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

/** Day-of-week for the 1st of the month (0=Sun) */
const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

export default function CalendarModal({ visible, selectedDate, onSelect, onClose, maxDate }) {
  const init = parseDate(selectedDate);
  const [viewYear,  setViewYear]  = useState(init.year);
  const [viewMonth, setViewMonth] = useState(init.month);

  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset view to the selected date's month when opened
      const p = parseDate(selectedDate);
      setViewYear(p.year);
      setViewMonth(p.month);

      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 11 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 300, duration: 220, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 0,   duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const handleDayPress = (day) => {
    const dateStr = toDateStr(viewYear, viewMonth, day);
    if (maxDate && dateStr > maxDate) return; // disabled
    onSelect(dateStr);
  };

  const renderGrid = () => {
    const totalDays = daysInMonth(viewYear, viewMonth);
    const startDow  = firstDayOfMonth(viewYear, viewMonth);
    const today     = toDateStr(...(() => { const t = new Date(); return [t.getFullYear(), t.getMonth(), t.getDate()]; })());

    const cells = [];
    // Empty prefix cells
    for (let i = 0; i < startDow; i++) {
      cells.push(<View key={`e-${i}`} style={s.dayCell} />);
    }
    // Day cells
    for (let d = 1; d <= totalDays; d++) {
      const dateStr   = toDateStr(viewYear, viewMonth, d);
      const isSelected = dateStr === selectedDate;
      const isToday    = dateStr === today;
      const isDisabled = maxDate && dateStr > maxDate;
      const isPast     = dateStr < today;

      cells.push(
        <TouchableOpacity
          key={d}
          style={[
            s.dayCell,
            isSelected && s.dayCellSelected,
            isToday && !isSelected && s.dayCellToday,
          ]}
          onPress={() => handleDayPress(d)}
          disabled={isDisabled}
          activeOpacity={0.7}
        >
          <Text style={[
            s.dayNum,
            isSelected  && s.dayNumSelected,
            isToday && !isSelected && s.dayNumToday,
            isDisabled  && s.dayNumDisabled,
            !isDisabled && !isSelected && isPast && s.dayNumPast,
          ]}>
            {d}
          </Text>
          {isToday && <View style={[s.todayDot, isSelected && { backgroundColor: COLORS.accent }]} />}
        </TouchableOpacity>
      );
    }
    return cells;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Calendar card — slides up */}
      <Animated.View
        style={[
          s.sheet,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle bar */}
        <View style={s.handleBar} />

        {/* Header */}
        <View style={s.calHeader}>
          <TouchableOpacity onPress={prevMonth} style={s.navBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <Text style={s.monthTitle}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>

          <TouchableOpacity onPress={nextMonth} style={s.navBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Day of week labels */}
        <View style={s.dowRow}>
          {DAY_LABELS.map(d => (
            <View key={d} style={s.dowCell}>
              <Text style={s.dowTxt}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Day grid */}
        <View style={s.grid}>
          {renderGrid()}
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <TouchableOpacity style={s.todayBtn} onPress={() => {
            const t = new Date();
            const str = toDateStr(t.getFullYear(), t.getMonth(), t.getDate());
            setViewYear(t.getFullYear());
            setViewMonth(t.getMonth());
            onSelect(str);
          }} activeOpacity={0.8}>
            <Ionicons name="today-outline" size={15} color={COLORS.primary} />
            <Text style={s.todayBtnTxt}>Today</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={s.closeBtnTxt}>Done</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CELL_SIZE = (SCREEN_W - SPACING.lg * 2 - 8) / 7;

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,22,40,0.55)',
    zIndex: 10,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 36,
    zIndex: 11,
    ...SHADOWS.card,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.cardBorder,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },

  // Header
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
  },

  // Day of week row
  dowRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  dowCell: {
    width: CELL_SIZE,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dowTxt: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayCellSelected: {
    backgroundColor: COLORS.primary,
    borderRadius: CELL_SIZE / 2,
  },
  dayCellToday: {
    backgroundColor: COLORS.accent + '22',
    borderRadius: CELL_SIZE / 2,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  dayNum: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dayNumSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayNumToday: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  dayNumDisabled: {
    color: COLORS.cardBorder,
  },
  dayNumPast: {
    color: COLORS.textMuted,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
    position: 'absolute',
    bottom: 5,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.bgLight,
    borderRadius: RADIUS.md,
  },
  todayBtnTxt: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.primary,
  },
  closeBtn: {
    paddingVertical: 10,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
  },
  closeBtnTxt: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '800',
    color: COLORS.accent,
  },
});