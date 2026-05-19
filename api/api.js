import BASE_URL from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Exported so screens can do: catch (err) { if (err instanceof AuthError) … }
export class AuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthError';
  }
}

export const apiRequest = async (endpoint, method = 'GET', body = null) => {
  const token = await AsyncStorage.getItem('auth_access_token');

  const url = `${BASE_URL}${endpoint}`;
  console.log("🌍 API CALL:", method, url);

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : null,
    });

    // 👇 Handle empty responses safely
    let data = null;
    const text = await res.text();

    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      console.warn("⚠️ JSON parse failed:", text);
      data = {};
    }

    if (!res.ok) {
      console.error("❌ API ERROR:", res.status, data);
      if (res.status === 401) {
        throw new AuthError(data.detail || data.message || 'Session expired');
      }
      throw new Error(data.detail || data.message || `HTTP ${res.status}`);
    }

    return data;

  } catch (err) {
    console.error("🚨 NETWORK ERROR:", err.message);

    // 👇 This is the key improvement
    throw new Error(
      err.message === "Network request failed"
        ? "Cannot reach server. Check backend / internet / CORS."
        : err.message
    );
  }
};