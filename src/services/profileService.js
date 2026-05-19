/**
 * src/services/profileService.js
 *
 * Avatar upload + delete helpers, plus fetchProfile.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://universe-mainbackend.onrender.com';

// ── Auth header helper ────────────────────────────────────────────────────────
async function getAuthHeaders() {
  const token = await AsyncStorage.getItem('auth_access_token');
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}` };
}

// ── Generic API request helper ────────────────────────────────────────────────
export async function apiRequest(path, options = {}) {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed (${res.status})`);
  }

  return res.json();
}

// ── Fetch current user profile ────────────────────────────────────────────────
export const fetchProfile = async () => {
  return apiRequest('/users/me');
};

// ── Upload avatar ─────────────────────────────────────────────────────────────
/**
 * @param {string} localUri  - local file URI from ImagePicker
 * @param {string} mimeType  - e.g. 'image/jpeg'
 * @returns {Promise<string>} - absolute avatar URL returned by server
 */
export async function uploadProfilePicture(localUri, mimeType = 'image/jpeg') {
  const headers = await getAuthHeaders();

  const filename = localUri.split('/').pop();
  const ext      = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const type     = mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  const form = new FormData();
  form.append('file', { uri: localUri, name: filename, type });

  const res = await fetch(`${BASE_URL}/users/upload-avatar`, {
    method:  'POST',
    headers: { ...headers },  // Do NOT set Content-Type — let fetch set multipart boundary
    body:    form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Upload failed (${res.status})`);
  }

  const data = await res.json();
  return data.avatarUrl;  // full absolute URL
}

// ── Delete avatar ─────────────────────────────────────────────────────────────
export async function deleteProfilePicture() {
  const headers = await getAuthHeaders();

  const res = await fetch(`${BASE_URL}/users/avatar`, {
    method:  'DELETE',
    headers: { ...headers, 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Delete failed (${res.status})`);
  }
}