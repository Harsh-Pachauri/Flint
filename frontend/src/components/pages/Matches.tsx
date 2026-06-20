import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE, getAuthToken, getJSON, postJSON } from '../../utils/api';

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

type PlayroomInfo = {
  playroomId: string;
  spiceLevel: number;
  unlockedFeatures: string[];
  isActive: boolean;
  activeSession: { sessionId: string; gameType: string; currentRound: number } | null;
};

type GameState = {
  gameType: 'dareRoulette' | 'storyBuilding' | 'wyouldYouRather' | '';
  gameSessionId: string;
};

type ProfilePhoto = string | { url?: string | null } | null | undefined;

type CompatibilityAnswerMap = Record<string, 'A' | 'B' | ''>;

const COMPATIBILITY_QUESTIONS = [
  {
    id: 'q1',
    prompt: 'A perfect first date feels...',
    optionA: 'Spontaneous and playful',
    optionB: 'Calm and thoughtful',
  },
  {
    id: 'q2',
    prompt: 'Your ideal weekend is...',
    optionA: 'Busy, social, and full of plans',
    optionB: 'Low-key, cozy, and private',
  },
  {
    id: 'q3',
    prompt: 'When texting someone new, you prefer...',
    optionA: 'Quick replies and lots of energy',
    optionB: 'Slower, meaningful messages',
  },
] as const;

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
  const [playroom, setPlayroom] = useState<PlayroomInfo | null>(null);
  const [loadingPlayroom, setLoadingPlayroom] = useState(false);
  const [activeGame, setActiveGame] = useState<GameState | null>(null);
  const [gamePayload, setGamePayload] = useState<any>(null);
  const [gameMessage, setGameMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [compatibilityAnswers, setCompatibilityAnswers] = useState<CompatibilityAnswerMap>({ q1: '', q2: '', q3: '' });
  const [submittingCompatibility, setSubmittingCompatibility] = useState(false);
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
      setPlayroom(null);
      setActiveGame(null);
      setGamePayload(null);
      setGameMessage('');
      setCompatibilityAnswers({ q1: '', q2: '', q3: '' });
      setCompatibilityAnswers({ q1: '', q2: '', q3: '' });
      return;
    }

    let alive = true;
    async function loadMatchContext() {
      setLoadingConversation(true);
      setLoadingPlayroom(true);
      setError('');
      try {
        const [detail, chat, playroomData] = await Promise.all([
          getJSON(`/api/matches/${activeMatchId}`),
          getJSON(`/api/matches/${activeMatchId}/messages?limit=40`),
          getJSON(`/api/matches/${activeMatchId}/playroom`),
        ]);

        if (!alive) return;

        setMatchDetail(detail);
        setMessages(chat.messages || []);
        setPlayroom(playroomData);
        if (playroomData?.activeSession) {
          setActiveGame({
            gameType: playroomData.activeSession.gameType,
            gameSessionId: playroomData.activeSession.sessionId,
          });
        }
      } catch (err: any) {
        if (alive) setError(err?.error || err?.message || 'Could not load match conversation');
      } finally {
        if (alive) {
          setLoadingConversation(false);
          setLoadingPlayroom(false);
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
  }, [messages, gamePayload]);

  async function refreshPlayroom() {
    if (!activeMatchId) return;
    try {
      const data = await getJSON(`/api/matches/${activeMatchId}/playroom`);
      setPlayroom(data);
    } catch (err: any) {
      setToast(err?.error || err?.message || 'Could not refresh playroom');
    }
  }

  async function activatePlayroom() {
    if (!activeMatchId) return;
    setLoadingPlayroom(true);
    try {
      const data = await postJSON(`/api/matches/${activeMatchId}/playroom/activate`, {});
      setToast(data?.message || 'Playroom activated');
      await refreshPlayroom();
    } catch (err: any) {
      setToast(err?.error || err?.message || 'Could not activate playroom');
    } finally {
      setLoadingPlayroom(false);
    }
  }

  async function submitCompatibilityTest() {
    if (!activeMatchId) return;

    const answers = COMPATIBILITY_QUESTIONS.map((question) => ({
      questionId: question.id,
      answer: compatibilityAnswers[question.id],
    }));

    if (answers.some((answer) => !answer.answer)) {
      setToast('Choose an answer for each compatibility question first');
      return;
    }

    setSubmittingCompatibility(true);
    try {
      const data = await postJSON(`/api/matches/${activeMatchId}/compatibility-test`, { answers });
      setToast(data?.message || 'Compatibility submitted');
      setMatchDetail((prev) => prev ? {
        ...prev,
        compatibilityTest: {
          completed: true,
          score: data.compatibilityScore,
        },
      } : prev);

      const refreshed = await getJSON(`/api/matches/${activeMatchId}`);
      setMatchDetail(refreshed);
    } catch (err: any) {
      setToast(err?.error || err?.message || 'Could not submit compatibility test');
    } finally {
      setSubmittingCompatibility(false);
    }
  }

  async function startGame(gameType: 'dareRoulette' | 'storyBuilding' | 'wyouldYouRather') {
    if (!playroom?.playroomId) return;
    try {
      const data = await postJSON(`/api/playroom/${playroom.playroomId}/session`, { gameType });
      setActiveGame({ gameType, gameSessionId: data.gameSession });
      setGamePayload(null);
      setGameMessage(data?.message || `${gameType} started`);
      setToast(data?.message || 'Game started');
      if (gameType === 'storyBuilding') {
        const story = await getJSON(`/api/story/${data.gameSession}`);
        setGamePayload(story);
      }
      if (gameType === 'wyouldYouRather') {
        const wyr = await getJSON(`/api/wyr/${data.gameSession}`);
        setGamePayload(wyr);
      }
    } catch (err: any) {
      setToast(err?.error || err?.message || 'Could not start the game');
    }
  }

  async function sendMessage() {
    const content = draft.trim();
    if (!content || !activeMatchId || !socketRef.current) return;

    setSending(true);
    try {
      socketRef.current.emit('message:send', {
        matchId: activeMatchId,
        content,
      });
      setDraft('');
      setToast('Message sent');
    } catch (err: any) {
      setToast(err?.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  }

  async function spinDare() {
    if (!activeGame?.gameSessionId) return;
    try {
      const data = await postJSON(`/api/dare/${activeGame.gameSessionId}/spin`, {});
      setGamePayload(data);
      setGameMessage(data.message);
    } catch (err: any) {
      setToast(err?.error || err?.message || 'Could not spin the wheel');
    }
  }

  async function consentToSpin(accepted: boolean) {
    if (!gamePayload?.spinId) return;
    try {
      const data = await postJSON(`/api/dare/spin/${gamePayload.spinId}/consent`, { accepted });
      setGamePayload(data);
      setGameMessage(data.message || (accepted ? 'Consent recorded' : 'Dare skipped'));
    } catch (err: any) {
      setToast(err?.error || err?.message || 'Could not submit consent');
    }
  }

  async function completeDare(skipped = false) {
    const dareCardId = gamePayload?.dareCard?.dareCardId;
    if (!dareCardId) return;
    try {
      const data = await postJSON(`/api/dare/card/${dareCardId}/complete`, skipped ? { skipped: true } : { proofType: 'photo', proofUrl: 'https://example.com/proof.jpg', skipped: false });
      setGamePayload(data);
      setGameMessage(data.message);
    } catch (err: any) {
      setToast(err?.error || err?.message || 'Could not complete dare');
    }
  }

  async function submitStoryEntry() {
    const text = String(gamePayload?.draftText || '').trim();
    if (!text || !activeGame?.gameSessionId) return;
    try {
      const data = await postJSON(`/api/story/${activeGame.gameSessionId}/entry`, { text });
      setGamePayload((prev: any) => ({ ...prev, draftText: '', lastResponse: data }));
      setGameMessage(data.message);
      const story = await getJSON(`/api/story/${activeGame.gameSessionId}`);
      setGamePayload(story);
    } catch (err: any) {
      setToast(err?.error || err?.message || 'Could not add story entry');
    }
  }

  async function submitWyrAnswer(questionId: string, chosenOption: 'A' | 'B') {
    try {
      const data = await postJSON(`/api/wyr/question/${questionId}/answer`, { chosenOption });
      setGameMessage(data.message);
      const wyr = await getJSON(`/api/wyr/${activeGame?.gameSessionId}`);
      setGamePayload(wyr);
    } catch (err: any) {
      setToast(err?.error || err?.message || 'Could not submit answer');
    }
  }

  const activeMatch = matches.find((item) => item.matchId === activeMatchId) || null;
  const fallbackOtherUser = getDisplayName(matchDetail?.otherUser?.name || activeMatch?.otherUser?.name);
  const activeMatchAvatar = getPhotoUrl(matchDetail?.otherUser?.photos || activeMatch?.otherUser?.photos);
  const activeMatchProfileId = getProfileUserId(matchDetail?.otherUser || activeMatch?.otherUser);

  const renderGamePanel = () => {
    if (!activeGame) {
      return (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '14px', lineHeight: 1.7, fontFamily: 'var(--f2)', color: 'var(--t2)' }}>
          Activate the playroom to unlock game sessions. The current design supports Dare Roulette, Story Building, and Would You Rather.
        </div>
      );
    }

    if (activeGame.gameType === 'dareRoulette') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '14px' }}>
            <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--spark)', letterSpacing: '0.12em', marginBottom: '8px' }}>DARE ROULETTE</div>
            <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '16px', color: 'var(--t1)', marginBottom: '10px' }}>Spin the wheel and wait for consent</div>
            <button type="button" onClick={spinDare} style={{ background: 'var(--spark)', border: 'none', color: '#fff', fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '12px', padding: '10px 16px', borderRadius: '100px', cursor: 'pointer' }}>
              Spin wheel
            </button>
          </div>

          {gamePayload?.landedCategory ? (
            <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '14px' }}>
              <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)', letterSpacing: '0.08em', marginBottom: '6px' }}>RESULT</div>
              <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '15px', color: 'var(--t1)', marginBottom: '10px' }}>{gamePayload.landedCategory}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => consentToSpin(true)} style={{ flex: 1, background: 'var(--spark)', border: 'none', color: '#fff', fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '12px', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}>
                  Consent
                </button>
                <button type="button" onClick={() => consentToSpin(false)} style={{ flex: 1, background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--t2)', fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '12px', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}>
                  Skip
                </button>
              </div>
            </div>
          ) : null}

          {gamePayload?.dareCard ? (
            <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '14px' }}>
              <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)', letterSpacing: '0.08em', marginBottom: '6px' }}>DARE CARD</div>
              <div style={{ fontFamily: 'var(--f2)', color: 'var(--t1)', lineHeight: 1.7, marginBottom: '10px' }}>{gamePayload.dareCard.dareText}</div>
              <button type="button" onClick={() => completeDare(false)} style={{ width: '100%', background: 'var(--vio)', border: 'none', color: '#fff', fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '12px', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}>
                Mark complete
              </button>
              <button type="button" onClick={() => completeDare(true)} style={{ width: '100%', marginTop: '8px', background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--t2)', fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '12px', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}>
                Skip dare
              </button>
            </div>
          ) : null}
        </div>
      );
    }

    if (activeGame.gameType === 'storyBuilding') {
      const story = gamePayload;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '14px' }}>
            <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--spark)', letterSpacing: '0.12em', marginBottom: '8px' }}>STORY BUILDING</div>
            <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '16px', color: 'var(--t1)', marginBottom: '8px' }}>Build the story together</div>
            <textarea
              rows={4}
              value={story?.draftText || ''}
              onChange={(event) => setGamePayload((prev: any) => ({ ...prev, draftText: event.target.value }))}
              placeholder="Write the next sentence..."
              style={{ width: '100%', resize: 'none', background: 'var(--card3)', border: '1px solid var(--border)', color: 'var(--t1)', borderRadius: '12px', padding: '12px', fontFamily: 'var(--f2)', fontSize: '12px', lineHeight: 1.7, outline: 'none' }}
            />
            <button type="button" onClick={submitStoryEntry} style={{ width: '100%', marginTop: '10px', background: 'var(--spark)', border: 'none', color: '#fff', fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '12px', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}>
              Add sentence
            </button>
          </div>

          <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '14px' }}>
            <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)', letterSpacing: '0.08em', marginBottom: '8px' }}>CURRENT STORY</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(story?.entries || []).map((entry: any) => (
                <div key={entry.entryId} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '12px', color: 'var(--t1)' }}>{entry.userName}</span>
                    <span style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)' }}>#{entry.position}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--f2)', fontSize: '12px', color: 'var(--t2)', lineHeight: 1.6 }}>{entry.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeGame.gameType === 'wyouldYouRather') {
      const wyr = gamePayload;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '14px' }}>
            <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--vio)', letterSpacing: '0.12em', marginBottom: '8px' }}>WOULD YOU RATHER</div>
            <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '16px', color: 'var(--t1)', marginBottom: '10px' }}>Answer, then compare with your match</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(wyr?.questions || []).slice(0, 3).map((question: any) => (
                <div key={question.questionId} style={{ background: 'var(--card3)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px' }}>
                  <div style={{ fontFamily: 'var(--f2)', fontSize: '12px', color: 'var(--t1)', marginBottom: '8px', lineHeight: 1.6 }}>{question.optionA} / {question.optionB}</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => submitWyrAnswer(question.questionId, 'A')} style={{ flex: 1, background: 'var(--spark)', border: 'none', color: '#fff', fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '12px', padding: '9px', borderRadius: '10px', cursor: 'pointer' }}>
                      Option A
                    </button>
                    <button type="button" onClick={() => submitWyrAnswer(question.questionId, 'B')} style={{ flex: 1, background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--t2)', fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '12px', padding: '9px', borderRadius: '10px', cursor: 'pointer' }}>
                      Option B
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '14px' }}>
            <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)', letterSpacing: '0.08em', marginBottom: '8px' }}>SYNC SCORE</div>
            <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: '24px', color: 'var(--spark)' }}>{wyr?.syncScore || 0}%</div>
            <div style={{ fontFamily: 'var(--f2)', fontSize: '12px', color: 'var(--t2)', lineHeight: 1.6, marginTop: '6px' }}>{wyr?.syncBadge || 'Answer a few rounds to unlock a badge.'}</div>
          </div>
        </div>
      );
    }

    return null;
  };

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
                              const senderName = typeof message.senderId === 'object' ? message.senderId?.name : '';
                              const isMe = senderName === 'You';
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
