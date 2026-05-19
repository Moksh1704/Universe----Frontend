/**
 * src/context/AuthContext.js
 *
 * Source of truth for authentication and user state.
 *
 * API shape (from app/schemas/__init__.py → UserProfileResponse / CamelModel):
 *   avatarUrl            → stored as avatar_url
 *   registrationNumber   → stored as registration_number
 *   isActive             → stored as is_active
 *   createdAt            → stored as created_at
 *   overallAttendance    → stored as overall_attendance
 *   nickname             → short/preferred name from master DB (e.g. "Moksha")
 *   name                 → full display name (e.g. "SAI MOKSHA NAIMISHA NAMBURU")
 *
 * Startup flow:
 *   1. Restore cached token + user from AsyncStorage (instant)
 *   2. If token exists → fetchProfile() for fresh data (one API call, globally shared)
 *   3. HomeScreen reads nickname directly — no Profile visit needed
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchProfile } from '../services/profileService';  // ← named import

// ─── Storage key constants (single source of truth) ──────────────────────────
export const STORAGE_KEYS = {
  ACCESS_TOKEN:  'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER:          'user',
  AVATAR:        'user_avatar_uri',
};

// ─── Field normalizer ─────────────────────────────────────────────────────────
function normalizeUser(user) {
  if (!user) return user;

  const registration_number =
    (user.registration_number && String(user.registration_number).trim()) ||
    (user.registrationNumber  && String(user.registrationNumber).trim())  ||
    '';

  const avatar_url =
    user.avatar_url  ||
    user.avatarUrl   ||
    null;

  const is_active =
    user.is_active   !== undefined ? user.is_active  :
    user.isActive    !== undefined ? user.isActive   :
    true;

  const overall_attendance =
    user.overall_attendance !== undefined ? user.overall_attendance :
    user.overallAttendance  !== undefined ? user.overallAttendance  :
    null;

  const created_at =
    user.created_at || user.createdAt || null;

  const nickname = user.nickname || '';

  const {
    registrationNumber,
    avatarUrl,
    isActive,
    overallAttendance,
    createdAt,
    // eslint-disable-next-line no-unused-vars
    ...rest
  } = user;

  return {
    ...rest,
    registration_number,
    avatar_url,
    is_active,
    overall_attendance,
    created_at,
    nickname,
  };
}

// ─── Storage helpers ──────────────────────────────────────────────────────────
const saveAuthSession = async ({ accessToken, refreshToken, user }) => {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.ACCESS_TOKEN,  accessToken   ?? ''],
    [STORAGE_KEYS.REFRESH_TOKEN, refreshToken  ?? ''],
    [STORAGE_KEYS.USER,          JSON.stringify(user ?? {})],
  ]);
};

const getAuthSession = async () => {
  const pairs = await AsyncStorage.multiGet([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.USER,
  ]);
  const map = Object.fromEntries(pairs.map(([k, v]) => [k, v]));
  return {
    accessToken:  map[STORAGE_KEYS.ACCESS_TOKEN]  || null,
    refreshToken: map[STORAGE_KEYS.REFRESH_TOKEN] || null,
    user:         map[STORAGE_KEYS.USER] ? JSON.parse(map[STORAGE_KEYS.USER]) : null,
  };
};

const clearAuthSession = async () => {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.USER,
    // AVATAR intentionally kept so it persists across re-login
  ]);
};

// ─── Reducer ──────────────────────────────────────────────────────────────────
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
        isLoading:       true,
        isAuthenticated: !!action.accessToken,
        accessToken:     action.accessToken,
        refreshToken:    action.refreshToken,
        user:            action.user,
        role:            action.user?.role || null,
      };

    case 'FINISH_LOADING':
      return { ...state, isLoading: false };

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
      return {
        ...state,
        user: { ...state.user, ...action.user },
        role: action.user?.role || state.role,
      };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ── Startup: restore session + fetch fresh profile ─────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const session = await getAuthSession();

        if (__DEV__) {
          console.log('[Auth] Restoring session — token present:', !!session.accessToken);
          console.log('[Auth] Cached user:', JSON.stringify(session.user));
        }

        let cachedUser = normalizeUser(session.user);

        if (cachedUser && !cachedUser.avatar_url) {
          const saved = await AsyncStorage.getItem(STORAGE_KEYS.AVATAR).catch(() => null);
          if (saved) cachedUser = { ...cachedUser, avatar_url: saved };
        }

        dispatch({
          type:         'RESTORE_SESSION',
          accessToken:  session.accessToken,
          refreshToken: session.refreshToken,
          user:         cachedUser,
        });

        if (session.accessToken) {
          try {
            if (__DEV__) console.log('[Auth] Fetching fresh user profile at startup…');

            const freshUser  = await fetchProfile();   // GET /users/me
            const normalized = normalizeUser(freshUser);

            let resolvedUser = normalized;
            if (!resolvedUser.avatar_url) {
              const saved = await AsyncStorage.getItem(STORAGE_KEYS.AVATAR).catch(() => null);
              if (saved) resolvedUser = { ...resolvedUser, avatar_url: saved };
            }

            if (__DEV__) {
              console.log('[Auth] Fresh user loaded:', JSON.stringify(resolvedUser));
            }

            dispatch({ type: 'UPDATE_USER', user: resolvedUser });

            await AsyncStorage.setItem(
              STORAGE_KEYS.USER,
              JSON.stringify(resolvedUser),
            ).catch(() => {});

            if (resolvedUser.avatar_url) {
              await AsyncStorage.setItem(
                STORAGE_KEYS.AVATAR,
                resolvedUser.avatar_url,
              ).catch(() => {});
            }

          } catch (fetchErr) {
            // Non-fatal — cached user already in state, app still works offline
            console.warn('[Auth] Startup profile fetch failed (using cache):', fetchErr.message);
          }
        }

      } catch (err) {
        console.warn('[Auth] Session restore failed:', err);
        dispatch({ type: 'RESTORE_SESSION', accessToken: null, refreshToken: null, user: null });
      } finally {
        dispatch({ type: 'FINISH_LOADING' });
      }
    })();
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async ({ accessToken, refreshToken }) => {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.ACCESS_TOKEN,  accessToken  ?? ''],
      [STORAGE_KEYS.REFRESH_TOKEN, refreshToken ?? ''],
    ]);

    if (__DEV__) {
      console.log('[Auth] Login — tokens saved, fetching full profile from /users/me…');
    }

    let fullUser;
    try {
      fullUser = await fetchProfile();
    } catch (err) {
      console.warn('[Auth] login: /users/me fetch failed:', err.message);
      dispatch({ type: 'LOGIN', accessToken, refreshToken, user: null });
      return;
    }

    let resolvedUser = normalizeUser(fullUser);

    if (!resolvedUser.avatar_url) {
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.AVATAR).catch(() => null);
      if (saved) resolvedUser = { ...resolvedUser, avatar_url: saved };
    }

    if (__DEV__) {
      console.log('[Auth] Login — full user loaded:', JSON.stringify(resolvedUser));
    }

    await saveAuthSession({ accessToken, refreshToken, user: resolvedUser });
    if (resolvedUser.avatar_url) {
      await AsyncStorage.setItem(STORAGE_KEYS.AVATAR, resolvedUser.avatar_url).catch(() => {});
    }

    dispatch({ type: 'LOGIN', accessToken, refreshToken, user: resolvedUser });
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await clearAuthSession();
    dispatch({ type: 'LOGOUT' });
  }, []);

  // ── Update user ────────────────────────────────────────────────────────────
  const updateUser = useCallback((userData) => {
    const normalized = normalizeUser({ ...state.user, ...userData });
    dispatch({ type: 'UPDATE_USER', user: normalized });
    AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(normalized)).catch(() => {});
    if (normalized.avatar_url) {
      AsyncStorage.setItem(STORAGE_KEYS.AVATAR, normalized.avatar_url).catch(() => {});
    }
  }, [state.user]);

  const currentUserId = state.user?.id;

  return (
    <AuthContext.Provider
      value={{ ...state, currentUserId, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};