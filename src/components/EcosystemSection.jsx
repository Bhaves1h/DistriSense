import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { DASHBOARD_URL } from '../config';

const ECO_CARDS = [
  {
    id: 'forecast',
    eyebrow: 'DAILY DEMAND PREDICTION',
    title: 'Forecast Engine',
    image: '/assets/card-forecast.jpg',
    description: 'A 14-day demand forecast for every outlet–SKU — recent sales, day-of-week rhythm, festival calendar, trend. Every factor shown; never a black box.',
    features: [
      'Poisson & Gaussian volatility modelling',
      'Festival & wedding calendar modifiers',
      'Shelf velocity rhythm tracking'
    ],
    actionText: 'Open the dashboard',
    actionTab: 'forecast'
  },
  {
    id: 'radar',
    eyebrow: 'STOCKOUT & EXPIRY SCORING',
    title: 'Risk Radar',
    image: '/assets/card-radar.jpg',
    description: 'Every position scored each morning: days of cover, probability of stocking out, expiry exposure — ranked by rupees at risk, worst first.',
    features: [
      'Rupees at risk prioritized queue',
      'Short-shelf-life batch countdowns',
      'Stockout probability threshold alerts'
    ],
    actionText: 'Open the dashboard',
    actionTab: 'radar'
  },
  {
    id: 'optimizer',
    eyebrow: 'COST-MINIMISING ALLOCATION',
    title: 'Transfer Optimizer',
    image: '/assets/card-transfer.jpg',
    description: 'For every at-risk shelf, the cheapest safe source — solved as an optimisation, not a guess. A source never drops below its own reorder point.',
    features: [
      'Multi-hub origin cost matrix',
      'Strict safety buffer protection',
      '1-click dispatch approval'
    ],
    actionText: 'Open the dashboard',
    actionTab: 'queue'
  },
  {
    id: 'simulator',
    eyebrow: 'BEFORE / AFTER PROOF',
    title: 'Scenario Simulator',
    image: '/assets/card-simulator.jpg',
    description: 'Festival spike, flat week, demand drop, expiry wave — replay the territory three ways and watch doing nothing lose, in rupees.',
    features: [
      'Interactive demand surge shock testing',
      'Hold-out seeds without overfitting',
      'Quantified write-off prevention'
    ],
    actionText: 'Open the dashboard',
    actionTab: 'simulator'
  }
];

function EcosystemCardItem({ card, onOpenDashboardWithTab, registerCardRef }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      ref={registerCardRef}
      className={`ecosystem-card flip-card ${isFlipped ? 'is-flipped' : ''}`}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
      onClick={(e) => {
        // Touch devices / tap: toggle that card only
        if (e.target.closest('button, a')) return;
        setIsFlipped(prev => !prev);
      }}
    >
      <div className="flip-card-inner">
        {/* Front Face: Atmospheric Imagery (Painting) */}
        <div className="card-face card-front">
          <img src={card.image} alt={card.title} loading="lazy" />
          <div className="card-front-overlay">
            <span className="card-face-eyebrow">{card.eyebrow}</span>
            <h3 className="card-face-title">{card.title}</h3>
          </div>
        </div>

        {/* Back Face: Deep Logic & Action (Text) */}
        <div className="card-face card-back">
          <div>
            <span className="card-face-eyebrow" style={{ color: 'var(--color-sage)' }}>{card.eyebrow}</span>
            <h3 className="card-face-title" style={{ fontSize: '26px' }}>{card.title}</h3>
            <p>{card.description}</p>
            
            <ul className="card-back-features">
              {card.features.map((feat, i) => (
                <li key={i}>
                  <CheckCircle2 size={15} />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <a
            href={DASHBOARD_URL}
            onClick={(e) => e.stopPropagation()}
            className="pill pill-outline-light"
            style={{ marginTop: '20px', width: '100%', justifyContent: 'center' }}
          >
            <span className="pill-window">
              <span className="pill-track">
                <span>{card.actionText}</span>
                <span aria-hidden="true">{card.actionText}</span>
              </span>
            </span>
            <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function EcosystemSection({ onOpenDashboardWithTab }) {
  const cardRefs = useRef([]);

  useEffect(() => {
    const cards = cardRefs.current.filter(Boolean);
    if (!cards.length) return;

    if (!('IntersectionObserver' in window)) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Entrance flow-in (threshold 0.15, vanilla IntersectionObserver)
    let flowObserver = null;
    if (!reduceMotion) {
      cards.forEach((card, i) => {
        card.classList.add('flow-init');
        card.style.setProperty('--flow-delay', `${(i * 0.13).toFixed(2)}s`);
      });

      flowObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('flow-in');
              flowObserver.unobserve(e.target);
            }
          });
        },
        { threshold: 0.15 }
      );

      cards.forEach((card) => flowObserver.observe(card));
    }

    return () => {
      if (flowObserver) flowObserver.disconnect();
    };
  }, []);

  return (
    <section className="ecosystem-section" id="system">
      <div className="container">
        <div className="section-header-left">
          <span className="eyebrow" style={{ color: 'var(--color-teal)' }}>Core Decision Engine</span>
          <h2>Meet the DistriSense system</h2>
          <p className="lead-sub">
            We build the foresight layer for FMCG distribution, helping distributors act on tomorrow's demand the way they can only see yesterday's today.
          </p>
        </div>

        <div className="ecosystem-grid">
          {ECO_CARDS.map((card, idx) => (
            <EcosystemCardItem
              key={card.id}
              card={card}
              onOpenDashboardWithTab={onOpenDashboardWithTab}
              registerCardRef={(el) => (cardRefs.current[idx] = el)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
