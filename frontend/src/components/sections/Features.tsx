import React from 'react';

interface Feature {
  icon: string;
  title: string;
  description: string;
  colorClass: string;
  gradient: string;
}

const Features: React.FC = () => {
  const features: Feature[] = [
    {
      icon: '🎓',
      title: 'College-only matching',
      description: 'Only see verified students from your campus. No outsiders, no catfishing — just real people you might already know.',
      colorClass: 'spark',
      gradient: 'var(--spark)',
    },
    {
      icon: '🎮',
      title: 'Games over small talk',
      description:
        'Dare Roulette, Would You Rather, Story Builder. Break the ice without typing the word "hey" into the void.',
      colorClass: 'vio',
      gradient: 'var(--vio)',
    },
    {
      icon: '🔐',
      title: 'Compatibility-gated chat',
      description:
        'Unlock deeper conversations only after real interaction. Effort in, connection out — no ghost culture.',
      colorClass: 'rose',
      gradient: 'var(--rose)',
    },
    {
      icon: '📍',
      title: 'Campus-aware discovery',
      description: 'Find people from your department, your events, your clubs. Context that Tinder never had.',
      colorClass: 'sky',
      gradient: 'var(--sky)',
    },
    {
      icon: '💬',
      title: 'The Playroom',
      description:
        'A private zone for matched couples — shared challenges, games, and activities that build emotional connection over time.',
      colorClass: 'spark',
      gradient: 'var(--spark)',
    },
    {
      icon: '✅',
      title: 'Verified identities',
      description:
        'College email or ID verification on every profile. You know who you\'re talking to — and so does everyone else.',
      colorClass: 'vio',
      gradient: 'var(--vio)',
    },
  ];

  const getBackgroundColor = (colorClass: string) => {
    const mapping: { [key: string]: string } = {
      spark: 'var(--spd)',
      vio: 'var(--vid)',
      rose: 'var(--rod)',
      sky: 'var(--skd)',
    };
    return mapping[colorClass];
  };

  const getBorderColor = (colorClass: string) => {
    const mapping: { [key: string]: string } = {
      spark: 'rgba(224, 48, 192, 0.18)',
      vio: 'rgba(139, 92, 246, 0.18)',
      rose: 'rgba(255, 107, 157, 0.22)',
      sky: 'rgba(56, 189, 248, 0.18)',
    };
    return mapping[colorClass];
  };

  return (
    <section style={{ padding: '70px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div className="eyebrow" style={{ justifyContent: 'center', marginBottom: '14px' }}>
          Why FLINT
        </div>
        <h2
          style={{
            fontFamily: 'var(--f1)',
            fontWeight: 800,
            fontSize: 'clamp(28px, 4vw, 46px)',
            letterSpacing: '-0.04em',
            color: 'var(--t1)',
            lineHeight: 1,
          }}
        >
          Built different.<br />
          For campus life.
        </h2>
      </div>
      <div className="feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        {features.map((feature, idx) => (
          <div key={idx} className="card" style={{ padding: '24px', position: 'relative' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: getBackgroundColor(feature.colorClass),
                border: `1px solid ${getBorderColor(feature.colorClass)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                marginBottom: '16px',
              }}
            >
              {feature.icon}
            </div>
            <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '15px', color: 'var(--t1)', marginBottom: '8px' }}>
              {feature.title}
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
              {feature.description}
            </p>
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: feature.gradient,
                borderRadius: 0,
              }}
            ></div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Features;
