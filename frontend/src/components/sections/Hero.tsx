import React, { useEffect, useRef } from 'react';

const Hero: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = 200 * dpr;
        canvas.height = 280 * dpr;
        ctx.scale(dpr, dpr);

        const g = ctx.createLinearGradient(0, 0, 200, 280);
        g.addColorStop(0, 'rgba(224, 48, 192, 0.45)');
        g.addColorStop(0.5, 'rgba(139, 92, 246, 0.4)');
        g.addColorStop(1, 'rgba(56, 189, 248, 0.3)');

        ctx.fillStyle = '#0f0e22';
        ctx.fillRect(0, 0, 200, 280);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 200, 280);

        for (let i = 0; i < 200; i += 5) {
          const h = Math.random() * 80 + 20;
          const y = (280 - h) / 2;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.fillRect(i, y, 3, h);
        }
      }
    }
  }, []);

  return (
    <section style={{ position: 'relative', padding: '90px 32px 60px', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '60px', alignItems: 'center' }}>
        {/* Left Content */}
        <div>
          <div className="eyebrow" style={{ marginBottom: '18px' }}>
            College-first dating
          </div>
          <h1
            style={{
              fontFamily: 'var(--f1)',
              fontWeight: 800,
              fontSize: 'clamp(36px, 5.5vw, 62px)',
              letterSpacing: '-0.04em',
              lineHeight: 0.97,
              color: 'var(--t1)',
              marginBottom: '20px',
            }}
          >
            Find your<br />
            <span
              style={{
                background: 'linear-gradient(135deg, var(--spark), var(--vio))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              campus crush.
            </span>
          </h1>
          <p
            style={{
              fontFamily: 'var(--f2)',
              fontSize: '15px',
              fontWeight: 300,
              color: 'var(--t2)',
              lineHeight: 1.8,
              maxWidth: '420px',
              marginBottom: '30px',
            }}
          >
            No strangers. No random swipes. Only verified students from your college — people who share your campus, your classes,
            and your culture.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '36px' }}>
            <button className="btn-grad">Claim your campus spot →</button>
            <button className="btn-ghost">See how it works</button>
          </div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: '22px', color: 'var(--t1)' }}>4,200+</div>
              <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--t3)', letterSpacing: '0.08em' }}>
                STUDENTS JOINED
              </div>
            </div>
            <div style={{ width: '1px', background: 'var(--border)' }}></div>
            <div>
              <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: '22px', color: 'var(--t1)' }}>83%</div>
              <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--t3)', letterSpacing: '0.08em' }}>
                MATCH RATE
              </div>
            </div>
            <div style={{ width: '1px', background: 'var(--border)' }}></div>
            <div>
              <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: '22px', color: 'var(--t1)' }}>12</div>
              <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--t3)', letterSpacing: '0.08em' }}>
                CAMPUSES LIVE
              </div>
            </div>
          </div>
        </div>

        {/* Right - Phone Mockup */}
        <div className="desktop-only" style={{ position: 'relative' }}>
          <div style={{ width: '220px', margin: '0 auto', position: 'relative' }}>
            {/* Phone frame */}
            <div style={{ background: 'var(--card2)', border: '1px solid var(--bmd)', borderRadius: '36px', padding: '10px', position: 'relative', zIndex: 2 }}>
              {/* Notch */}
              <div style={{ width: '60px', height: '6px', background: 'var(--card3)', borderRadius: '10px', margin: '0 auto 10px' }}></div>
              {/* Profile card inside phone */}
              <div style={{ borderRadius: '24px', overflow: 'hidden', position: 'relative' }}>
                <canvas ref={canvasRef} style={{ width: '200px', height: '280px', display: 'block' }}></canvas>
                {/* Overlay info */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '16px',
                    background: 'linear-gradient(to top, rgba(7, 7, 15, 0.95) 0%, transparent 100%)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '17px', color: '#fff' }}>Priya, 20</div>
                      <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px' }}>
                        ECE · 2nd yr · VIT
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontFamily: 'var(--f1)',
                          fontWeight: 800,
                          fontSize: '20px',
                          background: 'linear-gradient(135deg, var(--spark), var(--vio))',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        94%
                      </div>
                      <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'rgba(255, 255, 255, 0.4)' }}>
                        MATCH
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <span className="pill pill-spark">SAME BATCH</span>
                    <span className="pill pill-vio">3 MUTUALS</span>
                  </div>
                  <div style={{ display: 'flex', gap: '7px', marginTop: '10px' }}>
                    <button
                      style={{
                        flex: 1,
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: '#fff',
                        fontFamily: 'var(--f2)',
                        fontSize: '12px',
                        padding: '9px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                    <button
                      style={{
                        flex: 2,
                        background: 'var(--spark)',
                        color: '#fff',
                        fontFamily: 'var(--f1)',
                        fontWeight: 700,
                        fontSize: '12px',
                        padding: '9px',
                        borderRadius: '10px',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      ♥ Like
                    </button>
                  </div>
                </div>
              </div>
              {/* Home indicator */}
              <div style={{ width: '50px', height: '4px', background: 'var(--card3)', borderRadius: '10px', margin: '10px auto 0' }}></div>
            </div>

            {/* Floating notif cards */}
            <div
              className="card"
              style={{
                position: 'absolute',
                top: '-18px',
                right: '-50px',
                padding: '10px 12px',
                borderRadius: '12px',
                width: '150px',
                zIndex: 3,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--spark), var(--vio))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    flexShrink: 0,
                  }}
                >
                  ♥
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--f1)', fontWeight: 600, fontSize: '10px', color: 'var(--t1)' }}>
                    It's a match!
                  </div>
                  <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)' }}>Aarav liked you back</div>
                </div>
              </div>
            </div>

            <div
              className="card"
              style={{
                position: 'absolute',
                bottom: '40px',
                left: '-55px',
                padding: '10px 12px',
                borderRadius: '12px',
                width: '140px',
                zIndex: 3,
              }}
            >
              <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)', marginBottom: '4px' }}>
                COMPATIBILITY
              </div>
              <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: '18px', color: 'var(--spark)' }}>94%</div>
              <div style={{ fontFamily: 'var(--f2)', fontSize: '9px', fontWeight: 300, color: 'var(--t2)' }}>
                Same dept · lab partners
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
