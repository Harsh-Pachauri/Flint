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
    <section style={{ position: 'relative', padding: '100px 32px 70px', maxWidth: '1200px', margin: '0 auto', overflow: 'hidden' }}>
      {/* Animated background grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(224,48,192,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(224,48,192,0.5) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
      <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '60px', alignItems: 'center' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: '18px', animation: 'fadeInUp 0.6s 0.1s ease both' }}>
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
              animation: 'fadeInUp 0.6s 0.2s ease both',
            }}
          >
            Find your<br />
            <span
              style={{
                background: 'linear-gradient(135deg, var(--spark), var(--vio), var(--rose))',
                backgroundSize: '200% 200%',
                animation: 'gradientShift 5s ease infinite',
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
              animation: 'fadeInUp 0.6s 0.3s ease both',
            }}
          >
            No strangers. No random swipes. Only verified students from your college — people who share your campus, your classes,
            and your culture.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '36px', animation: 'fadeInUp 0.6s 0.4s ease both' }}>
            <button className="btn-grad" onClick={() => (window.location.hash = '#/register')}>Claim your campus spot →</button>
            <button className="btn-ghost" onClick={() => {
              const el = document.querySelector('.steps-grid');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}>See how it works</button>
          </div>

          {/* Social proof strip */}
          <div style={{ animation: 'fadeInUp 0.6s 0.5s ease both', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div style={{ display: 'flex' }}>
              {['RK', 'SM', 'AP', 'VN'].map((init, i) => (
                <div key={init} style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${['var(--spark)', 'var(--vio)', 'var(--rose)', 'var(--sky)'][i]}, ${['var(--vio)', 'var(--rose)', 'var(--spark)', 'var(--vio)'][i]})`,
                  border: '2px solid var(--void)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--f1)', fontWeight: 700, fontSize: 9, color: '#fff',
                  marginLeft: i > 0 ? -10 : 0, zIndex: 4 - i,
                }}>
                  {init}
                </div>
              ))}
            </div>
            <div style={{ fontFamily: 'var(--f2)', fontSize: 12, color: 'var(--t2)' }}>
              <span style={{ color: 'var(--spark)', fontWeight: 600 }}>4,200+</span> students already on FLINT
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', animation: 'fadeInUp 0.6s 0.55s ease both' }}>
            <div>
              <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: '24px', background: 'linear-gradient(135deg, var(--spark), var(--vio))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>4,200+</div>
              <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--t3)', letterSpacing: '0.08em' }}>
                STUDENTS JOINED
              </div>
            </div>
            <div style={{ width: '1px', background: 'var(--border)' }} />
            <div>
              <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: '24px', background: 'linear-gradient(135deg, var(--vio), var(--rose))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>83%</div>
              <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--t3)', letterSpacing: '0.08em' }}>
                MATCH RATE
              </div>
            </div>
            <div style={{ width: '1px', background: 'var(--border)' }} />
            <div>
              <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: '24px', background: 'linear-gradient(135deg, var(--rose), var(--sky))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>12</div>
              <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--t3)', letterSpacing: '0.08em' }}>
                CAMPUSES LIVE
              </div>
            </div>
          </div>
        </div>

        {/* Right - Phone Mockup */}
        <div className="desktop-only" style={{ position: 'relative', animation: 'fadeInUp 0.8s 0.3s ease both' }}>
          <div style={{ width: '220px', margin: '0 auto', position: 'relative' }}>
            {/* Glow behind phone */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: '300px', height: '300px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(224,48,192,0.12) 0%, rgba(139,92,246,0.06) 50%, transparent 70%)',
              filter: 'blur(40px)', pointerEvents: 'none', animation: 'breathe 4s ease-in-out infinite',
            }} />
            {/* Phone frame */}
            <div style={{
              background: 'var(--card2)', border: '1px solid var(--bmd)', borderRadius: '36px',
              padding: '10px', position: 'relative', zIndex: 2,
              boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(224,48,192,0.08)',
            }}>
              <div style={{ width: '60px', height: '6px', background: 'var(--card3)', borderRadius: '10px', margin: '0 auto 10px' }} />
              <div style={{ borderRadius: '24px', overflow: 'hidden', position: 'relative' }}>
                <canvas ref={canvasRef} style={{ width: '200px', height: '280px', display: 'block' }} />
                <div
                  style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px',
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
                      <div style={{
                        fontFamily: 'var(--f1)', fontWeight: 800, fontSize: '20px',
                        background: 'linear-gradient(135deg, var(--spark), var(--vio))',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      }}>94%</div>
                      <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'rgba(255, 255, 255, 0.4)' }}>MATCH</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', marginTop: '8px', flexWrap: 'wrap' }}>
                    <span className="pill pill-spark">SAME BATCH</span>
                    <span className="pill pill-vio">3 MUTUALS</span>
                  </div>
                  <div style={{ display: 'flex', gap: '7px', marginTop: '10px' }}>
                    <button style={{ flex: 1, background: 'rgba(255, 255, 255, 0.08)', color: '#fff', fontFamily: 'var(--f2)', fontSize: '12px', padding: '9px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)', cursor: 'pointer' }}>
                      ✕
                    </button>
                    <button style={{ flex: 2, background: 'var(--spark)', color: '#fff', fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '12px', padding: '9px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>
                      ♥ Like
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ width: '50px', height: '4px', background: 'var(--card3)', borderRadius: '10px', margin: '10px auto 0' }} />
            </div>

            {/* Floating notif cards with animation */}
            <div className="card" style={{
              position: 'absolute', top: '-18px', right: '-55px', padding: '10px 14px',
              borderRadius: '14px', width: '160px', zIndex: 3,
              animation: 'float 3s ease-in-out infinite',
              backdropFilter: 'blur(12px)', background: 'rgba(19, 18, 38, 0.9)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--spark), var(--vio))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0,
                }}>♥</div>
                <div>
                  <div style={{ fontFamily: 'var(--f1)', fontWeight: 600, fontSize: '10px', color: 'var(--t1)' }}>It's a match!</div>
                  <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)' }}>Aarav liked you back</div>
                </div>
              </div>
            </div>

            <div className="card" style={{
              position: 'absolute', bottom: '40px', left: '-60px', padding: '10px 14px',
              borderRadius: '14px', width: '148px', zIndex: 3,
              animation: 'float 3.5s 0.5s ease-in-out infinite',
              backdropFilter: 'blur(12px)', background: 'rgba(19, 18, 38, 0.9)',
            }}>
              <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)', marginBottom: '4px' }}>COMPATIBILITY</div>
              <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: '18px', color: 'var(--spark)' }}>94%</div>
              <div style={{ fontFamily: 'var(--f2)', fontSize: '9px', fontWeight: 300, color: 'var(--t2)' }}>Same dept · lab partners</div>
            </div>

            <div className="card" style={{
              position: 'absolute', top: '100px', right: '-70px', padding: '8px 12px',
              borderRadius: '12px', zIndex: 3,
              animation: 'float 4s 1s ease-in-out infinite',
              backdropFilter: 'blur(12px)', background: 'rgba(19, 18, 38, 0.9)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                <span style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--green)', letterSpacing: '0.06em' }}>247 ONLINE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
