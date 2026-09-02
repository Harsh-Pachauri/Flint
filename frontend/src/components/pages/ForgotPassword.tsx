import React, { useState } from 'react';
import { postJSON } from '../../utils/api';

const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);

  function parseApiError(err: any, fallback: string) {
    if (!err) return fallback;
    if (typeof err === 'string') return err;
    if (err.error) return err.error;
    if (err.message) return err.message;
    return fallback;
  }

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await postJSON('/api/auth/forgot-password', { email });
      setResetToken(res.resetToken);
      setMessage(res.message || 'If an account exists, a code has been sent.');
      setMessageType('success');
      setStep('reset');
    } catch (err: any) {
      setMessage(parseApiError(err, 'Could not send reset code. Please try again.'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      setMessageType('error');
      return;
    }

    setLoading(true);
    try {
      await postJSON('/api/auth/reset-password', { resetToken, otp, newPassword });
      setMessage('Password reset successful. You can now sign in.');
      setMessageType('success');
      setStep('done');
    } catch (err: any) {
      setMessage(parseApiError(err, 'Could not reset password. Please try again.'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ padding: '80px 32px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, top: -100, right: -100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(224,48,192,0.06) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 400, height: 400, bottom: -80, left: -80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1, animation: 'fadeInUp 0.5s ease both' }}>
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
          <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--spark)', letterSpacing: '0.12em', marginBottom: 8 }}>RESET PASSWORD</div>

          {step === 'request' && (
            <>
              <h2 style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 26, color: 'var(--t1)', marginBottom: 6, letterSpacing: '-0.03em' }}>
                Forgot your password?
              </h2>
              <p style={{ fontFamily: 'var(--f2)', color: 'var(--t2)', fontSize: 13, marginBottom: 24, fontWeight: 300, lineHeight: 1.6 }}>
                Enter the email on your account and we'll send you a code to reset your password.
              </p>
              <form onSubmit={handleRequestCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                <button className="btn-grad" type="submit" style={{ width: '100%', marginTop: 4, padding: '13px 0' }} disabled={loading}>
                  {loading ? 'Sending...' : 'Send reset code →'}
                </button>
              </form>
            </>
          )}

          {step === 'reset' && (
            <>
              <h2 style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 26, color: 'var(--t1)', marginBottom: 6, letterSpacing: '-0.03em' }}>
                Enter your code
              </h2>
              <p style={{ fontFamily: 'var(--f2)', color: 'var(--t2)', fontSize: 13, marginBottom: 24, fontWeight: 300, lineHeight: 1.6 }}>
                If an account exists for that email, a 6-digit code was sent to it. Enter it below with your new password.
              </p>
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.07em', marginBottom: 8 }}>6-DIGIT CODE</label>
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    placeholder="123456"
                    className="inp"
                    style={{ letterSpacing: '0.2em', textAlign: 'center' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.07em', marginBottom: 8 }}>NEW PASSWORD</label>
                  <input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type="password"
                    required
                    placeholder="Min. 8 characters"
                    className="inp"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.07em', marginBottom: 8 }}>CONFIRM NEW PASSWORD</label>
                  <input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type="password"
                    required
                    placeholder="Re-enter password"
                    className="inp"
                  />
                </div>
                <button className="btn-grad" type="submit" style={{ width: '100%', marginTop: 4, padding: '13px 0' }} disabled={loading}>
                  {loading ? 'Resetting...' : 'Reset password →'}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ width: '100%' }}
                  onClick={() => { setStep('request'); setMessage(null); }}
                >
                  Use a different email
                </button>
              </form>
            </>
          )}

          {step === 'done' && (
            <>
              <h2 style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 26, color: 'var(--t1)', marginBottom: 6, letterSpacing: '-0.03em' }}>
                You're all set →
              </h2>
              <p style={{ fontFamily: 'var(--f2)', color: 'var(--t2)', fontSize: 13, marginBottom: 24, fontWeight: 300, lineHeight: 1.6 }}>
                Your password has been reset. You can sign in with your new password now.
              </p>
              <button className="btn-grad" type="button" style={{ width: '100%', padding: '13px 0' }} onClick={() => (window.location.hash = '#/login')}>
                Go to login →
              </button>
            </>
          )}

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
          Remembered it?{' '}
          <a href="#/login" style={{ color: 'var(--spark)', textDecoration: 'none', fontWeight: 600 }}>
            Sign in
          </a>
        </div>
      </div>
    </section>
  );
};

export default ForgotPassword;
