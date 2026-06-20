import React, { useEffect, useState } from 'react';
import './App.css';
import Homepage from './components/Homepage';
import Navbar from './components/sections/Navbar';
import Register from './components/pages/Register';
import Login from './components/pages/Login';
import Onboarding from './components/pages/Onboarding';
import CampusPulse from './components/pages/CampusPulse';
import Discover from './components/pages/Discover';
import Profile from './components/pages/Profile';
import PublicProfile from './components/pages/PublicProfile';
import Matches from './components/pages/Matches';
import AdminPanel from './components/pages/AdminPanel';
import { isOnboardingCompleteState } from './utils/api';

function App() {
  const [route, setRoute] = useState<string>(window.location.hash || '#/');
  const [authStateTick, setAuthStateTick] = useState(0);

  useEffect(() => {
    function onHash() {
      setRoute(window.location.hash || '#/');
    }
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const bumpAuthState = () => setAuthStateTick((value) => value + 1);
    window.addEventListener('auth-changed', bumpAuthState as EventListener);
    window.addEventListener('storage', bumpAuthState);
    window.addEventListener('focus', bumpAuthState);
    return () => {
      window.removeEventListener('auth-changed', bumpAuthState as EventListener);
      window.removeEventListener('storage', bumpAuthState);
      window.removeEventListener('focus', bumpAuthState);
    };
  }, []);

  useEffect(() => {
    const currentRoute = window.location.hash || '#/';
    const isAuthenticated = !!localStorage.getItem('accessToken');
    const onboardingComplete = isOnboardingCompleteState();

    if (!isAuthenticated && currentRoute === '#/onboarding') {
      window.location.hash = '#/login';
      return;
    }

    if (isAuthenticated && !onboardingComplete && currentRoute !== '#/onboarding') {
      window.location.hash = '#/onboarding';
      return;
    }

    if (isAuthenticated && onboardingComplete && (currentRoute === '#/login' || currentRoute === '#/register' || currentRoute === '#/onboarding')) {
      window.location.hash = '#/';
    }
  }, [route, authStateTick]);

  let content = <Homepage />;
  if (route === '#/register') content = <Register />;
  if (route === '#/login') content = <Login />;
  if (route === '#/onboarding') content = <Onboarding />;
  if (route.startsWith('#/campus-pulse')) content = <CampusPulse />;
  if (route.startsWith('#/discover')) content = <Discover />;
  if (route.startsWith('#/matches')) content = <Matches />;
  if (route === '#/profile') content = <Profile />;
  if (route.startsWith('#/profile/') && route.split('/').length >= 3) content = <PublicProfile />;
  if (route === '#/admin') content = <AdminPanel />;

  return (
    <div className="App">
      {route !== '#/onboarding' && <Navbar />}
      {content}
    </div>
  );
}

export default App;
