import API_URL from '../utils/apiBaseUrl';
import { clearAdminSession } from './authService';

export async function adminApi(token, method, path, body) {
  const options = { method, headers: { 'x-admin-token': token }, cache: 'no-store' };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${API_URL}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    clearAdminSession();
    window.location.replace('/admin/login');
    throw new Error('Your admin session expired. Please sign in again.');
  }
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}
