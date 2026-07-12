import API_URL from '../utils/apiBaseUrl';
import { clearAdminSession } from './authService.js';

export async function adminApi(token, method, path, body) {
  const options = { method, headers: { 'x-admin-token': token }, cache: 'no-store', credentials: 'include' };
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

export async function adminUploadVoiceNote(token, path, blob) {
  const formData = new FormData();
  formData.append('audio', blob, `voice-note.${(blob.type.split('/')[1] || 'webm').split(';')[0]}`);
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'x-admin-token': token },
    cache: 'no-store',
    body: formData,
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    clearAdminSession();
    window.location.replace('/admin/login');
    throw new Error('Your admin session expired. Please sign in again.');
  }
  if (!res.ok) throw new Error(data.message || 'Could not send your voice note.');
  return data;
}
