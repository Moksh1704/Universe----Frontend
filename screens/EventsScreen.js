import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, StatusBar, TextInput,
  ScrollView, Linking, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { apiRequest } from '../api/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import AppHeader from '../components/AppHeader';

const CATEGORIES = ['All', 'Technical', 'Cultural', 'Sports', 'Workshops'];

const EventCard = ({ event }) => {
  // Resolve form link from any field name the backend might return
 const formLink =
  event.formUrl ||   // ✅ THIS IS THE KEY FIX
  event.google_form_url ||
  event.form_url ||
  event.registration_link ||
  event.formLink;
  const hasForm  = Boolean(formLink);

  const handleRegister = async () => {
    if (!hasForm) return; // button is disabled when no form link — guard just in case

    try {
      const canOpen = await Linking.canOpenURL(formLink);
      if (canOpen) {
        await Linking.openURL(formLink);
      } else {
        Alert.alert('Invalid Link', 'This registration link cannot be opened on your device.');
      }
    } catch (err) {
      Alert.alert('Error', 'Something went wrong while opening the registration link. Please try again.');
    }
  };

  return (
    <View style={s.card}>
      <View style={[s.colorBar, { backgroundColor: event.color || COLORS.primary }]} />
      <View style={s.cardBody}>

        {/* ── Card header: icon + category + title ── */}
        <View style={s.cardHead}>
          <View style={[s.catIcon, { backgroundColor: (event.color || COLORS.primary) + '1E' }]}>
            <Ionicons name="calendar" size={20} color={event.color || COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.catLabel, { color: event.color || COLORS.primary }]}>
              {event.category?.toUpperCase()}
            </Text>
            <Text style={s.eventTitle}>{event.title}</Text>
          </View>
        </View>

        {/* ── Meta: date/time + venue ── */}
        <View style={s.metaRow}>
          <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
          <Text style={s.metaTxt}>{event.date} · {event.time}</Text>
        </View>
        <View style={s.metaRow}>
          <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
          <Text style={s.metaTxt}>{event.venue}</Text>
        </View>

        <Text style={s.desc}>{event.description}</Text>

        {/* ── Registration button ── */}
        {hasForm ? (
          // Form link present → active button that opens Google Form
          <TouchableOpacity
            style={s.regBtn}
            onPress={handleRegister}
            activeOpacity={0.85}
          >
            <Ionicons name="open-outline" size={16} color={COLORS.secondary} />
            <Text style={s.regBtnTxt}>Register</Text>
          </TouchableOpacity>
        ) : (
          // No form link → disabled "unavailable" button, no API call
          <View style={s.regBtnDisabled}>
            <Ionicons name="ban-outline" size={16} color={COLORS.textMuted} />
            <Text style={s.regBtnDisabledTxt}>No Registration Available</Text>
          </View>
        )}

      </View>
    </View>
  );
};

export default function EventsScreen() {
  const [events,     setEvents]    = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]    = useState('');
  const [category,   setCategory]  = useState('All');

  const fetchEvents = useCallback(async (isPullRefresh = false) => {
    isPullRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const data = await apiRequest('/events');
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log('Events error:', e);
    } finally {
      isPullRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents])
  );

  const filtered = events.filter(ev => {
    const q      = search.trim().toLowerCase();
    const matchQ = !q || ev.title?.toLowerCase().includes(q) || ev.description?.toLowerCase().includes(q) || ev.venue?.toLowerCase().includes(q);
    const matchC = category === 'All' || ev.category?.toLowerCase() === category.toLowerCase();
    return matchQ && matchC;
  });

  if (loading) {
    return (
      <View style={s.container}>
        <Text style={{ textAlign: 'center', marginTop: 50, color: COLORS.textMuted }}>Loading events…</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <AppHeader
        title="Events"
        subtitle="Campus events and activities"
      />

      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search events…"
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={17} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={s.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
          {CATEGORIES.map(cat => {
            const active = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[s.pill, active && s.pillActive]}
                onPress={() => setCategory(cat)}
                activeOpacity={0.8}
              >
                <Text style={[s.pillTxt, active && s.pillActiveTxt]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => String(i.id)}
        renderItem={({ item }) => <EventCard event={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        refreshing={refreshing}
        onRefresh={() => fetchEvents(true)}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Ionicons name="calendar-outline" size={40} color={COLORS.textMuted} />
            <Text style={s.empty}>No events found.</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: COLORS.bgLight },
  header:            { paddingTop: 62, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.lg },
  headerTitle:       { fontSize: FONTS.sizes.xxxl, fontWeight: '900', color: COLORS.secondary },
  headerSub:         { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  searchWrap:        { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  searchBar:         { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.cardBorder, paddingHorizontal: SPACING.md, paddingVertical: 11, ...SHADOWS.card },
  searchInput:       { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textPrimary },
  filterWrap:        { paddingBottom: SPACING.sm },
  filterScroll:      { paddingHorizontal: SPACING.md, gap: SPACING.sm },
  pill:              { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.cardBg, borderWidth: 1.5, borderColor: COLORS.cardBorder },
  pillActive:        { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillTxt:           { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary },
  pillActiveTxt:     { color: COLORS.secondary, fontWeight: '700' },
  list:              { padding: SPACING.md, paddingBottom: 110 },
  emptyWrap:         { alignItems: 'center', paddingTop: 40, gap: SPACING.sm },
  empty:             { textAlign: 'center', color: COLORS.textMuted },
  card:              { backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, marginBottom: SPACING.md, overflow: 'hidden', ...SHADOWS.card, borderWidth: 1, borderColor: COLORS.cardBorder },
  colorBar:          { height: 5 },
  cardBody:          { padding: SPACING.md },
  cardHead:          { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.sm },
  catIcon:           { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  catLabel:          { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  eventTitle:        { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  metaRow:           { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  metaTxt:           { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  desc:              { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginVertical: SPACING.sm },
  // Active register button (form link present)
  regBtn:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: 12 },
  regBtnTxt:         { color: COLORS.secondary, fontWeight: '800' },
  // Disabled state (no form link)
  regBtnDisabled:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: COLORS.cardBg, borderRadius: RADIUS.full, paddingVertical: 12, borderWidth: 1.5, borderColor: COLORS.cardBorder },
  regBtnDisabledTxt: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONTS.sizes.sm },
});