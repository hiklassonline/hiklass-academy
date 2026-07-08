import React, { useCallback, useState } from 'react';
import { Eye, EyeOff, GraduationCap, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { brandAssets } from '../../assets';
import { loginStudent, loginWithGoogleCredential } from '../../services/studentAuthService';
import GoogleAuthButton from '../../components/GoogleAuthButton';
import './StudentAuth.css';

const GOOGLE_ENABLED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

function validate(values) {
  const errors = {};
  if (!values.email.trim()) errors.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Enter a valid email address.';
  if (!values.password) errors.password = 'Password is required.';
  else if (values.password.length < 6) errors.password = 'Password must be at least 6 characters.';
  return errors;
}

export default function StudentLogin() {
  const [values, setValues] = useState({ email: '', password: '', rememberMe: true });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function updateField(event) {
    const { name, type, checked, value } = event.target;
    setValues((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setFormError('');
  }

  async function submitLogin(event) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    setFormError('');
    try {
      await loginStudent(values);
      window.location.assign('/student/dashboard');
    } catch (error) {
      setFormError(error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleCredential = useCallback(async (credential) => {
    setFormError('');
    setLoading(true);
    try {
      await loginWithGoogleCredential(credential, values.rememberMe);
      window.location.assign('/student/dashboard');
    } catch (error) {
      setFormError(error.message);
    } finally {
      setLoading(false);
    }
  }, [values.rememberMe]);

  return (
    <main className="studentAuthPage">
      <section className="studentAuthBrandPanel">
        <div className="studentAuthBrandContent">
          <img className="studentAuthLogo" src={brandAssets.logoHorizontal} alt="HIKLASS Academy" />
          <div className="studentAuthIntro">
            <h1>Welcome Back!</h1>
            <span />
            <p>Sign in to track your enrollments and payment status.</p>
          </div>

          <div className="studentAuthSecurity">
            <ShieldCheck size={38} />
            <div>
              <strong>Your account, your data</strong>
              <p>Only you can see your enrollments and payments.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="studentAuthFormPanel">
        <form className="studentAuthCard" onSubmit={submitLogin} noValidate>
          <div className="studentAuthLock">
            <GraduationCap size={34} />
          </div>
          <h2>Student Login</h2>
          <p>Enter your credentials to continue</p>

          {GOOGLE_ENABLED ? (
            <>
              <div className="studentAuthGoogle">
                <GoogleAuthButton onCredential={handleGoogleCredential} type="icon" />
              </div>
              <div className="studentAuthDivider"><span>or sign in with email</span></div>
            </>
          ) : null}

          <label className="studentAuthField">
            <span>Email Address</span>
            <div className={errors.email ? 'invalid' : ''}>
              <Mail size={22} />
              <input
                type="email"
                name="email"
                value={values.email}
                onChange={updateField}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            {errors.email ? <small>{errors.email}</small> : null}
          </label>

          <label className="studentAuthField">
            <span>Password</span>
            <div className={errors.password ? 'invalid' : ''}>
              <LockKeyhole size={22} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={values.password}
                onChange={updateField}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>
            {errors.password ? <small>{errors.password}</small> : null}
          </label>

          <div className="studentAuthOptions">
            <label>
              <input type="checkbox" name="rememberMe" checked={values.rememberMe} onChange={updateField} />
              <span>Remember me</span>
            </label>
            <a href="/student/register">Create an account</a>
          </div>

          {formError ? <div className="studentAuthError">{formError}</div> : null}

          <button className="studentAuthSubmit" type="submit" disabled={loading}>
            <LockKeyhole size={21} />
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        <footer>&copy; 2026 HIKLASS Academy. All Rights Reserved.</footer>
      </section>
    </main>
  );
}
