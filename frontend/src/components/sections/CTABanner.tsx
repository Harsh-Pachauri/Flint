import React from 'react';

const CTABanner: React.FC = () => {
  return (
    <section style={{ padding: '60px 32px', maxWidth: '1200px', margin: '0 auto 40px' }}>
      <div
        className="card"
        style={{
          padding: '50px 40px',
          textAlign: 'center',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(224, 48, 192, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: '1px solid rgba(224, 48, 192, 0.15)',
        }}
      >
        <div className="eyebrow" style={{ justifyContent: 'center', marginBottom: '16px' }}>
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
          }}
        >
          Your campus. Your rules.<br />
          Your person.
        </h2>
        <p
          style={{
            fontFamily: 'var(--f2)',
            fontSize: '14px',
            fontWeight: 300,
            color: 'var(--t2)',
            marginBottom: '28px',
          }}
        >
          FLINT is live at 12 campuses and growing. Claim your spot before your college fills up.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-grad" style={{ fontSize: '15px', padding: '14px 36px' }}>
            Get early access →
          </button>
        </div>
        <div
          style={{
            fontFamily: 'var(--f3)',
            fontSize: '9px',
            color: 'var(--t3)',
            marginTop: '14px',
            letterSpacing: '0.06em',
          }}
        >
          FREE FOREVER · COLLEGE EMAIL REQUIRED · NO STRANGERS
        </div>
      </div>
    </section>
  );
};

export default CTABanner;
