import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import TracingBeam from './TracingBeam';
import { DASHBOARD_URL } from '../config';

const DECK_CARDS = [
  {
    key: 'festival',
    type: 'sage',
    tabName: 'Festival Spike ×1.4',
    eyebrow: 'Scenario Simulator · Spike ×1.4',
    quote: '"Festival spike: 1,825 stockout events doing nothing. With DistriSense: fewer than one."',
    stats: [
      { label: 'DistriSense Stockouts', val: '< 1 event' },
      { label: 'Unmanaged Stockouts', val: '1,825 events' },
      { label: 'Net Rupees Protected', val: '₹3,38,572' }
    ],
    footnote: 'Simulated · 600 Kolhapur positions, hold-out seeds, never tuned on'
  },
  {
    key: 'expiry',
    type: 'olive',
    tabName: 'Expiry Wave Inbound',
    eyebrow: 'Scenario Simulator · Expiry wave',
    quote: '"Expiry write-offs cut by two-thirds — 3,343 units against 10,261 — because batches move while they can still sell."',
    stats: [
      { label: 'DistriSense Write-offs', val: '3,343 units' },
      { label: 'Unmanaged Write-offs', val: '10,261 (−67%)' },
      { label: 'Net Rupees Protected', val: '+₹2,64,220' }
    ],
    footnote: 'Simulated · 600 Kolhapur positions, hold-out seeds, never tuned on'
  },
  {
    key: 'flat',
    type: 'paper',
    tabName: 'Flat Steady Week',
    eyebrow: 'Scenario Simulator · Flat week',
    quote: '"On a flat week the honest gain is small: lost sales fall 5%. The system says so itself, on the same screen."',
    stats: [
      { label: 'Net Protected', val: '+₹90,581' },
      { label: 'Write-off Savings', val: '₹84,753' },
      { label: 'Stockout Reduction', val: '~5%' }
    ],
    footnote: 'Simulated · 600 Kolhapur positions, hold-out seeds, never tuned on'
  }
];

// 1. Number Ticker Component (Counts up over ~1.2s with ease-out, Indian digit grouping on view)
function NumberTicker({ value, triggerKey }) {
  if (!value || value.trim().startsWith('<')) {
    return <span>{value}</span>;
  }

  const match = value.match(/^([^\d]*)([\d,]+)(.*)$/);
  if (!match) return <span>{value}</span>;

  const prefix = match[1];
  const targetNum = parseInt(match[2].replace(/,/g, ''), 10);
  const suffix = match[3];

  const [currentNum, setCurrentNum] = useState(0);
  const spanRef = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
      }
    }, { threshold: 0.2 });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView) {
      setCurrentNum(0);
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setCurrentNum(targetNum);
      return;
    }

    let start = null;
    let animId;
    const duration = 1200; // ~1.2s

    const step = (timestamp) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrentNum(Math.round(targetNum * eased));

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setCurrentNum(targetNum);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isInView, targetNum]);

  const formatted = currentNum.toLocaleString('en-IN');
  return <span ref={spanRef}>{prefix}{formatted}{suffix}</span>;
}

// 2. Border Beam Component (Soft deep-teal light segment traveling the card border continuously)
function BorderBeam() {
  return (
    <div className="border-beam-container" aria-hidden="true">
      <svg className="border-beam-svg">
        <rect
          x="1"
          y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          rx="16"
          fill="none"
          pathLength="1000"
          className="border-beam-track-line"
        />
      </svg>
      <div className="border-beam-glow" />
    </div>
  );
}

// 3. Quote Reveal Component (Text Generate Effect style with preserved spaces between words)
function TextGenerateQuote({ text }) {
  const words = text.split(' ');

  return (
    <div className="deck-card-quote">
      {words.map((word, idx) => (
        <React.Fragment key={idx}>
          <span
            className="quote-word-fade"
            style={{ animationDelay: `${idx * 30}ms` }}
          >
            {word}
          </span>
          {idx < words.length - 1 ? ' ' : ''}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function FindingsDeckSection({ onOpenDashboardWithTab }) {
  return (
    <section className="findings-section" id="proof">
      <TracingBeam className="container">
        <div className="findings-grid">
          {/* Left Sticky Column */}
          <div className="findings-sticky-left">
            <span className="eyebrow" style={{ color: 'var(--color-olive)' }}>Hold-Out Validation</span>
            <h2>Proven in simulation,<br />before it costs a rupee.</h2>
            <p>
              DistriSense replays a 600-position territory under stress, three ways — doing nothing, the weekly manual review, and the daily decision loop.
            </p>

            <a
              href="#/login"
              className="pill pill-solid"
            >
              <span className="pill-window">
                <span className="pill-track">
                  <span>Open the dashboard</span>
                  <span aria-hidden="true">Open the dashboard</span>
                </span>
              </span>
              <ArrowRight size={15} />
            </a>
          </div>

          {/* Right Column: Stack of All Three Scenario Cards */}
          <div className="findings-card-half">
            {/* Backdrop: Faint Dot Pattern behind right column */}
            <div className="findings-dot-pattern" aria-hidden="true" />

            <div 
              className="findings-stacked-cards" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '48px', 
                position: 'relative', 
                zIndex: 1 
              }}
            >
              {DECK_CARDS.map((card) => (
                <div key={card.key} className="findings-stacked-card-item">
                  {/* Scenario Name static non-interactive label */}
                  <div style={{ marginBottom: '14px' }}>
                    <span 
                      style={{ 
                        display: 'inline-block', 
                        cursor: 'default', 
                        pointerEvents: 'none',
                        userSelect: 'none',
                        background: 'rgba(38, 38, 36, 0.06)',
                        border: '1px solid rgba(38, 38, 36, 0.2)',
                        borderRadius: '999px',
                        color: 'var(--color-ink)',
                        fontSize: '13px',
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                        padding: '6px 16px'
                      }}
                    >
                      {card.tabName}
                    </span>
                  </div>

                  {/* Scenario Card */}
                  <div className={`deck-card deck-card-${card.type}`}>
                    <BorderBeam />

                    <div>
                      <span className={`eyebrow ${card.type === 'olive' ? 'eyebrow-light' : ''}`}>
                        {card.eyebrow}
                      </span>

                      <TextGenerateQuote text={card.quote} />
                    </div>

                    {/* Metric Highlights */}
                    <div 
                      className="deck-card-stats" 
                      style={{
                        background: card.type === 'olive' 
                          ? 'rgba(0,0,0,0.2)' 
                          : card.type === 'sage' 
                          ? 'rgba(255,255,255,0.3)' 
                          : 'rgba(38,38,36,0.05)'
                      }}
                    >
                      {card.stats.map((s, idx) => (
                        <div key={idx} className="deck-stat-col">
                          <span className="deck-stat-label">{s.label}</span>
                          <span className="deck-stat-num">
                            <NumberTicker 
                              value={s.val} 
                              triggerKey={card.key} 
                            />
                          </span>
                        </div>
                      ))}
                    </div>

                    <div 
                      className="deck-card-bottom" 
                      style={{ 
                        borderColor: card.type === 'olive' 
                          ? 'rgba(255,255,255,0.2)' 
                          : 'rgba(38,38,36,0.15)' 
                      }}
                    >
                      <span>Scenario Simulator Engine</span>
                      <span style={{ fontSize: '11px', opacity: 0.85 }}>{card.footnote}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </TracingBeam>
    </section>
  );
}
