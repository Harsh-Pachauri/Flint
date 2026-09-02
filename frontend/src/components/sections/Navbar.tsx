import React, { useState, useEffect } from 'react';

const Navbar: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const syncAuthState = () => {
      const token = localStorage.getItem('accessToken');
      setIsAuthenticated(!!token);
      setIsAdmin(localStorage.getItem('role') === 'admin');
    };

    // Check if user has access token
    syncAuthState();

    // Listen for storage changes (login/logout)
    const handleStorageChange = () => syncAuthState();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-changed', handleStorageChange as EventListener);
    window.addEventListener('focus', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-changed', handleStorageChange as EventListener);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    localStorage.removeItem('onboardingComplete');
    localStorage.removeItem('onboarded');
    window.dispatchEvent(new Event('auth-changed'));
    setIsAuthenticated(false);
    setIsAdmin(false);
    window.location.hash = '#/';
  };

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 32px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(7, 7, 15, 0.72)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--f1)',
          fontWeight: 800,
          fontSize: '20px',
          letterSpacing: '-0.04em',
          color: 'var(--t1)',
          cursor: 'pointer',
        }}
        onClick={() => (window.location.hash = '#/')}
      >
        FL<span style={{ color: 'var(--spark)' }}>INT</span>
        <span
          style={{
            fontFamily: 'var(--f3)',
            fontSize: '9px',
            fontWeight: 400,
            color: 'var(--t3)',
            marginLeft: '8px',
            letterSpacing: '0.08em',
          }}
        >
          BETA
        </span>
      </div>
      <div
        className="desktop-only"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '28px',
        }}
      >
        <span style={{ fontFamily: 'var(--f2)', fontSize: '13px', color: 'var(--t2)', cursor: 'pointer' }} onClick={() => (window.location.hash = '#/')}>
          Home
        </span>
        {isAuthenticated && (
          <>
            <span style={{ fontFamily: 'var(--f2)', fontSize: '13px', color: 'var(--t2)', cursor: 'pointer' }} onClick={() => (window.location.hash = '#/campus-pulse')}>
              Campus Pulse
            </span>
            <span style={{ fontFamily: 'var(--f2)', fontSize: '13px', color: 'var(--t2)', cursor: 'pointer' }} onClick={() => (window.location.hash = '#/discover')}>
              Discover
            </span>
            <span style={{ fontFamily: 'var(--f2)', fontSize: '13px', color: 'var(--t2)', cursor: 'pointer' }} onClick={() => (window.location.hash = '#/matches')}>
              Matches
            </span>
            {isAdmin && (
              <span style={{ fontFamily: 'var(--f2)', fontSize: '13px', color: 'var(--spark)', cursor: 'pointer' }} onClick={() => (window.location.hash = '#/admin')}>
                Admin
              </span>
            )}
          </>
        )}
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {isAuthenticated ? (
          <>
            <button
              className="btn-ghost"
              style={{ fontSize: '12px', padding: '8px 18px' }}
              onClick={() => (window.location.hash = '#/profile')}
            >
              👤 Profile
            </button>
            <button
              className="btn-ghost"
              style={{ fontSize: '12px', padding: '8px 18px' }}
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <button
              className="btn-ghost"
              style={{ fontSize: '12px', padding: '8px 18px' }}
              onClick={() => (window.location.hash = '#/login')}
            >
              Login
            </button>
            <button
              className="btn-primary"
              style={{ fontSize: '12px', padding: '8px 18px' }}
              onClick={() => (window.location.hash = '#/register')}
            >
              Join Free
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
