import React, { useEffect, useState } from 'react';
import { Calendar, KeyRound, Megaphone, Pencil, Trash2, Users, X } from 'lucide-react';
import { getStoredAdminToken } from '../../services/authService';
import { adminApi } from '../../services/adminContentApi';
import AdminCurriculumManager from './AdminCurriculumManager.jsx';
import AdminAssignmentsManager from './AdminAssignmentsManager.jsx';
import AdminQuizzesManager from './AdminQuizzesManager.jsx';
import AdminMessagesPanel from './AdminMessagesPanel.jsx';
import './AdminContentManager.css';

const ICON_OPTIONS = [
  { value: 'course', label: 'Course update' },
  { value: 'schedule', label: 'Schedule change' },
  { value: 'system', label: 'System message' },
];

const TYPE_OPTIONS = [
  { value: 'class', label: 'Class' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'quiz', label: 'Quiz' },
];

function toLocalInputValue(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function AdminContentManager() {
  const token = getStoredAdminToken();
  const [announcements, setAnnouncements] = useState([]);
  const [upcomingItems, setUpcomingItems] = useState([]);
  const [studentAccounts, setStudentAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);

  const [annForm, setAnnForm] = useState({ title: '', body: '', icon: 'system' });
  const [editingAnnouncementId, setEditingAnnouncementId] = useState('');
  const [eventForm, setEventForm] = useState({ title: '', type: 'class', date: toLocalInputValue(new Date()) });
  const [editingEventId, setEditingEventId] = useState('');
  const [saving, setSaving] = useState(false);
  const [accountBusyId, setAccountBusyId] = useState('');

  async function loadAll() {
    setLoading(true);
    try {
      const [a, u, s] = await Promise.all([
        adminApi(token, 'GET', '/api/admin/announcements'),
        adminApi(token, 'GET', '/api/admin/upcoming-items'),
        adminApi(token, 'GET', '/api/admin/student-accounts'),
      ]);
      setAnnouncements((a.announcements || []).sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt)));
      setUpcomingItems((u.upcomingItems || []).sort((x, y) => new Date(x.date) - new Date(y.date)));
      setStudentAccounts(s.studentAccounts || []);
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function submitAnnouncement(event) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      if (editingAnnouncementId) {
        await adminApi(token, 'PUT', `/api/admin/announcements/${editingAnnouncementId}`, annForm);
        setStatus({ type: 'success', text: 'Announcement updated.' });
      } else {
        await adminApi(token, 'POST', '/api/admin/announcements', annForm);
        setStatus({ type: 'success', text: 'Announcement posted.' });
      }
      setAnnForm({ title: '', body: '', icon: 'system' });
      setEditingAnnouncementId('');
      await loadAll();
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  }

  function editAnnouncement(item) {
    setEditingAnnouncementId(item.id);
    setAnnForm({ title: item.title, body: item.body, icon: item.icon });
    setStatus(null);
  }

  function cancelEditAnnouncement() {
    setEditingAnnouncementId('');
    setAnnForm({ title: '', body: '', icon: 'system' });
  }

  async function deleteAnnouncement(item) {
    if (!window.confirm(`Delete the announcement "${item.title}"? This cannot be undone.`)) return;
    setStatus(null);
    try {
      await adminApi(token, 'DELETE', `/api/admin/announcements/${item.id}`);
      if (editingAnnouncementId === item.id) cancelEditAnnouncement();
      setStatus({ type: 'success', text: 'Announcement deleted.' });
      await loadAll();
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    }
  }

  async function submitEvent(event) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const payload = { ...eventForm, date: new Date(eventForm.date).toISOString() };
      if (editingEventId) {
        await adminApi(token, 'PUT', `/api/admin/upcoming-items/${editingEventId}`, payload);
        setStatus({ type: 'success', text: 'Upcoming item updated.' });
      } else {
        await adminApi(token, 'POST', '/api/admin/upcoming-items', payload);
        setStatus({ type: 'success', text: 'Upcoming item added.' });
      }
      setEventForm({ title: '', type: 'class', date: toLocalInputValue(new Date()) });
      setEditingEventId('');
      await loadAll();
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  }

  function editEvent(item) {
    setEditingEventId(item.id);
    setEventForm({ title: item.title, type: item.type, date: toLocalInputValue(item.date) });
    setStatus(null);
  }

  function cancelEditEvent() {
    setEditingEventId('');
    setEventForm({ title: '', type: 'class', date: toLocalInputValue(new Date()) });
  }

  async function deleteEvent(item) {
    if (!window.confirm(`Delete the upcoming item "${item.title}"? This cannot be undone.`)) return;
    setStatus(null);
    try {
      await adminApi(token, 'DELETE', `/api/admin/upcoming-items/${item.id}`);
      if (editingEventId === item.id) cancelEditEvent();
      setStatus({ type: 'success', text: 'Upcoming item deleted.' });
      await loadAll();
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    }
  }

  async function deleteStudentAccount(account) {
    if (!window.confirm(`Delete the portal account for ${account.name} (${account.email})? They will be signed out immediately and will need to register again.`)) return;
    setAccountBusyId(account.id);
    setStatus(null);
    try {
      await adminApi(token, 'DELETE', `/api/admin/student-accounts/${account.id}`);
      setStatus({ type: 'success', text: `Deleted account for ${account.name}.` });
      await loadAll();
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setAccountBusyId('');
    }
  }

  async function resetStudentPassword(account) {
    if (!window.confirm(`Reset the password for ${account.name} (${account.email})? This invalidates their current password.`)) return;
    setAccountBusyId(account.id);
    setStatus(null);
    try {
      const data = await adminApi(token, 'POST', `/api/admin/student-accounts/${account.id}/reset-password`);
      setStatus({ type: 'success', text: `New temporary password for ${account.email}: ${data.temporaryPassword} — share this with the student securely.` });
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setAccountBusyId('');
    }
  }

  if (!token) {
    return (
      <div className="adminContentManager">
        <p>Sign in to the admin dashboard first, then return to this page.</p>
        <a href="/admin/login">Go to admin login</a>
      </div>
    );
  }

  return (
    <div className="adminContentManager">
      <a className="adminContentBack" href="/admin/dashboard">&larr; Back to admin dashboard</a>
      <h1>Student Portal Control</h1>
      <p>Manage everything shown on student dashboards: announcements, upcoming items, and registered portal accounts.</p>

      {status ? <div className={`adminContentStatus ${status.type}`}>{status.text}</div> : null}
      {loading ? <p>Loading...</p> : null}

      <div className="adminContentGrid">
        <section className="adminContentCard">
          <h2><Megaphone size={18} /> Announcements</h2>
          <form onSubmit={submitAnnouncement} className="adminContentForm">
            <input
              placeholder="Title"
              value={annForm.title}
              onChange={(e) => setAnnForm((v) => ({ ...v, title: e.target.value }))}
              required
              maxLength={140}
            />
            <textarea
              placeholder="Message"
              value={annForm.body}
              onChange={(e) => setAnnForm((v) => ({ ...v, body: e.target.value }))}
              required
              maxLength={600}
              rows={3}
            />
            <select value={annForm.icon} onChange={(e) => setAnnForm((v) => ({ ...v, icon: e.target.value }))}>
              {ICON_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <div className="adminContentFormActions">
              <button type="submit" disabled={saving}>{editingAnnouncementId ? 'Update announcement' : 'Post announcement'}</button>
              {editingAnnouncementId ? (
                <button type="button" className="ghost" onClick={cancelEditAnnouncement}><X size={14} /> Cancel</button>
              ) : null}
            </div>
          </form>

          <ul className="adminContentList">
            {announcements.map((item) => (
              <li key={item.id} className={editingAnnouncementId === item.id ? 'editing' : ''}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  <time>{new Date(item.createdAt).toLocaleString()}</time>
                </div>
                <div className="adminContentListActions">
                  <button type="button" onClick={() => editAnnouncement(item)} aria-label="Edit announcement"><Pencil size={16} /></button>
                  <button type="button" className="danger" onClick={() => deleteAnnouncement(item)} aria-label="Delete announcement"><Trash2 size={16} /></button>
                </div>
              </li>
            ))}
            {!loading && !announcements.length ? <li className="adminContentEmpty">No announcements yet.</li> : null}
          </ul>
        </section>

        <section className="adminContentCard">
          <h2><Calendar size={18} /> Upcoming Items</h2>
          <form onSubmit={submitEvent} className="adminContentForm">
            <input
              placeholder="Title"
              value={eventForm.title}
              onChange={(e) => setEventForm((v) => ({ ...v, title: e.target.value }))}
              required
              maxLength={140}
            />
            <select value={eventForm.type} onChange={(e) => setEventForm((v) => ({ ...v, type: e.target.value }))}>
              {TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <input
              type="datetime-local"
              value={eventForm.date}
              onChange={(e) => setEventForm((v) => ({ ...v, date: e.target.value }))}
              required
            />
            <div className="adminContentFormActions">
              <button type="submit" disabled={saving}>{editingEventId ? 'Update upcoming item' : 'Add upcoming item'}</button>
              {editingEventId ? (
                <button type="button" className="ghost" onClick={cancelEditEvent}><X size={14} /> Cancel</button>
              ) : null}
            </div>
          </form>

          <ul className="adminContentList">
            {upcomingItems.map((item) => (
              <li key={item.id} className={editingEventId === item.id ? 'editing' : ''}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.type} • {new Date(item.date).toLocaleString()}</p>
                </div>
                <div className="adminContentListActions">
                  <button type="button" onClick={() => editEvent(item)} aria-label="Edit item"><Pencil size={16} /></button>
                  <button type="button" className="danger" onClick={() => deleteEvent(item)} aria-label="Delete item"><Trash2 size={16} /></button>
                </div>
              </li>
            ))}
            {!loading && !upcomingItems.length ? <li className="adminContentEmpty">No upcoming items yet.</li> : null}
          </ul>
        </section>
      </div>

      <section className="adminContentCard adminContentAccounts">
        <h2><Users size={18} /> Student Portal Accounts</h2>
        <p className="adminContentHint">
          Everyone who has registered (email/password or Google) for the student dashboard. Deleting an account signs
          the student out immediately and they'll need to register again.
        </p>

        <div className="adminAccountsTableWrap">
          <table className="adminAccountsTable">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Sign-in</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {studentAccounts.map((account) => (
                <tr key={account.id}>
                  <td>{account.name}</td>
                  <td>{account.email}</td>
                  <td>{account.phone || '—'}</td>
                  <td><span className={`adminAccountBadge ${account.authProvider.toLowerCase()}`}>{account.authProvider}</span></td>
                  <td>{new Date(account.createdAt).toLocaleDateString()}</td>
                  <td className="adminAccountActions">
                    {account.authProvider === 'Password' ? (
                      <button
                        type="button"
                        title="Reset password"
                        disabled={accountBusyId === account.id}
                        onClick={() => resetStudentPassword(account)}
                      >
                        <KeyRound size={15} />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="danger"
                      title="Delete account"
                      disabled={accountBusyId === account.id}
                      onClick={() => deleteStudentAccount(account)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && !studentAccounts.length ? (
                <tr><td colSpan={6} className="adminContentEmpty">No students have registered yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <AdminCurriculumManager studentAccounts={studentAccounts} />
      <AdminAssignmentsManager studentAccounts={studentAccounts} />
      <AdminQuizzesManager studentAccounts={studentAccounts} />
      <AdminMessagesPanel studentAccounts={studentAccounts} />
    </div>
  );
}
