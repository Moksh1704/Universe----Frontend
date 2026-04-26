import { apiRequest } from '../../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const READ_IDS_KEY = 'notifications_read_ids';
const LAST_SEEN_KEY = 'notifications_last_seen_ids';

export const fetchNotifications = async () => {
  const data = await apiRequest('/notifications');
  return Array.isArray(data) ? data : (data.notifications || []);
};

export const getUnreadCount = async () => {
  try {
    const data = await apiRequest('/notifications/unread-count');
    return data.count ?? data.unread_count ?? 0;
  } catch {
    return 0;
  }
};

export const getPersistedReadIds = async () => {
  try {
    const raw = await AsyncStorage.getItem(READ_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const persistMarkAllRead = async (notificationIds) => {
  try {
    await apiRequest('/notifications/read-all', 'POST');
  } catch (_) {}
  const existing = await getPersistedReadIds();
  const merged   = [...new Set([...existing, ...notificationIds.map(String)])];
  await AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify(merged));
  await AsyncStorage.setItem(LAST_SEEN_KEY, JSON.stringify(notificationIds.map(String)));
};

// Reset persisted reads if new notifications arrived since last seen
export const applyReadState = async (notifications) => {
  const readIds    = await getPersistedReadIds();
  const lastSeenIds = JSON.parse(await AsyncStorage.getItem(LAST_SEEN_KEY) || '[]');
  const currentIds  = notifications.map(n => String(n.id));
  const newOnes     = currentIds.filter(id => !lastSeenIds.includes(id));

  if (newOnes.length > 0) {
    // New notifications arrived — clear old persisted reads for them
    const filtered = readIds.filter(id => !newOnes.includes(id));
    await AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify(filtered));
    return notifications.map(n => ({
      ...n,
      read: filtered.includes(String(n.id)) ? true : !!n.read,
    }));
  }

  return notifications.map(n => ({
    ...n,
    read: readIds.includes(String(n.id)) ? true : !!n.read,
  }));
};
