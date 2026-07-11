import React, { useState, useEffect, useRef } from 'react';
import { Camera, Loader2, Trash2, Save, User, Mail, Shield, AlertCircle } from 'lucide-react';
import { getAdminProfile, updateAdminProfile, uploadAdminAvatar, deleteAdminAvatar, getStoredAdminUser } from '../../services/adminProfileService';
import AdminAvatar from './AdminAvatar.jsx';

function toast(text, type = 'success') {
  const evt = new CustomEvent('admin:toast', { detail: { message: text, type } });
  window.dispatchEvent(evt);
}

function updateAdminUser(user) {
  localStorage.setItem('hiklass-admin-user', JSON.stringify(user));
  window.dispatchEvent(new CustomEvent('admin:profile-update'));
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await getAdminProfile();
      setProfile(res.user || {});
    } catch {
      const stored = getStoredAdminUser();
      setProfile(stored || { name: 'Admin', email: '', role: 'Super Admin', avatarUrl: '' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateAdminProfile({ name: profile.name, email: profile.email });
      if (res.user) {
        setProfile(res.user);
        updateAdminUser(res.user);
        toast('Profile updated successfully');
      }
    } catch (e) {
      toast(e.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const res = await uploadAdminAvatar(file);
      const user = res.user || {};
      setProfile((prev) => ({ ...prev, ...user }));
      updateAdminUser({ ...(getStoredAdminUser() || {}), ...user });
      toast('Avatar uploaded successfully');
    } catch (e) {
      setUploadError(e.message || 'Upload failed');
      toast(e.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);
    try {
      const res = await deleteAdminAvatar();
      const user = res.user || {};
      setProfile((prev) => ({ ...prev, ...user }));
      updateAdminUser({ ...(getStoredAdminUser() || {}), ...user });
      toast('Avatar removed');
    } catch (e) {
      toast(e.message || 'Failed to remove avatar', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <article className="adminPanel adminFullPanel" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Loader2 size={32} className="spin" color="#0149CA" />
      </article>
    );
  }

  return (
    <article className="adminPanel adminFullPanel">
      <div className="adminPanelTitle">
        <h2>My Profile</h2>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <AdminAvatar key={profile?.avatarUrl || 'default'} user={profile} size={120} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 36, height: 36, borderRadius: '50%',
                background: '#1E2F97', border: '3px solid #FFFFFF',
                color: '#FFFFFF', cursor: 'pointer',
                display: 'grid', placeItems: 'center',
              }}
              aria-label="Upload avatar"
            >
              {uploading ? <Loader2 size={16} className="spin" /> : <Camera size={16} />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} style={{ display: 'none' }} />
          </div>
          <div style={{ marginTop: 8 }}>
            {profile?.avatarUrl ? (
              <button type="button" onClick={handleRemoveAvatar} disabled={uploading} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D30D1A', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Trash2 size={14} /> Remove photo
              </button>
            ) : (
              <span style={{ fontSize: 12, color: '#6B7280' }}>JPG, PNG or WEBP. Max 2MB.</span>
            )}
          </div>
          {uploadError && (
            <div style={{ marginTop: 8, color: '#D30D1A', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <AlertCircle size={14} /> {uploadError}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
              <input
                type="text"
                value={profile?.name || ''}
                onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px 10px 38px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                placeholder="Enter your name"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
              <input
                type="email"
                value={profile?.email || ''}
                onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px 10px 38px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Role</label>
            <div style={{ position: 'relative' }}>
              <Shield size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
              <input
                type="text"
                value={profile?.role || 'Super Admin'}
                disabled
                style={{ width: '100%', padding: '10px 12px 10px 38px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, background: '#F9FAFB', color: '#6B7280', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 32px', background: '#1E2F97', color: '#FFFFFF', border: 'none',
              borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              marginTop: 8,
            }}
          >
            {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #E5E7EB' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#D30D1A', marginBottom: 4 }}>Danger Zone</h3>
          <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>Permanently remove your avatar photo.</p>
          <button
            type="button"
            onClick={handleRemoveAvatar}
            disabled={uploading || !profile?.avatarUrl}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 20px', border: '1px solid #D30D1A', borderRadius: 8,
              background: 'transparent', color: '#D30D1A', fontSize: 13, cursor: 'pointer',
              opacity: (!profile?.avatarUrl || uploading) ? 0.5 : 1,
            }}
          >
            <Trash2 size={16} /> Remove Avatar
          </button>
        </div>
      </div>
    </article>
  );
}
