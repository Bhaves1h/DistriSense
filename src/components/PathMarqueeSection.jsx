import React, { useEffect, useRef } from 'react';

const IMAGES = [
  'https://cdn.cosmos.so/b9909337-7a53-48bc-9672-33fbd0f040a1?format=jpeg',
  'https://cdn.cosmos.so/ecdc9dd7-2862-4c28-abb1-dcc0947390f3?format=jpeg',
  'https://cdn.cosmos.so/79de41ec-baa4-4ac0-a9a4-c090005ca640?format=jpeg',
  'https://cdn.cosmos.so/1a18b312-21cd-4484-bce5-9fb7ed1c5e01?format=jpeg',
  'https://cdn.cosmos.so/d765f64f-7a66-462f-8b2d-3d7bc8d7db55?format=jpeg',
  'https://cdn.cosmos.so/6b9f08ea-f0c5-471f-a620-71221ff1fb65?format=jpeg',
  'https://cdn.cosmos.so/40a09525-4b00-4666-86f0-3c45f5d77605?format=jpeg',
  'https://cdn.cosmos.so/14f05ab6-b4d0-4605-9007-8a2190a249d0?format=jpeg',
  'https://cdn.cosmos.so/d05009a2-a2f8-4a4c-a0de-e1b0379dddb8?format=jpeg',
  'https://cdn.cosmos.so/ba646e35-efc2-494a-961b-b40f597e6fc9?format=jpeg',
  'https://cdn.cosmos.so/e899f9c3-ed48-4899-8c16-fbd5a60705da?format=jpeg',
  'https://cdn.cosmos.so/24e83c11-c607-45cd-88fb-5059960b56a0?format=jpeg',
  'https://cdn.cosmos.so/cd346bce-f415-4ea7-8060-99c5f7c1741a?format=jpeg'
];

// Repeat set x2 along the path (exact 26 tiles total)
const ALL_TILES = [...IMAGES, ...IMAGES];
const SPEED = 28; // path units per second
const PATH_D = "M1 209.434C58.5872 255.935 387.926 325.938 482.583 209.434C600.905 63.8051 525.516 -43.2211 427.332 19.9613C329.149 83.1436 352.902 242.723 515.041 267.302C644.752 286.966 943.56 181.94 995 156.5";

export function PathMarquee() {
  const containerRef = useRef(null);
  const pathRef = useRef(null);
  const tileRefs = useRef([]);

  const phaseRef = useRef(0);
  const speedFactorRef = useRef(1);
  const targetFactorRef = useRef(1);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    const pathEl = pathRef.current;
    const tiles = tileRefs.current.filter(Boolean);
    if (!container || !pathEl || tiles.length === 0) return;

    const numTiles = tiles.length; // 26
    const L = pathEl.getTotalLength() || 1400;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const draw = () => {
      const rect = container.getBoundingClientRect();
      const containerWidth = rect.width || window.innerWidth || 996;
      const isMobile = window.innerWidth <= 760;

      // Scale driven by WIDTH only: s = containerWidth / 996
      const s = containerWidth / 996;
      // Container height grows with width: height = max(400px, containerWidth * 0.38), (260px mobile)
      const containerHeight = isMobile 
        ? Math.max(260, containerWidth * 0.38)
        : Math.max(400, containerWidth * 0.38);

      container.style.height = `${containerHeight.toFixed(0)}px`;
      const yOff = (containerHeight - 330 * s) / 2;

      // Tile size scales gently with band: width clamp(104px, 8vw, 148px), height = width * 0.69
      const tileW = isMobile ? 76 : Math.max(104, Math.min(148, containerWidth * 0.08));
      const tileH = Math.round(tileW * 0.69);

      tiles.forEach((el, i) => {
        // dist = ((i / 26) + phase) mod 1 * L
        const frac = (((i / numTiles) + phaseRef.current) % 1 + 1) % 1;
        const dist = frac * L;
        const pt = pathEl.getPointAtLength(dist);

        // Angle from point at dist + 2 (seamless forward tangent)
        const pt2 = pathEl.getPointAtLength(Math.min(L, dist + 2));
        const pt1 = dist + 2 > L ? pathEl.getPointAtLength(Math.max(0, dist - 2)) : pt;
        const angle = Math.atan2((pt2.y - pt1.y) * s, (pt2.x - pt1.x) * s) * (180 / Math.PI);

        const tx = pt.x * s - tileW / 2;
        const ty = yOff + pt.y * s - tileH / 2;

        el.style.width = `${tileW}px`;
        el.style.height = `${tileH}px`;
        el.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${angle.toFixed(1)}deg)`;
      });
    };

    // Draw full initial frame immediately
    draw();

    if (prefersReducedMotion) {
      return;
    }

    let reqId;
    let lastTime = performance.now();

    const loop = (now) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      // SpeedFactor lerps toward targetFactor (1.0 normal, 0.12 while hovered)
      speedFactorRef.current += (targetFactorRef.current - speedFactorRef.current) * Math.min(1, dt * 6);

      if (!draggingRef.current) {
        phaseRef.current = ((phaseRef.current + (SPEED * speedFactorRef.current * dt) / L) % 1 + 1) % 1;
      }

      draw();
      reqId = requestAnimationFrame(loop);
    };

    reqId = requestAnimationFrame(loop);

    // Hover listeners (ease to ~12% speed)
    const onMouseEnter = () => {
      targetFactorRef.current = 0.12;
    };
    const onMouseLeave = () => {
      targetFactorRef.current = 1.0;
    };

    // Drag listeners
    const onPointerDown = (e) => {
      draggingRef.current = true;
      lastXRef.current = e.clientX;
      container.classList.add('pm-dragging');
      if (container.setPointerCapture) {
        try { container.setPointerCapture(e.pointerId); } catch (_) {}
      }
    };

    const onPointerMove = (e) => {
      if (!draggingRef.current) return;
      const rect = container.getBoundingClientRect();
      const cWidth = rect.width || window.innerWidth || 996;
      const dx = e.clientX - lastXRef.current;
      phaseRef.current = ((phaseRef.current - dx / cWidth) % 1 + 1) % 1;
      lastXRef.current = e.clientX;
    };

    const endDrag = (e) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      container.classList.remove('pm-dragging');
      if (container.releasePointerCapture && e.pointerId !== undefined) {
        try { container.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    };

    const onResize = () => {
      draw();
    };

    container.addEventListener('mouseenter', onMouseEnter);
    container.addEventListener('mouseleave', onMouseLeave);
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', endDrag);
    container.addEventListener('pointercancel', endDrag);
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(reqId);
      container.removeEventListener('mouseenter', onMouseEnter);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', endDrag);
      container.removeEventListener('pointercancel', endDrag);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className="path-marquee-container">
      <div 
        className="path-marquee" 
        ref={containerRef}
        role="region"
        aria-label="Stock flow carousel"
      >
        {/* Hidden inline SVG holding the path */}
        <svg 
          width="996" 
          height="330" 
          style={{ position: 'absolute', pointerEvents: 'none', opacity: 0, visibility: 'hidden' }} 
          aria-hidden="true" 
          viewBox="0 0 996 330"
        >
          <path
            ref={pathRef}
            d={PATH_D}
            fill="none"
          />
        </svg>

        {/* 26 Absolute Image Tiles distributed across the full-width wavy path */}
        {ALL_TILES.map((src, i) => (
          <div
            key={i}
            ref={(el) => (tileRefs.current[i] = el)}
            className="pm-tile"
          >
            <img src={src} alt="" draggable={false} loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PathMarqueeSection() {
  const headingRef = useRef(null);
  const wordsRef = useRef([]);

  useEffect(() => {
    const headingEl = headingRef.current;
    const words = wordsRef.current.filter(Boolean);
    if (!headingEl || words.length < 4) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return; // Keep full ink by default

    const OFFSETS = [0, 20, 4, 13];
    let ticking = false;

    const updateWords = () => {
      ticking = false;
      const rect = headingEl.getBoundingClientRect();
      const vh = window.innerHeight;

      // Progress p from 0 (heading top at 85% of vh) to 1 (heading bottom at 45% of vh)
      const startY = vh * 0.85;
      const endY = vh * 0.45;
      const totalDist = startY - (endY - rect.height);
      const currentDist = startY - rect.top;
      const p = Math.max(0, Math.min(1, currentDist / (totalDist || 1)));

      words.forEach((wordEl, i) => {
        // li = clamp01(p * 4 - i)
        const li = Math.max(0, Math.min(1, p * 4 - i));
        // Color interpolates from ink at 15% opacity to full ink (100%)
        const opacity = 0.15 + 0.85 * li;
        const yOffset = (1 - li) * 14;
        wordEl.style.color = `rgba(38, 38, 36, ${opacity.toFixed(3)})`;
        wordEl.style.transform = `translateX(${OFFSETS[i]}%) translateY(${yOffset.toFixed(1)}px)`;
      });
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateWords);
      }
    };

    // Apply scroll-scrub state from JS once handler runs
    updateWords();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <section className="giant-scroll-section" id="continuous-flow">
      <div className="container">
        <div className="stacked-heading-wrap">
          <span className="eyebrow" style={{ color: 'var(--color-olive)' }}>Continuous Flow</span>
          <h2 className="stacked-heading" ref={headingRef}>
            <span className="stacked-word word-0" ref={(el) => (wordsRef.current[0] = el)}>Stock</span>
            <span className="stacked-word word-1" ref={(el) => (wordsRef.current[1] = el)}>that</span>
            <span className="stacked-word word-2" ref={(el) => (wordsRef.current[2] = el)}>arrives</span>
            <span className="stacked-word word-3" ref={(el) => (wordsRef.current[3] = el)}>early</span>
          </h2>
        </div>
      </div>

      {/* Full 100vw edge-to-edge Carousel */}
      <PathMarquee />
    </section>
  );
}
