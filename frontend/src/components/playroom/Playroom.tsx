import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE, getAuthToken, getJSON, postJSON, patchJSON } from '../../utils/api';
import DareRoulette from './DareRoulette';
import StoryBuilder from './StoryBuilder';
import WouldYouRather from './WouldYouRather';

export type GameType = 'dareRoulette' | 'storyBuilding' | 'wouldYouRather';

type ActiveSession = {
  sessionId: string;
  gameType: GameType;
  currentRound: number;
  gameSessionId: string | null;
};

type PlayroomState = {
  playroomId: string;
  spiceLevel: number;
  unlockedFeatures: string[];
  isActive: boolean;
  activeSession: ActiveSession | null;
};

const GAME_META: Record<GameType, { label: string; icon: string; tagline: string; gradient: string }> = {
  dareRoulette: {
    label: 'Dare Roulette',
    icon: '🎡',
    tagline: 'Spin. Consent. Reveal.',
    gradient: 'linear-gradient(135deg, var(--spark), var(--rose))',
  },
  storyBuilding: {
    label: 'Story Builder',
    icon: '📖',
    tagline: 'Write your story, one line at a time.',
    gradient: 'linear-gradient(135deg, var(--vio), var(--sky))',
  },
  wouldYouRather: {
    label: 'Would You Rather',
    icon: '🔮',
    tagline: 'Answer blind. Reveal together.',
    gradient: 'linear-gradient(135deg, var(--sky), var(--spark))',
  },
};

const GAME_ORDER: GameType[] = ['dareRoulette', 'storyBuilding', 'wouldYouRather'];

function SpiceLevelMeter({ level }: { level: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          style={{
            fontSize: 15,
            opacity: n <= level ? 1 : 0.22,
            filter: n <= level ? 'drop-shadow(0 0 6px rgba(224,48,192,0.5))' : 'none',
            transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          🔥
        </span>
      ))}
    </div>
  );
}

const Playroom: React.FC<{ matchId: string; otherUserName: string; onClose: () => void }> = ({
  matchId,
  otherUserName,
  onClose,
}) => {
  const [state, setState] = useState<PlayroomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [activatingRoom, setActivatingRoom] = useState(false);
  const [launchingGame, setLaunchingGame] = useState<GameType | null>(null);
  const [openGame, setOpenGame] = useState<{ gameType: GameType; gameSessionId: string } | null>(null);
  const socketRef = React.useRef<Socket | null>(null);
  const [socketReady, setSocketReady] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // One socket connection owned by the whole Playroom surface, shared by
  // whichever game is currently open — avoids each game managing its own
  // connection while the modal is open.
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    const socket = io(API_BASE, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => setSocketReady(true));
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  async function loadPlayroom() {
    setLoading(true);
    setError('');
    try {
      const data = await getJSON(`/api/matches/${matchId}/playroom`);
      setState(data);
      if (data.activeSession?.gameSessionId) {
        setOpenGame({ gameType: data.activeSession.gameType, gameSessionId: data.activeSession.gameSessionId });
      }
    } catch (err: any) {
      setError(err?.error || err?.message || 'Could not load the playroom');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlayroom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  async function activateRoom() {
    setActivatingRoom(true);
    try {
      await postJSON(`/api/matches/${matchId}/playroom/activate`, {});
      await loadPlayroom();
    } catch (err: any) {
      setToast(err?.error || err?.message || 'Could not activate the playroom');
    } finally {
      setActivatingRoom(false);
    }
  }

  async function launchGame(gameType: GameType) {
    if (!state) return;

    // Resume if this exact game is already the active session.
    if (state.activeSession?.gameType === gameType && state.activeSession.gameSessionId) {
      setOpenGame({ gameType, gameSessionId: state.activeSession.gameSessionId });
      return;
    }

    setLaunchingGame(gameType);
    try {
      const res = await postJSON(`/api/playroom/${state.playroomId}/session`, { gameType });
      setOpenGame({ gameType, gameSessionId: res.gameSession });
      await loadPlayroom();
    } catch (err: any) {
      setToast(err?.error || err?.message || 'Could not start this game');
    } finally {
      setLaunchingGame(null);
    }
  }

  // Ending the session server-side (not just clearing local state) matters:
  // loadPlayroom() re-resolves the active session on every load, so without
  // this the picker would immediately snap back into the same in-progress
  // game instead of letting you pick a different one.
  async function closeGame() {
    setOpenGame(null);
    if (state?.activeSession) {
      try {
        await patchJSON(`/api/playroom/${state.playroomId}/session/${state.activeSession.sessionId}/end`, {});
      } catch {
        // Non-fatal — worst case the picker resumes the same game.
      }
    }
    loadPlayroom();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(5,5,12,0.92)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeInUp 0.35s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {/* Background orbs, consistent with the rest of the app */}
      <div className="orb" style={{ width: 520, height: 520, top: -160, right: -140, background: 'radial-gradient(circle, rgba(224,48,192,0.1) 0%, transparent 70%)', filter: 'blur(90px)' }} />
      <div className="orb" style={{ width: 460, height: 460, bottom: -160, left: -120, background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', filter: 'blur(90px)' }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border)', background: 'rgba(7,7,15,0.6)', backdropFilter: 'blur(20px) saturate(180%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 18, color: 'var(--t1)', letterSpacing: '-0.02em' }}>
            Playroom <span style={{ color: 'var(--t3)', fontWeight: 500 }}>· with {otherUserName}</span>
          </div>
          {state && <SpiceLevelMeter level={state.spiceLevel} />}
        </div>
        <button
          type="button"
          onClick={() => {
            socketRef.current?.disconnect();
            onClose();
          }}
          style={{ background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--t2)', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', fontSize: 14 }}
          aria-label="Close playroom"
        >
          ✕
        </button>
      </div>

      <div style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ margin: 'auto', textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid var(--s2)', borderTopColor: 'var(--spark)', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ fontFamily: 'var(--f2)', color: 'var(--t2)', fontSize: 13 }}>Opening the playroom...</div>
          </div>
        ) : error ? (
          <div style={{ margin: 'auto', textAlign: 'center', padding: '40px', maxWidth: 380 }}>
            <div style={{ fontFamily: 'var(--f2)', color: 'var(--t2)', fontSize: 13, marginBottom: 16 }}>{error}</div>
            <button type="button" className="btn-ghost" onClick={loadPlayroom}>Try again</button>
          </div>
        ) : !state?.isActive ? (
          <div style={{ margin: 'auto', textAlign: 'center', padding: '40px 24px', maxWidth: 420 }}>
            <div style={{ fontSize: 44, marginBottom: 16, animation: 'float 3s ease-in-out infinite' }}>🎮</div>
            <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 22, color: 'var(--t1)', marginBottom: 10 }}>Unlock the Playroom</div>
            <p style={{ fontFamily: 'var(--f2)', fontSize: 13, color: 'var(--t2)', lineHeight: 1.7, marginBottom: 24 }}>
              Skip the awkward first message. Dare Roulette, Story Builder, and Would You Rather are all waiting — activate the playroom to start playing with {otherUserName}.
            </p>
            <button type="button" className="btn-grad" disabled={activatingRoom} onClick={activateRoom} style={{ padding: '13px 32px' }}>
              {activatingRoom ? 'Activating...' : 'Activate Playroom →'}
            </button>
          </div>
        ) : openGame ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {openGame.gameType === 'dareRoulette' && (
              <DareRoulette
                drSessionId={openGame.gameSessionId}
                socket={socketRef.current}
                socketReady={socketReady}
                onBack={closeGame}
                onToast={setToast}
              />
            )}
            {openGame.gameType === 'storyBuilding' && (
              <StoryBuilder
                storySessionId={openGame.gameSessionId}
                socket={socketRef.current}
                socketReady={socketReady}
                onBack={closeGame}
                onToast={setToast}
              />
            )}
            {openGame.gameType === 'wouldYouRather' && (
              <WouldYouRather
                wyrSessionId={openGame.gameSessionId}
                socket={socketRef.current}
                socketReady={socketReady}
                onBack={closeGame}
                onToast={setToast}
              />
            )}
          </div>
        ) : (
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '36px 24px 60px', width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div className="eyebrow" style={{ justifyContent: 'center', marginBottom: 10 }}>Choose a game</div>
              <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 26, color: 'var(--t1)', letterSpacing: '-0.03em' }}>
                What are you two feeling?
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {GAME_ORDER.map((gameType) => {
                const meta = GAME_META[gameType];
                const unlocked = state.unlockedFeatures.includes(gameType);
                const isActiveHere = state.activeSession?.gameType === gameType;
                const isLaunching = launchingGame === gameType;
                return (
                  <button
                    key={gameType}
                    type="button"
                    disabled={!unlocked || isLaunching}
                    onClick={() => launchGame(gameType)}
                    className="card"
                    style={{
                      textAlign: 'left',
                      padding: 20,
                      cursor: unlocked ? 'pointer' : 'not-allowed',
                      opacity: unlocked ? 1 : 0.45,
                      border: isActiveHere ? '1px solid rgba(224,48,192,0.35)' : '1px solid var(--border)',
                      boxShadow: isActiveHere ? 'var(--glow-spark)' : 'none',
                      transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                    }}
                    onMouseOver={(e) => { if (unlocked) e.currentTarget.style.transform = 'translateY(-3px)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: meta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 14, boxShadow: '0 8px 24px rgba(224,48,192,0.2)' }}>
                      {meta.icon}
                    </div>
                    <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: 16, color: 'var(--t1)', marginBottom: 6 }}>
                      {meta.label}
                    </div>
                    <div style={{ fontFamily: 'var(--f2)', fontSize: 12, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 14 }}>
                      {meta.tagline}
                    </div>
                    {!unlocked ? (
                      <span className="pill" style={{ background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--t3)' }}>🔒 LOCKED</span>
                    ) : isActiveHere ? (
                      <span className="pill pill-spark">● IN PROGRESS</span>
                    ) : isLaunching ? (
                      <span className="pill pill-vio">STARTING...</span>
                    ) : (
                      <span className="pill pill-vio">TAP TO START</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {toast ? (
        <div style={{ position: 'fixed', left: '50%', bottom: '22px', transform: 'translateX(-50%)', background: 'rgba(19,18,38,0.92)', backdropFilter: 'blur(12px)', border: '1px solid var(--bmd)', borderRadius: '100px', padding: '10px 20px', fontFamily: 'var(--f3)', fontSize: '10px', color: 'var(--t1)', letterSpacing: '0.07em', zIndex: 260, animation: 'toastIn 0.3s ease', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
          {toast}
        </div>
      ) : null}
    </div>
  );
};

export default Playroom;
