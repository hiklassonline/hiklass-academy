import React, { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { brandAssets } from '../../assets';
import { loginAdmin } from '../../services/authService';
import './AdminLogin.css';

function validate(values) {
  const errors = {};
  if (!values.email.trim()) errors.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Enter a valid email address.';
  if (!values.password) errors.password = 'Password is required.';
  else if (values.password.length < 6) errors.password = 'Password must be at least 6 characters.';
  return errors;
}

export default function AdminLogin() {
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
      await loginAdmin(values);
      window.location.assign('/admin/dashboard');
    } catch (error) {
      setFormError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="adminLoginPage">
      <section className="adminLoginBrandPanel">
        <div className="adminLoginBrandContent">
          <img className="adminLoginLogo" src={brandAssets.logoHorizontal} alt="HIKLASS Academy" />
          <div className="adminLoginIntro">
            <h1>Welcome Back, Admin!</h1>
            <span />
            <p>Sign in to access your dashboard and manage HIKLASS Academy.</p>
          </div>

          <div className="adminLoginIllustration" aria-hidden="true">
            <div className="adminLoginLaptop">
              <div className="adminLoginLaptopScreen">
                <i />
                <b />
                <b />
                <b />
                <em />
              </div>
              <div className="adminLoginLaptopBase" />
            </div>
            <div className="adminLoginBooks">
              <span />
              <span />
              <span />
            </div>
            <div className="adminLoginCap" />
          </div>

          <div className="adminLoginSecurity">
            <ShieldCheck size={38} />
            <div>
              <strong>Secure Admin Access</strong>
              <p>Your data is protected with advanced security.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="adminLoginFormPanel">
        <form className="adminLoginCard" onSubmit={submitLogin} noValidate>
          <div className="adminLoginLock">
            <LockKeyhole size={34} />
          </div>
          <h2>Admin Login</h2>
          <p>Enter your credentials to continue</p>

          <label className="adminLoginField">
            <span>Email Address</span>
            <div className={errors.email ? 'invalid' : ''}>
              <Mail size={22} />
              <input
                type="email"
                name="email"
                value={values.email}
                onChange={updateField}
                placeholder="admin@hiklassacademy.com"
                autoComplete="email"
              />
            </div>
            {errors.email ? <small>{errors.email}</small> : null}
          </label>

          <label className="adminLoginField">
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

          <div className="adminLoginOptions">
            <label>
              <input type="checkbox" name="rememberMe" checked={values.rememberMe} onChange={updateField} />
              <span>Remember me</span>
            </label>
            <a href="mailto:info@hiklassacademy.com?subject=Admin%20password%20reset">Forgot Password?</a>
          </div>

          {formError ? <div className="adminLoginError">{formError}</div> : null}

          <button className="adminLoginSubmit" type="submit" disabled={loading}>
            <LockKeyhole size={21} />
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          <div className="adminLoginDivider">
            <span />
            <p>or continue with</p>
            <span />
          </div>

          <button className="adminLoginGoogle" type="button" onClick={() => setFormError('Google sign-in is not configured yet.')}>
            <strong>G</strong>
            Continue with Google
          </button>
        </form>
        <footer>&copy; 2026 HIKLASS Academy. All Rights Reserved.</footer>
      </section>
    </main>
  );
}
