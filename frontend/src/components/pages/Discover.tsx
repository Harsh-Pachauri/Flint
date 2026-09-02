import React, { useEffect, useRef, useState } from 'react';
import { getJSON, postJSON } from '../../utils/api';

type FeedProfile = {
  _id: string;
  name: string;
  age: number;
  gender: string;
  bio?: string;
  photos?: any[];
  aiAssessmentScore?: number;
  college?: { _id: string; name: string; city: string };
  year?: string;
  depart?: string;
  vibewords?: string[];
};

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

function Discover() {
  const [profiles, setProfiles] = useState<FeedProfile[]>([]);
  const [recommendations, setRecommendations] = useState<Array<{ profile: FeedProfile; score: number }>>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [incomingSwipes, setIncomingSwipes] = useState<SwipeItem[]>([]);
  const [loadingSwipes, setLoadingSwipes] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

function getProfileUserId(profile: FeedProfile | undefined) {
  if (!profile) return '';
  const rawUserId = (profile as any).userId;
  if (typeof rawUserId === 'string') return rawUserId;
  if (rawUserId && typeof rawUserId === 'object' && typeof rawUserId._id === 'string') return rawUserId._id;
  return profile._id;
}

function getPhotoUrl(photo: any) {
  if (!photo) return '';
  if (typeof photo === 'string') return photo;
  return photo.url || photo.secureUrl || '';
}

  useEffect(() => {
    let alive = true;
    async function loadFeed() {
      setLoading(true);
      setError('');
      try {
        const data = await getJSON('/api/feed?distance=50&page=1&limit=20');
        if (!alive) return;
        setProfiles(data.profiles || []);
        setCurrentIndex(0);

        const currentUserId = localStorage.getItem('userId');
        if (currentUserId) {
          setLoadingRecommendations(true);
          try {
            const recData = await getJSON(`/api/recommendations/${currentUserId}?page=1&limit=6`);
            if (!alive) return;

            const recProfiles = (recData?.recommendedProfiles || [])
              .map((item: any) => {
                const profile = item?.profile || {};
                const normalized: FeedProfile = {
                  ...profile,
                  _id:
                    profile?._id ||
                    (typeof profile?.userId === 'string'
                      ? profile.userId
                      : profile?.userId?._id || ''),
                  vibewords:
                    Array.isArray(profile?.personality?.traits)
                      ? profile.personality.traits
                      : Array.isArray(profile?.interests)
                        ? profile.interests
                        : [],
                };

                return {
                  profile: normalized,
                  score: Number(item?.score) || 0,
                };
              })
              .filter((item: any) => !!item?.profile?._id);

            setRecommendations(recProfiles);
          } catch (recErr) {
            if (alive) {
              setRecommendations([]);
            }
          } finally {
            if (alive) {
              setLoadingRecommendations(false);
            }
          }
        } else {
          setRecommendations([]);
        }
      } catch (err: any) {
        if (alive) {
          setError(err?.error || err?.message || 'Failed to load discovery feed');
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    loadFeed();
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
    if (!drawerOpen) return;
    let alive = true;
    async function loadIncoming() {
      setLoadingSwipes(true);
      try {
        const data = await getJSON('/api/swipes/incoming');
        if (alive) {
          setIncomingSwipes(data.swipes || []);
        }
      } catch (err: any) {
        if (alive) {
          setToast(err?.error || err?.message || 'Could not load incoming swipes');
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

  useEffect(() => {
    const profile = profiles[currentIndex];
    const canvas = canvasRef.current;
    if (!canvas || !profile) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth || 360;
    const height = 420;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const initials = (profile.name || '')
      .split(' ')
      .map((word) => word[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(224,48,192,0.55)');
    gradient.addColorStop(0.5, 'rgba(139,92,246,0.42)');
    gradient.addColorStop(1, 'rgba(56,189,248,0.32)');

    ctx.fillStyle = '#0f0e22';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < width; i += 5) {
      const barHeight = Math.random() * height * 0.7 + height * 0.1;
      const barTop = (height - barHeight) / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(i, barTop, 3, barHeight);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.arc(width * 0.3, height * 0.35, width * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.arc(width * 0.75, height * 0.25, width * 0.18, 0, Math.PI * 2);
    ctx.fill();

    const badgeSize = 70;
    const badgeX = (width - badgeSize) / 2;
    const badgeY = height / 2 - badgeSize / 2 - 20;
    const badgeGradient = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeSize, badgeY + badgeSize);
    badgeGradient.addColorStop(0, 'rgba(255,255,255,0.2)');
    badgeGradient.addColorStop(1, 'rgba(255,255,255,0.05)');
    ctx.fillStyle = badgeGradient;
    ctx.beginPath();
    ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 22px Plus Jakarta Sans';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, badgeX + badgeSize / 2, badgeY + badgeSize / 2);
  }, [profiles, currentIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
        setProfileModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function reloadFeed() {
    try {
      const data = await getJSON('/api/feed?distance=50&page=1&limit=20');
      setProfiles(data.profiles || []);
      setCurrentIndex(0);
    } catch (err: any) {
      setToast(err?.error || err?.message || 'Could not refresh feed');
    }
  }

  async function swipe(direction: 'like' | 'pass') {
    const profile = profiles[currentIndex];
    if (!profile) return;

    try {
      const toUserId = getProfileUserId(profile);
      const result = await postJSON('/api/swipe', {
        toUserId,
        direction,
      });

      setToast(direction === 'like' ? 'Liked.' : 'Passed.');
      if (result?.match?.matchId) {
        setToast('It is a match. Opening chat...');
        window.setTimeout(() => {
          window.location.hash = `#/matches/${result.match.matchId}`;
        }, 450);
      } else {
        setCurrentIndex((value) => value + 1);
      }
    } catch (err: any) {
      setToast(err?.error || err?.message || 'Could not swipe');
    }
  }

  async function acceptSwipe(swipeId: string) {
    try {
      const result = await postJSON(`/api/swipes/${swipeId}/accept`, {});
      setIncomingSwipes((prev) => prev.filter((item) => item.swipeId !== swipeId));
      setToast(result?.match?.message || 'Swipe accepted');
      if (result?.match?.matchId) {
        window.location.hash = `#/matches/${result.match.matchId}`;
      }
    } catch (err: any) {
      setToast(err?.error || err?.message || 'Could not accept swipe');
    }
  }

  async function rejectSwipe(swipeId: string) {
    try {
      await postJSON(`/api/swipes/${swipeId}/reject`, {});
      setIncomingSwipes((prev) => prev.filter((item) => item.swipeId !== swipeId));
      setToast('Swipe rejected');
    } catch (err: any) {
      setToast(err?.error || err?.message || 'Could not reject swipe');
    }
  }

  async function likeRecommendedProfile(targetProfile: FeedProfile) {
    try {
      const toUserId = getProfileUserId(targetProfile);
      if (!toUserId) return;

      const result = await postJSON('/api/swipe', {
        toUserId,
        direction: 'like',
      });

      if (result?.match?.matchId) {
        setToast('It is a match. Opening chat...');
        window.setTimeout(() => {
          window.location.hash = `#/matches/${result.match.matchId}`;
        }, 450);
      } else {
        setToast(`Liked ${targetProfile.name}.`);
      }
    } catch (err: any) {
      setToast(err?.error || err?.message || 'Could not swipe');
    }
  }

  const profile = profiles[currentIndex];
  const nextProfile = profiles[currentIndex + 1];
  const profilePhotoUrl = profile?.photos?.length ? getPhotoUrl(profile.photos[0]) : '';
  const primaryCardHeight = 'clamp(420px, 68vh, 560px)';

  return (
    <div style={{ background: 'var(--void)', minHeight: '100vh', color: 'var(--t1)' }}>
      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '20px 20px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px', overflowX: 'auto', paddingBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '100px', padding: '7px 14px', flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--spark)', letterSpacing: '0.07em' }}>DISCOVER</span>
          </div>
          <div style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" onClick={() => setDrawerOpen(true)} style={{ position: 'relative', width: '30px', height: '30px', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Incoming swipes">
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                <path d="M10 2a6 6 0 0 0-6 6c0 6-2.5 7.5-2.5 7.5h17S16 14 16 8a6 6 0 0 0-6-6zM8.5 17a1.5 1.5 0 0 0 3 0" stroke="var(--t2)" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <div style={{ position: 'absolute', top: '-1px', right: '-1px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--spark)', border: '1.5px solid var(--void)' }} />
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--s2)', borderTopColor: 'var(--spark)', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ fontFamily: 'var(--f2)', color: 'var(--t2)', fontSize: 14 }}>Finding people on your campus...</div>
          </div>
        ) : error ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '18px', padding: '32px', fontFamily: 'var(--f2)', color: 'var(--t2)', textAlign: 'center' }}>{error}</div>
        ) : !profile ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '22px', padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🌙</div>
            <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: 18, color: 'var(--t1)', marginBottom: 8 }}>All caught up</div>
            <div style={{ fontFamily: 'var(--f2)', color: 'var(--t2)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>No more profiles left in your feed right now. Come back later for new faces.</div>
            <button type="button" onClick={reloadFeed} className="btn-grad" style={{ padding: '12px 28px' }}>
              Refresh feed
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>
            <div style={{ maxWidth: '560px', width: '100%', margin: '0 auto' }}>
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%) rotate(3deg)', width: 'calc(100% - 40px)', height: '100%', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: '24px', zIndex: 1 }} />
                <div style={{ position: 'absolute', top: '5px', left: '50%', transform: 'translateX(-50%) rotate(-1.5deg)', width: 'calc(100% - 20px)', height: '100%', background: 'var(--card3)', border: '1px solid var(--border)', borderRadius: '24px', zIndex: 2 }} />
                <div style={{ position: 'relative', zIndex: 3, background: 'var(--card)', border: '1px solid var(--bmd)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.4), 0 0 30px rgba(224,48,192,0.06)', transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                  <div style={{ position: 'relative', height: primaryCardHeight }}>
                    {profilePhotoUrl ? (
                      <img src={profilePhotoUrl} alt={profile.name} style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain', background: '#0f0e22' }} />
                    ) : (
                      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
                    )}

                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, pointerEvents: 'none', borderRadius: '24px 24px 0 0' }} id="likeOverlay">
                      <div style={{ background: 'rgba(34,197,94,0.9)', color: '#fff', fontFamily: 'var(--f1)', fontWeight: 800, fontSize: '28px', padding: '10px 28px', borderRadius: '12px', transform: 'rotate(-8deg)', letterSpacing: '0.06em' }}>LIKE</div>
                    </div>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(224,48,192,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, pointerEvents: 'none', borderRadius: '24px 24px 0 0' }} id="passOverlay">
                      <div style={{ background: 'rgba(200,40,100,0.9)', color: '#fff', fontFamily: 'var(--f1)', fontWeight: 800, fontSize: '28px', padding: '10px 28px', borderRadius: '12px', transform: 'rotate(8deg)', letterSpacing: '0.06em' }}>PASS</div>
                    </div>

                    <div style={{ position: 'absolute', top: '14px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '5px' }}>
                      <div style={{ width: '30px', height: '3px', borderRadius: '100px', background: 'rgba(255,255,255,0.9)' }} />
                      <div style={{ width: '20px', height: '3px', borderRadius: '100px', background: 'rgba(255,255,255,0.35)' }} />
                      <div style={{ width: '20px', height: '3px', borderRadius: '100px', background: 'rgba(255,255,255,0.35)' }} />
                      <div style={{ width: '20px', height: '3px', borderRadius: '100px', background: 'rgba(255,255,255,0.35)' }} />
                    </div>

                    <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(7,7,15,0.75)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '100px', padding: '5px 11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                        <path d="M8 14s-6-4-6-8a4 4 0 0 1 8 0 4 4 0 0 1 4 4" stroke="var(--spark)" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0" fill="var(--spark)" />
                      </svg>
                      <span style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: '13px', background: 'linear-gradient(135deg,var(--spark),var(--vio))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{profile.aiAssessmentScore || 94}%</span>
                    </div>

                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 20px 16px', background: 'linear-gradient(to top, rgba(7,7,15,1) 0%, rgba(7,7,15,0.7) 60%, transparent 100%)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: '24px', color: '#fff', letterSpacing: '-0.02em' }}>
                            {profile.name}, {profile.age}
                          </div>
                          <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'rgba(255,255,255,0.55)', marginTop: '2px', letterSpacing: '0.06em' }}>
                            {profile.depart || 'Unknown'} · {profile.year || 'Unknown'}
                          </div>
                        </div>
                        <button type="button" onClick={() => {
                          const targetId = getProfileUserId(profile);
                          window.location.hash = `#/profile/${targetId}`;
                        }} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontFamily: 'var(--f2)', fontSize: '11px', padding: '7px 13px', borderRadius: '100px', cursor: 'pointer' }}>
                          View profile
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {(profile.vibewords || []).slice(0, 4).map((word, index) => (
                          <span key={`${word}-${index}`} className={`pill ${['pill-spark', 'pill-vio', 'pill-rose', 'pill-sky'][index % 4]}`}>
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '14px 18px', background: 'var(--s2)', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--spark)', letterSpacing: '0.1em', marginBottom: '6px' }}>WHY FLINT MATCHED YOU</div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--spark)', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--f2)', fontSize: '11px', fontWeight: 300, color: 'var(--t2)' }}>Shared events overlap</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--vio)', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--f2)', fontSize: '11px', fontWeight: 300, color: 'var(--t2)' }}>Similar vibe words</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--rose)', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--f2)', fontSize: '11px', fontWeight: 300, color: 'var(--t2)' }}>Mutual friend overlap</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
                <button type="button" onClick={() => swipe('pass')} style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--t2)', fontSize: '20px', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.borderColor = 'var(--rose)'; e.currentTarget.style.color = 'var(--rose)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--t2)'; }}
                  title="Pass">
                  ✕
                </button>
                <button type="button" onClick={() => swipe('like')} style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--spark), var(--vio))', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 4px 20px rgba(224,48,192,0.3)' }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(224,48,192,0.45)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(224,48,192,0.3)'; }}
                  title="Like">
                  ♥
                </button>
                {/* Other optional engagement/game-adjacent controls disabled for now.
                <button type="button" onClick={() => setToast('Super like is available from the profile match flow.')} style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--skd)', border: '1px solid rgba(56,189,248,0.25)', color: 'var(--sky)', cursor: 'pointer' }} title="Super like">
                  ★
                </button>
                <button type="button" onClick={() => setToast('Boost is a profile-level feature, not required for this flow.')} style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'var(--s2)', border: '1px solid var(--border)', cursor: 'pointer' }} title="Boost">
                  ⚡
                </button>
                */}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px' }}>
                <span style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--t3)', letterSpacing: '0.06em' }}>← PASS</span>
                <span style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--t3)', letterSpacing: '0.06em' }}>→ LIKE</span>
              </div>

              {nextProfile ? (
                <div style={{ textAlign: 'center', paddingTop: '12px', fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)', letterSpacing: '0.08em' }}>
                  NEXT UP: {nextProfile.name}
                </div>
              ) : null}

              <div style={{ textAlign: 'center', paddingTop: '14px' }}>
                <button type="button" onClick={() => (window.location.hash = '#/matches')} style={{ background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--t2)', fontFamily: 'var(--f3)', fontSize: '9px', padding: '10px 24px', borderRadius: '100px', cursor: 'pointer', letterSpacing: '0.08em' }}>
                  OPEN MATCHES
                </button>
              </div>

              <div style={{ marginTop: '22px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '18px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--spark)', letterSpacing: '0.12em' }}>
                    PERSONALIZED FOR YOU
                  </div>
                  <span className="pill pill-vio">GET RECOMMENDATIONS</span>
                </div>

                {loadingRecommendations ? (
                  <div style={{ fontFamily: 'var(--f2)', fontSize: '12px', color: 'var(--t2)' }}>Loading recommendations...</div>
                ) : recommendations.length === 0 ? (
                  <div style={{ fontFamily: 'var(--f2)', fontSize: '12px', color: 'var(--t2)' }}>No personalized recommendations yet.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
                    {recommendations.map((item) => {
                      const recProfile = item.profile;
                      const recPhotoUrl = recProfile?.photos?.length ? getPhotoUrl(recProfile.photos[0]) : '';
                      const recTargetId = getProfileUserId(recProfile);

                      return (
                        <div key={`${recProfile._id}-${item.score}`} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                          <div style={{ height: '230px', background: '#0f0e22' }}>
                            {recPhotoUrl ? (
                              <img src={recPhotoUrl} alt={recProfile.name} style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f1)', fontWeight: 700, color: 'var(--t3)' }}>
                                {recProfile.name?.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase() || 'NA'}
                              </div>
                            )}
                          </div>
                          <div style={{ padding: '10px 11px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
                              <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '13px', color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {recProfile.name}, {recProfile.age}
                              </div>
                              <span className="pill pill-spark">{Math.round(item.score)}%</span>
                            </div>
                            <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)', letterSpacing: '0.06em', marginBottom: '8px' }}>
                              {recProfile.depart || 'Unknown'} · {recProfile.year || 'Unknown'}
                            </div>
                            <div style={{ display: 'flex', gap: '7px' }}>
                              <button
                                type="button"
                                onClick={() => (window.location.hash = `#/profile/${recTargetId}`)}
                                style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--t2)', borderRadius: '10px', padding: '7px 8px', cursor: 'pointer', fontFamily: 'var(--f3)', fontSize: '9px' }}
                              >
                                VIEW
                              </button>
                              <button
                                type="button"
                                onClick={() => likeRecommendedProfile(recProfile)}
                                style={{ flex: 1, background: 'var(--spark)', border: 'none', color: '#fff', borderRadius: '10px', padding: '7px 8px', cursor: 'pointer', fontFamily: 'var(--f3)', fontSize: '9px' }}
                              >
                                LIKE
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '18px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--spark)', letterSpacing: '0.12em' }}>TODAY'S QUEUE</div>
                  <span className="pill pill-spark">{profiles.length - currentIndex} LEFT</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {profiles.slice(currentIndex, currentIndex + 4).map((item) => (
                    <div key={item._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setToast(`Previewing ${item.name}`)}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--spark),var(--vio))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '11px', flexShrink: 0 }}>
                        {(item.name || '').split(' ').map((word) => word[0]).filter(Boolean).slice(0, 2).join('')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--f2)', fontSize: '12px', fontWeight: 500, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                        <div style={{ fontFamily: 'var(--f3)', fontSize: '9px', color: 'var(--t3)' }}>{item.depart || 'Unknown department'}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '12px', color: 'var(--t3)' }}>{item.aiAssessmentScore || 0}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Game promotion card is temporarily disabled.
              <div style={{ background: 'linear-gradient(135deg,rgba(224,48,192,0.1),rgba(139,92,246,0.1))', border: '1px solid rgba(224,48,192,0.18)', borderRadius: '18px', padding: '16px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(224,48,192,0.3),transparent)' }} />
                <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '13px', color: 'var(--t1)', marginBottom: '5px' }}>Send a game instead</div>
                <p style={{ fontFamily: 'var(--f2)', fontSize: '11px', fontWeight: 300, color: 'var(--t2)', lineHeight: 1.65, marginBottom: '12px' }}>Skip the awkward first message. Start with playroom games once you match.</p>
                <button type="button" onClick={() => (window.location.hash = '#/matches')} style={{ width: '100%', background: 'var(--spark)', color: '#fff', fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '12px', padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>
                  OPEN MATCHES
                </button>
              </div>
              */}
            </div>
          </div>
        )}
      </div>

      {drawerOpen ? (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(7,7,15,0.78)', zIndex: 80 }} />
          <aside style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: 'min(420px, 100vw)', background: 'var(--card2)', borderLeft: '1px solid var(--border)', zIndex: 90, padding: '20px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: '18px', color: 'var(--t1)' }}>Incoming swipes</div>
                <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)', letterSpacing: '0.07em', marginTop: '3px' }}>Review likes and accept or reject them</div>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} style={{ background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--t2)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
            </div>

            {loadingSwipes ? (
              <div style={{ padding: '16px', fontFamily: 'var(--f2)', color: 'var(--t2)' }}>Loading incoming swipes...</div>
            ) : incomingSwipes.length === 0 ? (
              <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', fontFamily: 'var(--f2)', color: 'var(--t2)', lineHeight: 1.7 }}>No incoming swipes right now.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {incomingSwipes.map((swipe) => {
                  const profileSwipe = swipe.fromUserProfile;
                  return (
                    <div key={swipe.swipeId} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '18px', padding: '14px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--spark),var(--vio))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--f1)', fontWeight: 700 }}>
                          {profileSwipe?.name?.slice(0, 2).toUpperCase() || '??'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'start' }}>
                            <div>
                              <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '14px', color: 'var(--t1)' }}>{profileSwipe?.name || 'Unknown'}</div>
                              <div style={{ fontFamily: 'var(--f3)', fontSize: '8px', color: 'var(--t3)', letterSpacing: '0.06em' }}>{profileSwipe?.depart || 'Unknown dept'}</div>
                            </div>
                            <span className="pill pill-spark">NEW</span>
                          </div>
                          <p style={{ fontFamily: 'var(--f2)', fontSize: '12px', color: 'var(--t2)', lineHeight: 1.65, margin: '8px 0 10px' }}>{profileSwipe?.bio || 'This person liked your profile.'}</p>
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
        <div style={{ position: 'fixed', left: '50%', bottom: '22px', transform: 'translateX(-50%)', background: 'rgba(19,18,38,0.9)', backdropFilter: 'blur(12px)', border: '1px solid var(--bmd)', borderRadius: '100px', padding: '10px 20px', fontFamily: 'var(--f3)', fontSize: '10px', color: 'var(--t1)', letterSpacing: '0.07em', zIndex: 120, animation: 'toastIn 0.3s ease', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>{toast}</div>
      ) : null}

      {profileModalOpen && profile ? (
        <>
          <div onClick={() => setProfileModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(7,7,15,0.76)', zIndex: 140 }} />
          <div style={{ position: 'fixed', inset: 'auto 20px 20px 20px', maxWidth: '560px', margin: '0 auto', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '20px', zIndex: 150, overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: '14px', color: 'var(--t1)' }}>{profile.name}&apos;s full profile</span>
              <button type="button" onClick={() => setProfileModalOpen(false)} style={{ background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--t2)', fontSize: '12px', padding: '5px 12px', borderRadius: '100px', cursor: 'pointer' }}>Close</button>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <p style={{ fontFamily: 'var(--f2)', fontSize: '12px', fontWeight: 300, color: 'var(--t2)', lineHeight: 1.75, marginBottom: '12px' }}>{profile.bio || 'No bio available yet.'}</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {(profile.vibewords || []).slice(0, 6).map((word) => (
                  <span key={word} className="pill pill-spark">{word}</span>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default Discover;
