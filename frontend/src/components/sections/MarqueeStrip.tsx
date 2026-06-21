import React, { useEffect, useRef } from 'react';

const MARQUEE_ITEMS = [
  'VERIFIED STUDENTS',
  'CAMPUS MATCHES',
  'DARE ROULETTE',
  'PRIVACY FIRST',
  'PLAYROOM',
  'VIT VELLORE',
  'BITS PILANI',
  'NIT TRICHY',
  'IIT BOMBAY',
  'NO STRANGERS',
  'REAL CONNECTIONS',
  'DRAMA CLUB',
  'CHESS CLUB',
  'PHOTOGRAPHY',
];

const MARQUEE_COLORS = ['var(--spark)', 'var(--vio)', 'var(--rose)', 'var(--sky)'];

const MarqueeStrip: React.FC = () => {
  const marqueeRef = useRef<HTMLDivElement>(null);
  const mq1Ref = useRef<HTMLDivElement>(null);
  const mq2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mkItem = (text: string, i: number) => {
      const s = document.createElement('span');
      s.style.cssText = `font-family: var(--f3); font-size: 10px; color: ${MARQUEE_COLORS[i % 4]}; padding: 0 18px; border-right: 1px solid var(--border); letter-spacing: 0.08em; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;`;
      s.innerHTML = `<span style="width: 4px; height: 4px; border-radius: 50%; background: ${MARQUEE_COLORS[i % 4]}; display: inline-block; flex-shrink: 0;"></span>${text}`;
      return s;
    };

    if (mq1Ref.current && mq2Ref.current) {
      MARQUEE_ITEMS.forEach((t, i) => {
        mq1Ref.current?.appendChild(mkItem(t, i));
        mq2Ref.current?.appendChild(mkItem(t, i));
      });

      let w = 0;
      const measure = () => {
        if (mq1Ref.current) w = mq1Ref.current.offsetWidth;
      };
      measure();
      requestAnimationFrame(measure);

      let pos = 0;
      const tick = () => {
        pos -= 0.5;
        if (Math.abs(pos) >= w) pos = 0;
        if (marqueeRef.current) marqueeRef.current.style.transform = `translateX(${pos}px)`;
        requestAnimationFrame(tick);
      };

      setTimeout(tick, 300);
    }
  }, []);

  return (
    <div
      style={{
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--s1)',
        overflow: 'hidden',
        padding: '13px 0',
        position: 'relative',
      }}
    >
      {/* Fade edges */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 80, background: 'linear-gradient(90deg, var(--s1), transparent)', zIndex: 2, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 80, background: 'linear-gradient(270deg, var(--s1), transparent)', zIndex: 2, pointerEvents: 'none' }} />
      <div
        ref={marqueeRef}
        id="marquee"
        style={{ display: 'flex', gap: 0, whiteSpace: 'nowrap' }}
      >
        <div ref={mq1Ref} style={{ display: 'flex', gap: 0, flexShrink: 0 }}></div>
        <div ref={mq2Ref} style={{ display: 'flex', gap: 0, flexShrink: 0 }}></div>
      </div>
    </div>
  );
};

export default MarqueeStrip;
