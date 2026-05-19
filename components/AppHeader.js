import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

export default function AppHeader({ title, subtitle, rightComponent }) {
  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryMid]}
      style={s.header}
    >
      <StatusBar barStyle="light-content" />

      <View style={s.inner}>
        {/* Left side */}
        <View>
          <Text style={s.title}>{title}</Text>
          {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
        </View>

        {/* Right side (optional: icons, badges, etc.) */}
        {rightComponent && (
          <View style={s.right}>
            {rightComponent}
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  header: {
    paddingTop: (StatusBar.currentHeight || 44) + 30,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },

  inner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  title: {
    fontSize: FONTS.sizes.xxxl,
    fontWeight: '900',
    color: COLORS.secondary,
  },

  subtitle: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },

  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});