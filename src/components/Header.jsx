import React, { useState, useEffect } from 'react';
import { ArrowRight, LayoutDashboard, Menu, X } from 'lucide-react';
import { DASHBOARD_URL, getDashboardUrl } from '../config';

export default function Header({ currentView, currentCompany, onNavigate, onSwitchCompany }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    if (currentView !== 'landing') {
      onNavigate('landing');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className={`cinematic-header ${scrolled ? 'scrolled' : ''}`} id="mainNav">
      {/* Brand Wordmark */}
      <div 
        className="cinematic-wordmark" 
        onClick={() => {
          onNavigate('landing');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      >
        <span className="distri">distri</span>
        <span className="sense">SENSE</span>
        <sup>TM</sup>
      </div>

      {/* Center Liquid-Glass Nav */}
      <nav className="liquid-glass cinematic-nav">
        <button onClick={() => scrollToSection('system')} className="cinematic-nav-link">SYSTEM</button>
        <button onClick={() => scrollToSection('proof')} className="cinematic-nav-link">PROOF</button>
        <button onClick={() => scrollToSection('expertise')} className="cinematic-nav-link">EXPERTISE</button>
        <button onClick={() => scrollToSection('proof')} className="cinematic-nav-link">SIMULATION</button>
      </nav>

      {/* Right Liquid-Glass CTA Anchor */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {currentCompany ? (
          <>
            <div 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '12px',
                color: '#E9E8E1',
              }}
            >
              <span 
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#34c759',
                  boxShadow: '0 0 6px rgba(52, 199, 89, 0.6)'
                }} 
              />
              <span style={{ fontWeight: 500, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentCompany}
              </span>
              <button
                type="button"
                onClick={() => {
                  const confirmed = window.confirm(`Log out of "${currentCompany}" and sign in as another company?`);
                  if (confirmed && onSwitchCompany) {
                    onSwitchCompany();
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8AAFA7',
                  fontSize: '11px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '0 2px'
                }}
                title="Log out or sign in as another company"
              >
                Switch
              </button>
            </div>

            <a 
              href={getDashboardUrl(currentCompany)}
              className="liquid-glass cinematic-nav-cta"
            >
              Dashboard &rarr;
            </a>
          </>
        ) : (
          <>
            <a 
              href="#/login"
              className="cinematic-nav-link"
              style={{ fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}
            >
              Sign In
            </a>
            <a 
              href="#/login"
              className="liquid-glass cinematic-nav-cta"
            >
              Open the dashboard
            </a>
          </>
        )}

        {/* Mobile menu trigger */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: '#fff',
            padding: '8px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'none'
          }}
          className="mobile-menu-btn"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: '72px',
          left: 0,
          right: 0,
          background: 'rgba(18, 22, 21, 0.96)',
          backdropFilter: 'blur(16px)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 999
        }}>
          <button onClick={() => scrollToSection('system')} className="cinematic-nav-link" style={{ textAlign: 'left' }}>SYSTEM</button>
          <button onClick={() => scrollToSection('expertise')} className="cinematic-nav-link" style={{ textAlign: 'left' }}>EXPERTISE</button>
          <button onClick={() => scrollToSection('map')} className="cinematic-nav-link" style={{ textAlign: 'left' }}>TERRITORY MAP</button>
          <button onClick={() => scrollToSection('proof')} className="cinematic-nav-link" style={{ textAlign: 'left' }}>PROOF & FINDINGS</button>
          <button onClick={() => scrollToSection('proof')} className="cinematic-nav-link" style={{ textAlign: 'left' }}>SIMULATION</button>
          
          {currentCompany ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: '#E9E8E1' }}>
                <span>Signed in: <strong>{currentCompany}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    const confirmed = window.confirm(`Log out of "${currentCompany}" and sign in as another company?`);
                    if (confirmed && onSwitchCompany) onSwitchCompany();
                  }}
                  style={{ background: 'none', border: 'none', color: '#8AAFA7', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Switch
                </button>
              </div>
              <a 
                href={getDashboardUrl(currentCompany)}
                className="pill pill-solid"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Open Dashboard &rarr;
              </a>
            </div>
          ) : (
            <>
              <a 
                href="#/login"
                className="cinematic-nav-link"
                style={{ textAlign: 'left', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In / Register
              </a>
              <a 
                href="#/login"
                className="pill pill-solid"
                style={{ width: '100%', marginTop: '4px', justifyContent: 'center' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Open the dashboard
              </a>
            </>
          )}
        </div>
      )}
    </header>
  );
}
