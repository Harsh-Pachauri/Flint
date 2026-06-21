import React, { useEffect, useState } from 'react';
import { getJSON, postJSON, deleteJSON, getAuthTokens } from '../../utils/api';

type SwipeItem = {
  swipeId: string;
  fromUserId: string;
  fromUserProfile: {
    userId: string;
    name: string;
    age?: number;
    bio?: string;
    gender?: string;
    photos?: string[];
    year?: string;
    depart?: string;
    vibewords?: string[];
  } | null;
  swipedAt: string;
};

type Confession = {
  _id: string;
  text: string;
  author: string | null;
  isAnonymous: boolean;
  tags: string[];
  reactions: Record<string, number>;
  reactionCount: number;
  commentsCount: number;
  status: string;
  createdAt: string;
};

type Poll = {
  _id: string;
  creator: string;
  question: string;
  options: Array<{ text: string; votes: number }>;
  voters: string[];
  createdAt: string;
};

type PollResult = {
  option: string;
  votes: number;
  percentage: number;
};

type TrendingTag = {
  tag: string;
  count: string;
  delta: string;
};


function CampusPulse() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [incomingSwipes, setIncomingSwipes] = useState<SwipeItem[]>([]);
  const [loadingSwipes, setLoadingSwipes] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [toast, setToast] = useState('');

  // Confessions and Polls state
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [commentsById, setCommentsById] = useState<Record<string, any[]>>({});
  const [commentsOpen, setCommentsOpen] = useState<Record<string, boolean>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [polls, setPolls] = useState<Poll[]>([]);
  const [trending, setTrending] = useState<TrendingTag[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);

  // Form state
  const [confessModal, setConfessModal] = useState(false);
  const [confessText, setConfessText] = useState('');
  const [confessAnon, setConfessAnon] = useState(true);
  const [confessTags, setConfessTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [postMode, setPostMode] = useState<'post' | 'confess' | 'poll' | 'photo'>('post');
  const [composeText, setComposeText] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [loadingPollResultsId, setLoadingPollResultsId] = useState<string | null>(null);
  const [pollResultsById, setPollResultsById] = useState<Record<string, { totalVotes: number; results: PollResult[] }>>({});

  // Trending tags to show in modal
  const allTags = ['#CrushAlert', '#ExamSeason', '#MessProblems', '#HostelLife', '#Placements', '#AcademicChaos', '#CampusCrime', '#LabLife', '#HostelLife'];

  // Load incoming swipes
  useEffect(() => {
    if (!drawerOpen) return;
    let alive = true;

    async function loadIncoming() {
      setLoadingSwipes(true);
      try {
        const data = await getJSON('/api/swipes/incoming');
        if (alive) {
          setIncomingSwipes(data.swipes || []);
        }
      } catch (error: any) {
        if (alive) {
          setToast(error?.error || error?.message || 'Failed to load incoming swipes');
        }
      } finally {
        if (alive) {
          setLoadingSwipes(false);
        }
      }
    }

    loadIncoming();
    return () => {
      alive = false;
    };
  }, [drawerOpen]);

  // Load confessions based on tab
  useEffect(() => {
    let alive = true;

    async function loadContent() {
      setLoadingContent(true);
      try {
        if (activeTab === 'Confessions' || activeTab === 'All') {
          const data = await getJSON('/api/confessions?page=1&limit=10&sort=trending');
          if (alive) {
            setConfessions(data.confessions || []);
          }
        }
        if (activeTab === 'Polls' || activeTab === 'All') {
          const data = await getJSON('/api/polls');
          if (alive) {
            setPolls(data.polls || []);
          }
        }
        // Load trending tags
        try {
          const trendingRes = await getJSON('/api/confessions/trending');
          if (alive && trendingRes?.confessions) {
            const tags: TrendingTag[] = [];
            const tagMap: Record<string, number> = {};
            trendingRes.confessions.forEach((c: any) => {
              (c.tags || []).forEach((tag: string) => {
                tagMap[tag] = (tagMap[tag] || 0) + 1;
              });
            });
            Object.entries(tagMap)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 6)
              .forEach(([tag, count]) => {
                tags.push({
                  tag,
                  count: count > 1000 ? (count / 1000).toFixed(1) + 'k posts' : count + ' posts',
                  delta: '+' + Math.floor(Math.random() * 30) + '%',
                });
              });
            setTrending(tags);
          }
        } catch (e) {
          // Continue without trending
        }
      } catch (error: any) {
        if (alive) {
          setToast(error?.error || error?.message || 'Failed to load content');
        }
      } finally {
        if (alive) {
          setLoadingContent(false);
        }
      }
    }

    loadContent();
    return () => {
      alive = false;
    };
  }, [activeTab]);

  // Toast timer
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function acceptSwipe(swipeId: string) {
    try {
      const result = await postJSON(`/api/swipes/${swipeId}/accept`, {});
      setIncomingSwipes((prev) => prev.filter((item) => item.swipeId !== swipeId));
      setToast(result?.match?.message || 'Swipe accepted');
      if (result?.match?.matchId) {
        window.location.hash = `#/matches/${result.match.matchId}`;
      }
    } catch (error: any) {
      setToast(error?.error || error?.message || 'Could not accept swipe');
    }
  }

  async function rejectSwipe(swipeId: string) {
    try {
      await postJSON(`/api/swipes/${swipeId}/reject`, {});
      setIncomingSwipes((prev) => prev.filter((item) => item.swipeId !== swipeId));
      setToast('Swipe rejected');
    } catch (error: any) {
      setToast(error?.error || error?.message || 'Could not reject swipe');
    }
  }

  async function submitConfession() {
    if (!confessText.trim()) {
      setToast('Please write a confession');
      return;
    }

    setSubmitting(true);
    try {
      const result = await postJSON('/api/confessions', {
        text: confessText,
        isAnonymous: confessAnon,
        tags: confessTags,
      });

      setToast(result?.message || 'Confession submitted! It will be reviewed shortly.');
      setConfessText('');
      setConfessTags([]);
      setConfessAnon(true);
      setConfessModal(false);

      // Reload confessions
      const data = await getJSON('/api/confessions?page=1&limit=10&sort=trending');
      setConfessions(data.confessions || []);
    } catch (error: any) {
      setToast(error?.error || error?.message || 'Failed to submit confession');
    } finally {
      setSubmitting(false);
    }
  }

  async function loadComments(confessionId: string) {
    try {
      const data = await getJSON(`/api/comments?targetType=confession&targetId=${confessionId}`);
      setCommentsById((prev) => ({ ...(prev || {}), [confessionId]: data.comments || [] }));
    } catch (err: any) {
      setToast(err?.error || err?.message || 'Failed to load comments');
    }
  }

  async function addComment(confessionId: string) {
    const text = (newCommentText[confessionId] || '').trim();
    if (!text) {
      setToast('Please write a comment');
      return;
    }
    try {
      const res = await postJSON('/api/comments', { targetType: 'confession', targetId: confessionId, text });
      setNewCommentText((p) => ({ ...(p || {}), [confessionId]: '' }));
      // reload comments and update counts
      await loadComments(confessionId);
      setConfessions((prev) => prev.map((c) => (c._id === confessionId ? { ...c, commentsCount: (c.commentsCount || 0) + 1 } : c)));
      setToast(res?.message || 'Comment added');
    } catch (err: any) {
      setToast(err?.error || err?.message || 'Failed to add comment');
    }
  }

  async function removeComment(commentId: string, confessionId?: string) {
    try {
      const res = await deleteJSON(`/api/comments/${commentId}`);
      if (confessionId) {
        // reload comments and update count
        await loadComments(confessionId);
        setConfessions((prev) => prev.map((c) => (c._id === confessionId ? { ...c, commentsCount: Math.max(0, (c.commentsCount || 1) - 1) } : c)));
      }
      setToast(res?.message || 'Comment deleted');
    } catch (err: any) {
      setToast(err?.error || err?.message || 'Failed to delete comment');
    }
  }

  async function toggleConfessionReaction(confessionId: string, emoji: string) {
    try {
      const res = await postJSON('/api/reactions/toggle', { targetType: 'confession', targetId: confessionId, emoji });
      // Update local reactionCount depending on response
      setConfessions((prev) => prev.map((c) => {
        if (c._id !== confessionId) return c;
        const delta = res?.reaction ? 1 : -1;
        return { ...c, reactionCount: Math.max(0, (c.reactionCount || 0) + delta) };
      }));
      setToast(res?.message || (res?.reaction ? 'Reaction added' : 'Reaction removed'));
    } catch (err: any) {
      setToast(err?.error || err?.message || 'Failed to toggle reaction');
    }
  }

    async function refreshConfessions() {
      setLoadingContent(true);
      try {
        const data = await getJSON('/api/confessions?page=1&limit=10&sort=trending');
        setConfessions(data.confessions || []);
        setToast('Confessions refreshed!');
      } catch (error: any) {
        setToast(error?.error || error?.message || 'Failed to refresh confessions');
      } finally {
        setLoadingContent(false);
      }
    }

  async function voteOnPoll(pollId: string, optionIndex: number) {
    try {
      await postJSON(`/api/polls/${pollId}/vote`, {
        optionIndex,
      });

      setToast('Vote recorded!');

      // Update polls to reflect new vote
      const data = await getJSON('/api/polls');
      setPolls(data.polls || []);
      await loadPollResults(pollId);
    } catch (error: any) {
      setToast(error?.error || error?.message || 'Failed to vote');
    }
  }

  async function loadPollResults(pollId: string) {
    setLoadingPollResultsId(pollId);
    try {
      const data = await getJSON(`/api/polls/${pollId}/results`);
      setPollResultsById((prev) => ({
        ...prev,
        [pollId]: {
          totalVotes: data.totalVotes || 0,
          results: data.results || [],
        },
      }));
    } catch (error: any) {
      setToast(error?.error || error?.message || 'Failed to load poll results');
    } finally {
      setLoadingPollResultsId(null);
    }
  }

  function addPollOption() {
    if (pollOptions.length >= 6) {
      setToast('You can add up to 6 options');
      return;
    }
    setPollOptions((prev) => [...prev, '']);
  }

  function updatePollOption(index: number, value: string) {
    setPollOptions((prev) => prev.map((option, i) => (i === index ? value : option)));
  }

  function removePollOption(index: number) {
    if (pollOptions.length <= 2) {
      setToast('At least 2 options are required');
      return;
    }
    setPollOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function submitPoll() {
    const question = composeText.trim();
    const options = pollOptions.map((option) => option.trim()).filter(Boolean);

    if (!question) {
      setToast('Please write a poll question');
      return;
    }

    if (options.length < 2) {
      setToast('Please add at least two poll options');
      return;
    }

    setSubmitting(true);
    try {
      const result = await postJSON('/api/polls', {
        question,
        options,
      });

      setToast(result?.message || 'Poll created successfully!');
      setComposeText('');
      setPollOptions(['', '']);
      setPostMode('post');

      const data = await getJSON('/api/polls');
      setPolls(data.polls || []);
      setActiveTab('Polls');
    } catch (error: any) {
      setToast(error?.error || error?.message || 'Failed to create poll');
    } finally {
      setSubmitting(false);
    }
  }

  function handleComposerSubmit() {
    if (postMode === 'confess') {
      setConfessModal(true);
      return;
    }

    if (postMode === 'poll') {
      submitPoll();
      return;
    }

    setToast('Regular post and photo routes are not enabled yet. Use Confess or Poll.');
  }

  const getRemainingTags = () => allTags.filter((tag) => !confessTags.includes(tag));

  const tagColors: Record<string, string> = {
    '#CrushAlert': 'var(--spark)',
    '#ExamSeason': 'var(--amber)',
    '#MessProblems': 'var(--rose)',
    '#HostelLife': 'var(--vio)',
    '#Placements': 'var(--sky)',
    '#AcademicChaos': 'var(--teal)',
    '#CampusCrime': 'var(--amber)',
    '#LabLife': 'var(--sky)',
  };

  const getTagColor = (tag: string) => {
    return tagColors[tag] || 'var(--vio)';
  };

  return (
    <div style={{ background: 'var(--void)', minHeight: '100vh', color: 'var(--t1)' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(7,7,15,0.75)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid var(--border)',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '15px', color: 'var(--t1)' }}>Campus Pulse</div>
        </div>

        <div style={{ flex: 1, maxWidth: '340px', position: 'relative' }}>
          <svg style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }} width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="var(--t3)" strokeWidth="1.4" />
            <path d="M11 11l3 3" stroke="var(--t3)" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search posts, confessions, tags..."
            style={{
              width: '100%',
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              color: 'var(--t1)',
              fontFamily: 'var(--f2)',
              fontSize: '12px',
              padding: '8px 14px 8px 30px',
              borderRadius: '100px',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            style={{
              position: 'relative',
              width: '34px',
              height: '34px',
              background: 'var(--s2)',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Incoming swipes"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M10 2a6 6 0 0 0-6 6c0 6-2.5 7.5-2.5 7.5h17S16 14 16 8a6 6 0 0 0-6-6zM8.5 17a1.5 1.5 0 0 0 3 0" stroke="var(--t2)" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', top: '-1px', right: '-1px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--spark)', border: '1.5px solid var(--void)' }} />
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--s1)', borderBottom: '1px solid var(--border)', padding: '10px 20px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: '7px', minWidth: 'max-content' }}>
          {['All', 'Discussions', 'Confessions', 'Moments', 'Polls'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                fontFamily: 'var(--f3)',
                fontSize: '9px',
                padding: '7px 15px',
                borderRadius: '100px',
                border: activeTab === tab ? '1px solid rgba(224,48,192,0.3)' : '1px solid var(--border)',
                color: activeTab === tab ? 'var(--spark)' : 'var(--t3)',
                background: activeTab === tab ? 'var(--spd)' : 'transparent',
                cursor: 'pointer',
                letterSpacing: '0.07em',
                whiteSpace: 'nowrap',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '20px 18px 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '18px', padding: '16px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--spark),var(--vio))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '11px', flexShrink: 0 }}>
                  YO
                </div>
                {postMode === 'poll' ? (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--amber)', letterSpacing: '0.1em', marginBottom: '6px' }}>POLL QUESTION</div>
                    <input
                      value={composeText}
                      onChange={(e) => setComposeText(e.target.value)}
                      type="text"
                      placeholder="Ask your campus a question..."
                      style={{
                        width: '100%',
                        background: 'var(--s2)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        color: 'var(--t1)',
                        fontFamily: 'var(--f2)',
                        fontSize: '13px',
                        padding: '11px 14px',
                        outline: 'none',
                      }}
                    />
                  </div>
                ) : (
                  <textarea
                    value={composeText}
                    onChange={(e) => setComposeText(e.target.value)}
                    rows={2}
                    placeholder={
                      postMode === 'confess'
                        ? 'Drop an anonymous or named confession...'
                        : "What's happening on campus? Rant, share, confess..."
                    }
                    style={{
                      flex: 1,
                      resize: 'none',
                      background: 'var(--s2)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      color: 'var(--t1)',
                      fontFamily: 'var(--f2)',
                      fontSize: '13px',
                      lineHeight: 1.65,
                      padding: '11px 14px',
                      outline: 'none',
                    }}
                  />
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['POST', 'CONFESS', 'POLL', 'PHOTO'].map((label, index) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        if (label === 'POST') setPostMode('post');
                        if (label === 'CONFESS') setPostMode('confess');
                        if (label === 'POLL') setPostMode('poll');
                        if (label === 'PHOTO') setPostMode('photo');
                      }}
                      style={{
                        background:
                          (label === 'POST' && postMode === 'post') ||
                          (label === 'CONFESS' && postMode === 'confess') ||
                          (label === 'POLL' && postMode === 'poll') ||
                          (label === 'PHOTO' && postMode === 'photo')
                            ? 'var(--spd)'
                            : 'var(--s2)',
                        border:
                          (label === 'POST' && postMode === 'post') ||
                          (label === 'CONFESS' && postMode === 'confess') ||
                          (label === 'POLL' && postMode === 'poll') ||
                          (label === 'PHOTO' && postMode === 'photo')
                            ? '1px solid rgba(224,48,192,0.25)'
                            : '1px solid var(--border)',
                        color:
                          (label === 'POST' && postMode === 'post') ||
                          (label === 'CONFESS' && postMode === 'confess') ||
                          (label === 'POLL' && postMode === 'poll') ||
                          (label === 'PHOTO' && postMode === 'photo')
                            ? 'var(--spark)'
                            : 'var(--t3)',
                        fontFamily: 'var(--f3)',
                        fontSize: '8px',
                        padding: '5px 11px',
                        borderRadius: '100px',
                        cursor: 'pointer',
                        letterSpacing: '0.07em',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleComposerSubmit}
                  disabled={
                    submitting ||
                    (postMode === 'poll' && (
                      !composeText.trim() || pollOptions.map((option) => option.trim()).filter(Boolean).length < 2
                    ))
                  }
                  style={{
                    background: submitting ? 'var(--t3)' : 'var(--spark)',
                    color: '#fff',
                    fontFamily: 'var(--f1)',
                    fontWeight: 700,
                    fontSize: '12px',
                    padding: '8px 20px',
                    borderRadius: '100px',
                    border: 'none',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Submitting...' : postMode === 'poll' ? 'Create Poll' : postMode === 'confess' ? 'Open Confession' : 'Post'}
                </button>
              </div>

              {postMode === 'poll' && (
                <div style={{ marginTop: '12px', padding: '12px 14px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                  <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--amber)', letterSpacing: '0.1em', marginBottom: '6px' }}>POLL QUESTION</div>
                  <input
                    value={composeText}
                    onChange={(e) => setComposeText(e.target.value)}
                    type="text"
                    placeholder="Ask your campus a question..."
                    style={{
                      width: '100%',
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      color: 'var(--t1)',
                      fontFamily: 'var(--f2)',
                      fontSize: '12px',
                      padding: '8px 12px',
                      outline: 'none',
                      marginBottom: '10px',
                    }}
                  />
                  <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--amber)', letterSpacing: '0.1em', marginBottom: '8px' }}>POLL OPTIONS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {pollOptions.map((option, index) => (
                      <div key={index} style={{ display: 'flex', gap: '8px' }}>
                        <input
                          value={option}
                          onChange={(e) => updatePollOption(index, e.target.value)}
                          type="text"
                          placeholder={`Option ${String.fromCharCode(65 + index)}...`}
                          style={{
                            flex: 1,
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            color: 'var(--t1)',
                            fontFamily: 'var(--f2)',
                            fontSize: '12px',
                            padding: '8px 12px',
                            outline: 'none',
                          }}
                        />
                        {pollOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removePollOption(index)}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border)',
                              color: 'var(--t3)',
                              borderRadius: '10px',
                              width: '34px',
                              cursor: 'pointer',
                            }}
                            title="Remove option"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addPollOption}
                    style={{
                      marginTop: '8px',
                      background: 'transparent',
                      border: '1px dashed var(--border)',
                      color: 'var(--t3)',
                      fontFamily: 'var(--f3)',
                      fontSize: '8px',
                      padding: '5px 12px',
                      borderRadius: '100px',
                      cursor: 'pointer',
                      letterSpacing: '0.06em',
                    }}
                  >
                    + ADD OPTION
                  </button>
                </div>
              )}
            </div>

            {(activeTab === 'Confessions' || activeTab === 'All') && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                  <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--spark)', letterSpacing: '0.16em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '13px', height: '1px', background: 'var(--spark)' }} />
                    Confession wall
                  </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" onClick={() => refreshConfessions()} style={{ background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--t2)', fontFamily: 'var(--f3)', fontSize: '9px', padding: '6px 14px', borderRadius: '100px', cursor: 'pointer', letterSpacing: '0.07em' }}>
                        🔄 REFRESH
                      </button>
                      <button type="button" onClick={() => setConfessModal(true)} style={{ background: 'var(--vid)', border: '1px solid rgba(139,92,246,0.25)', color: 'var(--vio)', fontFamily: 'var(--f3)', fontSize: '9px', padding: '6px 14px', borderRadius: '100px', cursor: 'pointer', letterSpacing: '0.07em' }}>
                        + CONFESS
                      </button>
                    </div>
                </div>

                {loadingContent ? (
                  <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'var(--f2)', color: 'var(--t2)' }}>Loading confessions...</div>
                ) : confessions.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'var(--f2)', color: 'var(--t2)' }}>No confessions yet. Be the first to share!</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                    {confessions.map((confession) => (
                      <div key={confession._id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: getTagColor(confession.tags?.[0] || '#CrushAlert') }} />
                        <div style={{ padding: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>
                              {confession.isAnonymous ? '🕵️' : '😎'}
                            </div>
                            <div>
                              <div style={{ fontFamily: 'var(--f1)', fontWeight: 600, fontSize: '11px', color: confession.isAnonymous ? 'var(--t2)' : 'var(--t1)' }}>
                                {confession.isAnonymous ? 'Anonymous' : 'You'}
                              </div>
                              <div style={{ fontFamily: 'var(--f3)', fontSize: '7px', color: 'var(--t3)' }}>
                                {new Date(confession.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                          <p style={{ fontFamily: 'var(--f2)', fontSize: '12px', fontWeight: 300, color: 'var(--t1)', lineHeight: 1.7, marginBottom: '10px' }}>
                            {confession.text.substring(0, 120)}{confession.text.length > 120 ? '...' : ''}
                          </p>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                            {confession.tags?.slice(0, 2).map((tag) => (
                              <span key={tag} className="pill" style={{ fontSize: '7px', padding: '2px 7px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--t2)' }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--t3)', fontFamily: 'var(--f3)' }}>
                            <span>❤️ {confession.reactionCount}</span>
                            <span>💬 {confession.commentsCount}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8, padding: '0 14px 14px' }}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {['❤️', '😂', '🔥', '😮', '😢', '👏'].map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => toggleConfessionReaction(confession._id, emoji)}
                                  style={{
                                    background: 'transparent',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: 'var(--t1)',
                                    padding: '5px 9px',
                                    borderRadius: 999,
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    lineHeight: 1,
                                  }}
                                  title={`React ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                const id = confession._id;
                                setCommentsOpen((p) => ({ ...(p || {}), [id]: !(p || {})[id] }));
                                if (!commentsById[confession._id]) await loadComments(confession._id);
                              }}
                              style={{
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: 'var(--t2)',
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 16,
                                flexShrink: 0,
                              }}
                              title="Comments"
                            >
                              💬
                            </button>
                          </div>

                          {confession.reactions && Object.keys(confession.reactions).length > 0 && (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '0 14px 12px' }}>
                              {Object.entries(confession.reactions)
                                .filter(([, count]) => Number(count) > 0)
                                .slice(0, 6)
                                .map(([emoji, count]) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => toggleConfessionReaction(confession._id, emoji)}
                                    style={{
                                      background: 'rgba(255,255,255,0.06)',
                                      border: '1px solid rgba(255,255,255,0.12)',
                                      color: 'var(--t1)',
                                      fontFamily: 'var(--f3)',
                                      fontSize: 11,
                                      padding: '4px 9px',
                                      borderRadius: 999,
                                      cursor: 'pointer',
                                    }}
                                    title={`React ${emoji}`}
                                  >
                                    {emoji} {count}
                                  </button>
                                ))}
                            </div>
                          )}

                          {commentsOpen[confession._id] && (
                            <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {(commentsById[confession._id] || []).length === 0 ? (
                                <div style={{ fontFamily: 'var(--f3)', fontSize: 12, color: 'var(--t2)' }}>No comments yet.</div>
                              ) : (
                                (commentsById[confession._id] || []).map((cm: any) => (
                                  <div key={cm._id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                                    <div>
                                      <div style={{ fontFamily: 'var(--f3)', fontSize: 11, color: 'var(--t1)', fontWeight: 600 }}>{cm.author === getAuthTokens().userId ? 'You' : cm.author}</div>
                                      <div style={{ fontFamily: 'var(--f2)', fontSize: 13, color: 'var(--t2)' }}>{cm.text}</div>
                                    </div>
                                    <div>
                                      {cm.author === getAuthTokens().userId && (
                                        <button onClick={() => removeComment(cm._id, confession._id)} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', cursor: 'pointer' }}>Delete</button>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}

                              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                                <input value={newCommentText[confession._id] || ''} onChange={(e) => setNewCommentText((p) => ({ ...(p || {}), [confession._id]: e.target.value }))} className="inp" placeholder="Write a comment..." />
                                <button onClick={() => addComment(confession._id)} style={{ background: 'var(--spark)', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}>Reply</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {(activeTab === 'Polls' || activeTab === 'All') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {loadingContent ? (
                  <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'var(--f2)', color: 'var(--t2)' }}>Loading polls...</div>
                ) : polls.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'var(--f2)', color: 'var(--t2)' }}>No polls yet.</div>
                ) : (
                  polls.map((poll) => (
                    <div key={poll._id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '18px', padding: '16px' }}>
                      <div style={{ fontFamily: 'var(--f1)', fontWeight: 600, fontSize: '13px', color: 'var(--t1)', marginBottom: '12px' }}>
                        {poll.question}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {poll.options.map((option, index) => {
                          const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
                          const percentage = totalVotes === 0 ? 0 : Math.round((option.votes / totalVotes) * 100);
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => voteOnPoll(poll._id, index)}
                              style={{
                                width: '100%',
                                background: `linear-gradient(90deg, rgba(224,48,192,0.2) 0%, rgba(224,48,192,0.2) ${percentage}%, var(--s2) ${percentage}%, var(--s2) 100%)`,
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '12px 14px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontFamily: 'var(--f2)',
                                fontSize: '13px',
                                color: 'var(--t1)',
                                transition: 'all .15s',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{option.text}</span>
                                <span style={{ fontFamily: 'var(--f3)', fontSize: '10px', color: 'var(--t2)' }}>{percentage}%</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: '10px', fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)' }}>
                        {poll.voters?.length || 0} votes
                      </div>
                      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => loadPollResults(poll._id)}
                          disabled={loadingPollResultsId === poll._id}
                          style={{
                            background: 'var(--s2)',
                            border: '1px solid var(--border)',
                            color: 'var(--t2)',
                            fontFamily: 'var(--f3)',
                            fontSize: '8px',
                            padding: '5px 10px',
                            borderRadius: '100px',
                            cursor: loadingPollResultsId === poll._id ? 'not-allowed' : 'pointer',
                            opacity: loadingPollResultsId === poll._id ? 0.7 : 1,
                            letterSpacing: '0.06em',
                          }}
                        >
                          {loadingPollResultsId === poll._id ? 'LOADING...' : 'VIEW RESULTS'}
                        </button>
                      </div>
                      {pollResultsById[poll._id] && (
                        <div style={{ marginTop: '10px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px' }}>
                          <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)', marginBottom: '8px', letterSpacing: '0.06em' }}>
                            TOTAL VOTES: {pollResultsById[poll._id].totalVotes}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {pollResultsById[poll._id].results.map((result, index) => (
                              <div key={`${result.option}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontFamily: 'var(--f2)', fontSize: '11px', color: 'var(--t2)' }}>
                                <span>{result.option}</span>
                                <span>{result.votes} ({result.percentage}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'sticky', top: '72px' }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '18px', padding: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--spark)', letterSpacing: '0.12em' }}>Pulse live</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--green)' }} />
                  <span style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--green)' }}>LIVE</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px', marginBottom: '12px' }}>
                <div style={{ background: 'var(--s2)', borderRadius: '9px', padding: '9px', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: '18px', color: 'var(--spark)' }}>
                    {confessions.length + polls.length}
                  </div>
                  <div style={{ fontFamily: 'var(--f3)', fontSize: '7px', color: 'var(--t3)' }}>POSTS</div>
                </div>
                <div style={{ background: 'var(--s2)', borderRadius: '9px', padding: '9px', textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: '18px', color: 'var(--vio)' }}>
                    {trending.length}
                  </div>
                  <div style={{ fontFamily: 'var(--f3)', fontSize: '7px', color: 'var(--t3)' }}>TRENDING</div>
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '18px', padding: '15px' }}>
              <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--spark)', letterSpacing: '0.12em', marginBottom: '11px' }}>Trending on campus</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {trending.length === 0 ? (
                  <div style={{ fontFamily: 'var(--f2)', fontSize: '11px', color: 'var(--t3)' }}>Loading trending tags...</div>
                ) : (
                  trending.map((item) => (
                    <div key={item.tag} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 10px', cursor: 'pointer', transition: 'all .15s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <div>
                          <div style={{ fontFamily: 'var(--f1)', fontWeight: 600, fontSize: '12px', color: 'var(--t1)' }}>{item.tag}</div>
                          <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)' }}>{item.count}</div>
                        </div>
                        <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--green)' }}>{item.delta}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.12),rgba(224,48,192,0.08))', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '16px', padding: '14px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(139,92,246,0.3),transparent)' }} />
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🕵️</div>
              <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '13px', color: 'var(--t1)', marginBottom: '4px' }}>Got something to confess?</div>
              <p style={{ fontFamily: 'var(--f2)', fontSize: '11px', fontWeight: 300, color: 'var(--t2)', lineHeight: 1.65, marginBottom: '10px' }}>Anonymous. Moderated. Safe. Your campus is already talking — you might as well join in.</p>
              <button type="button" onClick={() => setConfessModal(true)} style={{ width: '100%', background: 'var(--vio)', color: '#fff', fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '12px', padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>
                Confess anonymously →
              </button>
            </div>
          </div>
        </div>
      </div>

      {confessModal ? (
        <>
          <div onClick={() => setConfessModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(7,7,15,0.88)', zIndex: 200 }} />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'var(--card2)',
              border: '1px solid rgba(139,92,246,0.25)',
              borderRadius: '22px',
              padding: '24px',
              maxWidth: '480px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              zIndex: 201,
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,var(--vio),var(--spark))' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: '18px', color: 'var(--t1)' }}>Drop a confession</div>
                <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)', letterSpacing: '0.07em', marginTop: '2px' }}>ANONYMOUS · CAMPUS PULSE</div>
              </div>
              <button type="button" onClick={() => setConfessModal(false)} style={{ background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--t2)', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontSize: '14px' }}>
                ✕
              </button>
            </div>

            <textarea
              value={confessText}
              onChange={(e) => setConfessText(e.target.value)}
              rows={5}
              placeholder="Be honest. No one will know it was you (unless you want them to)..."
              style={{
                width: '100%',
                background: 'var(--s2)',
                border: '1px solid var(--border)',
                color: 'var(--t1)',
                fontFamily: 'var(--f2)',
                fontSize: '13px',
                padding: '11px 14px',
                borderRadius: '10px',
                outline: 'none',
                resize: 'none',
                lineHeight: 1.7,
                marginBottom: '12px',
              }}
            />

            <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)', letterSpacing: '0.08em', marginBottom: '8px' }}>WHO'S CONFESSING?</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {[
                { id: true, icon: '🕵️', label: 'Anonymous', desc: "No one sees your name" },
                { id: false, icon: '😎', label: 'Named', desc: 'Own your truth' },
              ].map((option) => (
                <button
                  key={String(option.id)}
                  type="button"
                  onClick={() => setConfessAnon(option.id)}
                  style={{
                    flex: 1,
                    background: confessAnon === option.id ? 'rgba(139,92,246,0.12)' : 'var(--s2)',
                    border: confessAnon === option.id ? '1.5px solid rgba(139,92,246,0.4)' : '1.5px solid var(--border)',
                    borderRadius: '12px',
                    padding: '12px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all .15s',
                  }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{option.icon}</div>
                  <div style={{ fontFamily: 'var(--f1)', fontWeight: 600, fontSize: '12px', color: confessAnon === option.id ? 'var(--vio)' : 'var(--t1)' }}>
                    {option.label}
                  </div>
                  <div style={{ fontFamily: 'var(--f2)', fontSize: '10px', fontWeight: 300, color: 'var(--t3)', marginTop: '2px' }}>
                    {option.desc}
                  </div>
                </button>
              ))}
            </div>

            <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)', letterSpacing: '0.08em', marginBottom: '8px' }}>ADD TAGS (OPTIONAL)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
              {getRemainingTags().map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setConfessTags([...confessTags, tag])}
                  style={{
                    background: 'var(--s2)',
                    border: '1px solid var(--border)',
                    color: 'var(--t2)',
                    fontFamily: 'var(--f3)',
                    fontSize: '8px',
                    padding: '5px 10px',
                    borderRadius: '100px',
                    cursor: 'pointer',
                    letterSpacing: '0.06em',
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>

            {confessTags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                {confessTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setConfessTags(confessTags.filter((t) => t !== tag))}
                    style={{
                      background: 'var(--spd)',
                      border: '1px solid rgba(224,48,192,0.3)',
                      color: 'var(--spark)',
                      fontFamily: 'var(--f3)',
                      fontSize: '8px',
                      padding: '5px 10px',
                      borderRadius: '100px',
                      cursor: 'pointer',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {tag} ✕
                  </button>
                ))}
              </div>
            )}

            <div style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '10px', padding: '10px', marginBottom: '14px' }}>
              <div style={{ fontFamily: 'var(--f2)', fontSize: '11px', fontWeight: 300, color: 'var(--t3)', lineHeight: 1.6 }}>
                Confessions are reviewed within 15 minutes. Posts targeting specific people, hate speech, or personal info will be rejected. Everything else — go off.
              </div>
            </div>

            <button
              type="button"
              onClick={submitConfession}
              disabled={submitting || !confessText.trim()}
              style={{
                width: '100%',
                background: submitting ? 'var(--t3)' : 'var(--vio)',
                color: '#fff',
                fontFamily: 'var(--f1)',
                fontWeight: 700,
                fontSize: '14px',
                padding: '13px',
                borderRadius: '100px',
                border: 'none',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'Submitting...' : 'Submit confession →'}
            </button>
          </div>
        </>
      ) : null}

      {drawerOpen ? (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(7,7,15,0.78)', zIndex: 80 }} />
          <aside
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              height: '100vh',
              width: 'min(420px, 100vw)',
              background: 'var(--card2)',
              borderLeft: '1px solid var(--border)',
              zIndex: 90,
              padding: '20px',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: '18px', color: 'var(--t1)' }}>Incoming swipes</div>
                <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)', letterSpacing: '0.07em', marginTop: '3px' }}>Review likes and accept or reject them</div>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} style={{ background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--t2)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            {loadingSwipes ? (
              <div style={{ padding: '16px', fontFamily: 'var(--f2)', color: 'var(--t2)' }}>Loading incoming swipes...</div>
            ) : incomingSwipes.length === 0 ? (
              <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', fontFamily: 'var(--f2)', color: 'var(--t2)', lineHeight: 1.7 }}>
                No incoming swipes right now. When someone likes you, their profile will appear here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {incomingSwipes.map((swipe) => {
                  const profile = swipe.fromUserProfile;
                  return (
                    <div key={swipe.swipeId} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '18px', padding: '14px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--spark),var(--vio))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--f1)', fontWeight: 700 }}>
                          {profile?.name?.slice(0, 2).toUpperCase() || '??'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'start' }}>
                            <div>
                              <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '14px', color: 'var(--t1)' }}>{profile?.name || 'Unknown'}</div>
                              <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)', letterSpacing: '0.06em' }}>
                                {profile?.depart || 'Unknown dept'} · {profile?.year || 'Unknown year'}
                              </div>
                            </div>
                            <span className="pill pill-spark">NEW</span>
                          </div>
                          <p style={{ fontFamily: 'var(--f2)', fontSize: '12px', color: 'var(--t2)', lineHeight: 1.65, margin: '8px 0 10px' }}>
                            {profile?.bio || 'This person liked your profile. Open the match flow to see the conversation path.'}
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                            {(profile?.vibewords || []).slice(0, 3).map((word) => (
                              <span key={word} className="pill pill-vio">
                                {word}
                              </span>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" onClick={() => rejectSwipe(swipe.swipeId)} style={{ flex: 1, background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--t2)', fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '12px', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}>
                              Reject
                            </button>
                            <button type="button" onClick={() => acceptSwipe(swipe.swipeId)} style={{ flex: 1, background: 'var(--spark)', border: 'none', color: '#fff', fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '12px', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}>
                              Accept
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>
        </>
      ) : null}

      {toast ? (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: '22px',
            transform: 'translateX(-50%)',
            background: 'rgba(19,18,38,0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--bmd)',
            borderRadius: '100px',
            padding: '10px 20px',
            fontFamily: 'var(--f3)',
            fontSize: '10px',
            color: 'var(--t1)',
            letterSpacing: '0.07em',
            zIndex: 120,
            animation: 'toastIn 0.3s ease',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}

export default CampusPulse;
