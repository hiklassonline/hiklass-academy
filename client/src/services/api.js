function apiBaseUrl() {
  const fallback = import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : `${window.location.origin}/api`;
  const rawBaseUrl = (import.meta.env.VITE_API_URL || fallback).replace(/\/+$/, '');
  return rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl}/api`;
}

const API_BASE_URL = apiBaseUrl();

export async function submitEnrollment(payload) {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('The enrollment API is not returning JSON. Please check the backend deployment.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Enrollment submission failed');
  }

  return data;
}

export async function fetchTestimonials() {
  const response = await fetch(`${API_BASE_URL}/testimonials`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Could not load testimonials');
  }
  return data.testimonials || [];
}

export async function submitTestimonial(payload) {
  const response = await fetch(`${API_BASE_URL}/testimonials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Testimonial submission failed');
  }

  return data;
}
