import React from 'react';

const CTABanner: React.FC = () => {
  return (
    <section style={{ padding: '60px 32px', maxWidth: '1200px', margin: '0 auto 40px' }}>
      <div
        style={{
          position: 'relative',
          padding: '56px 40px',
          textAlign: 'center',
          borderRadius: '28px',
          background: 'linear-gradient(135deg, rgba(224, 48, 192, 0.06) 0%, rgba(139, 92, 246, 0.06) 50%, rgba(56,189,248,0.04) 100%)',
          border: '1px solid rgba(224, 48, 192, 0.12)',
          overflow: 'hidden',
          animation: 'pulseGlow 4s ease-in-out infinite',
        }}
      >
        {/* Animated top border gradient */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: 'linear-gradient(90deg, transparent, var(--spark), var(--vio), var(--spark), transparent)',
          backgroundSize: '200% 100%', animation: 'shimmer 3s linear infinite',
        }} />
        {/* Corner orbs */}
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(224,48,192,0.08), transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -40, left: -40, width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.08), transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none',
        }} />

        <div className="eyebrow" style={{ justifyContent: 'center', marginBottom: '16px', position: 'relative' }}>
          Join the waitlist
        </div>
        <h2
          style={{
            fontFamily: 'var(--f1)',
            fontWeight: 800,
            fontSize: 'clamp(24px, 4vw, 40px)',
            letterSpacing: '-0.04em',
            color: 'var(--t1)',
            marginBottom: '14px',
            position: 'relative',
          }}
        >
          Your campus. Your rules.<br />
          <span style={{
            background: 'linear-gradient(135deg, var(--spark), var(--vio))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Your person.</span>
        </h2>
        <p
          style={{
            fontFamily: 'var(--f2)',
            fontSize: '14px',
            fontWeight: 300,
            color: 'var(--t2)',
            marginBottom: '28px',
            position: 'relative',
          }}
        >
          FLINT is live at 12 campuses and growing. Claim your spot before your college fills up.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
          <button className="btn-grad" style={{ fontSize: '15px', padding: '14px 36px' }} onClick={() => (window.location.hash = '#/register')}>
            Get early access →
          </button>
        </div>
        <div
          style={{
            fontFamily: 'var(--f3)',
            fontSize: '9px',
            color: 'var(--t3)',
            marginTop: '16px',
            letterSpacing: '0.06em',
            position: 'relative',
            display: 'flex', justifyContent: 'center', gap: 16,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
            FREE FOREVER
          </span>
          <span>COLLEGE EMAIL REQUIRED</span>
          <span>NO STRANGERS</span>
        </div>
      </div>
    </section>
  );
};

export default CTABanner;
