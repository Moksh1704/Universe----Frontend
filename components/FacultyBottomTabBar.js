import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS } from '../constants/theme';

const TABS = [
  { name: 'Timetable',  icon: 'time',             outline: 'time-outline',              label: 'Timetable'  },
  { name: 'Attendance', icon: 'checkmark-circle',  outline: 'checkmark-circle-outline',  label: 'Attendance' },
  { name: 'Profile',    icon: 'person-circle',     outline: 'person-circle-outline',     label: 'Profile'    },
];

export default function FacultyBottomTabBar({ state, navigation }) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const tab = TABS.find(t => t.name === route.name) || TABS[0];
        const focused = state.index === index;
        return (
          <TouchableOpacity key={route.key} style={styles.tab} onPress={() => navigation.navigate(route.name)} activeOpacity={0.7}>
            {focused && <View style={styles.indicator} />}
            <Ionicons name={focused ? tab.icon : tab.outline} size={26} color={focused ? COLORS.accent : COLORS.tabBarInactive} />
            <Text style={[styles.label, focused && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row', backgroundColor: COLORS.primary,
    paddingBottom: 22, paddingTop: 12,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 20,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, position: 'relative' },
  indicator: { position: 'absolute', top: -12, width: 44, height: 4, borderRadius: 2, backgroundColor: COLORS.accent },
  label: { fontSize: 11, fontWeight: '600', color: COLORS.tabBarInactive },
  labelActive: { color: COLORS.accent, fontWeight: '800' },
});
