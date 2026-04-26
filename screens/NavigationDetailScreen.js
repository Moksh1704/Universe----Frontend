/**
 * NavigationDetailScreen.js
 *
 * Google Maps–style navigation detail screen.
 *   • Top 75 % → react-native-maps MapView (real map, marker, user location)
 *   • Bottom 25 % → draggable animated bottom sheet (collapses / expands)
 *   • Floating "Open in Google Maps" FAB
 *
 * Required packages (install once):
 *   npx expo install react-native-maps
 *   npx expo install react-native-gesture-handler react-native-reanimated
 *   npx expo install expo-location
 *
 * Usage in NavigationScreen (replace Modal openDetail with):
 *   navigation.navigate('NavigationDetailScreen', { location: loc, type: 'campus' | 'indoor' });
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Dimensions,
  ScrollView,
  Platform,
  StatusBar,
  Animated,
  PanResponder,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

// ─── Category configs (mirrored from NavigationScreen) ───────────────────────
const CAMPUS_CAT = {
  academic:       { icon: 'school-outline',        color: '#2471A3', label: 'Academic'   },
  library:        { icon: 'library-outline',        color: '#117A65', label: 'Library'    },
  innovation:     { icon: 'bulb-outline',           color: '#784212', label: 'Innovation' },
  administration: { icon: 'business-outline',       color: '#6C3483', label: 'Admin'      },
  health:         { icon: 'medkit-outline',         color: '#C0392B', label: 'Health'     },
  food:           { icon: 'restaurant-outline',     color: '#D68910', label: 'Food'       },
  bank:           { icon: 'card-outline',           color: '#1A5276', label: 'Bank'       },
  entertainment:  { icon: 'musical-notes-outline',  color: '#7D6608', label: 'Events'     },
  sports:         { icon: 'football-outline',       color: '#1E8449', label: 'Sports'     },
  hostel:         { icon: 'home-outline',           color: '#5D6D7E', label: 'Hostel'     },
};

const INDOOR_CAT = {
  classroom:      { icon: 'school-outline',    color: '#2471A3', label: 'Classroom' },
  lab:            { icon: 'flask-outline',     color: '#117A65', label: 'Lab'       },
  cabin:          { icon: 'person-outline',    color: '#6C3483', label: 'Faculty'   },
  washroom:       { icon: 'water-outline',     color: '#5D6D7E', label: 'Washroom'  },
  office:         { icon: 'briefcase-outline', color: '#784212', label: 'Office'    },
  'seminar hall': { icon: 'people-outline',    color: '#C0392B', label: 'Seminar'   },
};

// ─── Sheet snap points ────────────────────────────────────────────────────────
const SCREEN_HEIGHT      = Dimensions.get('window').height;
const COLLAPSED_HEIGHT   = SCREEN_HEIGHT * 0.28;   // 28 % → visible when collapsed
const EXPANDED_HEIGHT    = SCREEN_HEIGHT * 0.65;   // 65 % → fully expanded
const DRAG_THRESHOLD     = 60;                      // px drag needed to toggle state

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NavigationDetailScreen({ route, navigation }) {
  const { location: loc, type } = route.params;
  const isCampus = type === 'campus';

  // Category config
  const catCfg = isCampus
    ? CAMPUS_CAT[loc.category] || { icon: 'location-outline', color: COLORS.primary, label: loc.category }
    : INDOOR_CAT[(loc.category || '').toLowerCase()] || { icon: 'location-outline', color: COLORS.primary, label: loc.category };

  // ── Map ref ──────────────────────────────────────────────────────────────
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }
    })();
  }, []);

  // ── Bottom sheet animation ────────────────────────────────────────────────
  const [isExpanded, setIsExpanded]   = useState(false);
  const sheetAnim                     = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const dragStartY                    = useRef(0);
  const dragStartHeight               = useRef(COLLAPSED_HEIGHT);

  const animateSheet = useCallback((toExpanded) => {
    const toValue = toExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
    Animated.spring(sheetAnim, {
      toValue,
      useNativeDriver: false,
      bounciness: 4,
      speed: 14,
    }).start();
    setIsExpanded(toExpanded);
  }, [sheetAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: (_, gs) => {
        dragStartY.current      = gs.y0;
        dragStartHeight.current = isExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
      },
      onPanResponderMove: (_, gs) => {
        const newH = dragStartHeight.current - gs.dy;
        const clamped = Math.min(Math.max(newH, COLLAPSED_HEIGHT), EXPANDED_HEIGHT);
        sheetAnim.setValue(clamped);
      },
      onPanResponderRelease: (_, gs) => {
        // Drag UP → expand; drag DOWN → collapse
        if (gs.dy < -DRAG_THRESHOLD) { animateSheet(true);  return; }
        if (gs.dy >  DRAG_THRESHOLD) { animateSheet(false); return; }
        // Snap back to current state if threshold not crossed
        animateSheet(isExpanded);
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ).current;

  // ── Open Google Maps ──────────────────────────────────────────────────────
  const openGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
    Linking.openURL(url);
  };

  // ── Map region ────────────────────────────────────────────────────────────
  const mapRegion = {
    latitude:       loc.lat,
    longitude:      loc.lng,
    latitudeDelta:  0.002,
    longitudeDelta: 0.002,
  };

  // ── Step-by-step parser ───────────────────────────────────────────────────
  const steps = loc.steps
    ? loc.steps.split('\n').map(s => s.trim()).filter(Boolean)
    : loc.steps
    ? [loc.steps]
    : [];

  // ── Map height (inverse of sheet) ────────────────────────────────────────
  const mapHeight = sheetAnim.interpolate({
    inputRange:  [COLLAPSED_HEIGHT, EXPANDED_HEIGHT],
    outputRange: [SCREEN_HEIGHT - COLLAPSED_HEIGHT, SCREEN_HEIGHT - EXPANDED_HEIGHT],
    extrapolate: 'clamp',
  });

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* ── Animated Map Area ── */}
      <Animated.View style={[s.mapContainer, { height: mapHeight }]}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={mapRegion}
          showsUserLocation={!!userLocation}
          showsMyLocationButton={false}
          showsCompass
          zoomEnabled
          scrollEnabled
          rotateEnabled
        >
          <Marker
            coordinate={{ latitude: loc.lat, longitude: loc.lng }}
            title={loc.name}
            description={loc.description || loc.building}
            pinColor={catCfg.color}
          />
        </MapView>

        {/* Back button */}
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>

        {/* Re-centre button */}
        <TouchableOpacity
          style={s.recenterBtn}
          onPress={() => mapRef.current?.animateToRegion(mapRegion, 600)}
          activeOpacity={0.85}
        >
          <Ionicons name="locate-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Animated Bottom Sheet ── */}
      <Animated.View style={[s.sheet, { height: sheetAnim }]}>

        {/* Drag Handle */}
        <View style={s.handleWrap} {...panResponder.panHandlers}>
          <View style={s.handle} />
        </View>

        {/* ── Collapsed Content (always visible) ── */}
        <View style={s.sheetHeader} {...panResponder.panHandlers}>
          {/* Category badge */}
          <View style={[s.catBadge, { backgroundColor: catCfg.color + '18' }]}>
            <Ionicons name={catCfg.icon} size={13} color={catCfg.color} />
            <Text style={[s.catBadgeTxt, { color: catCfg.color }]}>{catCfg.label}</Text>
          </View>

          {/* Name */}
          <Text style={s.locName} numberOfLines={isExpanded ? 3 : 1}>{loc.name}</Text>
        </View>

        {/* ── Expanded Content (inside scroll) ── */}
        <ScrollView
          style={s.sheetScroll}
          contentContainerStyle={s.sheetScrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={isExpanded}
        >

          {/* Indoor: building / floor / room grid */}
          {!isCampus && (
            <>
              <View style={s.infoGrid}>
                <InfoTile label="Building" value={loc.building} />
                <InfoTile label="Floor"    value={loc.floor}    />
                <InfoTile label="Room"     value={loc.room || '—'} />
              </View>

            </>
          )}

          {/* Campus: keywords */}
          {isCampus && !!loc.keywords && (
            <View style={s.keywordsRow}>
              <Ionicons name="pricetag-outline" size={14} color={COLORS.textMuted} />
              <Text style={s.keywordsTxt}>{loc.keywords}</Text>
            </View>
          )}

          {/* Entrance */}
          {!isCampus && !!loc.entrance && (
            <NavCard
              icon="enter-outline"
              title="Entrance"
              color={catCfg.color}
            >
              <Text style={s.entranceTxt}>{loc.entrance}</Text>
            </NavCard>
          )}

          {/* Steps */}
          {!isCampus && steps.length > 0 && (
            <NavCard
              icon="footsteps-outline"
              title="How to reach"
              color={catCfg.color}
            >
              {steps.map((step, i) => (
                <View key={i} style={s.stepRow}>
                  <View style={[s.stepBubble, { backgroundColor: catCfg.color }]}>
                    <Text style={s.stepNum}>{i + 1}</Text>
                  </View>
                  <Text style={s.stepTxt}>{step}</Text>
                </View>
              ))}
            </NavCard>
          )}


          <View style={{ height: 24 }} />
        </ScrollView>
      </Animated.View>

      {/* ── Floating "Open in Google Maps" button ── */}
      <TouchableOpacity style={s.fab} onPress={openGoogleMaps} activeOpacity={0.88}>
        <Ionicons name="navigate" size={18} color="#fff" />
        <Text style={s.fabTxt}>Open in Google Maps</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Small reusable components ────────────────────────────────────────────────
const InfoTile = ({ label, value }) => (
  <View style={s.infoTile}>
    <Text style={s.infoTileLabel}>{label}</Text>
    <Text style={s.infoTileVal} numberOfLines={2}>{value}</Text>
  </View>
);

const NavCard = ({ icon, title, color, children }) => (
  <View style={s.navCard}>
    <View style={s.navCardHead}>
      <Ionicons name={icon} size={17} color={color} />
      <Text style={s.navCardTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },

  // Map
  mapContainer: { width: '100%', overflow: 'hidden' },
  backBtn: {
    position: 'absolute', top: 52, left: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 6 },
    }),
  },
  recenterBtn: {
    position: 'absolute', top: 52, right: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 6 },
    }),
  },

  // Bottom Sheet
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: -4 } },
      android: { elevation: 14 },
    }),
  },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db' },

  // Sheet header (always visible)
  sheetHeader: { paddingHorizontal: 20, paddingBottom: 14, gap: 5 },
  catBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  catBadgeTxt: { fontSize: 11, fontWeight: '700' },
  locName:     { fontSize: 18, fontWeight: '800', color: '#111827', lineHeight: 24 },

  // Scroll area
  sheetScroll:        { flex: 1 },
  sheetScrollContent: { paddingHorizontal: 16, gap: 12 },

  // Info grid (building / floor / room)
  infoGrid:      { flexDirection: 'row', gap: 8 },
  infoTile:      { flex: 1, backgroundColor: '#f9fafb', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  infoTileLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoTileVal:   { fontSize: 12, fontWeight: '800', color: '#111827', textAlign: 'center' },

  // Keywords
  keywordsRow: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  keywordsTxt: { fontSize: 12, color: '#6b7280', flex: 1 },

  // Nav cards (entrance / steps / GPS)
  navCard:     { backgroundColor: '#f9fafb', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', gap: 10 },
  navCardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  navCardTitle:{ fontSize: 14, fontWeight: '800', color: '#111827' },

  // Entrance
  entranceTxt: { fontSize: 13, color: '#374151', lineHeight: 20 },

  // Steps
  stepRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 2 },
  stepBubble: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1 },
  stepNum:    { fontSize: 11, fontWeight: '800', color: '#fff' },
  stepTxt:    { fontSize: 13, color: '#374151', flex: 1, lineHeight: 20 },

  // FAB
  fab: {
    position: 'absolute', bottom: COLLAPSED_HEIGHT + 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1a73e8',
    paddingVertical: 13, paddingHorizontal: 18,
    borderRadius: 28,
    ...Platform.select({
      ios:     { shadowColor: '#1a73e8', shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 8 },
    }),
  },
  fabTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});