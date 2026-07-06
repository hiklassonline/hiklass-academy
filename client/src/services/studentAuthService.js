import API_URL from '../utils/apiBaseUrl';

export const STUDENT_TOKEN_KEY = 'hiklass-student-token';
const STUDENT_SESSION_TOKEN_KEY = 'hiklass-student-session-token';
const STUDENT_USER_KEY = 'hiklass-student-user';

export function getStoredStudentToken() {
  return localStorage.getItem(STUDENT_TOKEN_KEY) || sessionStorage.getItem(STUDENT_SESSION_TOKEN_KEY) || '';
}

export function saveStudentSession(payload, rememberMe) {
  const token = payload?.token || '';
  const student = payload?.student ? JSON.stringify(payload.student) : '';
  sessionStorage.removeItem(STUDENT_SESSION_TOKEN_KEY);
  localStorage.removeItem(STUDENT_TOKEN_KEY);

  if (rememberMe) {
    localStorage.setItem(STUDENT_TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(STUDENT_SESSION_TOKEN_KEY, token);
  }

  if (student) localStorage.setItem(STUDENT_USER_KEY, student);
}

export function clearStudentSession() {
  localStorage.removeItem(STUDENT_TOKEN_KEY);
  localStorage.removeItem(STUDENT_USER_KEY);
  sessionStorage.removeItem(STUDENT_SESSION_TOKEN_KEY);
}

export async function registerStudent({ name, email, phone, password, rememberMe }) {
  const res = await fetch(`${API_URL}/api/student/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phone, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Unable to create your account.');
  saveStudentSession(data, rememberMe);
  return data;
}

export async function loginStudent({ email, password, rememberMe }) {
  const res = await fetch(`${API_URL}/api/student/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Unable to sign in.');
  saveStudentSession(data, rememberMe);
  return data;
}

export async function fetchStudentEnrollments() {
  const token = getStoredStudentToken();
  const res = await fetch(`${API_URL}/api/student/enrollments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not load your enrollments.');
  return data.orders || [];
}

export async function fetchStudentPayments() {
  const token = getStoredStudentToken();
  const res = await fetch(`${API_URL}/api/student/payments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not load your payments.');
  return data.payments || [];
}
