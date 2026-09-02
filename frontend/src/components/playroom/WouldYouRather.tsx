import React, { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { getJSON, postJSON } from '../../utils/api';

type Question = {
  questionId: string;
  optionA: string;
  optionB: string;
  questionNumber: number;
  userAnswer: { answerId: string; chosenOption: 'A' | 'B'; isRevealed: boolean } | null;
  partnerAnswer: { chosenOption: 'A' | 'B' } | null;
};

type WYRState = {
  wyrSessionId: string;
  totalQuestions: number;
  syncScore: number;
  syncBadge: string | null;
  status: string;
  questions: Question[];
};

const WouldYouRather: React.FC<{
  wyrSessionId: string;
  socket: Socket | null;
  socketReady: boolean;
  onBack: () => void;
  onToast: (msg: string) => void;
}> = ({ wyrSessionId, socket, onBack, onToast }) => {
  const [state, setState] = useState<WYRState | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewIndex, setViewIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [justRevealed, setJustRevealed] = useState(false);

  async function loadState(preserveIndex = true) {
    try {
      const data: WYRState = await getJSON(`/api/wyr/${wyrSessionId}`);
      setState(data);
      if (!preserveIndex) {
        const firstUnanswered = data.questions.findIndex((q) => !q.userAnswer);
        setViewIndex(firstUnanswered === -1 ? data.questions.length - 1 : firstUnanswered);
      }
    } catch (err: any) {
      onToast(err?.error || err?.message || 'Could not load Would You Rather');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadState(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wyrSessionId]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('join:wyr', wyrSessionId);
    const onReveal = (data: any) => {
      if (data.wyrSessionId !== wyrSessionId) return;
      loadState(true);
    };
    socket.on('wyr:reveal', onReveal);
    return () => {
      socket.off('wyr:reveal', onReveal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, wyrSessionId]);

  async function chooseOption(question: Question, option: 'A' | 'B') {
    setSubmitting(true);
    try {
      const res = await postJSON(`/api/wyr/question/${question.questionId}/answer`, { chosenOption: option });
      if (res.isRevealed) {
        setJustRevealed(true);
        socket?.emit('wyr:reveal', { wyrSessionId, questionId: question.questionId });
      }
      await loadState(true);
    } catch (err: any) {
      onToast(err?.error || err?.message || "Couldn't submit your answer");
    } finally {
      setSubmitting(false);
    }
  }

  function nextQuestion() {
    setJustRevealed(false);
    if (!state) return;
    setViewIndex((i) => Math.min(i + 1, state.questions.length - 1));
  }

  if (loading || !state) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--s2)', borderTopColor: 'var(--sky)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const question = state.questions[viewIndex];
  const allRevealed = state.questions.length > 0 && state.questions.every((q) => q.userAnswer?.isRevealed);
  const showSummary = allRevealed && (justRevealed ? false : viewIndex >= state.questions.length - 1 && question?.userAnswer?.isRevealed);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 620, margin: '0 auto', width: '100%', padding: '24px 20px 50px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <button type="button" onClick={onBack} style={{ background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--t2)', borderRadius: '100px', padding: '7px 16px', cursor: 'pointer', fontFamily: 'var(--f3)', fontSize: 9, letterSpacing: '0.07em' }}>
          ← GAMES
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="pill pill-sky">SYNC {Math.round(state.syncScore)}%</span>
          {state.syncBadge && <span className="pill pill-spark">{state.syncBadge}</span>}
        </div>
      </div>

      {!question || showSummary ? (
        <div className="card" style={{ padding: 32, textAlign: 'center', animation: 'fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🔮</div>
          <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 22, color: 'var(--t1)', marginBottom: 10 }}>Sync complete</div>
          <div
            style={{
              fontFamily: 'var(--f1)',
              fontWeight: 800,
              fontSize: 44,
              background: 'linear-gradient(135deg, var(--sky), var(--spark))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 6,
              animation: 'pulseGlow 2.4s ease-in-out infinite',
            }}
          >
            {Math.round(state.syncScore)}%
          </div>
          {state.syncBadge && <div style={{ fontFamily: 'var(--f2)', fontSize: 15, color: 'var(--t1)', marginBottom: 22 }}>{state.syncBadge}</div>}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {state.questions.map((q) => (
              <span
                key={q.questionId}
                title={`Question ${q.questionNumber}`}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  background: q.userAnswer?.chosenOption === q.partnerAnswer?.chosenOption ? 'rgba(56,189,248,0.18)' : 'rgba(224,48,192,0.1)',
                  border: `1px solid ${q.userAnswer?.chosenOption === q.partnerAnswer?.chosenOption ? 'rgba(56,189,248,0.4)' : 'var(--border)'}`,
                }}
              >
                {q.userAnswer?.chosenOption === q.partnerAnswer?.chosenOption ? '✨' : '·'}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.08em', marginBottom: 8, textAlign: 'center' }}>
            QUESTION {question.questionNumber} / {state.totalQuestions}
          </div>

          {!question.userAnswer ? (
            <div style={{ animation: 'fadeInUp 0.35s cubic-bezier(0.16,1,0.3,1)' }}>
              <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 20, color: 'var(--t1)', textAlign: 'center', marginBottom: 24 }}>
                Would you rather...
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => chooseOption(question, 'A')}
                  className="card"
                  style={{ padding: '22px 20px', textAlign: 'center', cursor: 'pointer', border: '1px solid rgba(224,48,192,0.25)' }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.015)'; e.currentTarget.style.boxShadow = 'var(--glow-spark)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: 16, color: 'var(--spark)' }}>{question.optionA}</div>
                </button>
                <div style={{ textAlign: 'center', fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.1em' }}>OR</div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => chooseOption(question, 'B')}
                  className="card"
                  style={{ padding: '22px 20px', textAlign: 'center', cursor: 'pointer', border: '1px solid rgba(56,189,248,0.25)' }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.015)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(56,189,248,0.15), 0 0 60px rgba(56,189,248,0.05)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: 16, color: 'var(--sky)' }}>{question.optionB}</div>
                </button>
              </div>
            </div>
          ) : !question.userAnswer.isRevealed ? (
            <div className="card" style={{ padding: 28, textAlign: 'center', animation: 'fadeInUp 0.3s ease' }}>
              <div style={{ fontSize: 30, marginBottom: 12 }}>🙈</div>
              <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: 15, color: 'var(--t1)', marginBottom: 8 }}>
                You chose: {question.userAnswer.chosenOption === 'A' ? question.optionA : question.optionB}
              </div>
              <p style={{ fontFamily: 'var(--f2)', fontSize: 12, color: 'var(--t2)', marginBottom: 4 }}>
                Waiting for your match to answer — their pick stays hidden until you're both in.
              </p>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--s2)', borderTopColor: 'var(--sky)', margin: '14px auto 0', animation: 'spin 0.9s linear infinite' }} />
            </div>
          ) : (
            <div style={{ animation: 'fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <span
                  className="pill"
                  style={{
                    fontSize: 12,
                    padding: '8px 18px',
                    background: question.userAnswer.chosenOption === question.partnerAnswer?.chosenOption ? 'rgba(56,189,248,0.15)' : 'rgba(224,48,192,0.1)',
                    border: `1px solid ${question.userAnswer.chosenOption === question.partnerAnswer?.chosenOption ? 'rgba(56,189,248,0.4)' : 'rgba(224,48,192,0.25)'}`,
                    color: question.userAnswer.chosenOption === question.partnerAnswer?.chosenOption ? 'var(--sky)' : 'var(--spark)',
                    animation: question.userAnswer.chosenOption === question.partnerAnswer?.chosenOption ? 'pulseGlow 1.8s ease-in-out infinite' : 'none',
                  }}
                >
                  {question.userAnswer.chosenOption === question.partnerAnswer?.chosenOption ? '✨ YOU MATCHED!' : '💭 DIFFERENT PICKS'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {(['A', 'B'] as const).map((opt) => {
                  const text = opt === 'A' ? question.optionA : question.optionB;
                  const isMine = question.userAnswer!.chosenOption === opt;
                  const isPartners = question.partnerAnswer?.chosenOption === opt;
                  return (
                    <div
                      key={opt}
                      className="card"
                      style={{
                        padding: '16px 14px',
                        textAlign: 'center',
                        border: isMine || isPartners ? '1px solid rgba(224,48,192,0.3)' : '1px solid var(--border)',
                      }}
                    >
                      <div style={{ fontFamily: 'var(--f2)', fontSize: 13, color: 'var(--t1)', marginBottom: 10 }}>{text}</div>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {isMine && <span className="pill pill-spark">YOU</span>}
                        {isPartners && <span className="pill pill-sky">THEM</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ textAlign: 'center' }}>
                <button type="button" onClick={nextQuestion} className="btn-grad" style={{ padding: '12px 28px' }}>
                  {viewIndex >= state.questions.length - 1 ? 'See sync score →' : 'Next question →'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WouldYouRather;
