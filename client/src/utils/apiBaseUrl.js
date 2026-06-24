const rawApiBaseUrl = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')).replace(/\/$/, '');
const API_BASE_URL = rawApiBaseUrl.replace(/\/api$/i, '');

export default API_BASE_URL;
