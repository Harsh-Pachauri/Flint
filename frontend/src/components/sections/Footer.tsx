import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        padding: '32px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'var(--s1)',
        position: 'relative',
      }}
    >
      {/* Subtle top glow */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(224,48,192,0.15), rgba(139,92,246,0.15), transparent)',
      }} />
      <div
        style={{
          fontFamily: 'var(--f1)',
          fontWeight: 800,
          fontSize: '16px',
          letterSpacing: '-0.03em',
          color: 'var(--t1)',
        }}
      >
        FL<span style={{ background: 'linear-gradient(135deg, var(--spark), var(--vio))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>INT</span>
      </div>
      <div
        style={{
          fontFamily: 'var(--f3)',
          fontSize: '9px',
          color: 'var(--t3)',
          letterSpacing: '0.06em',
        }}
      >
        © 2025 FLINT · BUILT FOR CAMPUS LIFE
      </div>
      <div style={{ display: 'flex', gap: '20px' }}>
        {['Privacy', 'Terms', 'Safety'].map((item) => (
          <span key={item} style={{
            fontFamily: 'var(--f2)', fontSize: '12px', color: 'var(--t3)', cursor: 'pointer',
            transition: 'color 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = 'var(--spark)')}
          onMouseOut={(e) => (e.currentTarget.style.color = 'var(--t3)')}
          >
            {item}
          </span>
        ))}
      </div>
    </footer>
  );
};

export default Footer;
