import API_URL from '../utils/apiBaseUrl';
import { safeLocalStorage as localStorage, safeSessionStorage as sessionStorage } from '../utils/safeStorage';

export const ADMIN_TOKEN_KEY = 'hiklass-admin-token';
const ADMIN_SESSION_TOKEN_KEY = 'hiklass-admin-session-token';
const ADMIN_USER_KEY = 'hiklass-admin-user';

export function getStoredAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || sessionStorage.getItem(ADMIN_SESSION_TOKEN_KEY) || '';
}

export function saveAdminSession(payload, rememberMe) {
  const token = payload?.token || '';
  const user = payload?.user ? JSON.stringify(payload.user) : '';
  sessionStorage.removeItem(ADMIN_SESSION_TOKEN_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);

  if (rememberMe) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(ADMIN_SESSION_TOKEN_KEY, token);
  }

  if (user) localStorage.setItem(ADMIN_USER_KEY, user);
  // Note: if the browser blocks localStorage/sessionStorage, the above calls
  // silently no-op (see safeStorage.js). That's fine — the server also set an
  // httpOnly session cookie on this response, which SessionGate (main.jsx)
  // falls back to verifying, so the admin stays signed in either way.
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
  sessionStorage.removeItem(ADMIN_SESSION_TOKEN_KEY);
  // Also clear the httpOnly session cookie (used as a fallback when browser
  // storage is blocked); fire-and-forget, nothing to do if it fails.
  fetch(`${API_URL}/api/admin/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
}

export async function loginAdmin({ email, password, rememberMe }) {
  const res = await fetch(`${API_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, rememberMe }),
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Unable to sign in.');
  saveAdminSession(data, rememberMe);
  return data;
}
