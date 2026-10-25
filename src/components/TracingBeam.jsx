import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'motion/react';

export default function TracingBeam({ children, className = '' }) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const svgHeightRef = useRef(0);
  const [svgHeight, setSvgHeight] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.75', 'end 0.85'],
  });

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (latest) => {
      setIsScrolled(latest > 0.01);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  useEffect(() => {
    const updateHeight = () => {
      if (contentRef.current) {
        const h = contentRef.current.offsetHeight;
        svgHeightRef.current = h;
        setSvgHeight(h);
      }
    };

    updateHeight();

    const ro = new ResizeObserver(() => {
      updateHeight();
    });

    if (contentRef.current) {
      ro.observe(contentRef.current);
    }

    window.addEventListener('resize', updateHeight);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  // Map scroll progress to gradient window coordinates along SVG rail
  // Smooth window progression matching Inspira UI (tension: 80, friction: 26)
  const y1 = useTransform(scrollYProgress, (v) => {
    const h = svgHeightRef.current || svgHeight || 600;
    const clamped = Math.min(Math.max(v, 0), 1);
    return Math.max(0, clamped * h);
  });

  const y2 = useTransform(scrollYProgress, (v) => {
    const h = svgHeightRef.current || svgHeight || 600;
    const clamped = Math.min(Math.max(v, 0), 1);
    return Math.max(0, clamped * h - 350);
  });

  const springY1 = useSpring(y1, {
    stiffness: 80,
    damping: 26,
    restDelta: 0.001,
  });

  const springY2 = useSpring(y2, {
    stiffness: 80,
    damping: 26,
    restDelta: 0.001,
  });

  const currentHeight = svgHeight || 600;

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
    >
      {/* SVG rail placed at -left-12 relative to the inner content container, hidden below lg */}
      <div
        className="pointer-events-none absolute top-3 -left-12 hidden lg:block select-none"
        aria-hidden="true"
      >
        {/* Head dot at top of rail */}
        <div
          style={{
            boxShadow: isScrolled ? 'none' : 'rgba(32, 96, 92, 0.24) 0px 3px 8px',
          }}
          className="ml-[27px] flex h-4 w-4 items-center justify-center rounded-full border border-neutral-300 bg-white"
        >
          <motion.div
            animate={{
              backgroundColor: isScrolled ? 'white' : '#20605C',
              borderColor: isScrolled ? 'white' : '#173F3B',
            }}
            transition={{ duration: 0.2 }}
            className="h-2 w-2 rounded-full border border-[#20605C] bg-[#20605C]"
          />
        </div>

        {/* SVG rail with faint path and brand-teal gradient beam */}
        <svg
          viewBox={`0 0 20 ${currentHeight}`}
          width="20"
          height={currentHeight}
          className="ml-4 block"
          aria-hidden="true"
        >
          {/* Faint full-length path (#9091A0 at 0.16 opacity) */}
          <path
            d={`M 1 0V -36 l 18 24 V ${currentHeight * 0.8} l -18 24V ${currentHeight}`}
            fill="none"
            stroke="#9091A0"
            strokeOpacity="0.16"
          />

          {/* Gradient stroke with brand colors: #20605C -> #7FB5AE -> #C2D6D0 */}
          <motion.path
            d={`M 1 0V -36 l 18 24 V ${currentHeight * 0.8} l -18 24V ${currentHeight}`}
            fill="none"
            stroke="url(#distrisense-tracing-beam-gradient)"
            strokeWidth="1.25"
            className="motion-reduce:hidden"
          />

          <defs>
            <motion.linearGradient
              id="distrisense-tracing-beam-gradient"
              gradientUnits="userSpaceOnUse"
              x1="0"
              x2="0"
              y1={springY1}
              y2={springY2}
            >
              <stop stopColor="#20605C" stopOpacity="0" />
              <stop stopColor="#20605C" />
              <stop offset="0.325" stopColor="#7FB5AE" />
              <stop offset="1" stopColor="#C2D6D0" stopOpacity="0" />
            </motion.linearGradient>
          </defs>
        </svg>
      </div>

      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
}
