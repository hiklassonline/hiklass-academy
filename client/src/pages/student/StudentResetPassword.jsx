import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { brandAssets } from '../../assets';
import { requestPasswordReset, resetPassword } from '../../services/studentAuthService';
import './StudentAuth.css';

function getTokenFromUrl() {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('token') || '';
}

export default function StudentResetPassword() {
  const token = getTokenFromUrl();

  if (token) return <ResetPasswordForm token={token} />;
  return <ForgotPasswordForm />;
}

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!email.trim()) { setError('Email is required.'); return; }
    setLoading(true);
    setError('');
    setStatus('');
    try {
      const data = await requestPasswordReset(email.trim());
      setStatus(data.message || 'If an account with that email exists, a password reset link has been sent.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="studentAuthPage">
      <section className="studentAuthBrandPanel">
        <div className="studentAuthBrandContent">
          <img className="studentAuthLogo" src={brandAssets.logoHorizontal} alt="HIKLASS Academy" />
          <div className="studentAuthIntro">
            <h1>Forgot Your Password?</h1>
            <span />
            <p>Enter your email and we'll send you a link to reset it.</p>
          </div>
          <div className="studentAuthSecurity">
            <ShieldCheck size={38} />
            <div>
              <strong>Secure reset link</strong>
              <p>The link expires in 60 minutes for your security.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="studentAuthFormPanel">
        <form className="studentAuthCard" onSubmit={submit} noValidate>
          <div className="studentAuthLock">
            <KeyRound size={34} />
          </div>
          <h2>Reset Password</h2>
          <p>We'll email you a link to set a new password</p>

          <label className="studentAuthField">
            <span>Email Address</span>
            <div className={error ? 'invalid' : ''}>
              <Mail size={22} />
              <input
                type="email"
                value={email}
                onChange={(event) => { setEmail(event.target.value); setError(''); }}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
          </label>

          {error ? <div className="studentAuthError">{error}</div> : null}
          {status ? <div className="studentAuthSuccess">{status}</div> : null}

          <button className="studentAuthSubmit" type="submit" disabled={loading}>
            <Mail size={21} />
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <div className="studentAuthOptions">
            <a href="/student/login">Back to Sign In</a>
          </div>
        </form>
        <footer>&copy; 2026 HIKLASS Academy. All Rights Reserved.</footer>
      </section>
    </main>
  );
}

function ResetPasswordForm({ token }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    setError('');
    try {
      await resetPassword({ token, password });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="studentAuthPage">
      <section className="studentAuthBrandPanel">
        <div className="studentAuthBrandContent">
          <img className="studentAuthLogo" src={brandAssets.logoHorizontal} alt="HIKLASS Academy" />
          <div className="studentAuthIntro">
            <h1>Set a New Password</h1>
            <span />
            <p>Choose a strong password for your student account.</p>
          </div>
        </div>
      </section>

      <section className="studentAuthFormPanel">
        {done ? (
          <div className="studentAuthCard">
            <div className="studentAuthLock">
              <ShieldCheck size={34} />
            </div>
            <h2>Password Updated</h2>
            <p>Your password has been reset successfully.</p>
            <a className="studentAuthSubmit" href="/student/login" style={{ textDecoration: 'none', textAlign: 'center' }}>
              Sign In Now
            </a>
          </div>
        ) : (
          <form className="studentAuthCard" onSubmit={submit} noValidate>
            <div className="studentAuthLock">
              <LockKeyhole size={34} />
            </div>
            <h2>New Password</h2>
            <p>Enter and confirm your new password</p>

            <label className="studentAuthField">
              <span>New Password</span>
              <div className={error ? 'invalid' : ''}>
                <LockKeyhole size={22} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => { setPassword(event.target.value); setError(''); }}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </label>

            <label className="studentAuthField">
              <span>Confirm Password</span>
              <div className={error ? 'invalid' : ''}>
                <LockKeyhole size={22} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => { setConfirmPassword(event.target.value); setError(''); }}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </div>
            </label>

            {error ? <div className="studentAuthError">{error}</div> : null}

            <button className="studentAuthSubmit" type="submit" disabled={loading}>
              <LockKeyhole size={21} />
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
        <footer>&copy; 2026 HIKLASS Academy. All Rights Reserved.</footer>
      </section>
    </main>
  );
}
