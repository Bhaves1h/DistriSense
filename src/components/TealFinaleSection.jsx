import React from 'react';
import { ArrowRight } from 'lucide-react';
import { DASHBOARD_URL, getSmartDashboardUrl } from '../config';

export default function TealFinaleSection({ onOpenDashboard }) {
  return (
    <section className="statement-section">
      {/* Full-bleed statement image band with bottom gradient fade */}
      <div className="statement-image-band">
        <img 
          src="/assets/statement-bg.jpg" 
          alt="Distribution Network Statement" 
          className="statement-crowd-img"
          loading="lazy"
        />
        <div className="statement-image-fade" aria-hidden="true" />
      </div>

      <div className="container statement-inner">
        {/* "How a company starts" strip (B3) */}
        <div className="finale-steps-strip">
          <div className="finale-step-item">
            <span className="finale-step-num">1</span>
            <span className="finale-step-sep">—</span>
            <span className="finale-step-text">Bring your stock and sales data (simple CSV import)</span>
          </div>
          <div className="finale-step-item">
            <span className="finale-step-num">2</span>
            <span className="finale-step-sep">—</span>
            <span className="finale-step-text">Every morning, one queue: what will empty or expire, worst first</span>
          </div>
          <div className="finale-step-item">
            <span className="finale-step-num">3</span>
            <span className="finale-step-sep">—</span>
            <span className="finale-step-text">You approve each move; the warehouse gets the exact dispatch on WhatsApp</span>
          </div>
        </div>

        <span className="eyebrow" style={{ color: 'var(--color-sage)' }}>Autonomous Foresight</span>
        <h2>Excel tells you what already happened.<br />Now, foresight is everything.</h2>
        <p>See the queue your distributor will face tomorrow morning — and clear it today.</p>
        
        <a 
          href={getSmartDashboardUrl()}
          className="pill pill-solid"
        >
          <span className="pill-window">
            <span className="pill-track">
              <span>Open the dashboard</span>
              <span aria-hidden="true">Open the dashboard</span>
            </span>
          </span>
          <ArrowRight size={16} />
        </a>
      </div>
    </section>
  );
}
