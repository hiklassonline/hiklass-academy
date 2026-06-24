function apiBaseUrl() {
  const fallback = import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : `${window.location.origin}/api`;
  const rawBaseUrl = (import.meta.env.VITE_API_URL || fallback).replace(/\/+$/, '');
  return rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl}/api`;
}

const API_BASE_URL = apiBaseUrl();

export async function submitEnrollment(payload) {
  const response = await fetch(`${API_BASE_URL}/enrollments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Enrollment submission failed');
  }

  return data;
}
