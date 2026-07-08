import React, { useState } from 'react';
import { changeStudentPassword } from '../../services/studentAuthService';

export default function StudentSettings() {
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setMessage(null);
  }

  async function submit(event) {
    event.preventDefault();
    if (values.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (values.newPassword !== values.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await changeStudentPassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      setMessage({ type: 'success', text: 'Password updated.' });
      setValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="studentPageHeader">
        <h2>Settings</h2>
        <p>Manage your account security.</p>
      </div>

      <div className="studentCard">
        <div className="studentCardHead"><h3>Change Password</h3></div>
        <form className="studentForm" onSubmit={submit}>
          <div className="studentFormField">
            <label htmlFor="current-password">Current password</label>
            <input id="current-password" name="currentPassword" type="password" value={values.currentPassword} onChange={updateField} required />
          </div>
          <div className="studentFormField">
            <label htmlFor="new-password">New password</label>
            <input id="new-password" name="newPassword" type="password" value={values.newPassword} onChange={updateField} required minLength={6} />
          </div>
          <div className="studentFormField">
            <label htmlFor="confirm-password">Confirm new password</label>
            <input id="confirm-password" name="confirmPassword" type="password" value={values.confirmPassword} onChange={updateField} required minLength={6} />
          </div>

          {message ? <span className={`studentFormMessage ${message.type}`}>{message.text}</span> : null}

          <div className="studentFormActions">
            <button className="studentBtnPrimary" type="submit" disabled={saving}>
              {saving ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </form>

        <p className="studentSettingsNote">
          Notification preferences and dark mode are coming soon.
        </p>
      </div>
    </div>
  );
}
