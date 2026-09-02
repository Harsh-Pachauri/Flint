import React, { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { getJSON, postJSON } from '../../utils/api';

type StoryEntry = {
  entryId: string;
  userId: string;
  userName: string;
  text: string;
  position: number;
  likedByPartner: boolean;
};

type StoryState = {
  storySessionId: string;
  vibe: string;
  maxSentences: number;
  currentPosition: number;
  currentTurnUserId: string;
  status: 'active' | 'paused' | 'completed';
  entries: StoryEntry[];
};

const VIBE_META: Record<string, { emoji: string; label: string }> = {
  romantic: { emoji: '🌹', label: 'Romantic' },
  funny: { emoji: '😂', label: 'Funny' },
  spicy: { emoji: '🌶️', label: 'Spicy' },
  adventure: { emoji: '🗺️', label: 'Adventure' },
};

const StoryBuilder: React.FC<{
  storySessionId: string;
  socket: Socket | null;
  socketReady: boolean;
  onBack: () => void;
  onToast: (msg: string) => void;
}> = ({ storySessionId, socket, onBack, onToast }) => {
  const myUserId = localStorage.getItem('userId') || '';
  const [state, setState] = useState<StoryState | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ fullText: string; cardImageUrl: string | null } | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  async function loadStory() {
    setLoading(true);
    try {
      const data = await getJSON(`/api/story/${storySessionId}`);
      setState(data);
    } catch (err: any) {
      onToast(err?.error || err?.message || 'Could not load the story');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storySessionId]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('join:story', storySessionId);

    const onEntryAdded = (data: any) => {
      if (data.storySessionId !== storySessionId) return;
      setState((prev) => {
        if (!prev) return prev;
        if (prev.entries.some((e) => e.entryId === data.entryId)) return prev;
        return {
          ...prev,
          currentPosition: data.position,
          currentTurnUserId: data.nextTurnUserId,
          status: data.status,
          entries: [...prev.entries, { entryId: data.entryId, userId: data.userId, userName: data.userName, text: data.text, position: data.position, likedByPartner: false }],
        };
      });
    };
    const onEntryLiked = (data: any) => {
      if (data.storySessionId !== storySessionId) return;
      setState((prev) => prev ? { ...prev, entries: prev.entries.map((e) => (e.entryId === data.entryId ? { ...e, likedByPartner: data.liked } : e)) } : prev);
    };

    socket.on('story:entry-added', onEntryAdded);
    socket.on('story:entry-liked', onEntryLiked);
    return () => {
      socket.off('story:entry-added', onEntryAdded);
      socket.off('story:entry-liked', onEntryLiked);
    };
  }, [socket, storySessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [state?.entries.length]);

  async function submitEntry() {
    const text = draft.trim();
    if (text.length < 5 || !state) return;
    setSubmitting(true);
    try {
      const res = await postJSON(`/api/story/${storySessionId}/entry`, { text });
      setDraft('');
      // Mirrors the chat pattern in Matches.tsx: don't optimistically render
      // locally — this socket is already in the story room, so the relay
      // echo (below) is what actually adds the entry to the list.
      socket?.emit('story:entry-added', {
        storySessionId,
        entryId: res.entryId,
        userId: myUserId,
        userName: 'You',
        text,
        position: res.position,
        nextTurnUserId: null,
        status: res.position >= (state.maxSentences || 20) ? 'completed' : 'active',
      });
      await loadStory();
    } catch (err: any) {
      onToast(err?.error || err?.message || "Couldn't add — is it your turn?");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleLike(entryId: string) {
    try {
      const res = await postJSON(`/api/story/${storySessionId}/like/${entryId}`, {});
      socket?.emit('story:entry-liked', { storySessionId, entryId, liked: res.liked });
      setState((prev) => prev ? { ...prev, entries: prev.entries.map((e) => (e.entryId === entryId ? { ...e, likedByPartner: res.liked } : e)) } : prev);
    } catch (err: any) {
      onToast(err?.error || err?.message || 'Could not like this line');
    }
  }

  async function exportStory() {
    setExporting(true);
    try {
      // The backend already renders + uploads the card image via Puppeteer
      // — this just triggers that existing endpoint and shows the result.
      const res = await postJSON(`/api/story/${storySessionId}/export`, {});
      setExportResult({ fullText: res.fullText, cardImageUrl: res.cardImageUrl });
    } catch (err: any) {
      onToast(err?.error || err?.message || 'Could not export the story');
    } finally {
      setExporting(false);
    }
  }

  const myTurn = state?.currentTurnUserId === myUserId;
  const progress = state ? Math.min(100, Math.round((state.currentPosition / state.maxSentences) * 100)) : 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 640, margin: '0 auto', width: '100%', padding: '24px 20px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <button type="button" onClick={onBack} style={{ background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--t2)', borderRadius: '100px', padding: '7px 16px', cursor: 'pointer', fontFamily: 'var(--f3)', fontSize: 9, letterSpacing: '0.07em' }}>
          ← GAMES
        </button>
        {state && (
          <span className="pill pill-vio">{VIBE_META[state.vibe]?.emoji || '📖'} {VIBE_META[state.vibe]?.label || state.vibe}</span>
        )}
      </div>

      {loading ? (
        <div style={{ margin: 'auto', textAlign: 'center', padding: '40px 0' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--s2)', borderTopColor: 'var(--vio)', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : state ? (
        <>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.06em' }}>
              <span>{state.currentPosition} / {state.maxSentences} LINES</span>
              <span>{state.status === 'completed' ? 'COMPLETE' : myTurn ? 'YOUR TURN' : "PARTNER'S TURN"}</span>
            </div>
            <div style={{ height: 4, background: 'var(--s2)', borderRadius: 100, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--vio), var(--sky))', borderRadius: 100, transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)' }} />
            </div>
          </div>

          <div className="card" style={{ flex: 1, minHeight: 320, maxHeight: 420, overflowY: 'auto', padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {state.entries.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: 32, marginBottom: 10, animation: 'float 3s ease-in-out infinite' }}>✍️</div>
                <div style={{ fontFamily: 'var(--f2)', fontSize: 12, color: 'var(--t2)' }}>
                  {myTurn ? 'Write the first line — one sentence, then it\'s their turn.' : 'Waiting for your match to start the story...'}
                </div>
              </div>
            ) : (
              state.entries.map((entry) => {
                const isMe = entry.userId === myUserId;
                return (
                  <div key={entry.entryId} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '82%' }}>
                      <div style={{ background: isMe ? 'linear-gradient(135deg, var(--vio), rgba(56,189,248,0.75))' : 'var(--card2)', border: isMe ? 'none' : '1px solid var(--border)', color: isMe ? '#fff' : 'var(--t1)', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '10px 14px', animation: 'fadeInUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
                        <div style={{ fontFamily: 'var(--f3)', fontSize: 8, letterSpacing: '0.06em', opacity: 0.75, marginBottom: 3 }}>
                          {isMe ? 'YOU' : entry.userName?.toUpperCase() || 'THEM'} · #{entry.position}
                        </div>
                        <div style={{ fontFamily: 'var(--f2)', fontSize: 13, lineHeight: 1.65 }}>{entry.text}</div>
                      </div>
                      {!isMe && (
                        <button type="button" onClick={() => toggleLike(entry.entryId)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 4, fontSize: 13, opacity: entry.likedByPartner ? 1 : 0.5, transition: 'all 0.2s' }}>
                          {entry.likedByPartner ? '❤️' : '🤍'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {state.status === 'completed' ? (
            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🎉</div>
              <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: 15, color: 'var(--t1)', marginBottom: 14 }}>Your story is complete!</div>
              {exportResult ? (
                <div style={{ animation: 'fadeInUp 0.3s ease' }}>
                  {exportResult.cardImageUrl && (
                    <img src={exportResult.cardImageUrl} alt="Story export" style={{ maxWidth: '100%', borderRadius: 14, marginBottom: 12, border: '1px solid var(--border)' }} />
                  )}
                  <p style={{ fontFamily: 'var(--f2)', fontSize: 12, color: 'var(--t2)', lineHeight: 1.7 }}>{exportResult.fullText}</p>
                </div>
              ) : (
                <button type="button" disabled={exporting} onClick={exportStory} className="btn-grad" style={{ padding: '12px 28px' }}>
                  {exporting ? 'Exporting...' : 'Export as image →'}
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitEntry(); } }}
                disabled={!myTurn || submitting}
                placeholder={myTurn ? 'Continue the story...' : "Waiting for their line..."}
                className="inp"
                style={{ flex: 1, opacity: myTurn ? 1 : 0.6 }}
              />
              <button type="button" disabled={!myTurn || submitting || draft.trim().length < 5} onClick={submitEntry} className="btn-primary" style={{ padding: '11px 20px', opacity: !myTurn || draft.trim().length < 5 ? 0.5 : 1 }}>
                Add
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

export default StoryBuilder;
