import React, { useState } from 'react';
import { postJSON, saveAuthTokens, setOnboardingCompleteState } from '../../utils/api';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await postJSON('/api/auth/login', { email, password });
      saveAuthTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken, userId: res.userId });
      setMessage('Welcome back! Redirecting...');
      setMessageType('success');
      const onboardingComplete = res?.user?.onboardingComplete === true || res?.onboardingComplete === true;
      setOnboardingCompleteState(onboardingComplete);
      setTimeout(() => (window.location.hash = onboardingComplete ? '#/' : '#/onboarding'), 600);
    } catch (err: any) {
      setMessage(parseApiError(err));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  function parseApiError(err: any) {
    if (!err) return 'Login failed';
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    if (err.error) return err.error;
    return JSON.stringify(err) || 'Login failed';
  }

  return (
    <section style={{ padding: '80px 32px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* Background orbs */}
      <div style={{ position: 'absolute', width: 500, height: 500, top: -100, right: -100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(224,48,192,0.06) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 400, height: 400, bottom: -80, left: -80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      {/* Subtle grid */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.02, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(224,48,192,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(224,48,192,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1, animation: 'fadeInUp 0.5s ease both' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 36, letterSpacing: '-0.04em', color: 'var(--t1)', marginBottom: 6 }}>
            FL<span style={{ background: 'linear-gradient(135deg, var(--spark), var(--vio))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>INT</span>
          </div>
          <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.15em' }}>COLLEGE · FIRST · DATING</div>
        </div>

        <div style={{
          background: 'rgba(19, 18, 38, 0.6)', backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '32px 28px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--spark)', letterSpacing: '0.12em', marginBottom: 8 }}>WELCOME BACK</div>
          <h2 style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 26, color: 'var(--t1)', marginBottom: 6, letterSpacing: '-0.03em' }}>
            Log in to FLINT
          </h2>
          <p style={{ fontFamily: 'var(--f2)', color: 'var(--t2)', fontSize: 13, marginBottom: 24, fontWeight: 300, lineHeight: 1.6 }}>
            Use your college email to sign in.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.07em', marginBottom: 8 }}>EMAIL</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                placeholder="you@college.edu"
                className="inp"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.07em', marginBottom: 8 }}>PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  className="inp"
                  style={{ paddingRight: 42 }}
                />
                <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label="Toggle password visibility" style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 16,
                }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button className="btn-grad" type="submit" style={{ width: '100%', marginTop: 4, padding: '13px 0' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          {message && (
            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 10,
              background: messageType === 'success' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${messageType === 'success' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
              fontFamily: 'var(--f2)', fontSize: 12,
              color: messageType === 'success' ? '#22c55e' : '#ef4444',
              animation: 'fadeInUp 0.3s ease',
            }}>
              {message}
            </div>
          )}
        </div>

        <div style={{ marginTop: 20, textAlign: 'center', fontFamily: 'var(--f2)', fontSize: 13, color: 'var(--t2)' }}>
          Don't have an account?{' '}
          <a href="#/register" style={{ color: 'var(--spark)', textDecoration: 'none', fontWeight: 600 }}>
            Create one
          </a>
        </div>
      </div>
    </section>
  );
};

export default Login;
