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

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'DM Mono' }}>
      <h1 style={{ color: 'var(--spark)', marginBottom: '30px' }}>🛡️ Admin Panel - Confession Moderation</h1>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: toast.type === 'success' ? '#10b981' : '#ef4444',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid var(--border)' }}>
        {(['pending', 'approved', 'all'] as const).map(status => (
          <button
            key={status}
            onClick={() => setActiveStatus(status)}
            style={{
              padding: '12px 20px',
              background: activeStatus === status ? 'var(--spark)' : 'transparent',
              color: activeStatus === status ? 'white' : 'var(--t3)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeStatus === status ? 'bold' : 'normal',
              borderBottom: activeStatus === status ? '2px solid var(--spark)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            {status === 'pending' && `⏳ Pending (${confessions.filter(c => c.status === 'pending').length})`}
            {status === 'approved' && `✅ Approved`}
            {status === 'all' && `📋 All`}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t2)' }}>
          Loading confessions...
        </div>
      )}

      {/* Confessions List */}
      {!loading && confessions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t2)' }}>
          No confessions to moderate
        </div>
      )}

      {!loading && confessions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {confessions.map(confession => (
            <div
              key={confession._id}
              style={{
                border: `1px solid ${confession.status === 'pending' ? 'var(--amber)' : 'var(--spark)'}`,
                borderRadius: '12px',
                padding: '16px',
                background: 'var(--card2)',
                position: 'relative'
              }}
            >
              {/* Status Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  padding: '4px 8px',
                  background: confession.status === 'pending' ? 'var(--amber)' : 'var(--spark)',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                {confession.status.toUpperCase()}
              </div>

              {/* Header */}
              <div style={{ marginBottom: '12px', paddingRight: '100px' }}>
                <div style={{ fontSize: '12px', color: 'var(--t3)', marginBottom: '4px' }}>
                  {confession.isAnonymous ? '🔒 Anonymous' : '👤 Named'} • {new Date(confession.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* Text */}
              <div style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '12px', color: 'var(--t1)' }}>
                {confession.text}
              </div>

              {/* Tags */}
              {confession.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {confession.tags.map(tag => (
                    <span
                      key={tag}
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(224, 48, 192, 0.1)',
                        color: 'var(--spark)',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div style={{ fontSize: '12px', color: 'var(--t3)', marginBottom: '12px' }}>
                ❤️ {confession.reactionCount} reactions • 💬 {confession.commentsCount} comments
              </div>

              {/* Actions */}
              {confession.status === 'pending' && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => approveConfession(confession._id)}
                    style={{
                      padding: '8px 16px',
                      background: 'var(--spark)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => rejectConfession(confession._id)}
                    style={{
                      padding: '8px 16px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    ❌ Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
