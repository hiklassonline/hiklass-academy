import { useState, useEffect, useCallback, useRef } from 'react';
import API_URL from '../utils/apiBaseUrl';
import { safeLocalStorage as localStorage, safeSessionStorage as sessionStorage } from '../utils/safeStorage';

let nextId = 100;

function createMockNotification(overrides = {}) {
  return {
    id: `notif-${++nextId}`,
    title: '',
    message: '',
    type: 'info',
    isRead: false,
    createdAt: new Date().toISOString(),
    route: '',
    ...overrides,
  };
}

const MOCK_NOTIFICATIONS = [
  { id: 'notif-1', title: 'New Enrollment', message: 'John Doe enrolled in Basic Computer', type: 'enrollment', isRead: false, createdAt: new Date(Date.now() - 300000).toISOString(), route: '/admin/enrollments' },
  { id: 'notif-2', title: 'Payment Received', message: 'Payment of 50,000 FCFA from Jane Smith', type: 'payment', isRead: false, createdAt: new Date(Date.now() - 1800000).toISOString(), route: '/admin/payments' },
  { id: 'notif-3', title: 'New Message', message: 'Alice has sent a new message', type: 'message', isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString(), route: '/admin/messages' },
  { id: 'notif-4', title: 'Email Failed', message: 'Failed to send confirmation to bob@example.com', type: 'error', isRead: true, createdAt: new Date(Date.now() - 7200000).toISOString(), route: '/admin/email-logs' },
  { id: 'notif-5', title: 'Course Updated', message: 'Advanced Excel course has been updated', type: 'info', isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString(), route: '/admin/courses' },
];

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/notifications`, {
        headers: { 'x-admin-token': localStorage.getItem('hiklass-admin-token') || sessionStorage.getItem('hiklass-admin-session-token') || '' },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        const items = data.notifications || [];
        setNotifications(items);
        setUnreadCount(items.filter((n) => !n.isRead).length);
        return;
      }
    } catch {}
    setNotifications(MOCK_NOTIFICATIONS);
    setUnreadCount(MOCK_NOTIFICATIONS.filter((n) => !n.isRead).length);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      loadNotifications();
    }
  }, [loadNotifications]);

  const markAsRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await fetch(`${API_URL}/api/admin/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'x-admin-token': localStorage.getItem('hiklass-admin-token') || '' },
        credentials: 'include',
      });
    } catch {}
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await fetch(`${API_URL}/api/admin/notifications/mark-all-read`, {
        method: 'POST',
        headers: { 'x-admin-token': localStorage.getItem('hiklass-admin-token') || '' },
        credentials: 'include',
      });
    } catch {}
  }, []);

  const addNotification = useCallback((data) => {
    const item = createMockNotification(data);
    setNotifications((prev) => [item, ...prev]);
    setUnreadCount((prev) => prev + 1);
  }, []);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, addNotification, refresh: loadNotifications };
}
