import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import EcosystemSection from './components/EcosystemSection';
import ExpertiseSection from './components/ExpertiseSection';
import InterludeMapSection from './components/InterludeMapSection';
import FindingsDeckSection from './components/FindingsDeckSection';
import MissingSignalSection from './components/MissingSignalSection';
import PathMarqueeSection from './components/PathMarqueeSection';
import TealFinaleSection from './components/TealFinaleSection';
import DashboardView from './components/DashboardView';
import LoginPage from './components/LoginPage';
import { CheckCircle2 } from 'lucide-react';

import { getCurrentCompany, getDashboardUrl } from './config';

export default function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [dashboardTab, setDashboardTab] = useState('queue');
  const [preloaderVisible, setPreloaderVisible] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [currentCompany, setCurrentCompany] = useState(() => getCurrentCompany());

  // Check URL on load, popstate, hashchange, and storage change
  useEffect(() => {
    const handleUrlChange = () => {
      const hash = window.location.hash;
      const savedCompany = getCurrentCompany();
      setCurrentCompany(savedCompany);

      if (hash === '#/login' || hash === '#login') {
        // If user is already authenticated (e.g. pressed browser Back from dashboard):
        // NEVER re-prompt for registration/sign-in. Cleanly resume landing page with auth state!
        if (savedCompany && savedCompany.trim()) {
          window.history.replaceState(null, '', '#overview');
          setCurrentView('landing');
          return;
        }
        try {
          localStorage.removeItem('ds_onboarding');
        } catch (_) {}
        setCurrentView('login');
      } else if (
        hash.startsWith('#dashboard') || 
        hash.startsWith('#/dashboard') || 
        window.location.pathname.includes('/dashboard')
      ) {
        setCurrentView('dashboard');
      } else {
        setCurrentView('landing');
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('storage', handleUrlChange);
    window.addEventListener('distrisense_auth_changed', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('storage', handleUrlChange);
      window.removeEventListener('distrisense_auth_changed', handleUrlChange);
    };
  }, []);

  // Preloader auto-dismiss
  useEffect(() => {
    const timer = setTimeout(() => {
      setPreloaderVisible(false);
    }, 1600);
    return () => clearTimeout(timer);
  }, []);

  // Toast trigger
  const showToast = (message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // View navigation helper
  const navigateTo = (view, tab = 'queue') => {
    setCurrentView(view);
    setDashboardTab(tab);
    if (view === 'dashboard') {
      let comp = null;
      try {
        comp = new URLSearchParams(window.location.search).get('company') || localStorage.getItem('ds_company');
      } catch (_) {}
      const compParam = comp ? `?company=${encodeURIComponent(comp)}` : '';
      window.history.pushState(null, '', `#dashboard${compParam}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.history.pushState(null, '', '#overview');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const openDashboardWithTab = (tab) => {
    navigateTo('dashboard', tab);
  };

  return (
    <>
      {/* Subtle full-page film grain overlay */}
      <div className="grain-overlay" aria-hidden="true" />

      {/* Opening Preloader */}
      {preloaderVisible && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'var(--color-paper)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'opacity 0.6s ease',
            pointerEvents: 'none'
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '48px', fontWeight: 600, color: 'var(--color-ink)' }}>
              distri
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 600, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'var(--color-ink)' }}>
              SENSE
            </span>
          </div>
        </div>
      )}

      {/* Active View Rendering */}
      {currentView === 'login' ? (
        <LoginPage onLoginSuccess={(comp) => {
          setCurrentCompany(comp);
          try {
            window.dispatchEvent(new Event('distrisense_auth_changed'));
          } catch (_) {}
        }} />
      ) : currentView === 'dashboard' ? (
        <DashboardView 
          initialTab={dashboardTab}
          onNavigateBack={() => navigateTo('landing')}
          showToast={showToast}
        />
      ) : (
        <div className="overview-page">
          <Header 
            currentView={currentView}
            currentCompany={currentCompany}
            onNavigate={(view) => navigateTo(view)}
            onSwitchCompany={() => {
              try {
                localStorage.removeItem('ds_company');
                localStorage.removeItem('ds_onboarding');
              } catch (_) {}
              setCurrentCompany(null);
              window.location.hash = '#/login';
              setCurrentView('login');
            }}
          />

          <main>
            <HeroSection 
              onOpenDashboard={() => navigateTo('dashboard', 'queue')}
            />

            <EcosystemSection 
              onOpenDashboardWithTab={openDashboardWithTab}
            />

            <ExpertiseSection />

            <InterludeMapSection 
              onOpenDashboardWithTab={openDashboardWithTab}
            />

            <FindingsDeckSection 
              onOpenDashboardWithTab={openDashboardWithTab}
            />

            <MissingSignalSection />

            <PathMarqueeSection />

            <TealFinaleSection 
              onOpenDashboard={() => navigateTo('dashboard', 'queue')}
            />
          </main>
        </div>
      )}

      {/* Global Toast Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className="toast-item">
            <CheckCircle2 size={18} color="var(--color-sage)" />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}
