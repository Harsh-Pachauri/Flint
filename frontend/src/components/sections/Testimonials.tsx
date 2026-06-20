import React from 'react';

interface Testimonial {
  quote: string;
  initials: string;
  name: string;
  location: string;
  badge: string;
  badgeColor: string;
  gradient: string;
}

const Testimonials: React.FC = () => {
  const testimonials: Testimonial[] = [
    {
      quote:
        'We sat 3 rows apart in Networks lab for a whole semester. FLINT told me we were a 91% match. Took one Dare Roulette to figure out the rest.',
      initials: 'RK',
      name: 'Rohan K.',
      location: 'CSE · VIT Vellore',
      badge: 'MATCHED',
      badgeColor: 'pill-spark',
      gradient: 'linear-gradient(135deg, var(--spark), var(--vio))',
    },
    {
      quote:
        'Literally matched with someone from my photography club. We had 5 mutual friends and didn\'t even know we both had the app. This campus is tiny and FLINT found it anyway.',
      initials: 'SM',
      name: 'Sanya M.',
      location: 'ECE · BITS Pilani',
      badge: 'DATING',
      badgeColor: 'pill-vio',
      gradient: 'linear-gradient(135deg, var(--vio), var(--rose))',
    },
    {
      quote:
        'The Would You Rather game is genuinely fun. We played for 45 minutes before even talking about meeting up. Felt natural, not desperate.',
      initials: 'AP',
      name: 'Arjun P.',
      location: 'Mech · NIT Trichy',
      badge: 'IN PLAYROOM',
      badgeColor: 'pill-rose',
      gradient: 'linear-gradient(135deg, var(--rose), var(--spark))',
    },
  ];

  return (
    <section style={{ padding: '60px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="eyebrow" style={{ marginBottom: '28px', justifyContent: 'center' }}>
        Real stories
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
        {testimonials.map((testimonial, idx) => (
          <div key={idx} className="card" style={{ padding: '22px' }}>
            <div
              style={{
                fontFamily: 'var(--f2)',
                fontSize: '13px',
                fontWeight: 300,
                color: 'var(--t2)',
                lineHeight: 1.8,
                marginBottom: '16px',
                fontStyle: 'italic',
              }}
            >
              "{testimonial.quote}"
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: testimonial.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--f1)',
                  fontWeight: 700,
                  fontSize: '11px',
                  color: '#fff',
                }}
              >
                {testimonial.initials}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--f1)', fontWeight: 600, fontSize: '12px', color: 'var(--t1)' }}>
                  {testimonial.name}
                </div>
                <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--t3)' }}>
                  {testimonial.location}
                </div>
              </div>
              <span className={`pill ${testimonial.badgeColor}`} style={{ marginLeft: 'auto' }}>
                {testimonial.badge}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;
