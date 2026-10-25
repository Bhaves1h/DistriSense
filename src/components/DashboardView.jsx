import React, { useState, useMemo } from 'react';
import { 
  TERRITORIES, 
  INITIAL_TRANSFERS, 
  NETWORK_NODES, 
  SKU_FORECASTS, 
  SIMULATION_SCENARIOS 
} from '../data/mockData';
import { 
  ArrowLeft, 
  Search, 
  Check, 
  AlertCircle, 
  Clock, 
  Navigation, 
  Sliders, 
  TrendingUp, 
  FileText, 
  CheckCircle2, 
  X, 
  Info, 
  Truck, 
  Sparkles,
  Layers,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function DashboardView({ initialTab = 'queue', onNavigateBack, showToast }) {
  const [selectedTerritoryId, setSelectedTerritoryId] = useState('kolhapur');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [transfers, setTransfers] = useState(INITIAL_TRANSFERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [inspectItem, setInspectItem] = useState(null);

  // Simulation Sandbox state
  const [simDemandSurge, setSimDemandSurge] = useState(1.4);
  const [simSupplyDelay, setSimSupplyDelay] = useState(1);
  const [simMonsoonRisk, setSimMonsoonRisk] = useState(false);

  // Territory details
  const currentTerritory = TERRITORIES.find(t => t.id === selectedTerritoryId) || TERRITORIES[0];

  // Company resolution: ?company= parameter ALWAYS wins and overwrites localStorage ds_company
  const companyName = useMemo(() => {
    let comp = null;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('company') && urlParams.get('company').trim()) {
      comp = urlParams.get('company').trim();
    } else if (window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.substring(window.location.hash.indexOf('?') + 1);
      const hashParams = new URLSearchParams(hashQuery);
      if (hashParams.has('company') && hashParams.get('company').trim()) {
        comp = hashParams.get('company').trim();
      }
    } else if (window.location.hash.includes('company=')) {
      const match = window.location.hash.match(/[?&#]company=([^&#]+)/);
      if (match && match[1]) {
        comp = decodeURIComponent(match[1]).trim();
      }
    }

    if (comp && comp.trim()) {
      comp = comp.trim();
      try {
        localStorage.setItem('ds_company', comp);
      } catch (_) {}
      return comp;
    }

    try {
      return localStorage.getItem('ds_company') || 'Apex FMCG Distributors';
    } catch (_) {
      return 'Apex FMCG Distributors';
    }
  }, []);

  // Filter transfers
  const filteredTransfers = useMemo(() => {
    return transfers.filter(t => {
      const matchSearch = t.destination.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.recommendedSource.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchFilter = riskFilter === 'all' || 
                          (riskFilter === 'stockout' && t.riskLevel === 'critical') ||
                          (riskFilter === 'high' && t.riskLevel === 'high') ||
                          (riskFilter === 'reorder' && t.riskLevel === 'medium') ||
                          (riskFilter === 'expiry' && t.riskLevel === 'optimal') ||
                          (riskFilter === 'pending' && !t.approved);

      return matchSearch && matchFilter;
    });
  }, [transfers, searchTerm, riskFilter]);

  // Statistics
  const pendingCount = transfers.filter(t => !t.approved).length;
  const approvedCount = transfers.filter(t => t.approved).length;
  const totalRupeesAverted = currentTerritory.rupeesAverted + (approvedCount * 14200);

  // Handle single approval
  const handleApprove = (id, e) => {
    if (e) e.stopPropagation();
    setTransfers(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, approved: true };
      }
      return item;
    }));

    // Trigger celebration
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#20605C', '#8AAFA7', '#C2D6D0']
      });
    } catch (err) {}

    const item = transfers.find(t => t.id === id);
    showToast(`Transfer #${id} approved. Dispatch manifest routed to ${item ? item.recommendedSource : 'Warehouse'}.`);
  };

  // Handle bulk approve
  const handleApproveAll = () => {
    setTransfers(prev => prev.map(item => ({ ...item, approved: true })));
    try {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#20605C', '#8AAFA7', '#C2D6D0', '#E9E8E1']
      });
    } catch (err) {}
    showToast(`All ${pendingCount} pending transfers approved for 05:00 dispatch!`);
  };

  return (
    <div className="dash-view-wrap">
      {/* Top Bar */}
      <header className="dash-top-bar">
        <div className="dash-left-group">
          <div 
            className="cinematic-wordmark" 
            style={{ color: 'var(--color-ink)' }}
            onClick={onNavigateBack}
          >
            <span className="distri">distri</span>
            <span className="sense">SENSE</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(38,38,36,0.6)' }}>Territory:</span>
            <select 
              value={selectedTerritoryId} 
              onChange={(e) => {
                setSelectedTerritoryId(e.target.value);
                showToast(`Switched view to ${e.target.options[e.target.selectedIndex].text}`);
              }}
              className="territory-select"
            >
              {TERRITORIES.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="dash-right-group">
          <div className="live-badge">
            <span className="live-dot" />
            <span>{currentTerritory.dispatchTime}</span>
          </div>

          <button onClick={onNavigateBack} className="pill pill-outline" style={{ height: '38px', padding: '0 18px', fontSize: '13px' }}>
            <ArrowLeft size={14} />
            <span>Back to Overview</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard Workspace */}
      <main className="dash-main">
        {/* Header Section */}
        <div className="dash-header-section">
          <div className="dash-title-group">
            <span className="eyebrow" style={{ color: 'var(--color-olive)' }}>
              {companyName} · {currentTerritory.name} · Morning Operations
            </span>
            <h1>Daily Decision & Transfer Queue</h1>
            <p className="dash-sub">
              {pendingCount} priority approvals pending today. {currentTerritory.activeOutlets.toLocaleString()} outlet-SKU positions evaluated at 05:00 IST.
            </p>
          </div>

          {pendingCount > 0 && (
            <button onClick={handleApproveAll} className="pill pill-teal">
              <Sparkles size={16} />
              <span>Approve All Recommended ({pendingCount})</span>
            </button>
          )}
        </div>

        {/* Top 4 Real-Time Operational KPI Cards */}
        <div className="dash-stats-grid">
          <div className="dash-stat-card">
            <div className="dash-stat-top">
              <span className="dash-stat-label">Active Outlets Scored</span>
              <Layers size={16} color="var(--color-olive)" />
            </div>
            <div className="dash-stat-val">{currentTerritory.activeOutlets.toLocaleString()}</div>
            <div className="dash-stat-sub">100% telemetry synced at 05:00 IST</div>
          </div>

          <div className="dash-stat-card">
            <div className="dash-stat-top">
              <span className="dash-stat-label">Interventions Generated</span>
              <AlertCircle size={16} color="#C85A4E" />
            </div>
            <div className="dash-stat-val" style={{ color: pendingCount > 0 ? '#C85A4E' : 'var(--color-teal)' }}>
              {pendingCount > 0 ? pendingCount : 'All Clear'}
            </div>
            <div className="dash-stat-sub">{approvedCount} transfers confirmed & routed</div>
          </div>

          <div className="dash-stat-card">
            <div className="dash-stat-top">
              <span className="dash-stat-label">Rupees at Risk Averted</span>
              <TrendingUp size={16} color="var(--color-teal)" />
            </div>
            <div className="dash-stat-val">₹{totalRupeesAverted.toLocaleString('en-IN')}</div>
            <div className="dash-stat-sub">Lost sales & expiry damages saved</div>
          </div>

          <div className="dash-stat-card">
            <div className="dash-stat-top">
              <span className="dash-stat-label">Simulation Efficiency</span>
              <CheckCircle2 size={16} color="var(--color-teal)" />
            </div>
            <div className="dash-stat-val">{currentTerritory.writeOffReduction}</div>
            <div className="dash-stat-sub">Write-off reduction vs static manual reviews</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="dash-nav-tabs">
          <button 
            className={`dash-tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('queue')}
          >
            <span>Decision & Transfer Queue</span>
            <span className="dash-tab-badge">{pendingCount}</span>
          </button>

          <button 
            className={`dash-tab-btn ${activeTab === 'radar' ? 'active' : ''}`}
            onClick={() => setActiveTab('radar')}
          >
            <Navigation size={15} />
            <span>Territory Network Radar</span>
          </button>

          <button 
            className={`dash-tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
            onClick={() => setActiveTab('simulator')}
          >
            <Sliders size={15} />
            <span>Scenario Simulator Lab</span>
          </button>

          <button 
            className={`dash-tab-btn ${activeTab === 'forecast' ? 'active' : ''}`}
            onClick={() => setActiveTab('forecast')}
          >
            <TrendingUp size={15} />
            <span>SKU Demand Forecast</span>
          </button>

          <button 
            className={`dash-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <FileText size={15} />
            <span>Audit & Dispatched Manifest</span>
          </button>
        </div>

        {/* TAB 1: DECISION & TRANSFER QUEUE */}
        {activeTab === 'queue' && (
          <div className="dash-panel-card">
            <div className="table-toolbar">
              <div className="search-box">
                <Search size={15} color="rgba(38,38,36,0.5)" />
                <input 
                  type="text" 
                  placeholder="Search SKU, outlet or source..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="filter-pills">
                <button 
                  className={`filter-chip ${riskFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setRiskFilter('all')}
                >
                  All Rows ({transfers.length})
                </button>
                <button 
                  className={`filter-chip ${riskFilter === 'pending' ? 'active' : ''}`}
                  onClick={() => setRiskFilter('pending')}
                >
                  Pending ({pendingCount})
                </button>
                <button 
                  className={`filter-chip ${riskFilter === 'stockout' ? 'active' : ''}`}
                  onClick={() => setRiskFilter('stockout')}
                >
                  Stockout Imminent
                </button>
                <button 
                  className={`filter-chip ${riskFilter === 'high' ? 'active' : ''}`}
                  onClick={() => setRiskFilter('high')}
                >
                  High Risk
                </button>
                <button 
                  className={`filter-chip ${riskFilter === 'expiry' ? 'active' : ''}`}
                  onClick={() => setRiskFilter('expiry')}
                >
                  Expiry Safeguarded
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Destination Shelf</th>
                    <th>SKU & Category</th>
                    <th>Cover Left</th>
                    <th>Recommended Source</th>
                    <th>Quantity</th>
                    <th>Risk State</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransfers.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'rgba(38,38,36,0.6)' }}>
                        No transfer interventions match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTransfers.map((item) => (
                      <tr key={item.id} style={{ opacity: item.approved ? 0.75 : 1 }}>
                        <td>
                          <div><strong>{item.destination}</strong></div>
                          <div style={{ fontSize: '12px', color: 'rgba(38,38,36,0.6)' }}>
                            {item.shopType} · {item.location}
                          </div>
                        </td>

                        <td>
                          <div>{item.sku}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(38,38,36,0.5)' }}>{item.category}</div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ 
                              fontWeight: 600, 
                              color: item.coverLeft <= 1.2 ? '#C85A4E' : item.coverLeft <= 2 ? '#B87820' : 'var(--color-teal)' 
                            }}>
                              {item.coverLeft} {item.coverUnit}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div>{item.recommendedSource}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-olive)' }}>
                            {item.sourceDistance} corridor · Freight {item.freightCost}
                          </div>
                        </td>

                        <td>
                          <strong>{item.quantity} {item.unit}</strong>
                          <div style={{ fontSize: '11px', color: 'rgba(38,38,36,0.5)' }}>Val: {item.totalValue}</div>
                        </td>

                        <td>
                          <span className={`risk-badge ${item.riskLevel}`}>
                            {item.riskState}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                            <button 
                              onClick={() => setInspectItem(item)}
                              className="action-btn-sm action-btn-inspect"
                              title="Inspect algorithmic decision rationale"
                            >
                              <Info size={13} />
                              <span>Inspect</span>
                            </button>

                            {item.approved ? (
                              <span className="action-btn-sm action-btn-done">
                                <Check size={13} />
                                Approved
                              </span>
                            ) : (
                              <button 
                                onClick={(e) => handleApprove(item.id, e)}
                                className="action-btn-sm action-btn-approve"
                              >
                                <Check size={13} />
                                Approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: TERRITORY NETWORK RADAR */}
        {activeTab === 'radar' && (
          <div className="dash-panel-card">
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '20px', marginBottom: '4px' }}>Kolhapur Distribution Corridor Network</h3>
                <p style={{ fontSize: '14px', color: 'rgba(38,38,36,0.7)' }}>
                  Active supply channels between central distribution hubs (MIDC, Shiroli, Gandhinagar) and kirana shelves.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <span className="risk-badge critical">1 Stockout Node</span>
                <span className="risk-badge high">2 High-Risk Nodes</span>
                <span className="risk-badge optimal">3 Warehouses Active</span>
              </div>
            </div>

            <div style={{ background: '#FAF9F5', borderRadius: '12px', padding: '24px', border: '1px solid rgba(38,38,36,0.1)' }}>
              <svg viewBox="0 0 600 440" style={{ width: '100%', height: '420px' }}>
                {/* Background Route Grid */}
                <path d="M 100 80 L 300 160 L 500 240 L 320 380 L 120 320 Z" stroke="rgba(38,38,36,0.1)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
                <path d="M 300 160 L 220 250 L 320 380" stroke="#8AAFA7" strokeWidth="2.5" fill="none" />
                <path d="M 100 80 L 220 250" stroke="#C2D6D0" strokeWidth="2" strokeDasharray="3 3" fill="none" />
                
                {/* Active Transfer Vector to SHOP-12 */}
                <path d="M 300 160 L 220 250" stroke="#C85A4E" strokeWidth="3" strokeDasharray="5 3" fill="none" />

                {/* Warehouse A */}
                <g transform="translate(100, 80)">
                  <rect x="-16" y="-16" width="32" height="32" fill="#20605C" rx="6" />
                  <Truck x="-9" y="-9" width="18" height="18" stroke="#FFFFFF" strokeWidth="2" />
                  <text x="22" y="5" fontFamily="Inter" fontSize="12" fontWeight="600" fill="#262624">Warehouse A (MIDC)</text>
                  <text x="22" y="20" fontFamily="Inter" fontSize="10" fill="rgba(38,38,36,0.6)">14,200 units · 88% cap</text>
                </g>

                {/* Warehouse B (Shiroli) */}
                <g transform="translate(300, 160)">
                  <rect x="-18" y="-18" width="36" height="36" fill="#20605C" rx="8" />
                  <Truck x="-10" y="-10" width="20" height="20" stroke="#FFFFFF" strokeWidth="2" />
                  <text x="24" y="5" fontFamily="Inter" fontSize="13" fontWeight="700" fill="#20605C">Warehouse B (Shiroli Hub)</text>
                  <text x="24" y="20" fontFamily="Inter" fontSize="10" fill="rgba(38,38,36,0.6)">18,500 units · Surplus Source</text>
                </g>

                {/* Warehouse C (Gandhinagar) */}
                <g transform="translate(320, 380)">
                  <rect x="-16" y="-16" width="32" height="32" fill="#20605C" rx="6" />
                  <Truck x="-9" y="-9" width="18" height="18" stroke="#FFFFFF" strokeWidth="2" />
                  <text x="22" y="5" fontFamily="Inter" fontSize="12" fontWeight="600" fill="#262624">Warehouse C (Gandhinagar)</text>
                  <text x="22" y="20" fontFamily="Inter" fontSize="10" fill="rgba(38,38,36,0.6)">9,800 units · 62% cap</text>
                </g>

                {/* SHOP-12 (Critical Stockout Alert) */}
                <g transform="translate(220, 250)">
                  <circle cx="0" cy="0" r="26" fill="#E8D3D0" className="pulse-circle" />
                  <circle cx="0" cy="0" r="12" fill="#C85A4E" />
                  <circle cx="0" cy="0" r="5" fill="#FFFFFF" />
                  
                  <rect x="20" y="-28" width="180" height="52" rx="6" fill="#262624" />
                  <text x="30" y="-10" fontFamily="Inter" fontSize="11" fontWeight="600" fill="#FFFFFF">SHOP-12 · Rajarampuri</text>
                  <text x="30" y="8" fontFamily="Inter" fontSize="10" fill="#F8A59C">Parle-G · 1.0 day cover left</text>
                  <text x="30" y="20" fontFamily="Inter" fontSize="9" fill="#8AAFA7">← Receiving 28 units from Shiroli</text>
                </g>

                {/* Other Shops */}
                <g transform="translate(480, 130)">
                  <circle cx="0" cy="0" r="8" fill="#8A8A68" />
                  <text x="12" y="4" fontFamily="Inter" fontSize="11" fill="rgba(38,38,36,0.75)">SHOP-07 (Laxmipuri)</text>
                </g>

                <g transform="translate(440, 260)">
                  <circle cx="0" cy="0" r="9" fill="#D49A38" />
                  <text x="14" y="4" fontFamily="Inter" fontSize="11" fill="rgba(38,38,36,0.75)">SHOP-28 (Shahupuri)</text>
                </g>

                <g transform="translate(130, 220)">
                  <circle cx="0" cy="0" r="9" fill="#C85A4E" />
                  <text x="14" y="4" fontFamily="Inter" fontSize="11" fill="rgba(38,38,36,0.75)">SHOP-19 (Rankala)</text>
                </g>

                <g transform="translate(210, 340)">
                  <circle cx="0" cy="0" r="8" fill="#20605C" />
                  <text x="12" y="4" fontFamily="Inter" fontSize="11" fill="rgba(38,38,36,0.75)">SHOP-44 (Tarabai Park)</text>
                </g>
              </svg>
            </div>
          </div>
        )}

        {/* TAB 3: SCENARIO SIMULATOR LAB */}
        {activeTab === 'simulator' && (
          <div className="dash-panel-card">
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Interactive Territory Stress-Test Simulator</h3>
            <p style={{ fontSize: '14px', color: 'rgba(38,38,36,0.7)', marginBottom: '24px' }}>
              Adjust territory volatility levers to observe how DistriSense maintains 99%+ fill rates compared to legacy distribution models.
            </p>

            {/* Simulation Sliders */}
            <div className="sim-controls-grid">
              <div className="slider-group">
                <label>
                  <span>Festival Demand Surge Factor:</span>
                  <span style={{ color: 'var(--color-teal)' }}>×{simDemandSurge.toFixed(1)}</span>
                </label>
                <input 
                  type="range" 
                  min="1.0" 
                  max="2.5" 
                  step="0.1" 
                  value={simDemandSurge} 
                  onChange={(e) => setSimDemandSurge(parseFloat(e.target.value))}
                  className="range-slider"
                />
                <span style={{ fontSize: '11px', color: 'rgba(38,38,36,0.6)' }}>Baseline (1.0) to Diwali / Festive Rush (2.5)</span>
              </div>

              <div className="slider-group">
                <label>
                  <span>Supply Delay Shock:</span>
                  <span style={{ color: 'var(--color-teal)' }}>+{simSupplyDelay} {simSupplyDelay === 1 ? 'day' : 'days'}</span>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="4" 
                  step="1" 
                  value={simSupplyDelay} 
                  onChange={(e) => setSimSupplyDelay(parseInt(e.target.value))}
                  className="range-slider"
                />
                <span style={{ fontSize: '11px', color: 'rgba(38,38,36,0.6)' }}>Factory dispatch delay from manufacturing plant</span>
              </div>

              <div className="slider-group">
                <label>
                  <span>Monsoon Highway Obstruction:</span>
                  <span style={{ color: simMonsoonRisk ? '#C85A4E' : 'var(--color-ink)' }}>
                    {simMonsoonRisk ? 'Enabled (+45m transit)' : 'Clear Roads'}
                  </span>
                </label>
                <button
                  onClick={() => setSimMonsoonRisk(!simMonsoonRisk)}
                  className={`pill ${simMonsoonRisk ? 'pill-solid' : 'pill-outline'}`}
                  style={{ height: '36px', fontSize: '12px' }}
                >
                  {simMonsoonRisk ? 'Active Obstruction' : 'Simulate Ghat Landslide'}
                </button>
              </div>
            </div>

            {/* Live Comparative Simulation Results */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {/* Card 1: Do Nothing */}
              <div style={{ background: 'rgba(38,38,36,0.04)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(38,38,36,0.1)' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', color: 'rgba(38,38,36,0.6)', marginBottom: '8px' }}>
                  Model A: Do Nothing
                </div>
                <div style={{ fontSize: '32px', fontFamily: 'var(--font-serif)', color: '#C85A4E', marginBottom: '8px' }}>
                  {Math.round(1825 * simDemandSurge * (1 + simSupplyDelay * 0.2))} Stockouts
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(38,38,36,0.7)', lineHeight: 1.5 }}>
                  Rupees Lost: <strong>₹{Math.round(412000 * simDemandSurge).toLocaleString('en-IN')}</strong><br />
                  Territory Fill Rate: <strong>{(68.2 / (1 + simSupplyDelay * 0.08)).toFixed(1)}%</strong>
                </div>
              </div>

              {/* Card 2: Manual Weekly */}
              <div style={{ background: 'rgba(38,38,36,0.04)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(38,38,36,0.1)' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', color: 'rgba(38,38,36,0.6)', marginBottom: '8px' }}>
                  Model B: Weekly Excel Review
                </div>
                <div style={{ fontSize: '32px', fontFamily: 'var(--font-serif)', color: '#B87820', marginBottom: '8px' }}>
                  {Math.round(614 * simDemandSurge * (1 + simSupplyDelay * 0.1))} Stockouts
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(38,38,36,0.7)', lineHeight: 1.5 }}>
                  Rupees Lost: <strong>₹{Math.round(156000 * simDemandSurge).toLocaleString('en-IN')}</strong><br />
                  Territory Fill Rate: <strong>{(84.5 / (1 + simSupplyDelay * 0.04)).toFixed(1)}%</strong>
                </div>
              </div>

              {/* Card 3: DistriSense */}
              <div style={{ background: '#D4E5DE', padding: '24px', borderRadius: '12px', border: '2px solid var(--color-teal)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-teal)' }}>
                    DistriSense Decision Engine
                  </div>
                  <span className="risk-badge optimal">OPTIMAL</span>
                </div>
                <div style={{ fontSize: '32px', fontFamily: 'var(--font-serif)', color: 'var(--color-teal)', marginBottom: '8px' }}>
                  {simDemandSurge > 2.0 || simSupplyDelay > 2 ? '2 Stockouts' : '< 1 Stockout'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-ink)', lineHeight: 1.5 }}>
                  Net Rupees Protected: <strong>₹{Math.round(338572 * (simDemandSurge / 1.4)).toLocaleString('en-IN')}</strong><br />
                  Territory Fill Rate: <strong>99.4%</strong> (Maintained via proactive transfers)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SKU FORECAST INTELLIGENCE */}
        {activeTab === 'forecast' && (
          <div className="dash-panel-card">
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>14-Day Demand Velocity & Risk Trajectories</h3>
            <p style={{ fontSize: '14px', color: 'rgba(38,38,36,0.7)', marginBottom: '24px' }}>
              Multi-factor forecast combining seasonal sales rhythms, festival calendar, and kirana replenishment cadences.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {SKU_FORECASTS.map((skuItem, i) => (
                <div 
                  key={i} 
                  style={{ 
                    background: '#FFFFFF', 
                    borderRadius: '12px', 
                    padding: '20px', 
                    border: '1px solid rgba(38,38,36,0.1)' 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 600 }}>{skuItem.sku}</h4>
                      <span style={{ fontSize: '13px', color: 'rgba(38,38,36,0.6)' }}>
                        Daily Velocity: {skuItem.dailyVelocity} · Demand Trend: <strong style={{ color: 'var(--color-teal)' }}>{skuItem.demandTrend}</strong>
                      </span>
                    </div>

                    <span className={`risk-badge ${skuItem.riskLevel === 'Critical' ? 'critical' : skuItem.riskLevel === 'High' ? 'high' : 'medium'}`}>
                      {skuItem.riskLevel}
                    </span>
                  </div>

                  {/* Forecast Bar visualization */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', height: '80px', gap: '8px', paddingTop: '10px' }}>
                    {skuItem.forecastDays.map((val, idx) => {
                      const maxVal = Math.max(...skuItem.forecastDays);
                      const heightPercent = (val / maxVal) * 100;
                      return (
                        <div 
                          key={idx} 
                          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
                          title={`Day ${idx + 1}: ${val} units`}
                        >
                          <div 
                            style={{
                              width: '100%',
                              height: `${heightPercent}%`,
                              background: idx >= 3 && idx <= 6 ? 'var(--color-teal)' : 'var(--color-sage)',
                              borderRadius: '4px 4px 0 0',
                              transition: 'height 0.3s ease'
                            }} 
                          />
                          <span style={{ fontSize: '9px', color: 'rgba(38,38,36,0.5)' }}>D{idx + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOG & DISPATCH MANIFEST */}
        {activeTab === 'audit' && (
          <div className="dash-panel-card">
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Dispatched Transfer Log & Courier Allocations</h3>
            <p style={{ fontSize: '14px', color: 'rgba(38,38,36,0.7)', marginBottom: '24px' }}>
              Historical trail of approved logistics directives transmitted to warehouse distribution terminals.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {transfers.filter(t => t.approved).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(38,38,36,0.6)' }}>
                  No transfers approved yet today. Approve items in the queue to populate this dispatch manifest.
                </div>
              ) : (
                transfers.filter(t => t.approved).map((t, i) => (
                  <div 
                    key={t.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '10px',
                      padding: '16px 20px',
                      border: '1px solid rgba(38,38,36,0.1)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>#{t.id} · {t.sku}</span>
                        <span className="risk-badge optimal">Dispatched</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'rgba(38,38,36,0.6)' }}>
                        Routed from <strong>{t.recommendedSource}</strong> to <strong>{t.destination}</strong> · Qty: {t.quantity} {t.unit}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: 'var(--color-olive)' }}>Van Manifest #VAN-04</div>
                      <div style={{ fontSize: '11px', color: 'rgba(38,38,36,0.5)' }}>Estimated Delivery: 07:15 IST</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Decision Explainer Modal */}
      {inspectItem && (
        <div className="modal-overlay" onClick={() => setInspectItem(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow" style={{ color: 'var(--color-teal)' }}>DistriSense Rationale Engine</span>
                <h3 style={{ fontSize: '24px', margin: '4px 0' }}>{inspectItem.destination}</h3>
                <span style={{ fontSize: '14px', color: 'rgba(38,38,36,0.6)' }}>Transfer #{inspectItem.id} · {inspectItem.sku}</span>
              </div>
              <button onClick={() => setInspectItem(null)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '24px', padding: '16px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid rgba(38,38,36,0.1)' }}>
              <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '14px' }}>Algorithmic Justification:</div>
              <p style={{ fontSize: '14px', color: 'rgba(38,38,36,0.85)', lineHeight: 1.55 }}>
                {inspectItem.reason}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#FAF9F5', padding: '14px', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'rgba(38,38,36,0.6)' }}>Cover Left Before</span>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#C85A4E' }}>{inspectItem.coverLeft} {inspectItem.coverUnit}</div>
              </div>

              <div style={{ background: '#D4E5DE', padding: '14px', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-teal)' }}>Projected Cover After</span>
                <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-teal)' }}>{inspectItem.destStockAfter}</div>
              </div>
            </div>

            <div style={{ fontSize: '13px', color: 'rgba(38,38,36,0.7)', marginBottom: '24px', lineHeight: 1.6 }}>
              • <strong>Recommended Source:</strong> {inspectItem.recommendedSource} ({inspectItem.sourceDistance})<br />
              • <strong>Source Inventory Safeguard:</strong> {inspectItem.sourceStockAfter}<br />
              • <strong>Allocated Logistics Cost:</strong> {inspectItem.freightCost} (combined with regional milk-run van)
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setInspectItem(null)} className="pill pill-outline" style={{ height: '40px' }}>
                Close
              </button>
              {!inspectItem.approved && (
                <button 
                  onClick={() => {
                    handleApprove(inspectItem.id);
                    setInspectItem(null);
                  }} 
                  className="pill pill-teal" 
                  style={{ height: '40px' }}
                >
                  <Check size={14} />
                  Approve This Transfer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
