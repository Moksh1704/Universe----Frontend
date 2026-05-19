import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const ROLES = [
  { key: 'student', label: 'Student', icon: 'school-outline' },
  { key: 'faculty', label: 'Faculty', icon: 'person-circle-outline' },
];

export default function RoleSelectionScreen({ navigation }) {
  // Guard: if navigation is somehow undefined (edge case in prod), fail silently
  if (!navigation) return null;

  // Prevent double-tap triggering multiple navigations
  const isNavigating = useRef(false);

  const handleSelect = async (role) => {
    // Guard: invalid role or already navigating
    if (!role || isNavigating.current) return;
    isNavigating.current = true;

    try {
      await AsyncStorage.setItem('userRole', role);
      console.log('[RoleSelection] Role saved to AsyncStorage:', role);
    } catch (storageError) {
      // Non-fatal: log and continue — navigation should still proceed
      console.warn('[RoleSelection] AsyncStorage write failed:', storageError?.message ?? storageError);
    }

    try {
      // requestAnimationFrame defers navigation by one frame — prevents
      // navigator state mutation crashes in production APK (EAS build)
      // where JS executes faster than Expo Go's dev bundle.
      // replace() is used instead of navigate() to:
      //   1. Remove RoleSelectionScreen from the stack (no back to role picker after login)
      //   2. Prevent double-mount / back-navigation race conditions in prod
      requestAnimationFrame(() => {
        navigation.replace('Login', { role });
      });
    } catch (navError) {
      console.error('[RoleSelection] Navigation to Login failed:', navError?.message ?? navError);
      // Reset flag so user can retry
      isNavigating.current = false;
    }
  };

  const handleBack = () => {
    try {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (err) {
      console.warn('[RoleSelection] goBack failed:', err?.message ?? err);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryMid, COLORS.primaryLight]}
        style={s.header}
      >
        {/* Back Button */}
        <TouchableOpacity onPress={handleBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>

        <View style={s.logoRing}>
          <Image
            source={require('../assets/logo.png')}
            style={s.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={s.title}>Welcome</Text>
        <Text style={s.subtitle}>Choose your role to continue</Text>
      </LinearGradient>

      {/* Cards */}
      <View style={s.cardsContainer}>
        {ROLES.map((role) => (
          <TouchableOpacity
            key={role.key}
            style={s.card}
            onPress={() => handleSelect(role.key)}
            activeOpacity={0.88}
          >
            <View style={s.iconWrap}>
              <Ionicons name={role.icon} size={22} color={COLORS.primary} />
            </View>

            <Text style={s.roleTitle}>{role.label}</Text>

            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
  },

  header: {
    paddingTop: 70,
    paddingBottom: 70,
    paddingHorizontal: SPACING.lg,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    alignItems: 'center',
  },

  // 🔥 SAME STYLE AS LOGIN
  backBtn: {
    position: 'absolute',
    top: 55,
    left: SPACING.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoRing: {
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(245,197,24,0.3)',
  },

  logo: {
    width: 70,
    height: 70,
  },

  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },

  subtitle: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },

  cardsContainer: {
    marginTop: 40,
    paddingHorizontal: SPACING.md,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    paddingVertical: 20,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...SHADOWS.card,
  },

  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  roleTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});