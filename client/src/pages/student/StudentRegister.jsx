import React, { useState } from 'react';
import { Eye, EyeOff, GraduationCap, LockKeyhole, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import { brandAssets } from '../../assets';
import { registerStudent } from '../../services/studentAuthService';
import './StudentAuth.css';

function validate(values) {
  const errors = {};
  if (!values.name.trim() || values.name.trim().length < 2) errors.name = 'Your name is required.';
  if (!values.email.trim()) errors.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Enter a valid email address.';
  if (!values.password) errors.password = 'Password is required.';
  else if (values.password.length < 6) errors.password = 'Password must be at least 6 characters.';
  return errors;
}

export default function StudentRegister() {
  const [values, setValues] = useState({ name: '', email: '', phone: '', password: '', rememberMe: true });
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

  async function submitRegister(event) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    setFormError('');
    try {
      await registerStudent(values);
      window.location.assign('/student/dashboard');
    } catch (error) {
      setFormError(error.message);
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
            <h1>Track Your Enrollment</h1>
            <span />
            <p>Create an account to see your courses, packages, and payment status in one place.</p>
          </div>

          <div className="studentAuthSecurity">
            <ShieldCheck size={38} />
            <div>
              <strong>Free and quick</strong>
              <p>Takes less than a minute to set up.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="studentAuthFormPanel">
        <form className="studentAuthCard" onSubmit={submitRegister} noValidate>
          <div className="studentAuthLock">
            <GraduationCap size={34} />
          </div>
          <h2>Create Your Account</h2>
          <p>Enter your details to get started</p>

          <label className="studentAuthField">
            <span>Full Name</span>
            <div className={errors.name ? 'invalid' : ''}>
              <User size={22} />
              <input
                type="text"
                name="name"
                value={values.name}
                onChange={updateField}
                placeholder="Your full name"
                autoComplete="name"
              />
            </div>
            {errors.name ? <small>{errors.name}</small> : null}
          </label>

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
            <span>Phone Number (optional)</span>
            <div>
              <Phone size={22} />
              <input
                type="tel"
                name="phone"
                value={values.phone}
                onChange={updateField}
                placeholder="Your phone number"
                autoComplete="tel"
              />
            </div>
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
                placeholder="Create a password"
                autoComplete="new-password"
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
            <a href="/student/login">Already have an account?</a>
          </div>

          {formError ? <div className="studentAuthError">{formError}</div> : null}

          <button className="studentAuthSubmit" type="submit" disabled={loading}>
            <LockKeyhole size={21} />
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        <footer>&copy; 2026 HIKLASS Academy. All Rights Reserved.</footer>
      </section>
    </main>
  );
}
