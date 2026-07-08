import React, { useEffect, useRef, useState } from 'react';
import { Camera, Trash2, User } from 'lucide-react';
import {
  fetchStudentProfile,
  updateStudentProfile,
  uploadStudentAvatar,
  removeStudentAvatar,
} from '../../services/studentAuthService';
import getAssetUrl from '../../utils/getAssetUrl';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function StudentProfile() {
  const [values, setValues] = useState({ name: '', email: '', phone: '' });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [avatarMessage, setAvatarMessage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchStudentProfile()
      .then((student) => {
        if (cancelled) return;
        setValues({ name: student.name, email: student.email, phone: student.phone || '' });
        setAvatarUrl(student.avatarUrl || '');
      })
      .catch((err) => { if (!cancelled) setMessage({ type: 'error', text: err.message }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await updateStudentProfile({ name: values.name, phone: values.phone });
      setMessage({ type: 'success', text: 'Profile updated.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setAvatarMessage(null);
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setAvatarMessage({ type: 'error', text: 'Only JPG, PNG, and WEBP images are allowed.' });
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarMessage({ type: 'error', text: 'File is too large. Maximum size is 2MB.' });
      return;
    }

    setAvatarBusy(true);
    try {
      const student = await uploadStudentAvatar(file);
      setAvatarUrl(student.avatarUrl || '');
      setAvatarMessage({ type: 'success', text: 'Photo updated.' });
    } catch (error) {
      setAvatarMessage({ type: 'error', text: error.message });
    } finally {
      setAvatarBusy(false);
    }
  }

  async function onRemoveAvatar() {
    setAvatarBusy(true);
    setAvatarMessage(null);
    try {
      const student = await removeStudentAvatar();
      setAvatarUrl(student.avatarUrl || '');
      setAvatarMessage({ type: 'success', text: 'Photo removed.' });
    } catch (error) {
      setAvatarMessage({ type: 'error', text: error.message });
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <div>
      <div className="studentPageHeader">
        <h2>Profile</h2>
        <p>Your account details.</p>
      </div>

      <div className="studentCard" style={{ marginBottom: 20 }}>
        <div className="studentCardHead"><h3>Profile Photo</h3></div>
        <div className="studentAvatarUploader">
          <span className="studentAvatarPreview">
            {avatarUrl ? <img src={getAssetUrl(avatarUrl)} alt="" /> : <User size={30} />}
          </span>
          <div className="studentAvatarActions">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onAvatarSelected}
              hidden
            />
            <button type="button" className="studentBtnPrimary" onClick={() => fileInputRef.current?.click()} disabled={avatarBusy}>
              <Camera size={16} /> {avatarUrl ? 'Change photo' : 'Upload photo'}
            </button>
            {avatarUrl ? (
              <button type="button" className="studentBtnGhost" onClick={onRemoveAvatar} disabled={avatarBusy}>
                <Trash2 size={16} /> Remove
              </button>
            ) : null}
            <small>JPG, PNG, or WEBP. Max 2MB.</small>
            {avatarMessage ? <span className={`studentFormMessage ${avatarMessage.type}`}>{avatarMessage.text}</span> : null}
          </div>
        </div>
      </div>

      <div className="studentCard">
        {loading ? (
          <p className="studentEmptyState">Loading your profile...</p>
        ) : (
          <form className="studentForm" onSubmit={submit}>
            <div className="studentFormField">
              <label htmlFor="profile-name">Full name</label>
              <input id="profile-name" name="name" value={values.name} onChange={updateField} required minLength={2} />
            </div>
            <div className="studentFormField">
              <label htmlFor="profile-email">Email address</label>
              <input id="profile-email" name="email" value={values.email} disabled />
            </div>
            <div className="studentFormField">
              <label htmlFor="profile-phone">Phone number</label>
              <input id="profile-phone" name="phone" value={values.phone} onChange={updateField} placeholder="Optional" />
            </div>

            {message ? <span className={`studentFormMessage ${message.type}`}>{message.text}</span> : null}

            <div className="studentFormActions">
              <button className="studentBtnPrimary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
