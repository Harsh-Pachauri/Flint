import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        padding: '28px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'var(--s1)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--f1)',
          fontWeight: 800,
          fontSize: '16px',
          letterSpacing: '-0.03em',
          color: 'var(--t1)',
        }}
      >
        FL<span style={{ color: 'var(--spark)' }}>INT</span>
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
        <span style={{ fontFamily: 'var(--f2)', fontSize: '12px', color: 'var(--t3)', cursor: 'pointer' }}>
          Privacy
        </span>
        <span style={{ fontFamily: 'var(--f2)', fontSize: '12px', color: 'var(--t3)', cursor: 'pointer' }}>
          Terms
        </span>
        <span style={{ fontFamily: 'var(--f2)', fontSize: '12px', color: 'var(--t3)', cursor: 'pointer' }}>
          Safety
        </span>
      </div>
    </footer>
  );
};

export default Footer;
