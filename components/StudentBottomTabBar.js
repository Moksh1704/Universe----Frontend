import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/theme';
import { SvgXml } from 'react-native-svg';

const LOCATION_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M536.5-503.5Q560-527 560-560t-23.5-56.5Q513-640 480-640t-56.5 23.5Q400-593 400-560t23.5 56.5Q447-480 480-480t56.5-23.5ZM480-186q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Zm0 106Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z"/></svg>`;

const TABS = [
  { name:'Home',       icon:'home',             outline:'home-outline',             label:'Home'   },
  { name:'Attendance', icon:'checkmark-circle',  outline:'checkmark-circle-outline',  label:'Attend' },
  { name:'Feed',       icon:'newspaper',         outline:'newspaper-outline',         label:'Feed'   },
  { name:'Events',     icon:'calendar',          outline:'calendar-outline',          label:'Events' },
  { name:'Navigation', label:'Map' },
];

export default function StudentBottomTabBar({ state, navigation }) {
  return (
    <View style={s.bar}>
      {state.routes.map((route, index) => {
        const tab = TABS.find(t => t.name === route.name) || TABS[0];
        const focused = state.index === index;
        const color = focused ? COLORS.accent : COLORS.tabBarInactive;
        return (
          <TouchableOpacity
            key={route.key}
            style={s.tab}
            onPress={() => navigation.navigate(route.name)}
            activeOpacity={0.7}
          >
            {focused && <View style={s.indicator} />}

            {route.name === 'Navigation'
              ? <SvgXml
                  xml={LOCATION_SVG.replace('fill="#e3e3e3"', `fill="${color}"`)}
                  width={21}
                  height={21}
                />
              : <Ionicons
                  name={focused ? tab.icon : tab.outline}
                  size={21}
                  color={color}
                />
            }

            <Text style={[s.label, focused && s.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar:         { flexDirection:'row', backgroundColor: COLORS.primary, paddingBottom:20, paddingTop:10, borderTopLeftRadius:20, borderTopRightRadius:20, shadowColor: COLORS.primary, shadowOffset:{width:0,height:-4}, shadowOpacity:0.4, shadowRadius:20, elevation:20 },
  tab:         { flex:1, alignItems:'center', justifyContent:'center', gap:2, position:'relative' },
  indicator:   { position:'absolute', top:-10, width:32, height:3, borderRadius:2, backgroundColor: COLORS.accent },
  label:       { fontSize:8, fontWeight:'600', color: COLORS.tabBarInactive },
  labelActive: { color: COLORS.accent, fontWeight:'800' },
});