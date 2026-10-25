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

export default function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [dashboardTab, setDashboardTab] = useState('queue');
  const [preloaderVisible, setPreloaderVisible] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Check URL on load, popstate, and hashchange
  useEffect(() => {
    const handleUrlChange = () => {
      const hash = window.location.hash;
      if (hash === '#/login' || hash === '#login') {
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
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
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
        <LoginPage />
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
            onNavigate={(view) => navigateTo(view)}
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
