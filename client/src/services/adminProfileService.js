import API_URL from '../utils/apiBaseUrl';
import { safeLocalStorage as localStorage, safeSessionStorage as sessionStorage } from '../utils/safeStorage';

const ADMIN_USER_KEY = 'hiklass-admin-user';

function authHeaders() {
  const token = localStorage.getItem('hiklass-admin-token') || sessionStorage.getItem('hiklass-admin-session-token') || '';
  return { 'x-admin-token': token };
}

function saveUser(user) {
  if (user) localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
}

export async function getAdminProfile() {
  const res = await fetch(`${API_URL}/api/admin/profile`, { headers: authHeaders(), credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to load profile.');
  return data;
}

export async function updateAdminProfile(data) {
  const res = await fetch(`${API_URL}/api/admin/profile`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.message || 'Failed to update profile.');
  if (result.user) saveUser(result.user);
  return result;
}

export async function uploadAdminAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);
  const res = await fetch(`${API_URL}/api/admin/profile/avatar`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
    credentials: 'include',
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.message || 'Failed to upload avatar.');
  const avatarUrl = result?.data?.avatarUrl || result?.avatarUrl || '';
  const user = result?.user || {};
  if (avatarUrl) user.avatarUrl = avatarUrl;
  if (user) saveUser(user);
  return { ...result, avatarUrl, user };
}

export async function deleteAdminAvatar() {
  const res = await fetch(`${API_URL}/api/admin/profile/avatar`, {
    method: 'DELETE',
    headers: authHeaders(),
    credentials: 'include',
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.message || 'Failed to remove avatar.');
  if (result.user) saveUser(result.user);
  return result;
}

export function getStoredAdminUser() {
  try {
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

const API_URL_USED = API_URL;
export { API_URL_USED as API_URL };
