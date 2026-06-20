import React, { useState } from 'react';
import { postJSON, saveAuthTokens, setOnboardingCompleteState } from '../../utils/api';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      setMessageType('error');
      setLoading(false);
      return;
    }

    try {
      const res = await postJSON('/api/auth/register', { 
        email, 
        password, 
        phone, 
        name 
      });
      saveAuthTokens({ 
        accessToken: res.accessToken, 
        refreshToken: res.refreshToken, 
        userId: res.userId 
      });
      const onboardingComplete = res?.onboardingComplete === true || res?.user?.onboardingComplete === true;
      setOnboardingCompleteState(onboardingComplete);
      setMessage(res.message || 'Registration successful! Redirecting to onboarding...');
      setMessageType('success');
      // navigate to onboarding after short delay
      setTimeout(() => (window.location.hash = onboardingComplete ? '#/' : '#/onboarding'), 900);
    } catch (err: any) {
      const msg = parseApiError(err);
      setMessage(msg);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  function parseApiError(err: any) {
    if (!err) return 'Registration failed';
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    // handle mongoose duplicate key
    if (err.code === 11000) {
      const key = err.keyValue ? Object.keys(err.keyValue)[0] : null;
      if (key === 'email') return 'Email already registered';
      if (key === 'username') return 'Username already taken';
      if (key === 'phone') return 'Phone number already in use';
      return 'Duplicate field exists';
    }
    if (err.errors) {
      try {
        return Object.values(err.errors).map((e: any) => e.message).join(', ');
      } catch (e) {
        // fallthrough
      }
    }
    return err?.error || JSON.stringify(err) || 'Registration failed';
  }

  return (
    <section style={{ padding: '60px 32px', maxWidth: '500px', margin: '0 auto' }}>
      <div className="card" style={{ padding: 28, borderRadius: 16 }}>
        <div style={{ fontFamily: 'var(--f3)', fontSize: 10, color: 'var(--spark)', letterSpacing: '0.1em', marginBottom: 12 }}>
          CREATE ACCOUNT
        </div>
        <h2 style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em', color: 'var(--t1)', marginBottom: 8 }}>
          Join FLINT
        </h2>
        <p style={{ fontFamily: 'var(--f2)', fontSize: 13, fontWeight: 300, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 24 }}>
          Sign up with your college email to start connecting with real people on your campus.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.07em', marginBottom: 6 }}>
              FULL NAME
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              placeholder="What should we call you?"
              required
              style={{
                width: '100%',
                padding: '11px 12px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--s2)',
                color: 'var(--t1)',
                fontFamily: 'var(--f2)',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.07em', marginBottom: 6 }}>
              EMAIL
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="your@college.edu"
              required
              style={{
                width: '100%',
                padding: '11px 12px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--s2)',
                color: 'var(--t1)',
                fontFamily: 'var(--f2)',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.07em', marginBottom: 6 }}>
              PHONE (OPTIONAL)
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              placeholder="+91 98765 43210"
              style={{
                width: '100%',
                padding: '11px 12px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--s2)',
                color: 'var(--t1)',
                fontFamily: 'var(--f2)',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.07em', marginBottom: 6 }}>
              PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--s2)',
                  color: 'var(--t1)',
                  fontFamily: 'var(--f2)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label="Toggle password visibility" style={{ position: 'absolute', right: 8, top: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t3)' }}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.07em', marginBottom: 6 }}>
              CONFIRM PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--s2)',
                  color: 'var(--t1)',
                  fontFamily: 'var(--f2)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <button type="button" onClick={() => setShowConfirm((s) => !s)} aria-label="Toggle confirm password visibility" style={{ position: 'absolute', right: 8, top: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t3)' }}>
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button className="btn-primary" type="submit" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
            {loading ? 'Creating account…' : 'Create account →'}
          </button>
        </form>

        {message && (
          <div
            style={{
              marginTop: 16,
              padding: '10px 12px',
              borderRadius: 8,
              background: messageType === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${messageType === 'success' ? '#22c55e' : '#ef4444'}`,
              fontFamily: 'var(--f2)',
              fontSize: 12,
              color: messageType === 'success' ? '#22c55e' : '#ef4444',
            }}
          >
            {message}
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: 'center', fontFamily: 'var(--f2)', fontSize: 12, color: 'var(--t2)' }}>
          Already have an account?{' '}
          <a
            href="#/login"
            style={{
              color: 'var(--spark)',
              textDecoration: 'none',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Sign in
          </a>
        </div>
      </div>
    </section>
  );
};

export default Register;
