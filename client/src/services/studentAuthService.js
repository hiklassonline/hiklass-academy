import API_URL from '../utils/apiBaseUrl';

export const STUDENT_TOKEN_KEY = 'hiklass-student-token';
const STUDENT_SESSION_TOKEN_KEY = 'hiklass-student-session-token';
const STUDENT_USER_KEY = 'hiklass-student-user';

export function getStoredStudentToken() {
  return localStorage.getItem(STUDENT_TOKEN_KEY) || sessionStorage.getItem(STUDENT_SESSION_TOKEN_KEY) || '';
}

export function getStoredStudentUser() {
  try {
    return JSON.parse(localStorage.getItem(STUDENT_USER_KEY) || 'null');
  } catch {
    return null;
  }
}

async function studentApi(method, path, body) {
  const token = getStoredStudentToken();
  const options = { method, headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' };
  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${API_URL}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || 'Request failed.');
    error.locked = data.locked || false;
    error.reason = data.reason || '';
    error.status = data.status || '';
    throw error;
  }
  return data;
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

export async function loginWithGoogleCredential(credential, rememberMe) {
  const res = await fetch(`${API_URL}/api/student/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Unable to sign in with Google.');
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

export async function fetchStudentDashboard() {
  return studentApi('GET', '/api/student/dashboard');
}

export async function fetchStudentProfile() {
  const data = await studentApi('GET', '/api/student/me');
  return data.student;
}

export async function updateStudentProfile({ name, phone }) {
  const data = await studentApi('PATCH', '/api/student/profile', { name, phone });
  if (data.student) localStorage.setItem(STUDENT_USER_KEY, JSON.stringify(data.student));
  return data.student;
}

export async function changeStudentPassword({ currentPassword, newPassword }) {
  return studentApi('PATCH', '/api/student/password', { currentPassword, newPassword });
}

export async function uploadStudentAvatar(file) {
  const token = getStoredStudentToken();
  const formData = new FormData();
  formData.append('avatar', file);
  const res = await fetch(`${API_URL}/api/student/profile/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not upload your photo.');
  if (data.student) localStorage.setItem(STUDENT_USER_KEY, JSON.stringify(data.student));
  return data.student;
}

export async function removeStudentAvatar() {
  const data = await studentApi('DELETE', '/api/student/profile/avatar');
  if (data.student) localStorage.setItem(STUDENT_USER_KEY, JSON.stringify(data.student));
  return data.student;
}

export async function fetchAnnouncements() {
  const res = await fetch(`${API_URL}/api/announcements`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not load announcements.');
  return data.announcements || [];
}

export async function fetchUpcomingItems() {
  const res = await fetch(`${API_URL}/api/upcoming-items`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not load upcoming items.');
  return data.upcomingItems || [];
}

export async function fetchInstructors() {
  const res = await fetch(`${API_URL}/api/instructors`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not load instructors.');
  return data.instructors || [];
}

export async function fetchStudentCourseCurriculum(courseTitle) {
  return studentApi('GET', `/api/student/courses/${encodeURIComponent(courseTitle)}/curriculum`);
}

export async function fetchStudentMessages() {
  const data = await studentApi('GET', '/api/student/messages');
  return data.messages || [];
}

export async function sendStudentMessage(body) {
  const data = await studentApi('POST', '/api/student/messages', { body });
  return data.message;
}

export async function fetchUnreadMessageCount() {
  const data = await studentApi('GET', '/api/student/messages/unread-count');
  return data.count || 0;
}

export async function fetchStudentAssignments(courseTitle) {
  const data = await studentApi('GET', `/api/student/courses/${encodeURIComponent(courseTitle)}/assignments`);
  return data.assignments || [];
}

export async function fetchAllStudentAssignments() {
  const data = await studentApi('GET', '/api/student/assignments');
  return data.assignments || [];
}

export async function fetchStudentQuizzes() {
  const data = await studentApi('GET', '/api/student/quizzes');
  return data.quizzes || [];
}

export async function fetchStudentQuiz(quizId) {
  return studentApi('GET', `/api/student/quizzes/${encodeURIComponent(quizId)}`);
}

export async function submitStudentQuiz(quizId, answers) {
  const data = await studentApi('POST', `/api/student/quizzes/${encodeURIComponent(quizId)}/submit`, { answers });
  return data.attempt;
}

export async function submitStudentAssignment(assignmentId, { file, notes }) {
  const token = getStoredStudentToken();
  const formData = new FormData();
  if (file) formData.append('file', file);
  if (notes) formData.append('notes', notes);
  const res = await fetch(`${API_URL}/api/student/assignments/${encodeURIComponent(assignmentId)}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not submit your assignment.');
  return data.submission;
}
