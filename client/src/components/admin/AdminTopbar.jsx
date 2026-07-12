import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, Search, RefreshCw, Bell, ChevronDown, User, Lock, Activity, Settings, LogOut, CheckCircle2, X, Mail, CreditCard, MessageSquare, Info, AlertCircle } from 'lucide-react';
import useNotifications from '../../hooks/useNotifications';
import useGlobalSearch from '../../hooks/useGlobalSearch';
import { getStoredAdminToken } from '../../services/authService';
import { getStoredAdminUser } from '../../services/adminProfileService';
import API_URL from '../../utils/apiBaseUrl';
import AdminAvatar from './AdminAvatar.jsx';
import { safeLocalStorage as localStorage } from '../../utils/safeStorage';

const notifTypeIcons = { enrollment: Mail, payment: CreditCard, message: MessageSquare, error: AlertCircle, info: Info };
const notifTypeColors = { enrollment: '#0149CA', payment: '#059669', message: '#2554A5', error: '#D30D1A', info: '#6B7280' };

function formatRelativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function outsideClick(refs, handler) {
  return (e) => {
    if (refs.every((r) => r.current && !r.current.contains(e.target))) handler();
  };
}

export default function AdminTopbar({ currentPage, query: searchQuery, setQuery: setSearchQuery, sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed, loading, onRefresh, onOpenPage, onSignOut }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const dataSources = {
    courses: window.__adminData?.courses || [],
    packages: window.__adminData?.packages || [],
    orders: window.__adminData?.orders || [],
    students: window.__adminData?.students || [],
    payments: window.__adminData?.payments || [],
    messages: window.__adminData?.messages || [],
  };
  const { query, setQuery, grouped, open: searchOpen, setOpen: setSearchOpen, searching, ref: searchRef, typeLabels, typeIcons } = useGlobalSearch(dataSources);

  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [signOutConfirm, setSignOutConfirm] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwShow, setPwShow] = useState({ current: false, new: false, confirm: false });
  const [refreshing, setRefreshing] = useState(false);
  const [adminUser, setAdminUser] = useState(() => getStoredAdminUser() || { name: 'Admin', email: '', role: 'Super Admin', avatarUrl: '' });

  useEffect(() => {
    function handler() { setAdminUser(getStoredAdminUser() || { name: 'Admin', email: '', role: 'Super Admin', avatarUrl: '' }); }
    window.addEventListener('admin:profile-update', handler);
    return () => window.removeEventListener('admin:profile-update', handler);
  }, []);

  const notifRef = useRef(null);
  const notifBtnRef = useRef(null);
  const userMenuRef = useRef(null);
  const userBtnRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (notifRef.current && !notifRef.current.contains(e.target) && notifBtnRef.current && !notifBtnRef.current.contains(e.target)) setNotifOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target) && userBtnRef.current && !userBtnRef.current.contains(e.target)) setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    function escHandler(e) {
      if (e.key === 'Escape') { setNotifOpen(false); setUserMenuOpen(false); setSearchOpen(false); setPwModalOpen(false); setSignOutConfirm(false); }
    }
    document.addEventListener('keydown', escHandler);
    return () => document.removeEventListener('keydown', escHandler);
  }, [setSearchOpen]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
      window.dispatchEvent(new CustomEvent('admin:refresh'));
    } catch {} finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const handleSignOut = useCallback(() => {
    localStorage.removeItem('hiklass-admin-token');
    localStorage.removeItem('hiklass-admin-user');
    sessionStorage.removeItem('hiklass-admin-session-token');
    if (onSignOut) onSignOut();
    document.title = 'Admin Login - HIKLASS Academy';
  }, [onSignOut]);

  const handleChangePassword = useCallback(async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (!pwForm.currentPassword) { setPwError('Current password is required.'); return; }
    if (pwForm.newPassword.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('Passwords do not match.'); return; }
    try {
      const res = await fetch(`${API_URL}/api/admin/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': getStoredAdminToken() },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword, confirmPassword: pwForm.confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Password change failed.');
      setPwSuccess('Password changed successfully.');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPwModalOpen(false), 1500);
    } catch (err) {
      setPwError(err.message);
    }
  }, [pwForm]);

  const handleSearchInputChange = useCallback((e) => {
    const val = e.target.value;
    setQuery(val);
    if (setSearchQuery) setSearchQuery(val);
  }, [setSearchQuery, setQuery]);

  return (
    <>
      <header style={{
        position: 'sticky', top: 0, zIndex: 20,
        display: 'grid', gridTemplateColumns: 'auto minmax(200px, 340px) auto',
        alignItems: 'center', gap: '16px',
        minHeight: '72px', padding: '0 28px',
        background: 'rgba(255,255,255,0.92)',
        borderBottom: '1px solid #E5E7EB',
        backdropFilter: 'blur(18px)',
      }}>
        {/* Left: title + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button type="button" onClick={() => { if (window.innerWidth <= 1180) { setSidebarOpen((prev) => !prev); } else { setSidebarCollapsed((prev) => { const next = !prev; try { localStorage.setItem('adminSidebarCollapsed', JSON.stringify(next)); } catch {} return next; }); } }} aria-label="Toggle sidebar" style={{
            display: 'inline-grid', placeItems: 'center', width: 40, height: 40,
            background: 'transparent', border: '1px solid transparent', borderRadius: 8,
            cursor: 'pointer', color: '#111827',
          }}>
            <Menu size={22} />
          </button>
          <h1 style={{ margin: 0, color: '#111827', fontSize: '1.35rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{currentPage?.label || 'Dashboard'}</h1>
        </div>

        {/* Center: search */}
        <div ref={searchRef} style={{ position: 'relative', width: '100%' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            minHeight: 42, padding: '0 12px',
            background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8,
          }}>
            <Search size={18} color="#6B7280" />
            <input
              value={query}
              onChange={handleSearchInputChange}
              onFocus={() => query.trim() && setSearchOpen(true)}
              placeholder="Search courses, enrollments..."
              style={{ width: '100%', border: 0, outline: 'none', color: '#111827', fontSize: 14, background: 'transparent' }}
              aria-label="Global search"
            />
            {searching && <RefreshCw size={14} color="#6B7280" style={{ animation: 'spin 1s linear infinite' }} />}
          </div>
          {searchOpen && query.trim() && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              background: '#FFFFFF', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
              maxHeight: 380, overflow: 'auto', zIndex: 100,
              border: '1px solid #E5E7EB',
            }}>
              {Object.keys(grouped).length === 0 ? (
                <div style={{ padding: '28px 20px', textAlign: 'center', color: '#6B7280', fontSize: 14 }}>
                  <Search size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                  <div>No results found</div>
                </div>
              ) : (
                Object.entries(grouped).map(([type, items]) => (
                  <div key={type}>
                    <div style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {typeLabels[type] || type}
                    </div>
                    {items.map((item) => (
                      <button
                        key={item.id + item.type}
                        type="button"
                        onClick={() => { onOpenPage(item.type === 'enrollment' ? 'enrollments' : `${item.type}s`); setSearchOpen(false); setQuery(''); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          width: '100%', padding: '10px 16px',
                          background: 'none', border: 'none', cursor: 'pointer',
                          textAlign: 'left', fontSize: 14, color: '#111827',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        <span style={{ fontSize: 18 }}>{typeIcons[type]}</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{item.title}</div>
                          <div style={{ fontSize: 12, color: '#6B7280' }}>{item.subtitle}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right: icons + profile */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
          {/* Refresh */}
          <button type="button" onClick={handleRefresh} disabled={refreshing} aria-label="Refresh dashboard" style={{
            display: 'inline-grid', placeItems: 'center', width: 40, height: 40,
            background: 'transparent', border: '1px solid transparent', borderRadius: 8,
            cursor: refreshing ? 'not-allowed' : 'pointer', color: '#111827', opacity: refreshing ? 0.5 : 1,
          }}>
            <RefreshCw size={18} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>

          {/* Notification bell */}
          <div style={{ position: 'relative' }}>
            <button ref={notifBtnRef} type="button" onClick={() => setNotifOpen((prev) => !prev)} aria-label="Notifications" style={{
              position: 'relative', display: 'inline-grid', placeItems: 'center', width: 40, height: 40,
              background: 'transparent', border: '1px solid transparent', borderRadius: 8,
              cursor: 'pointer', color: '#111827',
            }}>
              <Bell size={18} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 6, right: 6, width: 18, height: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#D30D1A', color: '#FFFFFF', fontSize: 10, fontWeight: 700,
                  borderRadius: '50%', border: '2px solid #FFFFFF',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div ref={notifRef} style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 360,
                background: '#FFFFFF', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                maxHeight: 420, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                zIndex: 100, border: '1px solid #E5E7EB',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 10px', borderBottom: '1px solid #F3F4F6' }}>
                  <strong style={{ fontSize: 15, color: '#111827' }}>Notifications</strong>
                  <button type="button" onClick={markAllAsRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#0149CA', fontWeight: 600 }}>
                    Mark all as read
                  </button>
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '32px 20px', textAlign: 'center', color: '#6B7280', fontSize: 14 }}>
                      <Bell size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                      No notifications
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const Icon = notifTypeIcons[n.type] || Info;
                      const color = notifTypeColors[n.type] || '#6B7280';
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => { markAsRead(n.id); setNotifOpen(false); if (n.route) onOpenPage(n.route.replace('/admin/', '')); }}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 12,
                            width: '100%', padding: '12px 16px',
                            background: n.isRead ? '#FFFFFF' : '#F0F4FF',
                            border: 'none', borderBottom: '1px solid #F3F4F6',
                            cursor: 'pointer', textAlign: 'left', fontSize: 13,
                          }}
                        >
                          <span style={{ flexShrink: 0, width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: 8, background: `${color}15`, color }}>
                            <Icon size={16} />
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: '#111827', marginBottom: 2 }}>{n.title}</div>
                            <div style={{ color: '#6B7280', fontSize: 12, lineHeight: 1.4 }}>{n.message}</div>
                            <div style={{ color: '#9CA3AF', fontSize: 11, marginTop: 4 }}>{formatRelativeTime(n.createdAt)}</div>
                          </div>
                          {!n.isRead && <span style={{ flexShrink: 0, width: 8, height: 8, borderRadius: '50%', background: '#1E2F97', marginTop: 6 }} />}
                        </button>
                      );
                    })
                  )}
                </div>
                <div style={{ padding: '10px 16px', borderTop: '1px solid #F3F4F6', textAlign: 'center' }}>
                  <button type="button" onClick={() => { setNotifOpen(false); onOpenPage('email-logs'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#6B7280' }}>
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Admin profile */}
          <div style={{ position: 'relative' }}>
            <button ref={userBtnRef} type="button" onClick={() => setUserMenuOpen((prev) => !prev)} aria-label="Admin menu" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              paddingLeft: 12, borderLeft: '1px solid #E5E7EB',
              background: 'none', borderTop: 'none', borderRight: 'none', borderBottom: 'none',
              cursor: 'pointer', color: '#111827',
            }}>
              <AdminAvatar key={adminUser.avatarUrl || 'no-avatar'} user={adminUser} size={36} />
              <div style={{ textAlign: 'left', display: 'none', '@media (min-width: 768px)': { display: 'block' } }}>
                <strong style={{ display: 'block', fontSize: 13 }}>{adminUser.name || 'Admin'}</strong>
                <small style={{ display: 'block', color: '#6B7280', fontSize: 11 }}>{adminUser.role || 'Super Admin'}</small>
              </div>
              <ChevronDown size={14} color="#6B7280" />
            </button>

            {userMenuOpen && (
              <div ref={userMenuRef} style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 260,
                background: '#FFFFFF', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                zIndex: 100, border: '1px solid #E5E7EB', padding: '6px 0',
              }}>
                {/* Account info */}
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #F3F4F6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <AdminAvatar key={adminUser.avatarUrl || 'no-avatar'} user={adminUser} size={40} />
                    <div>
                      <strong style={{ display: 'block', fontSize: 14, color: '#111827' }}>{adminUser.name || 'Admin'}</strong>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>{adminUser.role || 'Super Admin'}</span>
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>{adminUser.email || ''}</div>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                {[
                  { icon: User, label: 'My Profile', onClick: () => onOpenPage('profile') },
                  { icon: Lock, label: 'Change Password', onClick: () => { setUserMenuOpen(false); setPwModalOpen(true); } },
                  { icon: Activity, label: 'Activity Log', onClick: () => onOpenPage('activity-logs') },
                  { icon: Settings, label: 'Settings', onClick: () => onOpenPage('settings') },
                  { icon: LogOut, label: 'Sign Out', onClick: () => setSignOutConfirm(true), danger: true },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => { setUserMenuOpen(false); item.onClick(); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '10px 16px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      textAlign: 'left', fontSize: 14,
                      color: item.danger ? '#D30D1A' : '#111827',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <item.icon size={16} color={item.danger ? '#D30D1A' : '#6B7280'} />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      {pwModalOpen && (
        <div onClick={() => { setPwModalOpen(false); setPwError(''); setPwSuccess(''); }} style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: '#FFFFFF', borderRadius: 16, width: '90%', maxWidth: 440,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: '28px 32px 24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#111827' }}>Change Password</h3>
              <button type="button" onClick={() => { setPwModalOpen(false); setPwError(''); setPwSuccess(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
                <X size={20} />
              </button>
            </div>

            {pwError && <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#991B1B', fontSize: 13, marginBottom: 16 }}>{pwError}</div>}
            {pwSuccess && <div style={{ padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, color: '#065F46', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={16} />{pwSuccess}</div>}

            <form onSubmit={handleChangePassword}>
              {['currentPassword', 'newPassword', 'confirmPassword'].map((field) => {
                const label = field === 'currentPassword' ? 'Current Password' : field === 'newPassword' ? 'New Password' : 'Confirm New Password';
                const show = pwShow[field === 'currentPassword' ? 'current' : field === 'newPassword' ? 'new' : 'confirm'];
                return (
                  <div key={field} style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={show ? 'text' : 'password'}
                        value={pwForm[field]}
                        onChange={(e) => setPwForm((prev) => ({ ...prev, [field]: e.target.value }))}
                        style={{ width: '100%', padding: '10px 38px 10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                        autoComplete="off"
                      />
                      <button type="button" onClick={() => setPwShow((prev) => ({ ...prev, [field === 'currentPassword' ? 'current' : field === 'newPassword' ? 'new' : 'confirm']: !show }))} style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 12,
                      }}>
                        {show ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                );
              })}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" onClick={() => { setPwModalOpen(false); setPwError(''); setPwSuccess(''); }} style={{
                  padding: '10px 20px', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 8,
                  cursor: 'pointer', fontSize: 14, color: '#374151',
                }}>Cancel</button>
                <button type="submit" style={{
                  padding: '10px 24px', background: '#1E2F97', border: 'none', borderRadius: 8,
                  cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#FFFFFF',
                }}>Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation */}
      {signOutConfirm && (
        <div onClick={() => setSignOutConfirm(false)} style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: '#FFFFFF', borderRadius: 16, width: '90%', maxWidth: 380,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: '28px 32px 24px',
            textAlign: 'center',
          }}>
            <LogOut size={32} color="#D30D1A" style={{ margin: '0 auto 12px', display: 'block' }} />
            <h3 style={{ margin: '0 0 6px', fontSize: 18, color: '#111827' }}>Sign Out</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#6B7280' }}>Are you sure you want to sign out?</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button type="button" onClick={() => setSignOutConfirm(false)} style={{
                padding: '10px 24px', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 8,
                cursor: 'pointer', fontSize: 14, color: '#374151',
              }}>Cancel</button>
              <button type="button" onClick={handleSignOut} style={{
                padding: '10px 24px', background: '#D30D1A', border: 'none', borderRadius: 8,
                cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#FFFFFF',
              }}>Sign Out</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .topbar-search-wide { display: block; }
        }
      `}</style>
    </>
  );
}
