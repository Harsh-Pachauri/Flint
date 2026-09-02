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
      const res = await postJSON('/api/auth/register', { email, password, phone, name });
      saveAuthTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken, userId: res.userId });
      // The backend has no field for name at registration (it belongs on
      // Profile, set during onboarding) — hand it off via localStorage so
      // Onboarding's name field can pre-fill it instead of asking twice.
      if (name.trim()) {
        try {
          localStorage.setItem('pendingName', name.trim());
        } catch (e) {
          // localStorage unavailable — non-critical, onboarding just asks again
        }
      }
      const onboardingComplete = res?.onboardingComplete === true || res?.user?.onboardingComplete === true;
      setOnboardingCompleteState(onboardingComplete);
      setMessage('Account created! Setting up your profile...');
      setMessageType('success');
      setTimeout(() => (window.location.hash = onboardingComplete ? '#/' : '#/onboarding'), 900);
    } catch (err: any) {
      setMessage(parseApiError(err));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  function parseApiError(err: any) {
    if (!err) return 'Registration failed';
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    if (err.code === 11000) {
      const key = err.keyValue ? Object.keys(err.keyValue)[0] : null;
      if (key === 'email') return 'Email already registered';
      if (key === 'phone') return 'Phone number already in use';
      return 'Account already exists';
    }
    return err?.error || JSON.stringify(err) || 'Registration failed';
  }

  const inputStyle = 'inp';

  return (
    <section style={{ padding: '80px 32px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* Background orbs */}
      <div style={{ position: 'absolute', width: 500, height: 500, top: -100, left: -100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 400, height: 400, bottom: -80, right: -80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(224,48,192,0.06) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.02, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(139,92,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1, animation: 'fadeInUp 0.5s ease both' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
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
          <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--spark)', letterSpacing: '0.12em', marginBottom: 8 }}>CREATE ACCOUNT</div>
          <h2 style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 26, letterSpacing: '-0.03em', color: 'var(--t1)', marginBottom: 6 }}>
            Join FLINT
          </h2>
          <p style={{ fontFamily: 'var(--f2)', fontSize: 13, fontWeight: 300, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 24 }}>
            Sign up with your college email to start connecting.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.07em', marginBottom: 8 }}>FULL NAME</label>
              <input value={name} onChange={(e) => setName(e.target.value)} type="text" placeholder="What should we call you?" required className={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.07em', marginBottom: 8 }}>EMAIL</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="your@college.edu" required className={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.07em', marginBottom: 8 }}>PHONE (OPTIONAL)</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="+91 98765 43210" className={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.07em', marginBottom: 8 }}>PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters" required className={inputStyle} style={{ paddingRight: 42 }} />
                <button type="button" onClick={() => setShowPassword((s) => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 16 }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.07em', marginBottom: 8 }}>CONFIRM PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type={showConfirm ? 'text' : 'password'} placeholder="Re-enter password" required className={inputStyle} style={{ paddingRight: 42 }} />
                <button type="button" onClick={() => setShowConfirm((s) => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 16 }}>
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button className="btn-grad" type="submit" style={{ width: '100%', marginTop: 4, padding: '13px 0' }} disabled={loading}>
              {loading ? 'Creating account...' : 'Create account →'}
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
          Already have an account?{' '}
          <a href="#/login" style={{ color: 'var(--spark)', textDecoration: 'none', fontWeight: 600 }}>
            Sign in
          </a>
        </div>
      </div>
    </section>
  );
};

export default Register;
