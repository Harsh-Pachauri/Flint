import React from 'react';

interface Step {
  number: string;
  title: string;
  description: string;
  colorClass: string;
  gradient: string;
}

const HowItWorks: React.FC = () => {
  const steps: Step[] = [
    {
      number: '01',
      title: 'Verify your college ID',
      description: 'Sign up with your college email. We confirm you\'re actually enrolled — takes 30 seconds.',
      colorClass: 'spark',
      gradient: 'var(--spark)',
    },
    {
      number: '02',
      title: 'Build your vibe profile',
      description: 'Add your department, interests, personality traits, and what you\'re looking for. No generic bios.',
      colorClass: 'vio',
      gradient: 'var(--vio)',
    },
    {
      number: '03',
      title: 'Match. Play. Connect.',
      description: 'Swipe, play icebreaker games, and unlock real conversations with people who actually share your world.',
      colorClass: 'rose',
      gradient: 'var(--rose)',
    },
  ];

  const getBackgroundColor = (colorClass: string) => {
    const mapping: { [key: string]: string } = {
      spark: 'var(--spd)',
      vio: 'var(--vid)',
      rose: 'var(--rod)',
    };
    return mapping[colorClass];
  };

  const getBorderColor = (colorClass: string) => {
    const mapping: { [key: string]: string } = {
      spark: 'rgba(224, 48, 192, 0.25)',
      vio: 'rgba(139, 92, 246, 0.25)',
      rose: 'rgba(255, 107, 157, 0.25)',
    };
    return mapping[colorClass];
  };

  return (
    <section style={{ padding: '60px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div className="eyebrow" style={{ justifyContent: 'center', marginBottom: '14px' }}>
          Getting started
        </div>
        <h2
          style={{
            fontFamily: 'var(--f1)',
            fontWeight: 800,
            fontSize: 'clamp(26px, 4vw, 42px)',
            letterSpacing: '-0.04em',
            color: 'var(--t1)',
          }}
        >
          Three steps to your match.
        </h2>
      </div>
      <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {steps.map((step, idx) => (
          <div key={idx} style={{ textAlign: 'center', padding: '0 16px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: getBackgroundColor(step.colorClass),
                border: `1px solid ${getBorderColor(step.colorClass)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--f1)',
                fontWeight: 800,
                fontSize: '18px',
                color: step.gradient,
                margin: '0 auto 16px',
              }}
            >
              {step.number}
            </div>
            <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '15px', color: 'var(--t1)', marginBottom: '8px' }}>
              {step.title}
            </div>
            <p
              style={{
                fontFamily: 'var(--f2)',
                fontSize: '12px',
                fontWeight: 300,
                color: 'var(--t2)',
                lineHeight: 1.7,
              }}
            >
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;
