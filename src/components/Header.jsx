import React, { useState, useEffect } from 'react';
import { ArrowRight, LayoutDashboard, Menu, X } from 'lucide-react';
import { DASHBOARD_URL } from '../config';

export default function Header({ currentView, onNavigate }) {
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
        <a 
          href="#/login"
          className="cinematic-nav-link"
          style={{ fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}
        >
          Sign In
        </a>
        <a 
          href={DASHBOARD_URL}
          className="liquid-glass cinematic-nav-cta"
        >
          Open the dashboard
        </a>

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
          <a 
            href="#/login"
            className="cinematic-nav-link"
            style={{ textAlign: 'left', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em' }}
          >
            Sign In / Register
          </a>
          <a 
            href={DASHBOARD_URL}
            className="pill pill-solid"
            style={{ width: '100%', marginTop: '4px', justifyContent: 'center' }}
          >
            Open the dashboard
          </a>
        </div>
      )}
    </header>
  );
}
