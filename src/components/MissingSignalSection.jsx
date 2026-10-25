import React from 'react';

const CHANNELS = [
  'Kirana stores',
  'Supermarkets',
  'Wholesalers',
  'Pharmacies',
  'Dairy booths',
  'General trade'
];

export default function MissingSignalSection() {
  return (
    <section className="missing-signal-section">
      <div className="container">
        <div className="missing-signal-grid">
          {/* Left Text & Channel Pills */}
          <div className="missing-signal-text">
            <span className="eyebrow" style={{ color: 'var(--color-sage)' }}>Daily Field Cohesion</span>
            <h2>Connecting with the<br />missing signal: tomorrow</h2>
            <p>
              Distributors know their territory by feel. DistriSense gives that feel a forecast: expert judgment, pointed at the day after tomorrow instead of the week behind.
            </p>
            <div className="outline-tags-wrap">
              {CHANNELS.map(ch => (
                <span key={ch} className="outline-tag">{ch}</span>
              ))}
            </div>
          </div>

          {/* Right Visual Video Panel */}
          <div className="missing-signal-visual">
            <video
              className="signal-media-video"
              poster="/assets/signal-hand.jpg"
              autoPlay
              muted
              loop
              playsInline
            >
              <source src="/assets/signal-loop.mp4" type="video/mp4" />
            </video>
          </div>
        </div>

        {/* 3 Stat Cards in a Row */}
        <div className="stat-cards-row">
          <div className="stat-card-item">
            <div className="stat-card-number">6,000</div>
            <div className="stat-card-label">outlet–SKU positions scored daily at 05:00 IST</div>
          </div>
          <div className="stat-card-item">
            <div className="stat-card-number">13</div>
            <div className="stat-card-label">focused priority approval lanes a day, not 600 rows</div>
          </div>
          <div className="stat-card-item">
            <div className="stat-card-number">−67%</div>
            <div className="stat-card-label">expiry write-offs cut across warehouse inventory</div>
          </div>
        </div>
      </div>
    </section>
  );
}
