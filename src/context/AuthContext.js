/**
 * src/context/AuthContext.js
 * - Avatar persists across logout/login via AsyncStorage
 * - On session restore and new login, loads saved avatar if backend doesn't return one
 * - updateUser() auto-saves avatar_url changes to storage
 * - user.id is always persisted and restored correctly via saveAuthSession
 * - normalizeUser() ensures registration_number is ALWAYS populated from either
 *   snake_case or camelCase backend field; camelCase alias is then removed.
 */
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuthSession, saveAuthSession, clearAuthSession } from '../../api/storage';

const AVATAR_KEY = 'user_avatar_uri';

// ─── Field normalizer ─────────────────────────────────────────────────────────
// Guarantees ONE canonical field: registration_number (snake_case).
// Removes registrationNumber so nothing else in the app can accidentally use it.
function normalizeUser(user) {
  if (!user) return user;

  const registration_number =
    (user.registration_number && String(user.registration_number).trim()) ||
    (user.registrationNumber  && String(user.registrationNumber).trim())  ||
    '';

  // Destructure out registrationNumber so it never reaches state / storage
  // eslint-disable-next-line no-unused-vars
  const { registrationNumber, ...rest } = user;

  return { ...rest, registration_number };
}

// ─── State ────────────────────────────────────────────────────────────────────
const initialState = {
  isLoading:       true,
  isAuthenticated: false,
  accessToken:     null,
  refreshToken:    null,
  user:            null,
  role:            null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'RESTORE_SESSION':
      return {
        ...state,
        isLoading:       false,
        isAuthenticated: !!action.accessToken,
        accessToken:     action.accessToken,
        refreshToken:    action.refreshToken,
        user:            action.user,
        role:            action.user?.role || null,
      };
    case 'LOGIN':
      return {
        ...state,
        isLoading:       false,
        isAuthenticated: true,
        accessToken:     action.accessToken,
        refreshToken:    action.refreshToken,
        user:            action.user,
        role:            action.user?.role || null,
      };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.user } };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ── Session restore on app launch ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const session = await getAuthSession();

        // Normalize immediately — guarantees registration_number is populated
        let user = normalizeUser(session.user);

        // Restore persisted avatar if backend session doesn't include one
        if (user && !user.avatar_url) {
          const saved = await AsyncStorage.getItem(AVATAR_KEY).catch(() => null);
          if (saved) user = { ...user, avatar_url: saved };
        }

        dispatch({
          type:         'RESTORE_SESSION',
          accessToken:  session.accessToken,
          refreshToken: session.refreshToken,
          user,
        });
      } catch {
        dispatch({ type: 'RESTORE_SESSION', accessToken: null, refreshToken: null, user: null });
      }
    })();
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async ({ accessToken, refreshToken, user }) => {
    // Normalize immediately — registration_number is ready before any screen mounts
    let resolvedUser = normalizeUser(user);

    // Restore saved avatar if backend doesn't return one
    if (!resolvedUser?.avatar_url) {
      const saved = await AsyncStorage.getItem(AVATAR_KEY).catch(() => null);
      if (saved) resolvedUser = { ...resolvedUser, avatar_url: saved };
    }

    // Persist the normalized user (registrationNumber removed, registration_number set)
    await saveAuthSession({ accessToken, refreshToken, user: resolvedUser });
    dispatch({ type: 'LOGIN', accessToken, refreshToken, user: resolvedUser });
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    // Intentionally keep AVATAR_KEY so avatar persists after next login
    await clearAuthSession();
    dispatch({ type: 'LOGOUT' });
  }, []);

  // ── Update user fields ─────────────────────────────────────────────────────
  const updateUser = useCallback((userData) => {
    // Normalize any incoming update too, in case a profile refetch returns camelCase
    const normalized = normalizeUser({ ...state.user, ...userData });
    dispatch({ type: 'UPDATE_USER', user: normalized });
    if (normalized.avatar_url) {
      AsyncStorage.setItem(AVATAR_KEY, normalized.avatar_url).catch(() => {});
    }
  }, [state.user]);

  const currentUserId = state.user?.id;

  return (
    <AuthContext.Provider value={{ ...state, currentUserId, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};