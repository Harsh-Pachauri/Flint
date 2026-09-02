import React, { useEffect, useState, useRef } from 'react';
import { API_BASE, deleteJSON, getAuthToken, getAuthTokens, getJSON, postJSON, putJSON } from '../../utils/api';
import '../../styles/profile.css';

interface PersonalityData {
  introvertExtrovert: number;
  chillIntense: number;
  homebodyAdventurous: number;
  traits: string[];
}

interface LocationData {
  type: string;
  coordinates: number[];
}

interface ProfileData {
  _id: string;
  userId: {
    _id: string;
    email: string;
    phone: string;
  };
  name: string;
  age: number;
  gender: string;
  genderPreference: string;
  datingType: string;
  year: number;
  depart: string;
  vibewords: string[];
  interests: string[];
  photos: any[];
  personality: PersonalityData;
  location: LocationData;
  aiAssessmentScore: number;
}

interface ApiResponse {
  profile: ProfileData;
  aiAssessmentScore: number;
}

interface UploadItem {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: 'queued' | 'uploading' | 'uploaded' | 'failed';
  error?: string;
}

function animateBars(matchBarRef: React.RefObject<HTMLDivElement | null>) {
  if (matchBarRef.current) {
    matchBarRef.current.style.width = '75%';
  }
  document.querySelectorAll('.traitbar').forEach((bar: Element) => {
    const htmlBar = bar as HTMLElement;
    const val = htmlBar.dataset.val || '50';
    htmlBar.style.width = val + '%';
  });
}

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const matchBarRef = useRef<HTMLDivElement>(null);
  const galleryUploadRef = useRef<HTMLInputElement>(null);
  const avatarUploadRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [galleryMenuOpen, setGalleryMenuOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [deletePhotosOpen, setDeletePhotosOpen] = useState(false);
  const [, setUploadingPhotos] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const uploadXhrsRef = useRef<Record<string, XMLHttpRequest | null>>({});
  const uploadItemsRef = useRef<UploadItem[]>([]);
  const photoFingerprintRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    uploadItemsRef.current = uploadItems;
  }, [uploadItems]);

  const loadProfile = React.useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        setError('Not authenticated');
        return;
      }

      // Uses the shared api.ts wrapper (not a raw fetch) so an expired
      // access token is transparently refreshed and retried, same as every
      // other authenticated call in the app.
      const data: ApiResponse = await getJSON('/api/profile/me');
      setProfile(data.profile);

      // Trigger animations after data loads
      setTimeout(() => {
        animateBars(matchBarRef);
      }, 300);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [matchBarRef]);

  useEffect(() => {
    loadProfile();
    const currentUploadXhrs = uploadXhrsRef.current;
    const currentUploadItems = uploadItemsRef.current;
    return () => {
      Object.values(currentUploadXhrs).forEach((xhr) => xhr?.abort());
      currentUploadItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [loadProfile]);

  const drawCover = (canvasId: string, c1: string, c2: string, c3: string, h: number = 120) => {
    const cv = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = cv.offsetWidth * dpr;
    cv.height = h * dpr;
    cv.style.height = h + 'px';
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const w = cv.offsetWidth;
    const ht = h;
    const g = ctx.createLinearGradient(0, 0, w, ht);
    g.addColorStop(0, c1);
    g.addColorStop(0.5, c2);
    g.addColorStop(1, c3);
    ctx.fillStyle = '#0f0e22';
    ctx.fillRect(0, 0, w, ht);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, ht);
    for (let i = 0; i < w; i += 4) {
      const bh = Math.random() * ht * 0.7 + ht * 0.1;
      const by = (ht - bh) / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(i, by, 2, bh);
    }
  };

  useEffect(() => {
    if (profile) {
      drawCover('profileCover', 'rgba(224,48,192,0.5)', 'rgba(139,92,246,0.4)', 'rgba(56,189,248,0.3)', 120);
      const photoColors = [
        ['rgba(224,48,192,0.5)', 'rgba(139,92,246,0.4)', 'rgba(255,107,157,0.3)'],
        ['rgba(139,92,246,0.5)', 'rgba(56,189,248,0.4)', 'rgba(224,48,192,0.3)'],
        ['rgba(255,107,157,0.4)', 'rgba(224,48,192,0.5)', 'rgba(139,92,246,0.35)'],
        ['rgba(56,189,248,0.4)', 'rgba(139,92,246,0.45)', 'rgba(224,48,192,0.3)'],
        ['rgba(245,158,11,0.3)', 'rgba(224,48,192,0.4)', 'rgba(139,92,246,0.3)'],
      ];
      ['ph1', 'ph2', 'ph3', 'ph4', 'ph5'].forEach((id, i) => {
        const h = i < 3 ? 140 : 100;
        const [c1, c2, c3] = photoColors[i];
        drawCover(id, c1, c2, c3, h);
      });
    }
  }, [profile]);

  const updateFormField = (key: string, value: any) => {
    setForm((p: any) => ({ ...(p || {}), [key]: value }));
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const payload: any = {};
      if (form.year !== undefined) payload.year = Number(form.year) || null;
      if (form.depart !== undefined) payload.depart = form.depart || '';
      if (form.interests !== undefined) payload.interests = (form.interests || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      if (form.vibewords !== undefined) payload.vibewords = (form.vibewords || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      if (form.personality) {
        payload.personality = {
          introvertExtrovert: Number(form.personality.introvertExtrovert) || 50,
          chillIntense: Number(form.personality.chillIntense) || 50,
          homebodyAdventurous: Number(form.personality.homebodyAdventurous) || 50,
          traits: Array.isArray(form.personality.traits) ? form.personality.traits : []
        };
      }

      const res = await putJSON('/api/profile/me', payload);
      if (res && res.profile) {
        setProfile(res.profile);
        setEditOpen(false);
      }
    } catch (err: any) {
      console.error('Save profile error', err);
      alert(err?.error || err?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getDatingTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      something_real: 'Something Real',
      see_where_it_goes: 'See Where It Goes',
      campus_friends_first: 'Campus Friends First',
      study_partner: 'Study Partner',
      casual: 'Casual',
      serious: 'Serious',
      either: 'Either',
    };
    return map[type] || type;
  };

  const getGenderPrefLabel = (pref: string) => {
    const map: Record<string, string> = {
      male: 'Men',
      female: 'Women',
      both: 'Everyone',
    };
    return map[pref] || pref;
  };

  const isOwnProfile = !!profile && getAuthTokens().userId === profile.userId?._id;
  const profilePhotos = profile?.photos || [];

  const getPhotoUrl = (photo: any) => {
    if (!photo) return '';
    if (typeof photo === 'string') return photo;
    return photo.url || photo.secureUrl || '';
  };

  const getPhotoId = (photo: any) => {
    if (!photo || typeof photo === 'string') return '';
    return photo._id || photo.id || photo.publicId || '';
  };

  const getFileFingerprint = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

  const updateProfilePhotosLocally = (uploadedUrls: Array<{ url?: string; publicId?: string | null; uploadedAt?: string }>) => {
    if (!uploadedUrls.length) return;

    setProfile((prev) => {
      if (!prev) return prev;
      const nextPhotos = [...(prev.photos || [])];
      uploadedUrls.forEach((item) => {
        if (item?.url) {
          nextPhotos.push({
            url: item.url,
            publicId: item.publicId || null,
            uploadedAt: item.uploadedAt || new Date().toISOString(),
          });
        }
      });
      return { ...prev, photos: nextPhotos };
    });
  };

  const uploadProfilePhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const token = getAuthToken();
    if (!token) {
      alert('Not authenticated');
      return;
    }

    const selectedFiles = Array.from(files);
    const existingFingerprints = new Set(photoFingerprintRef.current);
    const newItems: UploadItem[] = [];

    selectedFiles.forEach((file) => {
      const fingerprint = getFileFingerprint(file);
      if (existingFingerprints.has(fingerprint)) return;
      existingFingerprints.add(fingerprint);
      photoFingerprintRef.current.add(fingerprint);
      newItems.push({
        id: `${fingerprint}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        status: 'queued',
      });
    });

    if (newItems.length === 0) {
      if (galleryUploadRef.current) galleryUploadRef.current.value = '';
      if (avatarUploadRef.current) avatarUploadRef.current.value = '';
      return;
    }

    setUploadItems((prev) => [...prev, ...newItems]);
    setUploadingPhotos(true);

    newItems.forEach((item) => {
      const xhr = new XMLHttpRequest();
      uploadXhrsRef.current[item.id] = xhr;

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const progress = Math.round((event.loaded / event.total) * 100);
        setUploadItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, status: 'uploading', progress } : entry)));
      };

      xhr.onload = () => {
        let payload: any = {};
        try {
          payload = JSON.parse(xhr.responseText || '{}');
        } catch (parseError) {
          payload = {};
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          const uploadedUrls = Array.isArray(payload?.uploadedUrls) ? payload.uploadedUrls : [];
          setUploadItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, status: 'uploaded', progress: 100 } : entry)));
          updateProfilePhotosLocally(uploadedUrls);
        } else {
          const message = payload?.error || 'Photo upload failed';
          setUploadItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, status: 'failed', error: message } : entry)));
          photoFingerprintRef.current.delete(getFileFingerprint(item.file));
        }

        delete uploadXhrsRef.current[item.id];
        setUploadingPhotos(Object.keys(uploadXhrsRef.current).length > 0);
      };

      xhr.onerror = () => {
        setUploadItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, status: 'failed', error: 'Network error' } : entry)));
        photoFingerprintRef.current.delete(getFileFingerprint(item.file));
        delete uploadXhrsRef.current[item.id];
        setUploadingPhotos(Object.keys(uploadXhrsRef.current).length > 0);
      };

      xhr.onabort = () => {
        setUploadItems((prev) => prev.filter((entry) => entry.id !== item.id));
        URL.revokeObjectURL(item.previewUrl);
        photoFingerprintRef.current.delete(getFileFingerprint(item.file));
        delete uploadXhrsRef.current[item.id];
        setUploadingPhotos(Object.keys(uploadXhrsRef.current).length > 0);
      };

      xhr.open('POST', `${API_BASE}/api/profile/photos`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      setUploadItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, status: 'uploading', progress: 1 } : entry)));

      const formData = new FormData();
      formData.append('photos', item.file);
      xhr.send(formData);
    });

    if (galleryUploadRef.current) galleryUploadRef.current.value = '';
    if (avatarUploadRef.current) avatarUploadRef.current.value = '';
  };

  const openGalleryAt = (index: number) => {
    const selected = getPhotoUrl(profilePhotos[index]);
    setPhotoPreviewUrl(selected || profilePhotos.map((photo) => getPhotoUrl(photo)).find(Boolean) || null);
    setGalleryOpen(true);
  };

  const cancelUpload = (uploadId: string) => {
    uploadXhrsRef.current[uploadId]?.abort();
    delete uploadXhrsRef.current[uploadId];
  };

  const deleteProfilePhoto = async (photoId: string) => {
    if (!photoId) return;
    try {
      setDeletingPhotoId(photoId);
      const token = getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const res = await deleteJSON(`/api/profile/photos/${photoId}`);
      if (res?.message) {
        setProfile((prev) => {
          if (!prev) return prev;
          const nextPhotos = (prev.photos || []).filter((photo: any) => getPhotoId(photo) !== photoId);
          return { ...prev, photos: nextPhotos };
        });
      }
    } catch (err: any) {
      alert(err?.message || err?.error || 'Failed to delete photo');
    } finally {
      setDeletingPhotoId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', minHeight: '100vh' }}>
        <div style={{ fontFamily: 'var(--f2)', color: 'var(--t2)' }}>Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', minHeight: '100vh' }}>
        <div style={{ fontFamily: 'var(--f2)', color: 'var(--rose)' }}>Error: {error || 'Profile not found'}</div>
        <button
          onClick={() => (window.location.hash = '#/')}
          style={{
            marginTop: '20px',
            background: 'var(--spark)',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'var(--f1)',
          }}
        >
          Go Home
        </button>
      </div>
    );
  }

  const initials = getInitials(profile.name);
  const matchScore = 75; // Could be calculated based on algorithm

  return (
    <div style={{ position: 'relative' }}>
      {/* ORB BACKGROUNDS */}
      <div
        className="orb"
        style={{
          width: '450px',
          height: '450px',
          top: '-50px',
          right: '-80px',
          background: 'radial-gradient(circle, rgba(224,48,192,0.065) 0%, transparent 70%)',
          filter: 'blur(110px)',
        }}
      />
      <div
        className="orb"
        style={{
          width: '350px',
          height: '350px',
          top: '600px',
          left: '-80px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.055) 0%, transparent 70%)',
          filter: 'blur(110px)',
        }}
      />

      {/* BREADCRUMB */}
      <div style={{ padding: '14px 28px', borderBottom: '1px solid var(--border)', background: 'var(--s1)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.06em', cursor: 'pointer' }}>MY PROFILE</span>
        <span style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)' }}>›</span>
        <span style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--spark)', letterSpacing: '0.06em' }}>{profile.name.toUpperCase()}</span>
      </div>

      {/* MAIN LAYOUT */}
      <div className="profile-layout" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '22px', maxWidth: '1160px', margin: '28px auto', padding: '0 22px' }}>
        {/* LEFT COLUMN — STICKY */}
        <div className="sticky-left" style={{ position: 'sticky', top: 20, alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* PROFILE CARD */}
          <div className="card" style={{ borderRadius: '22px', overflow: 'hidden', padding: 0 }}>
            <canvas id="profileCover" style={{ width: '100%', height: '120px', display: 'block' }} />
            <div style={{ padding: '0 16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '-32px', marginBottom: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <div
                    title={isOwnProfile ? 'Edit profile photo' : undefined}
                    onClick={() => {
                      if (!isOwnProfile) return;
                      setAvatarMenuOpen((prev) => !prev);
                      setGalleryMenuOpen(false);
                    }}
                    style={{
                      width: '62px',
                      height: '62px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--spark), var(--vio))',
                      border: '3px solid var(--card)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--f1)',
                      fontWeight: 800,
                      fontSize: 18,
                      color: '#fff',
                      position: 'relative',
                      cursor: isOwnProfile ? 'pointer' : 'default',
                    }}
                  >
                    {profile.photos && profile.photos.length > 0 && getPhotoUrl(profile.photos[0]) ? (
                      <img src={getPhotoUrl(profile.photos[0])} alt="avatar" style={{ width: '62px', height: '62px', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      initials
                    )}
                    {isOwnProfile && (
                      <span
                        style={{
                          position: 'absolute',
                          right: '-2px',
                          bottom: '-2px',
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: 'var(--spark)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          border: '2px solid var(--card)',
                        }}
                      >
                        ✎
                      </span>
                    )}
                  </div>
                  {avatarMenuOpen && isOwnProfile && (
                    <div style={{ position: 'absolute', top: '72px', left: 0, minWidth: 220, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 16px 40px rgba(0,0,0,0.35)', zIndex: 20, overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => {
                          avatarUploadRef.current?.click();
                          setAvatarMenuOpen(false);
                        }}
                        style={{ width: '100%', textAlign: 'left', padding: '12px 14px', background: 'transparent', border: 'none', color: 'var(--t1)', cursor: 'pointer', fontFamily: 'var(--f2)' }}
                      >
                        Upload New Profile Photo
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setAvatarMenuOpen(false);
                          if (!profile.photos || profile.photos.length <= 1) {
                            alert('Your profile photo must always exist. Upload another photo first.');
                            return;
                          }
                          const firstPhoto = profile.photos[0];
                          const firstPhotoId = getPhotoId(firstPhoto);
                          if (!firstPhotoId) {
                            alert('Unable to delete the current profile photo right now.');
                            return;
                          }
                          if (window.confirm('Delete the current profile photo? Another photo will become the new first photo.')) {
                            await deleteProfilePhoto(firstPhotoId);
                          }
                        }}
                        style={{ width: '100%', textAlign: 'left', padding: '12px 14px', background: 'transparent', border: 'none', color: 'var(--rose)', cursor: 'pointer', fontFamily: 'var(--f2)', borderTop: '1px solid var(--border)' }}
                      >
                        Delete Profile Photo
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e' }} />
                  <span style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)' }}>ACTIVE NOW</span>
                </div>
              </div>

              <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 18, color: 'var(--t1)', letterSpacing: '-0.02em' }}>
                {profile.name}, {profile.age}
              </div>
              <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.06em', marginTop: 3 }}>
                @{profile.name.toLowerCase()}.profile · {profile.gender === 'male' ? 'HE/HIM' : 'SHE/HER'}
              </div>

              <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="pill pill-spark">✓ VERIFIED</span>
                <span className="pill pill-vio">
                  {profile.depart} · {profile.year}ND YR
                </span>
              </div>

              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12 }}>📍</span>
                  <span style={{ fontFamily: 'var(--f2)', fontSize: 12, fontWeight: 300, color: 'var(--t2)' }}>Campus Location</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12 }}>🎓</span>
                  <span style={{ fontFamily: 'var(--f2)', fontSize: 12, fontWeight: 300, color: 'var(--t2)' }}>{profile.depart}</span>
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

              {/* Stats strip */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, marginTop: 16, background: 'var(--s2)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ padding: '10px 0', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 16, color: 'var(--spark)' }}>0</div>
                  <div style={{ fontFamily: 'var(--f3)', fontSize: 8, color: 'var(--t3)' }}>LIKES</div>
                </div>
                <div style={{ padding: '10px 0', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 16, color: 'var(--vio)' }}>0</div>
                  <div style={{ fontFamily: 'var(--f3)', fontSize: 8, color: 'var(--t3)' }}>MATCHES</div>
                </div>
                <div style={{ padding: '10px 0', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 16, color: 'var(--rose)' }}>0</div>
                  <div style={{ fontFamily: 'var(--f3)', fontSize: 8, color: 'var(--t3)' }}>MUTUALS</div>
                </div>
              </div>

              {/* CTAs */}
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button
                  onClick={() => {
                    // Open edit modal prefilled from profile
                    setForm({
                      year: profile.year,
                      depart: profile.depart,
                      interests: (profile.interests || []).join(', '),
                      vibewords: (profile.vibewords || []).join(', '),
                      personality: profile.personality || { introvertExtrovert: 50, chillIntense: 50, homebodyAdventurous: 50, traits: [] }
                    });
                    setEditOpen(true);
                  }}
                  style={{
                    flex: 1,
                    background: 'var(--s2)',
                    color: 'var(--t2)',
                    fontFamily: 'var(--f1)',
                    fontWeight: 700,
                    fontSize: 13,
                    padding: '11px',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  Edit profile
                </button>
                <button
                  onClick={async () => {
                    if (liking) return;
                    try {
                      setLiking(true);
                      const tokens = getAuthTokens();
                      const currentUserId = tokens.userId;
                      if (!currentUserId) {
                        alert('Not authenticated');
                        return;
                      }
                      if (profile.userId._id === currentUserId) {
                        alert("You can't like your own profile");
                        return;
                      }

                      const res = await postJSON('/api/swipe', { toUserId: profile.userId._id, direction: 'like' });
                      setLiked(true);
                      // Optionally show match message if returned
                      if (res?.match) {
                        alert('It\'s a match! ' + (res.match.message || ''));
                      }
                    } catch (err: any) {
                      console.error('Swipe error', err);
                      alert(err?.error || err?.message || 'Failed to send like');
                    } finally {
                      setLiking(false);
                    }
                  }}
                  style={{
                    flex: 1,
                    background: liked ? 'linear-gradient(90deg, #ff7ab6, #8b5cf6)' : 'var(--spark)',
                    color: '#fff',
                    fontFamily: 'var(--f1)',
                    fontWeight: 700,
                    fontSize: 13,
                    padding: '11px',
                    borderRadius: 12,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {liking ? 'Sending…' : liked ? '♥ Liked' : '♥ Like'}
                </button>
                <button
                  style={{
                    width: '44px',
                    background: 'var(--s2)',
                    border: '1px solid var(--border)',
                    color: 'var(--t2)',
                    fontSize: 16,
                    padding: '11px',
                    borderRadius: 12,
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
                <button
                  style={{
                    width: '44px',
                    background: 'var(--s2)',
                    border: '1px solid var(--border)',
                    color: 'var(--sky)',
                    fontSize: 14,
                    padding: '11px',
                    borderRadius: 12,
                    cursor: 'pointer',
                  }}
                >
                  ↗
                </button>
              </div>
            </div>
          </div>

          {/* MATCH SCORE */}
          <div className="card" style={{ padding: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Your match score</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 42, background: 'linear-gradient(135deg, var(--spark), var(--vio))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
                {matchScore}%
              </div>
              <div>
                <div style={{ fontFamily: 'var(--f1)', fontWeight: 600, fontSize: 13, color: 'var(--t1)' }}>Great Potential</div>
                <div style={{ fontFamily: 'var(--f3)', fontSize: 8, color: 'var(--t3)', marginTop: 3, lineHeight: 1.5 }}>
                  Profile complete · Verified
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ height: 4, background: 'var(--s2)', borderRadius: 100, overflow: 'hidden' }}>
                <div ref={matchBarRef} style={{ height: '100%', width: 0, background: 'linear-gradient(90deg, var(--spark), var(--vio))', borderRadius: 100, transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* PHOTO GALLERY */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, position: 'relative' }}>
              <div className="eyebrow">Photos</div>
              {isOwnProfile && (
                <button
                  type="button"
                  title="Photo options"
                  onClick={() => {
                    setGalleryMenuOpen((prev) => !prev);
                    setAvatarMenuOpen(false);
                  }}
                  style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--s2)', color: 'var(--t1)', cursor: 'pointer' }}
                >
                  ☰
                </button>
              )}
              {galleryMenuOpen && isOwnProfile && (
                <div style={{ position: 'absolute', top: 38, right: 0, minWidth: 210, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 16px 40px rgba(0,0,0,0.35)', zIndex: 20, overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => {
                      galleryUploadRef.current?.click();
                      setGalleryMenuOpen(false);
                    }}
                    style={{ width: '100%', textAlign: 'left', padding: '12px 14px', background: 'transparent', border: 'none', color: 'var(--t1)', cursor: 'pointer', fontFamily: 'var(--f2)' }}
                  >
                    Upload Photos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeletePhotosOpen(true);
                      setGalleryMenuOpen(false);
                    }}
                    style={{ width: '100%', textAlign: 'left', padding: '12px 14px', background: 'transparent', border: 'none', color: 'var(--rose)', cursor: 'pointer', fontFamily: 'var(--f2)', borderTop: '1px solid var(--border)' }}
                  >
                    Delete Photos
                  </button>
                </div>
              )}
            </div>
            <input ref={galleryUploadRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => uploadProfilePhotos(e.target.files)} />
            <input ref={avatarUploadRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => uploadProfilePhotos(e.target.files)} />

            {uploadItems.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 12 }}>
                {uploadItems.map((item) => (
                  <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', background: 'var(--s2)' }}>
                    <div style={{ position: 'relative', height: 150, background: '#0b0b18' }}>
                      <img src={item.previewUrl} alt={item.file.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: item.status === 'uploading' ? 0.75 : 1 }} />
                      <div style={{ position: 'absolute', inset: 0, background: item.status === 'failed' ? 'rgba(239,68,68,0.18)' : item.status === 'uploaded' ? 'rgba(34,197,94,0.14)' : 'linear-gradient(to top, rgba(0,0,0,0.45), transparent)' }} />
                      <div style={{ position: 'absolute', top: 10, left: 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 999, background: 'rgba(7,7,15,0.72)', color: '#fff', fontFamily: 'var(--f3)', fontSize: 9, letterSpacing: '0.08em' }}>
                        {item.status === 'queued' || item.status === 'uploading' ? 'Uploading...' : item.status === 'uploaded' ? 'Uploaded' : 'Failed'}
                      </div>
                      {item.status === 'uploading' && (
                        <button
                          type="button"
                          onClick={() => cancelUpload(item.id)}
                          style={{ position: 'absolute', top: 10, right: 10, border: 'none', background: 'rgba(7,7,15,0.72)', color: '#fff', borderRadius: 999, width: 32, height: 32, cursor: 'pointer' }}
                          title="Cancel upload"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div style={{ padding: 10 }}>
                      <div style={{ fontFamily: 'var(--f2)', fontSize: 12, color: 'var(--t1)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.file.name}</div>
                      {item.status === 'uploading' && (
                        <div style={{ height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
                          <div style={{ width: `${Math.max(item.progress, 6)}%`, height: '100%', background: 'linear-gradient(90deg, var(--spark), var(--vio))' }} />
                        </div>
                      )}
                      {item.status === 'failed' && (
                        <div style={{ fontFamily: 'var(--f3)', fontSize: 10, color: 'var(--rose)', marginBottom: 8 }}>{item.error || 'Upload failed'}</div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)' }}>{Math.round(item.progress)}%</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (item.status === 'uploading') {
                              cancelUpload(item.id);
                              return;
                            }
                            setUploadItems((prev) => prev.filter((entry) => entry.id !== item.id));
                            URL.revokeObjectURL(item.previewUrl);
                          }}
                          style={{ border: 'none', background: 'transparent', color: item.status === 'failed' ? 'var(--rose)' : 'var(--t3)', cursor: 'pointer', fontFamily: 'var(--f3)', fontSize: 10 }}
                        >
                          {item.status === 'uploading' ? 'Cancel' : 'Dismiss'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
              <div className="photo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                {Array.from({ length: 4 }).map((_, index) => {
                  const photo = profilePhotos[index];
                  const photoUrl = getPhotoUrl(photo);

                  return (
                    <button
                      key={getPhotoId(photo) || photoUrl || `slot-${index}`}
                      type="button"
                      onClick={() => photoUrl && openGalleryAt(index)}
                      style={{ position: 'relative', width: '100%', borderRadius: 14, overflow: 'hidden', height: 170, border: '1px solid var(--border)', background: photoUrl ? '#0b0b18' : 'linear-gradient(135deg, rgba(224,48,192,0.08), rgba(139,92,246,0.08))', padding: 0, cursor: photoUrl ? 'zoom-in' : 'default', textAlign: 'left' }}
                    >
                      {photoUrl ? (
                        <img src={photoUrl} alt={`profile-${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', gap: 4 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>+</div>
                          <div style={{ fontFamily: 'var(--f3)', fontSize: 8, letterSpacing: '0.06em' }}>NO PHOTO</div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', textAlign: 'center', marginTop: 10, letterSpacing: '0.06em' }}>
              {profilePhotos.length} PHOTOS · TAP TO VIEW
            </div>
          </div>

          {deletePhotosOpen && isOwnProfile && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(3,3,10,0.66)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div style={{ width: '100%', maxWidth: 760, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, maxHeight: '85vh', overflow: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 18 }}>Delete Photos</div>
                  <button type="button" onClick={() => setDeletePhotosOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 18 }}>✕</button>
                </div>
                <div style={{ fontFamily: 'var(--f2)', color: 'var(--t2)', fontSize: 13, marginBottom: 12 }}>
                  Delete any photo here. The first photo is your profile photo, so if you remove it, another photo must remain to take its place.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  {(profile.photos || []).map((photo: any, index: number) => {
                    const photoUrl = getPhotoUrl(photo);
                    const photoId = getPhotoId(photo);
                    const isPrimary = index === 0;
                    const canDelete = !isPrimary || (profile.photos.length > 1);

                    return (
                      <div key={photoId || photoUrl || index} style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--s2)' }}>
                        <button type="button" onClick={() => photoUrl && setPhotoPreviewUrl(photoUrl)} style={{ width: '100%', height: 160, padding: 0, border: 'none', background: '#0b0b18', cursor: photoUrl ? 'zoom-in' : 'default' }}>
                          {photoUrl ? (
                            <img src={photoUrl} alt={`photo-${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)' }}>No preview</div>
                          )}
                        </button>
                        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <button
                            type="button"
                            disabled={!canDelete || deletingPhotoId === photoId}
                            onClick={async () => {
                              if (!canDelete || !photoId) return;
                              const shouldDelete = isPrimary ? window.confirm('Delete the current profile photo? Another photo will become primary.') : window.confirm('Delete this photo?');
                              if (!shouldDelete) return;
                              await deleteProfilePhoto(photoId);
                            }}
                            style={{
                              width: '100%',
                              background: canDelete ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)',
                              color: canDelete ? 'var(--rose)' : 'var(--t3)',
                              border: '1px solid var(--border)',
                              borderRadius: 10,
                              padding: '10px 12px',
                              cursor: canDelete ? 'pointer' : 'not-allowed',
                              fontFamily: 'var(--f1)',
                              fontWeight: 700,
                            }}
                          >
                            {deletingPhotoId === photoId ? 'Deleting…' : canDelete ? 'Delete Photo' : 'Keep at least one photo'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

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
                      <img src={photoPreviewUrl} alt="Selected preview" style={{ width: '100%', height: '100%', maxHeight: '72vh', objectFit: 'contain', borderRadius: 14 }} />
                    ) : (
                      <div style={{ color: 'var(--t3)', fontFamily: 'var(--f2)' }}>No photo selected</div>
                    )}
                  </div>
                  <div style={{ padding: 16, background: 'var(--card2)', borderLeft: '1px solid var(--border)', overflowY: 'auto' }}>
                    <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 16, color: 'var(--t1)', marginBottom: 10 }}>Gallery</div>
                    {isOwnProfile ? (
                      <button type="button" onClick={() => galleryUploadRef.current?.click()} style={{ width: '100%', marginBottom: 12, background: 'var(--spark)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 12px', cursor: 'pointer', fontFamily: 'var(--f1)', fontWeight: 700 }}>
                        Upload photo
                      </button>
                    ) : null}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                      {profilePhotos.map((photo, index) => {
                        const photoUrl = getPhotoUrl(photo);
                        return (
                          <button
                            type="button"
                            key={getPhotoId(photo) || photoUrl || `gallery-${index}`}
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

          {/* ABOUT + KEY DETAILS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="card" style={{ padding: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Dating type</div>
              <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: 15, color: 'var(--t1)', marginBottom: 6 }}>
                {getDatingTypeLabel(profile.datingType)}
              </div>
              <p style={{ fontFamily: 'var(--f2)', fontSize: 12, fontWeight: 300, color: 'var(--t2)', lineHeight: 1.7 }}>
                Looking for someone genuine on this campus.
              </p>
            </div>
            <div className="card" style={{ padding: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>Basic info</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--f2)', fontSize: 11, color: 'var(--t3)' }}>Age</span>
                  <span style={{ fontFamily: 'var(--f2)', fontSize: 12, fontWeight: 500, color: 'var(--t1)' }}>{profile.age}</span>
                </div>
                <div style={{ height: 1, background: 'var(--border)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--f2)', fontSize: 11, color: 'var(--t3)' }}>Gender</span>
                  <span style={{ fontFamily: 'var(--f2)', fontSize: 12, fontWeight: 500, color: 'var(--t1)' }}>
                    {profile.gender === 'male' ? 'Male' : profile.gender === 'female' ? 'Female' : 'Other'}
                  </span>
                </div>
                <div style={{ height: 1, background: 'var(--border)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--f2)', fontSize: 11, color: 'var(--t3)' }}>Interested in</span>
                  <span style={{ fontFamily: 'var(--f2)', fontSize: 12, fontWeight: 500, color: 'var(--t1)' }}>
                    {getGenderPrefLabel(profile.genderPreference)}
                  </span>
                </div>
                <div style={{ height: 1, background: 'var(--border)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--f2)', fontSize: 11, color: 'var(--t3)' }}>Year</span>
                  <span style={{ fontFamily: 'var(--f2)', fontSize: 12, fontWeight: 500, color: 'var(--t1)' }}>
                    {profile.year}
                    {profile.year === 1 ? 'st' : profile.year === 2 ? 'nd' : profile.year === 3 ? 'rd' : 'th'} year
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PERSONALITY TRAITS */}
          <div className="card" style={{ padding: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Personality</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {profile.vibewords.map((word, i) => (
                <span key={i} className="trait-chip">
                  {word}
                </span>
              ))}
            </div>

            {/* Trait meter bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.06em' }}>INTROVERT</span>
                  <span style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.06em' }}>EXTROVERT</span>
                </div>
                <div style={{ height: 4, background: 'var(--s2)', borderRadius: 100 }}>
                  <div
                    className="traitbar"
                    data-val={profile.personality.introvertExtrovert}
                    style={{ height: '100%', width: 0, background: 'var(--vio)', borderRadius: 100, transition: 'width 1s ease' }}
                  />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.06em' }}>CHILL</span>
                  <span style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.06em' }}>INTENSE</span>
                </div>
                <div style={{ height: 4, background: 'var(--s2)', borderRadius: 100 }}>
                  <div
                    className="traitbar"
                    data-val={profile.personality.chillIntense}
                    style={{ height: '100%', width: 0, background: 'var(--spark)', borderRadius: 100, transition: 'width 1s ease' }}
                  />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.06em' }}>HOMEBODY</span>
                  <span style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.06em' }}>ADVENTUROUS</span>
                </div>
                <div style={{ height: 4, background: 'var(--s2)', borderRadius: 100 }}>
                  <div
                    className="traitbar"
                    data-val={profile.personality.homebodyAdventurous}
                    style={{ height: '100%', width: 0, background: 'var(--rose)', borderRadius: 100, transition: 'width 1s ease' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* INTERESTS */}
          <div className="card" style={{ padding: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Interests</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {profile.interests.map((interest, i) => {
                const colors = ['pill-spark', 'pill-vio', 'pill-rose', 'pill-sky', 'pill-amber'];
                const colorClass = colors[i % colors.length];
                return (
                  <span key={i} className={`pill ${colorClass}`} style={{ fontSize: 10, padding: '5px 12px' }}>
                    {interest}
                  </span>
                );
              })}
            </div>
          </div>

          {/* ICEBREAKER GAMES */}
          <div className="card" style={{ padding: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Break the ice</div>
            <p style={{ fontFamily: 'var(--f2)', fontSize: 12, fontWeight: 300, color: 'var(--t2)', marginBottom: 14, lineHeight: 1.7 }}>
              Start a game before sending a message. It's more fun than "hey" — and they'll actually reply.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>🎲</div>
                <div style={{ fontFamily: 'var(--f1)', fontWeight: 600, fontSize: 11, color: 'var(--t1)' }}>Dare Roulette</div>
                <div style={{ fontFamily: 'var(--f2)', fontSize: 10, fontWeight: 300, color: 'var(--t3)', marginTop: 3 }}>Break the ice</div>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>⚡</div>
                <div style={{ fontFamily: 'var(--f1)', fontWeight: 600, fontSize: 11, color: 'var(--t1)' }}>Would You Rather</div>
                <div style={{ fontFamily: 'var(--f2)', fontSize: 10, fontWeight: 300, color: 'var(--t3)', marginTop: 3 }}>+compatibility</div>
              </div>
              <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>📖</div>
                <div style={{ fontFamily: 'var(--f1)', fontWeight: 600, fontSize: 11, color: 'var(--t1)' }}>Story Builder</div>
                <div style={{ fontFamily: 'var(--f2)', fontSize: 10, fontWeight: 300, color: 'var(--t3)', marginTop: 3 }}>Co-create</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Edit modal */}
      {editOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(3,3,10,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div style={{ width: '92%', maxWidth: 720, background: 'var(--card)', borderRadius: 12, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontFamily: 'var(--f1)', fontWeight: 800 }}>Edit profile</div>
              <button onClick={() => setEditOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t3)' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', marginBottom: 6 }}>DEPARTMENT</div>
                <input className="inp" value={form.depart || ''} onChange={(e) => updateFormField('depart', e.target.value)} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', marginBottom: 6 }}>YEAR</div>
                <select className="inp" value={form.year || ''} onChange={(e) => updateFormField('year', e.target.value)}>
                  <option value="">Year...</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', marginBottom: 6 }}>INTERESTS (comma separated)</div>
              <input className="inp" value={form.interests || ''} onChange={(e) => updateFormField('interests', e.target.value)} />
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', marginBottom: 6 }}>VIBE WORDS (comma separated)</div>
              <input className="inp" value={form.vibewords || ''} onChange={(e) => updateFormField('vibewords', e.target.value)} />
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', marginBottom: 6 }}>PERSONALITY SLIDERS</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 6 }}>Introvert ↔ Extrovert</div>
                  <input type="range" min={0} max={100} value={form.personality?.introvertExtrovert ?? 50} onChange={(e) => updateFormField('personality', { ...(form.personality || {}), introvertExtrovert: Number(e.target.value) })} />
                </div>
                <div style={{ width: 80, textAlign: 'center', fontSize: 12 }}>{form.personality?.introvertExtrovert ?? 50}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 6 }}>Chill ↔ Intense</div>
                  <input type="range" min={0} max={100} value={form.personality?.chillIntense ?? 50} onChange={(e) => updateFormField('personality', { ...(form.personality || {}), chillIntense: Number(e.target.value) })} />
                </div>
                <div style={{ width: 80, textAlign: 'center', fontSize: 12 }}>{form.personality?.chillIntense ?? 50}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 6 }}>Homebody ↔ Adventurous</div>
                  <input type="range" min={0} max={100} value={form.personality?.homebodyAdventurous ?? 50} onChange={(e) => updateFormField('personality', { ...(form.personality || {}), homebodyAdventurous: Number(e.target.value) })} />
                </div>
                <div style={{ width: 80, textAlign: 'center', fontSize: 12 }}>{form.personality?.homebodyAdventurous ?? 50}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn-primary" onClick={saveProfile} disabled={saving} style={{ flex: 1 }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button className="btn-ghost" onClick={() => setEditOpen(false)} style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;
