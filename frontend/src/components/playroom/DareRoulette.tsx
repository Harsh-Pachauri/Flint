import React, { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { postJSON } from '../../utils/api';

type Category = 'dare' | 'truth' | 'challenge';

type SpinResult = { spinId: string; landedCategory: Category; roundNumber: number };
type DareCard = { dareCardId: string; assignedTo: string; dareText: string; difficulty: number; timeoutSecs: number };
type Completion = { completionId: string; userId: string; skipped: boolean };

const SEGMENTS: Category[] = ['dare', 'truth', 'challenge', 'dare', 'truth', 'challenge'];
const SEGMENT_ANGLE = 360 / SEGMENTS.length;

const CATEGORY_META: Record<Category, { label: string; color: string; emoji: string }> = {
  dare: { label: 'DARE', color: 'var(--spark)', emoji: '🔥' },
  truth: { label: 'TRUTH', color: 'var(--vio)', emoji: '💭' },
  challenge: { label: 'CHALLENGE', color: 'var(--sky)', emoji: '⚡' },
};

function wheelGradient() {
  const stops: string[] = [];
  SEGMENTS.forEach((cat, i) => {
    const from = i * SEGMENT_ANGLE;
    const to = (i + 1) * SEGMENT_ANGLE;
    const color =
      cat === 'dare' ? 'rgba(224,48,192,0.85)' : cat === 'truth' ? 'rgba(139,92,246,0.85)' : 'rgba(56,189,248,0.85)';
    stops.push(`${color} ${from}deg ${to}deg`);
  });
  return `conic-gradient(${stops.join(', ')})`;
}

const DareRoulette: React.FC<{
  drSessionId: string;
  socket: Socket | null;
  socketReady: boolean;
  onBack: () => void;
  onToast: (msg: string) => void;
}> = ({ drSessionId, socket, onBack, onToast }) => {
  const myUserId = localStorage.getItem('userId') || '';
  const [spinning, setSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [myConsent, setMyConsent] = useState<boolean | null>(null);
  const [partnerConsent, setPartnerConsent] = useState<boolean | null>(null);
  const [dareCard, setDareCard] = useState<DareCard | null>(null);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [skipTokens, setSkipTokens] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const spinCountRef = useRef(0);

  // Join the dare room and listen for the partner's spin/consent/completion
  // actions — the REST endpoints don't broadcast themselves (client-driven
  // relay, matching how story/WYR already work in this codebase).
  useEffect(() => {
    if (!socket) return;
    socket.emit('join:dare', drSessionId);

    const onSpin = (data: any) => {
      if (data.drSessionId !== drSessionId) return;
      setSpinResult({ spinId: data.spinId, landedCategory: data.landedCategory, roundNumber: data.roundNumber });
      setMyConsent(null);
      setPartnerConsent(null);
      setDareCard(null);
      setCompletion(null);
    };
    const onConsent = (data: any) => {
      if (data.drSessionId !== drSessionId) return;
      if (data.userId !== myUserId) setPartnerConsent(data.accepted);
      if (data.dareCard) setDareCard(data.dareCard);
    };
    const onCompletionReady = (data: any) => {
      if (data.drSessionId !== drSessionId) return;
      setCompletion({ completionId: data.completionId, userId: data.userId, skipped: data.skipped });
    };

    socket.on('dare:spin-result', onSpin);
    socket.on('dare:consent-update', onConsent);
    socket.on('dare:completion-ready', onCompletionReady);
    return () => {
      socket.off('dare:spin-result', onSpin);
      socket.off('dare:consent-update', onConsent);
      socket.off('dare:completion-ready', onCompletionReady);
    };
  }, [socket, drSessionId, myUserId]);

  async function spin() {
    setSpinning(true);
    try {
      const res = await postJSON(`/api/dare/${drSessionId}/spin`, {});
      const landedCategory: Category = res.landedCategory;
      const segmentIndexes = SEGMENTS.map((c, i) => (c === landedCategory ? i : -1)).filter((i) => i >= 0);
      const targetSegment = segmentIndexes[Math.floor(Math.random() * segmentIndexes.length)];
      const targetAngle = targetSegment * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
      spinCountRef.current += 1;
      // Several full rotations (weighty, not a quick flick) landing exactly
      // on the segment center for the category the server chose.
      const extraSpins = 5 + spinCountRef.current % 2;
      const finalRotation = wheelRotation + extraSpins * 360 + (360 - targetAngle) - (wheelRotation % 360);

      setWheelRotation(finalRotation);

      window.setTimeout(() => {
        setSpinning(false);
        setSpinResult({ spinId: res.spinId, landedCategory, roundNumber: res.roundNumber });
        socket?.emit('dare:spin-result', { drSessionId, spinId: res.spinId, landedCategory, roundNumber: res.roundNumber });
      }, 3200);
    } catch (err: any) {
      setSpinning(false);
      onToast(err?.error || err?.message || "Couldn't spin — is it your turn?");
    }
  }

  async function respondConsent(accepted: boolean) {
    if (!spinResult) return;
    setSubmitting(true);
    try {
      const res = await postJSON(`/api/dare/spin/${spinResult.spinId}/consent`, { accepted });
      setMyConsent(accepted);
      socket?.emit('dare:consent-update', { drSessionId, userId: myUserId, accepted, dareCard: res.dareCard || null });
      if (res.dareCard) setDareCard(res.dareCard);
    } catch (err: any) {
      onToast(err?.error || err?.message || 'Could not record your response');
    } finally {
      setSubmitting(false);
    }
  }

  async function markComplete(skipped: boolean) {
    if (!dareCard) return;
    setSubmitting(true);
    try {
      const res = await postJSON(`/api/dare/card/${dareCard.dareCardId}/complete`, {
        skipped,
        proofType: skipped ? undefined : 'text',
        proofUrl: skipped ? undefined : 'Completed in person',
      });
      if (skipped) setSkipTokens((t) => Math.max(0, t - 1));
      const completionData = { completionId: res.completionId, userId: myUserId, skipped };
      setCompletion(completionData);
      socket?.emit('dare:completion-ready', { drSessionId, ...completionData });
    } catch (err: any) {
      onToast(err?.error || err?.message || 'Could not submit');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRating() {
    if (!completion || rating === 0) return;
    setSubmitting(true);
    try {
      await postJSON(`/api/dare/completion/${completion.completionId}/rate`, { rating });
      onToast('Rated! Nice teamwork.');
      resetForNextRound();
    } catch (err: any) {
      onToast(err?.error || err?.message || 'Could not submit rating');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForNextRound() {
    setSpinResult(null);
    setMyConsent(null);
    setPartnerConsent(null);
    setDareCard(null);
    setCompletion(null);
    setRating(0);
  }

  const iAmAssigned = dareCard?.assignedTo === myUserId;
  const bothConsented = myConsent !== null && partnerConsent !== null;
  const bothDeclined = myConsent === false || partnerConsent === false;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px 60px', maxWidth: 640, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 24 }}>
        <button type="button" onClick={onBack} style={{ background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--t2)', borderRadius: '100px', padding: '7px 16px', cursor: 'pointer', fontFamily: 'var(--f3)', fontSize: 9, letterSpacing: '0.07em' }}>
          ← GAMES
        </button>
        <span className="pill" style={{ background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--t3)' }}>
          🎫 {skipTokens} SKIP{skipTokens === 1 ? '' : 'S'} LEFT
        </span>
      </div>

      {!dareCard && !completion && (
        <>
          <div
            style={{
              position: 'relative',
              width: 280,
              height: 280,
              marginBottom: 28,
            }}
          >
            {/* Pointer */}
            <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '20px solid var(--t1)', zIndex: 3, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }} />
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: wheelGradient(),
                border: '4px solid var(--card3)',
                boxShadow: spinResult && !spinning ? '0 0 40px rgba(224,48,192,0.4), 0 0 80px rgba(139,92,246,0.15)' : '0 12px 40px rgba(0,0,0,0.5)',
                transform: `rotate(${wheelRotation}deg)`,
                transition: spinning ? 'transform 3.1s cubic-bezier(0.16, 1, 0.3, 1)' : 'box-shadow 0.6s ease',
                animation: spinResult && !spinning ? 'pulseGlow 2s ease-in-out infinite' : 'none',
              }}
            >
              {SEGMENTS.map((cat, i) => {
                const angle = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: 0,
                      height: 0,
                      transform: `rotate(${angle}deg) translate(0, -96px) rotate(${-angle}deg)`,
                      transformOrigin: '0 0',
                    }}
                  >
                    <div style={{ transform: `translate(-50%, -50%) rotate(${angle}deg)`, fontSize: 18 }}>
                      {CATEGORY_META[cat].emoji}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 64, height: 64, borderRadius: '50%', background: 'var(--void)', border: '3px solid var(--card3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
              <span style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 10, color: 'var(--t2)', letterSpacing: '0.04em' }}>SPIN</span>
            </div>
          </div>

          {!spinResult ? (
            <button type="button" disabled={spinning} onClick={spin} className="btn-grad" style={{ padding: '15px 44px', fontSize: 15, opacity: spinning ? 0.7 : 1 }}>
              {spinning ? 'Spinning...' : 'Spin the wheel →'}
            </button>
          ) : myConsent === null ? (
            <div style={{ width: '100%', animation: 'fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                <span
                  className="pill"
                  style={{
                    background: `${CATEGORY_META[spinResult.landedCategory].color}22`,
                    border: `1px solid ${CATEGORY_META[spinResult.landedCategory].color}55`,
                    color: CATEGORY_META[spinResult.landedCategory].color,
                    fontSize: 12,
                    padding: '8px 20px',
                  }}
                >
                  {CATEGORY_META[spinResult.landedCategory].emoji} LANDED ON {CATEGORY_META[spinResult.landedCategory].label}
                </span>
              </div>

              {/* Consent gate — a deliberate trust/safety checkpoint, not a
                  throwaway confirm(). Both people must explicitly opt in
                  before anything is revealed. */}
              <div className="card" style={{ padding: 22, textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>🤝</div>
                <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 8 }}>
                  Both of you need to say yes
                </div>
                <p style={{ fontFamily: 'var(--f2)', fontSize: 12, color: 'var(--t2)', lineHeight: 1.7, marginBottom: 20, maxWidth: 340, margin: '0 auto 20px' }}>
                  A {CATEGORY_META[spinResult.landedCategory].label.toLowerCase()} is ready. It only reveals once you and your match both explicitly consent — either of you can decline, no explanation needed.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button type="button" disabled={submitting} onClick={() => respondConsent(false)} className="btn-ghost" style={{ padding: '12px 24px' }}>
                    Not this time
                  </button>
                  <button type="button" disabled={submitting} onClick={() => respondConsent(true)} className="btn-grad" style={{ padding: '12px 28px' }}>
                    I'm in →
                  </button>
                </div>
              </div>
            </div>
          ) : bothDeclined ? (
            <div className="card" style={{ padding: 24, textAlign: 'center', animation: 'fadeInUp 0.3s ease' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>👌</div>
              <div style={{ fontFamily: 'var(--f2)', fontSize: 13, color: 'var(--t2)', marginBottom: 18 }}>No worries — that one's skipped.</div>
              <button type="button" className="btn-primary" onClick={resetForNextRound}>Spin again</button>
            </div>
          ) : !bothConsented ? (
            <div className="card" style={{ padding: 24, textAlign: 'center', animation: 'fadeInUp 0.3s ease' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', border: '2px solid var(--s2)', borderTopColor: 'var(--spark)', margin: '0 auto 14px', animation: 'spin 0.9s linear infinite' }} />
              <div style={{ fontFamily: 'var(--f2)', fontSize: 13, color: 'var(--t2)' }}>Waiting for your match to respond...</div>
            </div>
          ) : null}
        </>
      )}

      {dareCard && !completion && (
        <div style={{ width: '100%', animation: 'fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
          <div
            className="card"
            style={{
              padding: 28,
              textAlign: 'center',
              position: 'relative',
              boxShadow: 'var(--glow-spark)',
              animation: 'pulseGlow 2.4s ease-in-out infinite',
            }}
          >
            <div style={{ position: 'absolute', top: 16, right: 16 }}>
              <span className="pill pill-spark">{'★'.repeat(dareCard.difficulty)}{'☆'.repeat(5 - dareCard.difficulty)}</span>
            </div>
            <div style={{ fontSize: 34, marginBottom: 14 }}>{CATEGORY_META[spinResult?.landedCategory || 'dare'].emoji}</div>
            <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--spark)', letterSpacing: '0.14em', marginBottom: 10 }}>
              {iAmAssigned ? 'THIS ONE IS ON YOU' : "YOUR MATCH'S DARE"}
            </div>
            <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: 19, color: 'var(--t1)', lineHeight: 1.5, marginBottom: 22, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
              "{dareCard.dareText}"
            </div>

            {iAmAssigned ? (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  type="button"
                  disabled={submitting || skipTokens === 0}
                  onClick={() => markComplete(true)}
                  className="btn-ghost"
                  style={{ padding: '12px 22px', opacity: skipTokens === 0 ? 0.4 : 1 }}
                  title={skipTokens === 0 ? 'No skip tokens left' : 'Use a skip token'}
                >
                  Skip (🎫 {skipTokens})
                </button>
                <button type="button" disabled={submitting} onClick={() => markComplete(false)} className="btn-grad" style={{ padding: '12px 28px' }}>
                  Mark as done →
                </button>
              </div>
            ) : (
              <div style={{ fontFamily: 'var(--f2)', fontSize: 12, color: 'var(--t2)' }}>
                Waiting for them to complete it...
              </div>
            )}
          </div>
        </div>
      )}

      {completion && (
        <div style={{ width: '100%', animation: 'fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
          {completion.skipped ? (
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🎫</div>
              <div style={{ fontFamily: 'var(--f2)', fontSize: 13, color: 'var(--t2)', marginBottom: 18 }}>They used a skip token on that one.</div>
              <button type="button" className="btn-primary" onClick={resetForNextRound}>Spin again</button>
            </div>
          ) : completion.userId === myUserId ? (
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>✅</div>
              <div style={{ fontFamily: 'var(--f2)', fontSize: 13, color: 'var(--t2)' }}>Nice! Waiting for them to rate it...</div>
            </div>
          ) : (
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🎉</div>
              <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 14 }}>They did it! Rate it:</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 26, transform: n <= rating ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.15s cubic-bezier(0.16,1,0.3,1)', filter: n <= rating ? 'drop-shadow(0 0 8px rgba(224,48,192,0.5))' : 'none' }}
                  >
                    {n <= rating ? '🔥' : '🤍'}
                  </button>
                ))}
              </div>
              <button type="button" disabled={rating === 0 || submitting} onClick={submitRating} className="btn-grad" style={{ padding: '12px 28px', opacity: rating === 0 ? 0.5 : 1 }}>
                Submit rating →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DareRoulette;
