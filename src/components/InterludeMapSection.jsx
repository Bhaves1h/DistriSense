import React, { useState } from 'react';
import { NETWORK_NODES } from '../data/mockData';
import { Navigation, Truck } from 'lucide-react';
import { DASHBOARD_URL } from '../config';

export default function InterludeMapSection({ onOpenDashboardWithTab }) {
  const [selectedNode, setSelectedNode] = useState(NETWORK_NODES.find(n => n.id === 'shop-12'));

  return (
    <section className="giant-interlude-section" id="map">
      <div className="container">
        <div className="interlude-grid">
          {/* Left: Giant Typography */}
          <div>
            <span className="eyebrow" style={{ color: 'var(--color-olive)' }}>Live Network Topology</span>
            <div className="giant-lines">
              <span>The</span>
              <span>Map of</span>
              <span>Every</span>
              <span>Shelf</span>
            </div>
            <p style={{ marginTop: '24px', color: 'rgba(38,38,36,0.75)', fontSize: '18px', maxWidth: '380px' }}>
              Kolhapur territory mapped down to the individual shelf position. Tap any node to inspect real-time cover and warehouse re-routing.
            </p>
            
            {/* 4. Selected Node Summary Box: Cross-fades/slides 8px on change */}
            {selectedNode && (
              <div 
                key={selectedNode.id}
                className="map-node-card-slide"
                style={{
                  marginTop: '28px',
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '18px',
                  border: '1px solid rgba(38,38,36,0.1)',
                  boxShadow: '0 8px 24px rgba(38,38,36,0.06)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{selectedNode.name}</span>
                  <span className={`risk-badge ${selectedNode.status === 'stockout-imminent' ? 'critical' : selectedNode.status === 'high-risk' ? 'high' : 'optimal'}`}>
                    {selectedNode.status === 'stockout-imminent' ? 'Stockout Alert' : selectedNode.status === 'high-risk' ? 'High Risk' : 'Healthy'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(38,38,36,0.7)', marginBottom: '12px' }}>
                  SKU Monitored: <strong>{selectedNode.sku || 'Multi-SKU Hub'}</strong>
                  <br />
                  Current Cover: <strong>{selectedNode.cover || selectedNode.stock}</strong>
                </div>
                <a
                  href={DASHBOARD_URL}
                  className="action-btn-sm action-btn-approve"
                  style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
                >
                  <Navigation size={12} />
                  <span>Open the dashboard</span>
                </a>
              </div>
            )}
          </div>

          {/* Right: Interactive Territory Map SVG with Surface & Animated Beams */}
          <div className="interlude-map-panel">
            <svg 
              viewBox="0 0 460 620" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg" 
              style={{ width: '100%', height: '100%', minHeight: '520px', background: '#FAF9F5', borderRadius: '12px' }}
            >
              {/* 3. Surface Dot Pattern inside panel */}
              <defs>
                <pattern id="mapPatternGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="10" cy="10" r="1" fill="rgba(38,38,36,0.06)" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#mapPatternGrid)" rx="12" />

              {/* Subtle Grid Guidelines */}
              {[100, 200, 300, 400, 500].map(y => (
                <line key={`y-${y}`} x1="0" y1={y} x2="460" y2={y} stroke="rgba(38,38,36,0.04)" />
              ))}
              {[100, 200, 300, 400].map(x => (
                <line key={`x-${x}`} x1={x} y1="0" x2={x} y2="620" stroke="rgba(38,38,36,0.04)" />
              ))}

              {/* Base Supply Route Tracks */}
              <path d="M 80 90 L 180 180 L 290 250 L 390 380 L 260 520" stroke="#8AAFA7" strokeWidth="2" strokeDasharray="6 4" opacity="0.6" />
              <path d="M 180 180 L 110 320 L 170 440 L 260 520" stroke="#C2D6D0" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
              <path d="M 290 250 L 360 210 L 410 130" stroke="#C2D6D0" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
              <path d="M 290 250 L 240 370 L 170 440" stroke="#C2D6D0" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
              
              {/* Base Highlight route to SHOP-12 */}
              <path d="M 290 250 L 240 370" stroke="#E8D3D0" strokeWidth="3" strokeDasharray="4 3" />

              {/* 1. Animated Route Beams: Deep teal light pulse for normal routes */}
              <path d="M 80 90 L 180 180 L 290 250 L 390 380 L 260 520" stroke="#20605C" strokeWidth="2.5" strokeLinecap="round" pathLength="100" className="map-route-beam normal-beam" />
              <path d="M 180 180 L 110 320 L 170 440 L 260 520" stroke="#20605C" strokeWidth="2" strokeLinecap="round" pathLength="100" className="map-route-beam normal-beam" />
              <path d="M 290 250 L 360 210 L 410 130" stroke="#20605C" strokeWidth="2" strokeLinecap="round" pathLength="100" className="map-route-beam normal-beam" />
              <path d="M 290 250 L 240 370 L 170 440" stroke="#20605C" strokeWidth="2" strokeLinecap="round" pathLength="100" className="map-route-beam normal-beam" />

              {/* 1. Animated Rescue Route Beam: Warehouse B -> SHOP-12 (Alert Red, slightly faster) */}
              <path d="M 290 250 L 240 370" stroke="#C85A4E" strokeWidth="3.5" strokeLinecap="round" pathLength="100" className="map-route-beam rescue-beam" />

              {/* Warehouse A */}
              <g 
                transform="translate(80, 90)" 
                className={`map-node-interactive ${selectedNode?.id === 'wh-a' ? 'is-selected' : ''}`} 
                onClick={() => setSelectedNode(NETWORK_NODES[0])}
              >
                {selectedNode?.id === 'wh-a' && (
                  <rect x="-18" y="-18" width="36" height="36" fill="rgba(255,255,255,0.85)" stroke="#20605C" strokeWidth="1.5" rx="8" className="selected-node-halo" />
                )}
                <rect x="-14" y="-14" width="28" height="28" fill="#20605C" stroke="#FAF9F5" strokeWidth="2" rx="5" />
                <Truck x="-8" y="-8" width="16" height="16" stroke="#FFFFFF" strokeWidth="2" />
                <text x="20" y="5" fontFamily="Inter" fontSize="12" fontWeight="600" fill="#262624">Warehouse A (MIDC)</text>
              </g>

              {/* Warehouse B */}
              <g 
                transform="translate(290, 250)" 
                className={`map-node-interactive ${selectedNode?.id === 'wh-b' ? 'is-selected' : ''}`} 
                onClick={() => setSelectedNode(NETWORK_NODES[1])}
              >
                {selectedNode?.id === 'wh-b' && (
                  <rect x="-20" y="-20" width="40" height="40" fill="rgba(255,255,255,0.85)" stroke="#20605C" strokeWidth="1.5" rx="8" className="selected-node-halo" />
                )}
                <rect x="-16" y="-16" width="32" height="32" fill="#20605C" stroke="#FAF9F5" strokeWidth="2" rx="6" />
                <Truck x="-9" y="-9" width="18" height="18" stroke="#FFFFFF" strokeWidth="2" />
                <text x="22" y="5" fontFamily="Inter" fontSize="12" fontWeight="600" fill="#262624">Warehouse B (Shiroli)</text>
              </g>

              {/* Warehouse C */}
              <g 
                transform="translate(260, 520)" 
                className={`map-node-interactive ${selectedNode?.id === 'wh-c' ? 'is-selected' : ''}`} 
                onClick={() => setSelectedNode(NETWORK_NODES[2])}
              >
                {selectedNode?.id === 'wh-c' && (
                  <rect x="-16" y="-16" width="32" height="32" fill="rgba(255,255,255,0.85)" stroke="#20605C" strokeWidth="1.5" rx="6" className="selected-node-halo" />
                )}
                <rect x="-12" y="-12" width="24" height="24" fill="#20605C" stroke="#FAF9F5" strokeWidth="2" rx="4" />
                <Truck x="-7" y="-7" width="14" height="14" stroke="#FFFFFF" strokeWidth="2" />
                <text x="18" y="5" fontFamily="Inter" fontSize="12" fontWeight="600" fill="#262624">Warehouse C (Gandhinagar)</text>
              </g>

              {/* Shop 07 */}
              <g 
                transform="translate(410, 130)" 
                className={`map-node-interactive ${selectedNode?.id === 'shop-07' ? 'is-selected' : ''}`} 
                onClick={() => setSelectedNode(NETWORK_NODES[3])}
              >
                {selectedNode?.id === 'shop-07' && (
                  <circle cx="0" cy="0" r="14" fill="rgba(255,255,255,0.85)" stroke="#20605C" strokeWidth="1.5" className="selected-node-halo" />
                )}
                <circle cx="0" cy="0" r="8" fill="#8A8A68" stroke="#FAF9F5" strokeWidth="2" />
                <text x="14" y="4" fontFamily="Inter" fontSize="11" fill="rgba(38,38,36,0.75)">SHOP-07</text>
              </g>

              {/* Shop 28 */}
              <g 
                transform="translate(360, 210)" 
                className={`map-node-interactive ${selectedNode?.id === 'shop-28' ? 'is-selected' : ''}`} 
                onClick={() => setSelectedNode(NETWORK_NODES[4])}
              >
                {selectedNode?.id === 'shop-28' && (
                  <circle cx="0" cy="0" r="15" fill="rgba(255,255,255,0.85)" stroke="#20605C" strokeWidth="1.5" className="selected-node-halo" />
                )}
                <circle cx="0" cy="0" r="9" fill="#D49A38" stroke="#FAF9F5" strokeWidth="2" />
                <text x="15" y="4" fontFamily="Inter" fontSize="11" fill="rgba(38,38,36,0.75)">SHOP-28</text>
              </g>

              {/* 2. THE ACTIVE RED-RISK NODE: SHOP-12 with 2 looping Sonar Rings */}
              <g 
                transform="translate(240, 370)" 
                className={`map-node-interactive ${selectedNode?.id === 'shop-12' ? 'is-selected' : ''}`} 
                onClick={() => setSelectedNode(NETWORK_NODES[5])}
              >
                {/* Selected soft white halo */}
                {selectedNode?.id === 'shop-12' && (
                  <circle cx="0" cy="0" r="17" fill="rgba(255,255,255,0.85)" stroke="#20605C" strokeWidth="1.5" className="selected-node-halo" />
                )}

                {/* 2 looping expanding fading red sonar rings */}
                <circle cx="0" cy="0" r="10" className="sonar-ring ring-1" />
                <circle cx="0" cy="0" r="10" className="sonar-ring ring-2" />

                {/* Node dot with 2px paper halo */}
                <circle cx="0" cy="0" r="10" fill="#C85A4E" stroke="#FAF9F5" strokeWidth="2" />
                <circle cx="0" cy="0" r="4" fill="#FFFFFF" />
                
                {/* Annotation Badge */}
                <rect x="18" y="-28" width="175" height="48" rx="6" fill="#262624" />
                <text x="28" y="-10" fontFamily="Inter" fontSize="11" fontWeight="600" fill="#FFFFFF">SHOP-12 · Rajarampuri</text>
                <text x="28" y="8" fontFamily="Inter" fontSize="10" fill="#F8A59C">Stockout: 1.0 day cover left</text>
              </g>

              {/* Shop 44 */}
              <g 
                transform="translate(170, 440)" 
                className={`map-node-interactive ${selectedNode?.id === 'shop-44' ? 'is-selected' : ''}`} 
                onClick={() => setSelectedNode(NETWORK_NODES[6])}
              >
                {selectedNode?.id === 'shop-44' && (
                  <circle cx="0" cy="0" r="14" fill="rgba(255,255,255,0.85)" stroke="#20605C" strokeWidth="1.5" className="selected-node-halo" />
                )}
                <circle cx="0" cy="0" r="8" fill="#20605C" stroke="#FAF9F5" strokeWidth="2" />
                <text x="14" y="4" fontFamily="Inter" fontSize="11" fill="rgba(38,38,36,0.75)">SHOP-44</text>
              </g>

              {/* Shop 19 */}
              <g 
                transform="translate(110, 320)" 
                className={`map-node-interactive ${selectedNode?.id === 'shop-19' ? 'is-selected' : ''}`} 
                onClick={() => setSelectedNode(NETWORK_NODES[7])}
              >
                {selectedNode?.id === 'shop-19' && (
                  <circle cx="0" cy="0" r="14" fill="rgba(255,255,255,0.85)" stroke="#20605C" strokeWidth="1.5" className="selected-node-halo" />
                )}
                <circle cx="0" cy="0" r="8" fill="#C85A4E" stroke="#FAF9F5" strokeWidth="2" />
                <text x="14" y="4" fontFamily="Inter" fontSize="11" fill="rgba(38,38,36,0.75)">SHOP-19</text>
              </g>

              {/* Shop 55 */}
              <g 
                transform="translate(390, 380)" 
                className={`map-node-interactive ${selectedNode?.id === 'shop-55' ? 'is-selected' : ''}`} 
                onClick={() => setSelectedNode(NETWORK_NODES[8])}
              >
                {selectedNode?.id === 'shop-55' && (
                  <circle cx="0" cy="0" r="14" fill="rgba(255,255,255,0.85)" stroke="#20605C" strokeWidth="1.5" className="selected-node-halo" />
                )}
                <circle cx="0" cy="0" r="8" fill="#D49A38" stroke="#FAF9F5" strokeWidth="2" />
                <text x="14" y="4" fontFamily="Inter" fontSize="11" fill="rgba(38,38,36,0.75)">SHOP-55</text>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
