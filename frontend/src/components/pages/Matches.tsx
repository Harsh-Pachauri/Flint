import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE, getAuthToken, getJSON } from '../../utils/api';

type MatchItem = {
  matchId: string;
  otherUser: {
    _id: string;
    name: string;
    photos?: string[];
    lastActive?: string;
  };
  matchedAt: string;
  status: string;
};

type MatchDetail = {
  matchId: string;
  otherUser: {
    _id: string;
    name: string;
    photos?: string[];
  };
  matchedAt: string;
  compatibilityTest: { completed: boolean; score: number } | null;
  lastMessage: { content?: string; sentAt?: string } | null;
  playroomActive: boolean;
};

type ChatMessage = {
  _id?: string;
  content?: string;
  sentAt?: string;
  senderId?: { _id?: string; name?: string } | string;
  mediaUrl?: string | null;
};

type ProfilePhoto = string | { url?: string | null } | null | undefined;

function getDisplayName(name?: string | null, fallback = 'Match') {
  const value = String(name || '').trim();
  return value || fallback;
}

function getProfileUserId(otherUser?: MatchItem['otherUser'] | MatchDetail['otherUser']) {
  return otherUser?._id || '';
}

function getPhotoUrl(photos?: ProfilePhoto[]) {
  if (!Array.isArray(photos) || photos.length === 0) return '';

  const first = photos.find(Boolean);
  if (!first) return '';
  if (typeof first === 'string') return first;
  if (typeof first === 'object' && typeof first.url === 'string') return first.url;
  return '';
}

function parseMatchId(hash: string) {
  const match = hash.match(/^#\/matches\/([^/?]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function formatRelativeDate(input?: string) {
  if (!input) return 'just now';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return 'just now';
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function getInitials(name?: string | null) {
  const fallback = 'M';
  if (!name) return fallback;

  const initials = name
    .split(' ')
    .map((word) => word.trim().charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return initials || fallback;
}

function Matches() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [matchDetail, setMatchDetail] = useState<MatchDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [sending, setSending] = useState(false);
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#/matches');
  const [showMatchesMobile, setShowMatchesMobile] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeMatchId = useMemo(() => parseMatchId(currentHash), [currentHash]);

  useEffect(() => {
    function handleHashChange() {
      setCurrentHash(window.location.hash || '#/matches');
      setShowMatchesMobile(false);
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadMatches() {
      setLoadingMatches(true);
      try {
        const data = await getJSON('/api/matches');
        if (!alive) return;
        setMatches(data.matches || []);
        if (!parseMatchId(window.location.hash) && (data.matches || []).length > 0) {
          window.location.hash = `#/matches/${data.matches[0].matchId}`;
        }
      } catch (err: any) {
        if (alive) setError(err?.error || err?.message || 'Could not load matches');
      } finally {
        if (alive) setLoadingMatches(false);
      }
    }

    loadMatches();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!activeMatchId) {
      setMatchDetail(null);
      setMessages([]);
      return;
    }

    let alive = true;
    async function loadMatchContext() {
      setLoadingConversation(true);
      setError('');
      try {
        const [detail, chat] = await Promise.all([
          getJSON(`/api/matches/${activeMatchId}`),
          getJSON(`/api/matches/${activeMatchId}/messages?limit=40`),
        ]);

        if (!alive) return;

        setMatchDetail(detail);
        setMessages(chat.messages || []);
      } catch (err: any) {
        if (alive) setError(err?.error || err?.message || 'Could not load match conversation');
      } finally {
        if (alive) {
          setLoadingConversation(false);
        }
      }
    }

    loadMatchContext();
    return () => {
      alive = false;
    };
  }, [activeMatchId]);

  useEffect(() => {
    if (!activeMatchId) return;

    const token = getAuthToken();
    if (!token) {
      setToast('You need to be logged in to open chat');
      return;
    }

    const socket = io(API_BASE, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:chat', activeMatchId);
    });

    socket.on('message:received', (payload: any) => {
      setMessages((prev) => [
        ...prev,
        {
          _id: payload.messageId || `${Date.now()}`,
          content: payload.content,
          sentAt: payload.sentAt,
          senderId: payload.senderId,
        },
      ]);
    });

    socket.on('error', (payload: any) => {
      setToast(payload?.message || 'Socket error');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeMatchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  function sendMessage() {
    const text = draft.trim();
    if (!text || !activeMatchId || !socketRef.current) return;
    setSending(true);
    socketRef.current.emit('message:send', {
      matchId: activeMatchId,
      content: text,
    });
    setDraft('');
    setSending(false);
  }

  const currentUserId = localStorage.getItem('userId') || '';
  const activeMatch = matches.find((item) => item.matchId === activeMatchId) || null;
  const fallbackOtherUser = getDisplayName(matchDetail?.otherUser?.name || activeMatch?.otherUser?.name);
  const activeMatchAvatar = getPhotoUrl(matchDetail?.otherUser?.photos || activeMatch?.otherUser?.photos);
  const activeMatchProfileId = getProfileUserId(matchDetail?.otherUser || activeMatch?.otherUser);

  return (
    <div style={{ background: 'var(--void)', minHeight: '100vh', color: 'var(--t1)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '18px 18px 44px' }}>
        {loadingMatches ? (
          <div style={{ padding: '28px 0', fontFamily: 'var(--f2)', color: 'var(--t2)' }}>Loading matches...</div>
        ) : error && matches.length === 0 ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '18px', padding: '20px', fontFamily: 'var(--f2)', color: 'var(--t2)' }}>{error}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr) 330px', gap: '16px', alignItems: 'start' }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '18px', padding: '14px', position: 'sticky', top: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--spark)', letterSpacing: '0.12em' }}>YOUR MATCHES</div>
                <span className="pill pill-spark">{matches.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {matches.length === 0 ? (
                  <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', fontFamily: 'var(--f2)', color: 'var(--t2)', lineHeight: 1.7 }}>
                    You do not have any matches yet. Go back to Discover and like a few profiles.
                  </div>
                ) : (
                  matches.map((item) => {
                    const isActive = item.matchId === activeMatchId;
                    const displayName = getDisplayName(item.otherUser?.name, 'Match');
                    const displayPhoto = getPhotoUrl(item.otherUser?.photos);
                    return (
                      <button
                        key={item.matchId}
                        type="button"
                        onClick={() => (window.location.hash = `#/matches/${item.matchId}`)}
                        style={{
                          textAlign: 'left',
                          background: isActive ? 'var(--spd)' : 'var(--s2)',
                          border: isActive ? '1px solid rgba(224,48,192,0.25)' : '1px solid var(--border)',
                          color: 'var(--t1)',
                          borderRadius: '14px',
                          padding: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {displayPhoto ? (
                              <img src={displayPhoto} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,var(--spark),var(--vio))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '12px', color: '#fff' }}>{getInitials(displayName)}</div>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                              <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '13px' }}>{displayName}</div>
                              <span style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)' }}>{formatRelativeDate(item.matchedAt)}</span>
                            </div>
                            <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)', letterSpacing: '0.05em', marginTop: '4px' }}>Tap to chat</div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {activeMatchId ? (
                <>
                  <div style={{ background: 'linear-gradient(135deg,rgba(224,48,192,0.1),rgba(139,92,246,0.1))', border: '1px solid rgba(224,48,192,0.15)', borderRadius: '18px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--void)', background: 'linear-gradient(135deg,var(--sky),var(--spark))', fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '13px', color: '#fff' }}>
                          YOU
                        </div>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--void)', marginLeft: '-12px' }}>
                          {activeMatchAvatar ? (
                            <img src={activeMatchAvatar} alt={fallbackOtherUser} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,var(--spark),var(--vio))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '13px', color: '#fff' }}>{getInitials(fallbackOtherUser)}</div>
                          )}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '14px', color: 'var(--t1)' }}>You & {fallbackOtherUser}</div>
                        <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--t3)', letterSpacing: '0.05em' }}>{matchDetail?.matchedAt ? `Matched ${formatRelativeDate(matchDetail.matchedAt)}` : 'Open conversation'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="pill pill-spark">{matchDetail?.playroomActive ? 'PLAYROOM ON' : 'PLAYROOM OFF'}</span>
                      {matchDetail?.compatibilityTest ? <span className="pill pill-vio">{Math.round(matchDetail.compatibilityTest.score)}% SYNC</span> : <span className="pill pill-amber">COMPATIBILITY PENDING</span>}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden' }}>
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--spark)', letterSpacing: '0.12em' }}>CHAT</div>
                          <div style={{ fontFamily: 'var(--f2)', fontSize: '12px', color: 'var(--t3)', marginTop: '4px' }}>Socket-powered messages from the existing backend</div>
                        </div>
                        <button type="button" onClick={() => (window.location.hash = '#/discover')} style={{ background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--t2)', borderRadius: '100px', padding: '7px 12px', cursor: 'pointer', fontFamily: 'var(--f3)', fontSize: '9px' }}>
                          Back to discover
                        </button>
                      </div>

                      <div style={{ height: '520px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'linear-gradient(180deg,rgba(17,16,38,0.45),rgba(7,7,15,0.75))' }}>
                          {loadingConversation ? (
                            <div style={{ fontFamily: 'var(--f2)', color: 'var(--t2)' }}>Loading chat...</div>
                          ) : messages.length === 0 ? (
                            <div style={{ padding: '18px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '14px', fontFamily: 'var(--f2)', color: 'var(--t2)', lineHeight: 1.7 }}>
                              No messages yet. Send the first hello.
                            </div>
                          ) : (
                            messages.map((message, index) => {
                              const senderObj = typeof message.senderId === 'object' ? message.senderId : null;
                              const senderId = senderObj?._id || (typeof message.senderId === 'string' ? message.senderId : '');
                              const senderName = senderObj?.name || '';
                              const isMe = senderId === currentUserId;
                              return (
                                <div key={message._id || `${index}-${message.sentAt}`} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                                  <div style={{ maxWidth: '78%', background: isMe ? 'var(--spark)' : 'var(--card2)', border: '1px solid var(--border)', color: isMe ? '#fff' : 'var(--t1)', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '10px 14px' }}>
                                    <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', letterSpacing: '0.07em', color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--t3)', marginBottom: '4px' }}>
                                      {senderName || (isMe ? 'You' : fallbackOtherUser)} · {formatRelativeDate(message.sentAt)}
                                    </div>
                                    <div style={{ fontFamily: 'var(--f2)', fontSize: '13px', lineHeight: 1.75 }}>{message.content}</div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                          <div ref={bottomRef} />
                        </div>

                        <div style={{ padding: '14px', borderTop: '1px solid var(--border)', background: 'var(--s1)' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                            <textarea
                              rows={2}
                              value={draft}
                              onChange={(event) => setDraft(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                  event.preventDefault();
                                  sendMessage();
                                }
                              }}
                              placeholder="Say something..."
                              style={{ flex: 1, resize: 'none', background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--t1)', borderRadius: '12px', padding: '11px 14px', fontFamily: 'var(--f2)', fontSize: '13px', lineHeight: 1.65, outline: 'none' }}
                            />
                            <button type="button" disabled={sending} onClick={sendMessage} style={{ background: 'var(--spark)', color: '#fff', border: 'none', fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '12px', padding: '11px 16px', borderRadius: '12px', cursor: 'pointer', opacity: sending ? 0.75 : 1 }}>
                              Send
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                            {/* Game shortcut temporarily disabled.
                            <button type="button" onClick={() => setToast('Open the playroom panel on the right to start a game.')} style={{ background: 'var(--vid)', border: '1px solid rgba(139,92,246,0.25)', color: 'var(--vio)', borderRadius: '100px', padding: '7px 12px', cursor: 'pointer', fontFamily: 'var(--f3)', fontSize: '9px', letterSpacing: '0.07em' }}>
                              SEND GAME
                            </button>
                            */}
                            <button type="button" onClick={() => {
                              if (!activeMatchProfileId) {
                                setToast('Could not open profile for this match');
                                return;
                              }
                              window.location.hash = `#/profile/${activeMatchProfileId}`;
                            }} style={{ background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--t2)', borderRadius: '100px', padding: '7px 12px', cursor: 'pointer', fontFamily: 'var(--f3)', fontSize: '9px', letterSpacing: '0.07em' }}>
                              DETAILS
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '18px', padding: '20px', fontFamily: 'var(--f2)', color: 'var(--t2)', lineHeight: 1.8 }}>
                  Choose a match from the left to open chat and the playroom panel.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'sticky', top: '16px' }}>
              {/*
              Game-related cards are intentionally hidden for now:
              - Compatibility
              - Playroom
              - Active Game
              */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '18px', padding: '16px' }}>
                <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--spark)', letterSpacing: '0.12em', marginBottom: '12px' }}>MATCH INFO</div>
                <div style={{ fontFamily: 'var(--f2)', fontSize: '12px', color: 'var(--t2)', lineHeight: 1.7 }}>
                  Game and playroom modules are temporarily hidden. Use chat and profile details for now.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showMatchesMobile ? null : null}

      {toast ? (
        <div style={{ position: 'fixed', left: '50%', bottom: '22px', transform: 'translateX(-50%)', background: 'var(--card2)', border: '1px solid var(--bmd)', borderRadius: '100px', padding: '9px 18px', fontFamily: 'var(--f3)', fontSize: '10px', color: 'var(--t1)', letterSpacing: '0.07em', zIndex: 120 }}>
          {toast}
        </div>
      ) : null}
    </div>
  );
}

export default Matches;
