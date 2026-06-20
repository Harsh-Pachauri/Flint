import React, { useState } from 'react';
import { postJSON, saveAuthTokens, setOnboardingCompleteState } from '../../utils/api';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await postJSON('/api/auth/login', { email, password });
      saveAuthTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken, userId: res.userId });
      setMessage('Login successful');
      const onboardingComplete = res?.user?.onboardingComplete === true || res?.onboardingComplete === true;
      setOnboardingCompleteState(onboardingComplete);
      setTimeout(() => (window.location.hash = onboardingComplete ? '#/' : '#/onboarding'), 600);
    } catch (err: any) {
      setMessage(parseApiError(err));
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
    <section style={{ padding: '60px 32px', maxWidth: '700px', margin: '20px auto' }}>
      <div className="card" style={{ padding: 28, borderRadius: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Welcome back</div>
        <h2 style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 28, color: 'var(--t1)', marginBottom: 8 }}>
          Log in to FLINT
        </h2>
        <p style={{ fontFamily: 'var(--f2)', color: 'var(--t2)', marginBottom: 18 }}>
          Use your college email to log in.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--t2)', marginBottom: 6 }}>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--t1)' }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--t2)', marginBottom: 6 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                required
                style={{ width: '100%', padding: '10px 40px 10px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--t1)' }}
              />
              <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label="Toggle password visibility" style={{ position: 'absolute', right: 8, top: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t3)' }}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button className="btn-grad" type="submit" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => (window.location.hash = '#/register')}>
              Create account
            </button>
          </div>
        </form>

        {message && <div style={{ marginTop: 12, fontFamily: 'var(--f2)', color: 'var(--t1)' }}>{message}</div>}
      </div>
    </section>
  );
};

export default Login;
