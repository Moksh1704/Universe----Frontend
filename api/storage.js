import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ACCESS_TOKEN:  'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER_ROLE:     'auth_user_role',
  USER_DATA:     'auth_user_data',
};

// ─── Token helpers ────────────────────────────────────────────────────────────
export const saveToken = (token) => AsyncStorage.setItem(KEYS.ACCESS_TOKEN, token);
export const getToken  = ()       => AsyncStorage.getItem(KEYS.ACCESS_TOKEN);
export const removeToken = ()     => AsyncStorage.removeItem(KEYS.ACCESS_TOKEN);

// ─── Full auth session ────────────────────────────────────────────────────────
export const saveAuthSession = async ({ accessToken, refreshToken, user }) => {
  const ops = [
    AsyncStorage.setItem(KEYS.ACCESS_TOKEN,  accessToken  || ''),
    AsyncStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken || ''),
    AsyncStorage.setItem(KEYS.USER_ROLE,     user?.role   || ''),
    AsyncStorage.setItem(KEYS.USER_DATA,     JSON.stringify(user || {})),
  ];
  await Promise.all(ops);
};

export const getAuthSession = async () => {
  const [accessToken, refreshToken, role, userData] = await Promise.all([
    AsyncStorage.getItem(KEYS.ACCESS_TOKEN),
    AsyncStorage.getItem(KEYS.REFRESH_TOKEN),
    AsyncStorage.getItem(KEYS.USER_ROLE),
    AsyncStorage.getItem(KEYS.USER_DATA),
  ]);
  return {
    accessToken,
    refreshToken,
    role,
    user: userData ? JSON.parse(userData) : null,
  };
};

export const clearAuthSession = async () => {
  await AsyncStorage.multiRemove(Object.values(KEYS));
};

// legacy aliases
export const saveRefreshToken  = (t) => AsyncStorage.setItem(KEYS.REFRESH_TOKEN, t);
export const getRefreshToken   = ()  => AsyncStorage.getItem(KEYS.REFRESH_TOKEN);
