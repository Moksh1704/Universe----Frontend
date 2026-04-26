/**
 * src/services/authService.js
 *
 * Auth service for UniVerse.
 * Works for BOTH students and faculty – role is auto-detected by the backend.
 * No mock logic.
 */
import BASE_URL from '../../api/config';

// ─── Send OTP (student or faculty) ───────────────────────────────────────────
export const sendOTP = async (email) => {
  const res = await fetch(`${BASE_URL}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.message || 'Failed to send OTP');
  return data;
};

// ─── Verify OTP (student or faculty) ─────────────────────────────────────────
export const verifyOTP = async (email, otp) => {
  const res = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.message || 'OTP verification failed');
  return normalizeAuthResponse(data);
};

// ─── Password Login (student or faculty, auto-detected) ───────────────────────
export const loginWithPassword = async (email, password) => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.message || 'Login failed');
  return normalizeAuthResponse(data);
};

// ─── Google Login (student or faculty, auto-detected) ─────────────────────────
export const loginWithGoogle = async (idToken) => {
  const res = await fetch(`${BASE_URL}/auth/google-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.message || 'Google login failed');
  return normalizeAuthResponse(data);
};

// ─── Forgot Password ──────────────────────────────────────────────────────────
export const forgotPassword = async (email) => {
  const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.message || 'Failed to send reset OTP');
  return data;
};

// ─── Reset Password ───────────────────────────────────────────────────────────
export const resetPassword = async (email, otp, newPassword) => {
  const res = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, new_password: newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.message || 'Password reset failed');
  return data;
};

// ─── Normalize backend response ───────────────────────────────────────────────
/**
 * Normalizes the TokenResponse shape from the backend into a consistent
 * { accessToken, refreshToken, user } object used throughout the app.
 *
 * The `role` field on the user object drives navigation:
 *   'student' → StudentTabNavigator
 *   'faculty' → FacultyTabNavigator
 */
function normalizeAuthResponse(data) {
  const accessToken  = data.accessToken  || data.access_token  || data.token || null;
  const refreshToken = data.refreshToken || data.refresh_token || null;
  const loginStatus  = data.loginStatus  || data.login_status  || null;

  const rawUser = data.user || data.profile || {};

  const normalizedUser = {
    id:                  rawUser.id          || rawUser._id    || null,
    name:                rawUser.name        || rawUser.full_name || rawUser.username || '',
    email:               rawUser.email       || '',
    // Role is set by the backend – 'student' or 'faculty'. Never default to
    // 'student' blindly so faculty are routed correctly.
    role:                rawUser.role        || null,
    department:          rawUser.department  || '',
    year:                rawUser.year        || null,
    section:             rawUser.section     || '',
    course:              rawUser.course      || 'B.Tech',
    registration_number: rawUser.registration_number || rawUser.reg_no || rawUser.regNo || '',
    cgpa:                rawUser.cgpa        || null,
    designation:         rawUser.designation || '',
    avatar_url:          rawUser.avatar_url  || rawUser.profile_picture || null,
  };

  return { accessToken, refreshToken, user: normalizedUser, loginStatus };
}