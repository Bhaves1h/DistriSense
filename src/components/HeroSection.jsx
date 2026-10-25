import React, { useEffect, useState, useRef } from 'react';
import { DASHBOARD_URL, getSmartDashboardUrl } from '../config';

export default function HeroSection({ onOpenDashboard }) {
  const [mounted, setMounted] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const videoWrapRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // Ensure CloudFront dawn hero video plays
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const targetX = ((e.clientX - cx) / cx) * 16;
      const targetY = ((e.clientY - cy) / cy) * 16;
      setOffset({ x: targetX, y: targetY });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section className="cinematic-hero-section" id="hero">
      {/* Video Background with Mouse Parallax */}
      <div 
        className="cinematic-video-wrap" 
        ref={videoWrapRef}
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`
        }}
      >
        <video
          ref={videoRef}
          className="cinematic-video"
          poster="/assets/hero-dawn.jpg"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260510_060007_60275ce7-030c-4668-a160-8f364ec537d3.mp4" type="video/mp4" />
          <source src="/assets/hero-dawn.mp4" type="video/mp4" />
          <source src="/assets/hero-loop.mp4" type="video/mp4" />
        </video>
        <div className="cinematic-vignette" aria-hidden="true" />
      </div>

      {/* Headline Block */}
      <div className={`cinematic-hero-headline ${mounted ? 'mounted' : ''}`}>
        <h1 className="cinematic-title-line-1">Distribution intelligence.</h1>
        <h2 className="cinematic-title-line-2">Foresight before the shelf runs dry.</h2>
      </div>

      {/* Bottom Block: Exact Subline + One CTA Pill */}
      <div className={`cinematic-hero-bottom ${mounted ? 'mounted' : ''}`}>
        <p className="cinematic-lead-text">
          it sees the stockout before the shelf does
        </p>

        <a href={getSmartDashboardUrl()} className="cinematic-cta-btn">
          <span>Open the dashboard</span>
        </a>
      </div>
    </section>
  );
}
