/**
 * MDTScheduleModal — built-in calendar + time picker, zero external deps.
 *
 * Features:
 *  • Month calendar grid with prev/next navigation
 *  • Selected date highlighted with primary color
 *  • Hour (1–12), minute (00 / 15 / 30 / 45), AM/PM selector
 *  • Smooth spring slide-up from bottom
 *  • Returns formatted label like "Thu 29 May, 9:30 AM"
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../theme';
import Icon from './Icon';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1–12
const MINUTES = ['00', '15', '30', '45'];

export interface MDTSchedule {
  date: Date;
  hour: number;   // 1–12
  minute: string; // '00' | '15' | '30' | '45'
  ampm: 'AM' | 'PM';
}

function formatSchedule(s: MDTSchedule): string {
  const dayName = s.date.toLocaleDateString('en-US', { weekday: 'short' });
  const day = s.date.getDate();
  const mon = MONTH_NAMES[s.date.getMonth()].substring(0, 3);
  return `${dayName} ${day} ${mon}, ${s.hour}:${s.minute} ${s.ampm}`;
}

interface Props {
  visible: boolean;
  initialSchedule: MDTSchedule;
  onConfirm: (schedule: MDTSchedule, label: string) => void;
  onClose: () => void;
}

export function MDTScheduleModal({ visible, initialSchedule, onConfirm, onClose }: Props) {
  const { colors, isDark } = useTheme();

  // Animation
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 3, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Calendar state
  const today = new Date();
  const [viewYear, setViewYear] = useState(initialSchedule.date.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialSchedule.date.getMonth());
  const [selectedDate, setSelectedDate] = useState(new Date(initialSchedule.date));

  // Time state
  const [hour, setHour] = useState(initialSchedule.hour);
  const [minute, setMinute] = useState(initialSchedule.minute);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(initialSchedule.ampm);

  // Re-sync when modal re-opens
  useEffect(() => {
    if (visible) {
      setViewYear(initialSchedule.date.getFullYear());
      setViewMonth(initialSchedule.date.getMonth());
      setSelectedDate(new Date(initialSchedule.date));
      setHour(initialSchedule.hour);
      setMinute(initialSchedule.minute);
      setAmpm(initialSchedule.ampm);
    }
  }, [visible]);

  // Calendar grid helpers
  function getDaysInMonth(y: number, m: number) {
    return new Date(y, m + 1, 0).getDate();
  }
  function getFirstDayOfWeek(y: number, m: number) {
    return new Date(y, m, 1).getDay(); // 0=Sun
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDow = getFirstDayOfWeek(viewYear, viewMonth);

  // Build grid cells: nulls for padding + day numbers
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  function isSameDay(d: number) {
    return (
      selectedDate.getFullYear() === viewYear &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getDate() === d
    );
  }
  function isToday(d: number) {
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === d
    );
  }

  function selectDay(d: number) {
    setSelectedDate(new Date(viewYear, viewMonth, d));
  }

  function handleConfirm() {
    const schedule: MDTSchedule = { date: selectedDate, hour, minute, ampm };
    onConfirm(schedule, formatSchedule(schedule));
  }

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Dimmed backdrop */}
        <Animated.View 
          style={[
            styles.backdrop, 
            { 
              opacity: fadeAnim, 
              backgroundColor: isDark ? 'rgba(5, 10, 18, 0.82)' : 'rgba(15, 23, 42, 0.45)' 
            }
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Drag handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>MDT Schedule</Text>
              <Text style={[styles.sheetSub, { color: colors.textMuted }]}>Pick date &amp; time</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.subtle }]}
              activeOpacity={0.8}
            >
              <Icon name="x" size={15} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            {/* ── Calendar ── */}
            <View style={[styles.calendarCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              {/* Month nav */}
              <View style={styles.monthNav}>
                <TouchableOpacity onPress={prevMonth} style={[styles.navBtn, { backgroundColor: colors.subtle }]} activeOpacity={0.7}>
                  <Icon name="chevron-left" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={[styles.monthLabel, { color: colors.foreground }]}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </Text>
                <TouchableOpacity onPress={nextMonth} style={[styles.navBtn, { backgroundColor: colors.subtle }]} activeOpacity={0.7}>
                  <Icon name="chevron-right" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Day-of-week headers */}
              <View style={styles.dowRow}>
                {DAY_LABELS.map(d => (
                  <Text key={d} style={[styles.dowLabel, { color: colors.textMuted }]}>{d}</Text>
                ))}
              </View>

              {/* Grid */}
              <View style={styles.grid}>
                {cells.map((cell, idx) => {
                  const isSelected = cell !== null && isSameDay(cell);
                  const isTod = cell !== null && isToday(cell);
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => cell !== null && selectDay(cell)}
                      activeOpacity={cell !== null ? 0.7 : 1}
                      style={[
                        styles.cell,
                        isSelected && { backgroundColor: colors.primary, borderRadius: 10 },
                        !isSelected && isTod && { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 10 },
                      ]}
                    >
                      {cell !== null && (
                        <Text style={[
                          styles.cellText,
                          { color: isSelected ? colors.primaryForeground : isTod ? colors.primary : colors.foreground },
                          isSelected && { fontWeight: '700' },
                        ]}>
                          {cell}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Time Picker ── */}
            <View style={[styles.timePicker, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.timePickerLabel, { color: colors.textMuted }]}>Meeting Time</Text>

              <View style={styles.timeRow}>
                {/* Hours */}
                <View style={styles.timeCol}>
                  <Text style={[styles.timeColLabel, { color: colors.textMuted }]}>Hour</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipScroll}
                  >
                    {HOURS.map(h => {
                      const sel = h === hour;
                      return (
                        <TouchableOpacity
                          key={h}
                          onPress={() => setHour(h)}
                          style={[
                            styles.chip,
                            { borderColor: colors.border, backgroundColor: sel ? colors.primary : colors.subtle },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.chipText, { color: sel ? colors.primaryForeground : colors.foreground }]}>
                            {h}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Minutes */}
                <View style={styles.timeCol}>
                  <Text style={[styles.timeColLabel, { color: colors.textMuted }]}>Minute</Text>
                  <View style={styles.chipRow}>
                    {MINUTES.map(m => {
                      const sel = m === minute;
                      return (
                        <TouchableOpacity
                          key={m}
                          onPress={() => setMinute(m)}
                          style={[
                            styles.chip,
                            { borderColor: colors.border, backgroundColor: sel ? colors.primary : colors.subtle },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.chipText, { color: sel ? colors.primaryForeground : colors.foreground }]}>
                            :{m}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* AM/PM */}
                <View style={styles.timeCol}>
                  <Text style={[styles.timeColLabel, { color: colors.textMuted }]}>Period</Text>
                  <View style={styles.chipRow}>
                    {(['AM', 'PM'] as const).map(p => {
                      const sel = p === ampm;
                      return (
                        <TouchableOpacity
                          key={p}
                          onPress={() => setAmpm(p)}
                          style={[
                            styles.chip,
                            { borderColor: colors.border, backgroundColor: sel ? colors.primary : colors.subtle },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.chipText, { color: sel ? colors.primaryForeground : colors.foreground }]}>
                            {p}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>

            {/* Preview */}
            <View style={[styles.preview, { backgroundColor: colors.infoHighlight, borderColor: colors.primary + '40' }]}>
              <Icon name="calendar" size={14} color={colors.primary} />
              <Text style={[styles.previewText, { color: colors.primary }]}>
                {formatSchedule({ date: selectedDate, hour, minute, ampm })}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.cancelActionBtn, { borderColor: colors.border }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelActionText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <Icon name="check" size={15} color={colors.primaryForeground} />
                <Text style={[styles.confirmText, { color: colors.primaryForeground }]}>Set Schedule</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const CELL_SIZE = Math.floor((Dimensions.get('window').width - 32 - 32 - 12) / 7);

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: SCREEN_HEIGHT * 0.88,
    paddingTop: 8,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.4 },
  sheetSub: { fontSize: 12, marginTop: 2 },
  closeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 36, gap: 14 },

  // Calendar
  calendarCard: {
    borderRadius: 16, borderWidth: 1, padding: 14,
  },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  navBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 15, fontWeight: '600' },
  dowRow: { flexDirection: 'row', marginBottom: 6 },
  dowLabel: { width: CELL_SIZE, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: CELL_SIZE, height: CELL_SIZE,
    alignItems: 'center', justifyContent: 'center',
  },
  cellText: { fontSize: 13 },

  // Time picker
  timePicker: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
  timePickerLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  timeRow: { gap: 12 },
  timeCol: { gap: 6 },
  timeColLabel: { fontSize: 11, fontWeight: '500' },
  chipScroll: { gap: 6 },
  chipRow: { flexDirection: 'row', gap: 6 },
  chip: {
    height: 34, minWidth: 40, paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  chipText: { fontSize: 13, fontWeight: '600' },

  // Preview
  preview: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  previewText: { fontSize: 13.5, fontWeight: '600' },

  // Actions
  actions: { flexDirection: 'row', gap: 10 },
  cancelActionBtn: {
    flex: 1, height: 44, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelActionText: { fontSize: 13.5, fontWeight: '600' },
  confirmBtn: {
    flex: 2, height: 44, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  confirmText: { fontSize: 13.5, fontWeight: '700' },
});
