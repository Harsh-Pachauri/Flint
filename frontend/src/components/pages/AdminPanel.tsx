import React, { useCallback, useEffect, useState } from 'react';
import { getJSON, patchJSON } from '../../utils/api';

type Confession = {
  _id: string;
  text: string;
  author: string | null;
  isAnonymous: boolean;
  tags: string[];
  reactionCount: number;
  commentsCount: number;
  status: string;
  createdAt: string;
};

type Toast = {
  message: string;
  type: 'success' | 'error';
};

const STATUS_META: Record<string, { label: string; color: string; dcolor: string }> = {
  pending: { label: 'PENDING', color: 'var(--amber)', dcolor: 'rgba(245,158,11,0.14)' },
  approved: { label: 'APPROVED', color: 'var(--green)', dcolor: 'rgba(34,197,94,0.14)' },
  rejected: { label: 'REJECTED', color: 'var(--rose)', dcolor: 'var(--rod)' },
};

function AdminPanel() {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [activeStatus, setActiveStatus] = useState<'pending' | 'approved' | 'all'>('pending');

  const loadConfessions = useCallback(async () => {
    setLoading(true);
    try {
      let data;
      if (activeStatus === 'pending') {
        data = await getJSON('/api/confessions/pending');
      } else if (activeStatus === 'approved') {
        data = await getJSON('/api/confessions?page=1&limit=50&sort=trending');
      } else {
        // Load pending, approved, AND rejected — an "All" tab that silently
        // dropped rejected confessions gave moderators no way to review past
        // rejections. The status=rejected override only takes effect for
        // admins (enforced server-side in confessionController.getConfessions).
        const [pending, approved, rejected] = await Promise.all([
          getJSON('/api/confessions/pending'),
          getJSON('/api/confessions?page=1&limit=50&sort=trending'),
          getJSON('/api/confessions?page=1&limit=50&status=rejected')
        ]);
        data = {
          confessions: [...pending.confessions, ...approved.confessions, ...rejected.confessions]
        };
      }
      setConfessions(data.confessions || []);
    } catch (error: any) {
      setToast({
        message: error?.error || 'Failed to load confessions',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [activeStatus]);

  useEffect(() => {
    loadConfessions();
  }, [loadConfessions]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2200);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function approveConfession(confessionId: string) {
    try {
      await patchJSON(`/api/confessions/${confessionId}/approve`, {});
      setToast({ message: 'Confession approved!', type: 'success' });
      loadConfessions();
    } catch (error: any) {
      setToast({
        message: error?.error || 'Failed to approve confession',
        type: 'error'
      });
    }
  }

  async function rejectConfession(confessionId: string) {
    try {
      await patchJSON(`/api/confessions/${confessionId}/reject`, {});
      setToast({ message: 'Confession rejected!', type: 'success' });
      loadConfessions();
    } catch (error: any) {
      setToast({
        message: error?.error || 'Failed to reject confession',
        type: 'error'
      });
    }
  }

  const pendingCount = confessions.filter((c) => c.status === 'pending').length;

  return (
    <div style={{ position: 'relative', background: 'var(--void)', minHeight: '100vh', color: 'var(--t1)', overflow: 'hidden' }}>
      <div className="orb" style={{ width: '480px', height: '480px', top: '-140px', right: '-100px', background: 'radial-gradient(circle, rgba(224,48,192,0.07) 0%, transparent 70%)', filter: 'blur(100px)' }} />
      <div className="orb" style={{ width: '380px', height: '380px', top: '520px', left: '-110px', background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)', filter: 'blur(100px)' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto', padding: '48px 24px 80px' }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>MODERATION</div>
        <h1 style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: '30px', letterSpacing: '-0.02em', color: 'var(--t1)', marginBottom: 8 }}>
          Admin Panel
        </h1>
        <p style={{ fontFamily: 'var(--f2)', fontSize: '13px', color: 'var(--t3)', marginBottom: 32 }}>
          Review and moderate confessions before they go live.
        </p>

        {/* Toast */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              background: toast.type === 'success' ? 'var(--green)' : 'var(--rose)',
              color: '#0a0a12',
              fontFamily: 'var(--f2)',
              fontWeight: 600,
              padding: '12px 22px',
              borderRadius: '100px',
              zIndex: 1000,
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              animation: 'toastIn 0.3s cubic-bezier(0.16,1,0.3,1)'
            }}
          >
            {toast.message}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          {(['pending', 'approved', 'all'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className="pill"
              style={{
                cursor: 'pointer',
                fontSize: '11px',
                padding: '9px 18px',
                border: activeStatus === status ? '1px solid rgba(224,48,192,0.3)' : '1px solid var(--border)',
                color: activeStatus === status ? 'var(--spark)' : 'var(--t3)',
                background: activeStatus === status ? 'var(--spd)' : 'transparent',
                transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)'
              }}
            >
              {status === 'pending' && `⏳ PENDING (${pendingCount})`}
              {status === 'approved' && '✅ APPROVED'}
              {status === 'all' && '📋 ALL'}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--s2)', borderTopColor: 'var(--spark)', margin: '0 auto 14px', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ fontFamily: 'var(--f3)', fontSize: 10, letterSpacing: '0.08em', color: 'var(--t3)' }}>LOADING CONFESSIONS...</div>
          </div>
        )}

        {/* Empty state */}
        {!loading && confessions.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: 32, marginBottom: 10, animation: 'float 3s ease-in-out infinite' }}>🛡️</div>
            <div style={{ fontFamily: 'var(--f2)', fontSize: 13, color: 'var(--t2)' }}>No confessions to moderate right now.</div>
          </div>
        )}

        {/* Confessions List */}
        {!loading && confessions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {confessions.map((confession) => {
              const meta = STATUS_META[confession.status] || STATUS_META.pending;
              return (
                <div
                  key={confession._id}
                  className="card"
                  style={{ padding: '18px 20px' }}
                >
                  {/* Status Badge */}
                  <div
                    className="pill"
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      background: meta.dcolor,
                      color: meta.color,
                      border: `1px solid ${meta.color}`
                    }}
                  >
                    {meta.label}
                  </div>

                  {/* Header */}
                  <div style={{ marginBottom: '10px', paddingRight: '110px', fontFamily: 'var(--f3)', fontSize: 9, letterSpacing: '0.06em', color: 'var(--t3)' }}>
                    {confession.isAnonymous ? '🔒 ANONYMOUS' : '👤 NAMED'} · {new Date(confession.createdAt).toLocaleDateString().toUpperCase()}
                  </div>

                  {/* Text */}
                  <div style={{ fontFamily: 'var(--f2)', fontSize: '14px', lineHeight: '1.65', marginBottom: '14px', color: 'var(--t1)' }}>
                    {confession.text}
                  </div>

                  {/* Tags */}
                  {confession.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                      {confession.tags.map((tag) => (
                        <span key={tag} className="pill pill-spark">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <div style={{ fontFamily: 'var(--f3)', fontSize: 10, letterSpacing: '0.05em', color: 'var(--t3)', marginBottom: '14px' }}>
                    ❤️ {confession.reactionCount} REACTIONS · 💬 {confession.commentsCount} COMMENTS
                  </div>

                  {/* Actions */}
                  {confession.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => approveConfession(confession._id)}
                        className="btn-primary"
                        style={{ padding: '9px 20px', fontSize: '12px' }}
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => rejectConfession(confession._id)}
                        className="btn-ghost"
                        style={{ padding: '9px 20px', fontSize: '12px', borderColor: 'var(--rose)', color: 'var(--rose)' }}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
