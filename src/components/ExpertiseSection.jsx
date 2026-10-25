import React, { useState, useEffect, useRef } from 'react';

const STATEMENTS = [
  "Built on real-world distribution expertise",
  "DistriSense watches a territory of warehouses and kirana shelves — and every route between them",
  "It sees the stockout before the shelf does",
  "Every shelf, scored by rupees at risk — worst first",
  "With tomorrow already in view"
];

/* Fragments with data-speed, data-from and positions strictly outside the clear zone:
   Horizontal [27%, 73%] and Vertical [18%, 82%] */
const FRAGMENTS = [
  { from: 'top', speed: 0.9, src: '/assets/panel-scanner.jpg', style: { top: '-4%', left: '6%', width: '280px', height: '200px' } },
  { from: 'top', speed: 0.55, src: '/assets/collage-hands.jpg', style: { top: '4%', left: '30%', width: '110px', height: '84px' } },
  { from: 'top', speed: 1.2, src: '/assets/panel-elder.jpg', style: { top: '-8%', right: '18%', width: '170px', height: '190px' } },
  { from: 'top', speed: 0.7, src: '/assets/panel-jars.jpg', style: { top: '2%', right: '-3%', width: '260px', height: '200px' } },
  { from: 'bottom', speed: 1.1, src: '/assets/panel-cart.jpg', style: { bottom: '4%', left: '-2%', width: '250px', height: '190px' } },
  { from: 'bottom', speed: 0.6, src: '/assets/panel-packets.jpg', style: { bottom: '-5%', left: '14%', width: '150px', height: '120px' } },
  { from: 'bottom', speed: 1.3, src: '/assets/collage-supervisor.jpg', style: { bottom: '0%', right: '4%', width: '290px', height: '230px' } },
  { from: 'bottom', speed: 0.8, src: '/assets/panel-scale.jpg', style: { bottom: '4%', right: '20%', width: '120px', height: '120px' } },
  { from: 'top', speed: 1.0, src: '/assets/still-life.jpg', style: { top: '26%', left: '-4%', width: '180px', height: '230px' } },
  { from: 'bottom', speed: 0.95, src: '/assets/collage-bazaar.jpg', style: { top: '30%', right: '-4%', width: '200px', height: '250px' } }
];

export default function ExpertiseSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const fragEls = section.querySelectorAll('.pin-frag');
    let ticking = false;

    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

    const update = () => {
      ticking = false;
      const r = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      const p = clamp01(-r.top / (total || 1));
      const idx = Math.min(STATEMENTS.length - 1, Math.floor(p * STATEMENTS.length));
      setActiveIndex(idx);

      fragEls.forEach((el) => {
        const speed = parseFloat(el.getAttribute('data-speed') || '1');
        const dir = el.getAttribute('data-from') === 'top' ? -1 : 1;
        const local = clamp01(p * 1.25 * speed);
        const y = dir * (1 - local) * 140;
        const sc = 1 - local * 0.08;
        el.style.transform = `translateY(${y.toFixed(1)}px) scale(${sc.toFixed(3)})`;
      });
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <section className="expertise-section pin-sequence" id="expertise" ref={sectionRef}>
      <div className="pin-stage">
        {/* Center text block with protected clear zone */}
        <div className="pin-statements">
          <div className="pin-statements-wrap">
            <span className="eyebrow pin-eyebrow">
              Territory Observation
            </span>
            <div className="pin-statement-slot">
              {STATEMENTS.map((stmt, idx) => (
                <h2
                  key={idx}
                  className={`pin-statement ${idx === activeIndex ? 'is-active' : ''}`}
                >
                  {stmt}
                </h2>
              ))}
            </div>
          </div>
        </div>

        {/* Converging fragment tiles */}
        {FRAGMENTS.map((frag, idx) => (
          <img
            key={idx}
            src={frag.src}
            alt=""
            className="pin-frag"
            data-from={frag.from}
            data-speed={frag.speed}
            style={frag.style}
            loading="lazy"
          />
        ))}
      </div>
    </section>
  );
}
