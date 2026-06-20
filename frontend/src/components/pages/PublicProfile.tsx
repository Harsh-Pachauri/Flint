import React, { useEffect, useRef, useState } from 'react';
import { getJSON } from '../../utils/api';
import '../../styles/profile.css';

type PublicProfileData = {
  _id: string;
  userId?: { _id?: string; email?: string; phone?: string } | string;
  name?: string;
  age?: number;
  gender?: string;
  genderPreference?: string;
  datingType?: string;
  year?: number | string;
  depart?: string;
  vibewords?: string[];
  interests?: string[];
  photos?: Array<string | { url?: string; secureUrl?: string; _id?: string; id?: string; publicId?: string }>; 
  personality?: {
    introvertExtrovert?: number;
    chillIntense?: number;
    homebodyAdventurous?: number;
    traits?: string[];
  };
  college?: { name?: string; city?: string };
  bio?: string;
  aiAssessmentScore?: number;
};

const PublicProfile: React.FC = () => {
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const matchBarRef = useRef<HTMLDivElement>(null);

  const drawCover = (canvasId: string, c1: string, c2: string, c3: string, h: number = 120) => {
    const cv = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = cv.offsetWidth * dpr;
    cv.height = h * dpr;
    cv.style.height = `${h}px`;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const w = cv.offsetWidth;
    const ht = h;
    const gradient = ctx.createLinearGradient(0, 0, w, ht);
    gradient.addColorStop(0, c1);
    gradient.addColorStop(0.5, c2);
    gradient.addColorStop(1, c3);
    ctx.fillStyle = '#0f0e22';
    ctx.fillRect(0, 0, w, ht);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, ht);
    for (let i = 0; i < w; i += 4) {
      const barHeight = Math.random() * ht * 0.7 + ht * 0.1;
      const barTop = (ht - barHeight) / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(i, barTop, 2, barHeight);
    }
  };

  const loadProfile = async () => {
    const hash = window.location.hash || '';
    const parts = hash.split('/');
    const userId = parts.length >= 3 ? parts[2] : null;

    if (!userId) {
      setError('User id not provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getJSON(`/api/profile/${userId}`);
      setProfile(data.profile);
      window.setTimeout(() => {
        if (matchBarRef.current) {
          matchBarRef.current.style.width = '75%';
        }
      }, 200);
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();

    const handleHashChange = () => {
      loadProfile();
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!profile) return;
    drawCover('publicProfileCover', 'rgba(224,48,192,0.5)', 'rgba(139,92,246,0.4)', 'rgba(56,189,248,0.3)', 120);
    const photoColors = [
      ['rgba(224,48,192,0.5)', 'rgba(139,92,246,0.4)', 'rgba(255,107,157,0.3)'],
      ['rgba(139,92,246,0.5)', 'rgba(56,189,248,0.4)', 'rgba(224,48,192,0.3)'],
      ['rgba(255,107,157,0.4)', 'rgba(224,48,192,0.5)', 'rgba(139,92,246,0.35)'],
      ['rgba(56,189,248,0.4)', 'rgba(139,92,246,0.45)', 'rgba(224,48,192,0.3)'],
      ['rgba(245,158,11,0.3)', 'rgba(224,48,192,0.4)', 'rgba(139,92,246,0.3)'],
    ] as const;

    ['pubph1', 'pubph2', 'pubph3', 'pubph4', 'pubph5'].forEach((id, index) => {
      const height = index < 3 ? 140 : 100;
      const [c1, c2, c3] = photoColors[index];
      drawCover(id, c1, c2, c3, height);
    });
  }, [profile]);

  const getInitials = (name?: string) => String(name || '')
    .split(' ')
    .map((word) => word.trim().charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  const getDatingTypeLabel = (type?: string) => {
    const map: Record<string, string> = {
      something_real: 'Something Real',
      see_where_it_goes: 'See Where It Goes',
      campus_friends_first: 'Campus Friends First',
      study_partner: 'Study Partner',
      casual: 'Casual',
      serious: 'Serious',
      either: 'Either',
    };
    return type ? (map[type] || type) : 'Unknown';
  };

  const getGenderPrefLabel = (pref?: string) => {
    const map: Record<string, string> = {
      male: 'Men',
      female: 'Women',
      both: 'Everyone',
    };
    return pref ? (map[pref] || pref) : 'Everyone';
  };

  const getPhotoUrl = (photo: any) => {
    if (!photo) return '';
    if (typeof photo === 'string') return photo;
    return photo.url || photo.secureUrl || '';
  };

  const profilePhotos = profile?.photos || [];
  const visiblePhotos = profilePhotos.slice(0, 3);
  const photoCardWidth = visiblePhotos.length === 1 ? '320px' : visiblePhotos.length === 2 ? '240px' : '200px';

  const openGalleryAt = (index: number) => {
    const selected = getPhotoUrl(profilePhotos[index]);
    setPhotoPreviewUrl(selected || profilePhotos.map((photo) => getPhotoUrl(photo)).find(Boolean) || null);
    setGalleryOpen(true);
  };

  const formatYear = (year?: number | string) => {
    if (year === undefined || year === null || year === '') return 'Unknown';
    return `${year}`;
  };

  const profileId = profile?.userId && typeof profile.userId === 'object' ? profile.userId._id || '' : '';
  const initials = getInitials(profile?.name);
  const photoCount = profile?.photos?.length || 0;
  const traitCount = profile?.personality?.traits?.length || 0;
  const matchScore = profile?.aiAssessmentScore || 75;

  if (loading) return <div style={{ padding: 40 }}>Loading profile…</div>;
  if (error || !profile) return <div style={{ padding: 40 }}>Error: {error || 'Profile not found'}</div>;

  return (
    <div style={{ position: 'relative', background: 'var(--void)', minHeight: '100vh', color: 'var(--t1)' }}>
      <div className="orb" style={{ width: '450px', height: '450px', top: '-50px', right: '-80px', background: 'radial-gradient(circle, rgba(224,48,192,0.065) 0%, transparent 70%)', filter: 'blur(110px)' }} />
      <div className="orb" style={{ width: '350px', height: '350px', top: '600px', left: '-80px', background: 'radial-gradient(circle, rgba(139,92,246,0.055) 0%, transparent 70%)', filter: 'blur(110px)' }} />

      <div style={{ padding: '14px 28px', borderBottom: '1px solid var(--border)', background: 'var(--s1)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.06em', cursor: 'pointer' }} onClick={() => (window.location.hash = '#/discover')}>DISCOVER</span>
        <span style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)' }}>›</span>
        <span style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--spark)', letterSpacing: '0.06em' }}>{String(profile.name || 'PROFILE').toUpperCase()}</span>
      </div>

      <div className="profile-layout" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '22px', maxWidth: '1160px', margin: '28px auto', padding: '0 22px' }}>
        <div className="sticky-left" style={{ position: 'sticky', top: 20, alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="card" style={{ borderRadius: '22px', overflow: 'hidden', padding: 0 }}>
            <canvas id="publicProfileCover" style={{ width: '100%', height: '120px', display: 'block' }} />
            <div style={{ padding: '0 16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '-32px', marginBottom: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '62px', height: '62px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--spark), var(--vio))', border: '3px solid var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 18, color: '#fff', position: 'relative', overflow: 'hidden' }}>
                    {profile.photos && profile.photos.length > 0 && getPhotoUrl(profile.photos[0]) ? (
                      <img src={getPhotoUrl(profile.photos[0])} alt="avatar" style={{ width: '62px', height: '62px', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      initials
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e' }} />
                  <span style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)' }}>VIEWING PROFILE</span>
                </div>
              </div>

              <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 18, color: 'var(--t1)', letterSpacing: '-0.02em' }}>
                {profile.name}, {profile.age}
              </div>
              <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.06em', marginTop: 3 }}>
                {profileId ? `@${String(profileId).slice(-6)}` : `@${String(profile.name || 'profile').toLowerCase()}`} · {profile.gender === 'male' ? 'HE/HIM' : profile.gender === 'female' ? 'SHE/HER' : 'THEY/THEM'}
              </div>

              <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="pill pill-spark">✓ VERIFIED</span>
                <span className="pill pill-vio">{String(profile.depart || 'Unknown')} · {formatYear(profile.year)}</span>
              </div>

              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12 }}>📍</span>
                  <span style={{ fontFamily: 'var(--f2)', fontSize: 12, fontWeight: 300, color: 'var(--t2)' }}>Campus Location</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12 }}>🎓</span>
                  <span style={{ fontFamily: 'var(--f2)', fontSize: 12, fontWeight: 300, color: 'var(--t2)' }}>{profile.depart || 'Unknown'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12 }}>💞</span>
                  <span style={{ fontFamily: 'var(--f2)', fontSize: 12, fontWeight: 300, color: 'var(--t2)' }}>Looking for {getDatingTypeLabel(profile.datingType)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12 }}>👥</span>
                  <span style={{ fontFamily: 'var(--f2)', fontSize: 12, fontWeight: 300, color: 'var(--t2)' }}>Interested in: {getGenderPrefLabel(profile.genderPreference)}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, marginTop: 16, background: 'var(--s2)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ padding: '10px 0', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 16, color: 'var(--spark)' }}>{photoCount}</div>
                  <div style={{ fontFamily: 'var(--f3)', fontSize: 8, color: 'var(--t3)' }}>PHOTOS</div>
                </div>
                <div style={{ padding: '10px 0', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 16, color: 'var(--vio)' }}>{traitCount}</div>
                  <div style={{ fontFamily: 'var(--f3)', fontSize: 8, color: 'var(--t3)' }}>TRAITS</div>
                </div>
                <div style={{ padding: '10px 0', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 16, color: 'var(--rose)' }}>{matchScore}</div>
                  <div style={{ fontFamily: 'var(--f3)', fontSize: 8, color: 'var(--t3)' }}>SCORE</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={() => (window.location.hash = '#/discover')} style={{ flex: 1, background: 'var(--s2)', color: 'var(--t2)', fontFamily: 'var(--f1)', fontWeight: 700, fontSize: 13, padding: '11px', borderRadius: 12, border: '1px solid var(--border)', cursor: 'pointer' }}>
                  Back to Discover
                </button>
                <button onClick={() => (window.location.hash = '#/matches')} style={{ flex: 1, background: 'var(--spark)', color: '#fff', fontFamily: 'var(--f1)', fontWeight: 700, fontSize: 13, padding: '11px', borderRadius: 12, border: 'none', cursor: 'pointer' }}>
                  Open Matches
                </button>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Match score</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 42, background: 'linear-gradient(135deg, var(--spark), var(--vio))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
                {matchScore}%
              </div>
              <div>
                <div style={{ fontFamily: 'var(--f1)', fontWeight: 600, fontSize: 13, color: 'var(--t1)' }}>Great Potential</div>
                <div style={{ fontFamily: 'var(--f3)', fontSize: 8, color: 'var(--t3)', marginTop: 3, lineHeight: 1.5 }}>Profile complete · Verified</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ height: 4, background: 'var(--s2)', borderRadius: 100, overflow: 'hidden' }}>
                <div ref={matchBarRef} style={{ height: '100%', width: 0, background: 'linear-gradient(90deg, var(--spark), var(--vio))', borderRadius: 100, transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, position: 'relative' }}>
              <div className="eyebrow">Photos</div>
            </div>

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setPhotoPreviewUrl(profilePhotos.map((photo) => getPhotoUrl(photo)).find(Boolean) || null);
                  setGalleryOpen(true);
                }}
                style={{ position: 'absolute', top: -6, right: 0, width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--card3)', color: 'var(--t1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, fontFamily: 'var(--f1)', fontWeight: 700 }}
                title="Open photo gallery"
              >
                +
              </button>
              <div
                className="photo-grid"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                {visiblePhotos.map((photo, index) => {
                  const photoUrl = getPhotoUrl(photo);

                  return (
                    <button
                      type="button"
                      key={photoUrl || `visible-${index}`}
                      onClick={() => photoUrl && openGalleryAt(index)}
                      style={{ position: 'relative', width: photoCardWidth, flex: '0 0 auto', borderRadius: 14, overflow: 'hidden', height: 170, border: '1px solid var(--border)', background: '#0b0b18', padding: 0, cursor: photoUrl ? 'zoom-in' : 'default', textAlign: 'left' }}
                    >
                      {photoUrl ? (
                        <img src={photoUrl} alt={`profile-${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(224,48,192,0.08), rgba(139,92,246,0.08))' }} />
                      )}
                      {profilePhotos.length > 3 && index === 2 && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(3,3,10,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'var(--f1)', fontWeight: 800, letterSpacing: '0.04em' }}>
                          +{profilePhotos.length - 3} MORE
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', textAlign: 'center', marginTop: 10, letterSpacing: '0.06em' }}>
              {photoCount} PHOTOS · TAP TO VIEW
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="card" style={{ padding: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Dating type</div>
              <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: 15, color: 'var(--t1)', marginBottom: 6 }}>{getDatingTypeLabel(profile.datingType)}</div>
              <p style={{ fontFamily: 'var(--f2)', fontSize: 12, fontWeight: 300, color: 'var(--t2)', lineHeight: 1.7 }}>Looking for someone genuine on this campus.</p>
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Basic info</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12 }}>🎓</span>
                  <span style={{ fontFamily: 'var(--f2)', fontSize: 12, fontWeight: 300, color: 'var(--t2)' }}>{profile.depart || 'Unknown'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12 }}>👥</span>
                  <span style={{ fontFamily: 'var(--f2)', fontSize: 12, fontWeight: 300, color: 'var(--t2)' }}>{getGenderPrefLabel(profile.genderPreference)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12 }}>📍</span>
                  <span style={{ fontFamily: 'var(--f2)', fontSize: 12, fontWeight: 300, color: 'var(--t2)' }}>{profile.college?.name || 'Campus profile'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>About</div>
            <div style={{ fontFamily: 'var(--f2)', fontSize: 14, lineHeight: 1.8, color: 'var(--t2)' }}>
              {profile.bio || 'No bio provided yet.'}
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Vibe words</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(profile.vibewords || []).length > 0 ? (
                profile.vibewords!.map((word, index) => (
                  <span key={`${word}-${index}`} className={`pill ${['pill-spark', 'pill-vio', 'pill-rose', 'pill-sky'][index % 4]}`}>
                    {word}
                  </span>
                ))
              ) : (
                <span style={{ fontFamily: 'var(--f2)', color: 'var(--t3)', fontSize: 12 }}>No vibe words listed.</span>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Personality</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {[
                { label: 'Introvert / Extrovert', value: profile.personality?.introvertExtrovert ?? 50 },
                { label: 'Chill / Intense', value: profile.personality?.chillIntense ?? 50 },
                { label: 'Homebody / Adventurous', value: profile.personality?.homebodyAdventurous ?? 50 },
              ].map((item) => (
                <div key={item.label} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 14, padding: 12 }}>
                  <div style={{ fontFamily: 'var(--f1)', fontSize: 12, fontWeight: 700, color: 'var(--t1)', marginBottom: 8 }}>{item.label}</div>
                  <div style={{ height: 4, background: 'var(--card3)', borderRadius: 100, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(0, Math.min(100, item.value))}%`, height: '100%', background: 'linear-gradient(90deg, var(--spark), var(--vio))' }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(profile.personality?.traits || []).length > 0 ? (
                profile.personality!.traits!.map((trait) => (
                  <span key={trait} className="trait-chip">{trait}</span>
                ))
              ) : (
                <span style={{ fontFamily: 'var(--f2)', color: 'var(--t3)', fontSize: 12 }}>No personality traits listed.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {galleryOpen && (
        <div
          role="presentation"
          onClick={() => setGalleryOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(3,3,10,0.82)', zIndex: 1600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            role="presentation"
            onClick={(event) => event.stopPropagation()}
            style={{ width: 'min(980px, 96vw)', maxHeight: '92vh', position: 'relative', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
          >
            <button
              type="button"
              onClick={() => setGalleryOpen(false)}
              style={{ position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border)', background: 'rgba(7,7,15,0.88)', color: 'var(--t1)', cursor: 'pointer', zIndex: 3 }}
            >
              ✕
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(260px, 0.7fr)', minHeight: '64vh' }}>
              <div style={{ background: '#0b0b18', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                {photoPreviewUrl ? (
                  <img src={photoPreviewUrl} alt="Photo preview" style={{ width: '100%', height: '100%', maxHeight: '72vh', objectFit: 'contain', borderRadius: 14 }} />
                ) : (
                  <div style={{ color: 'var(--t3)', fontFamily: 'var(--f2)' }}>No photo selected</div>
                )}
              </div>
              <div style={{ padding: 16, background: 'var(--card2)', borderLeft: '1px solid var(--border)', overflowY: 'auto' }}>
                <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 16, color: 'var(--t1)', marginBottom: 10 }}>Gallery</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {profilePhotos.map((photo, index) => {
                    const photoUrl = getPhotoUrl(photo);
                    return (
                      <button
                        type="button"
                        key={index}
                        onClick={() => photoUrl && setPhotoPreviewUrl(photoUrl)}
                        style={{ width: '100%', height: 96, borderRadius: 12, overflow: 'hidden', border: photoUrl === photoPreviewUrl ? '2px solid var(--spark)' : '1px solid var(--border)', background: '#0b0b18', padding: 0, cursor: photoUrl ? 'pointer' : 'default' }}
                      >
                        {photoUrl ? (
                          <img src={photoUrl} alt={`gallery-${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', fontFamily: 'var(--f3)', fontSize: 9 }}>No preview</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicProfile;
