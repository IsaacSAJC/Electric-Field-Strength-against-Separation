import React, { useState, useMemo, useEffect } from 'react';
import { Settings2, Info, Activity, Eye, EyeOff } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

// Utility for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const K = 8.99e9; // Coulomb's constant

export default function App() {
  // Sandbox State
  const [q1, setQ1] = useState<number>(7.2); // nC
  const [q2, setQ2] = useState<number>(-3.6); // nC
  const [d, setD] = useState<number>(0.06); // m
  const [r1, setR1] = useState<number>(0.01); // m
  const [r2, setR2] = useState<number>(0.01); // m
  const [probeX, setProbeX] = useState<number>(0.03); // m
  const [showComponents, setShowComponents] = useState<boolean>(true);

  // Ensure probeX stays within bounds if d changes
  useEffect(() => {
    if (probeX > d) {
      setProbeX(d / 2);
    }
  }, [d, probeX]);

  // Physics Calculations
  const getE1 = (x: number) => {
    if (x < r1 || x > d - r2) return 0;
    return (K * q1 * 1e-9) / (x * x);
  };

  const getE2 = (x: number) => {
    if (x < r1 || x > d - r2) return 0;
    return (-K * q2 * 1e-9) / ((d - x) * (d - x));
  };

  const getEnet = (x: number) => {
    if (x < r1 || x > d - r2) return 0;
    return getE1(x) + getE2(x);
  };

  // Current values at probe
  const currentE1 = getE1(probeX);
  const currentE2 = getE2(probeX);
  const currentEnet = getEnet(probeX);

  // Graph Data Generation
  const graphData = useMemo(() => {
    const points = [];
    const steps = 500; // Increased steps for better minimum finding
    let maxY = 0;
    let minAbsEnet = Infinity;
    let minEnetPoint = { x: 0, enet: 0 };

    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * d;
      const e1 = getE1(x);
      const e2 = getE2(x);
      const enet = getEnet(x);
      
      points.push({ x, e1, e2, enet });

      // Calculate max Y based on the middle 80% of the distance between spheres
      if (x > r1 + (d - r1 - r2) * 0.1 && x < d - r2 - (d - r1 - r2) * 0.1) {
        maxY = Math.max(maxY, Math.abs(e1), Math.abs(e2), Math.abs(enet));
      }

      // Find minimum absolute Enet between spheres
      if (x > r1 && x < d - r2) {
        if (Math.abs(enet) < minAbsEnet) {
          minAbsEnet = Math.abs(enet);
          minEnetPoint = { x, enet };
        }
      }
    }

    // Add a bit of padding to the max Y
    maxY = maxY === 0 ? 1000 : maxY * 1.2;

    // Calculate max Enet at the surfaces
    const maxEnetR1 = getEnet(r1 + 0.0001); // slightly outside to get value
    const maxEnetR2 = getEnet(d - r2 - 0.0001);

    return { points, maxY, minEnetPoint, maxEnetR1, maxEnetR2 };
  }, [q1, q2, d, r1, r2]);

  // SVG Graph Configuration
  const svgWidth = 800;
  const svgHeight = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 80 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  const xToSvg = (x: number) => padding.left + (x / d) * plotWidth;
  const yToSvg = (y: number) => {
    // Clamp Y to avoid SVG rendering issues with Infinity
    const clampedY = Math.max(-graphData.maxY * 2, Math.min(graphData.maxY * 2, y));
    return padding.top + plotHeight / 2 - (clampedY / graphData.maxY) * (plotHeight / 2);
  };

  // Generate SVG Paths
  const generatePath = (key: 'e1' | 'e2' | 'enet') => {
    // Only draw paths outside the spheres to show curves starting/ending at surfaces
    const validPoints = graphData.points.filter(p => p.x >= r1 && p.x <= d - r2);
    if (validPoints.length === 0) return '';
    return validPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xToSvg(p.x)} ${yToSvg(p[key])}`)
      .join(' ');
  };

  // Format numbers for display
  const formatSci = (num: number) => {
    if (!isFinite(num)) return 'â';
    if (Math.abs(num) < 0.01) return '0.00';
    return num.toExponential(2).replace('e+', ' x 10^').replace('e', ' x 10^');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Activity size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Electric Field Superposition</h1>
          </div>
          <p className="text-slate-600">
            Explore how the electric fields from two point charges combine. Drag the probe to plot the graph of Electric Field Strength (<InlineMath math="E" />) against separation (<InlineMath math="x" />).
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Controls Sandbox */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Settings2 size={20} className="text-slate-500" />
              <h2 className="text-lg font-semibold text-slate-800">Sandbox Controls</h2>
            </div>

            <div className="space-y-4">
              {/* Q1 Control */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-slate-700">Charge R (<InlineMath math="Q_1" />)</label>
                  <span className={cn("text-sm font-bold", q1 > 0 ? "text-red-600" : q1 < 0 ? "text-blue-600" : "text-slate-500")}>
                    {q1 > 0 ? '+' : ''}{q1} nC
                  </span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  step="0.1"
                  value={q1}
                  onChange={(e) => setQ1(parseFloat(e.target.value))}
                  className="w-full accent-slate-600"
                />
              </div>

              {/* Q2 Control */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-slate-700">Charge S (<InlineMath math="Q_2" />)</label>
                  <span className={cn("text-sm font-bold", q2 > 0 ? "text-red-600" : q2 < 0 ? "text-blue-600" : "text-slate-500")}>
                    {q2 > 0 ? '+' : ''}{q2} nC
                  </span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  step="0.1"
                  value={q2}
                  onChange={(e) => setQ2(parseFloat(e.target.value))}
                  className="w-full accent-slate-600"
                />
              </div>

              {/* Distance Control */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-slate-700">Distance (<InlineMath math="d" />)</label>
                  <span className="text-sm font-bold text-slate-700">{d.toFixed(3)} m</span>
                </div>
                <input
                  type="range"
                  min="0.04"
                  max="0.15"
                  step="0.01"
                  value={d}
                  onChange={(e) => {
                    const newD = parseFloat(e.target.value);
                    setD(newD);
                    if (r1 + r2 > newD) {
                      setR1(newD / 2.1);
                      setR2(newD / 2.1);
                    }
                  }}
                  className="w-full accent-slate-600"
                />
              </div>

              {/* Radius 1 Control */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-slate-700">Sphere R Radius (<InlineMath math="r_1" />)</label>
                  <span className="text-sm font-bold text-slate-700">{r1.toFixed(3)} m</span>
                </div>
                <input
                  type="range"
                  min="0.005"
                  max={d - r2 - 0.001}
                  step="0.001"
                  value={r1}
                  onChange={(e) => setR1(parseFloat(e.target.value))}
                  className="w-full accent-slate-600"
                />
              </div>

              {/* Radius 2 Control */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-slate-700">Sphere S Radius (<InlineMath math="r_2" />)</label>
                  <span className="text-sm font-bold text-slate-700">{r2.toFixed(3)} m</span>
                </div>
                <input
                  type="range"
                  min="0.005"
                  max={d - r1 - 0.001}
                  step="0.001"
                  value={r2}
                  onChange={(e) => setR2(parseFloat(e.target.value))}
                  className="w-full accent-slate-600"
                />
              </div>

              {/* Toggle Components */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowComponents(!showComponents)}
                  className="flex items-center gap-2 w-full justify-center py-2 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors border border-slate-200"
                >
                  {showComponents ? <EyeOff size={18} /> : <Eye size={18} />}
                  <span className="text-sm font-medium">
                    {showComponents ? "Hide Individual Fields" : "Show Individual Fields"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Visualization & Graph */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1D Vector Visualization */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">1D Vector Visualization</h2>
              
              <div className="relative h-32 w-full select-none">
                <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="xMidYMid meet" className="overflow-visible">
                  <defs>
                    <marker id="arrow-enet" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#1e293b" />
                    </marker>
                    <marker id="arrow-e1" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                    </marker>
                    <marker id="arrow-e2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
                    </marker>
                  </defs>

                  {/* Main Axis Line */}
                  <line x1="10" y1="20" x2="90" y2="20" stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="1 1" />
                  
                  {/* Distance Indicator */}
                  <line x1="10" y1="32" x2="90" y2="32" stroke="#94a3b8" strokeWidth="0.25" />
                  <line x1="10" y1="30" x2="10" y2="34" stroke="#94a3b8" strokeWidth="0.25" />
                  <line x1="90" y1="30" x2="90" y2="34" stroke="#94a3b8" strokeWidth="0.25" />
                  <text x="50" y="38" textAnchor="middle" className="text-[4px] fill-slate-500">{d.toFixed(3)} m</text>

                  {/* Charge R */}
                  <circle cx="10" cy="20" r={(r1 / d) * 80} className={cn(q1 > 0 ? "fill-red-100 stroke-red-500" : q1 < 0 ? "fill-blue-100 stroke-blue-500" : "fill-slate-100 stroke-slate-500")} strokeWidth="0.5" />
                  <text x="10" y="20" textAnchor="middle" dominantBaseline="central" className="text-[4px] font-bold fill-slate-700">{q1 > 0 ? '+' : q1 < 0 ? '-' : '0'}</text>
                  <text x="10" y="8" textAnchor="middle" className="text-[4px] font-semibold fill-slate-600">R</text>

                  {/* Charge S */}
                  <circle cx="90" cy="20" r={(r2 / d) * 80} className={cn(q2 > 0 ? "fill-red-100 stroke-red-500" : q2 < 0 ? "fill-blue-100 stroke-blue-500" : "fill-slate-100 stroke-slate-500")} strokeWidth="0.5" />
                  <text x="90" y="20" textAnchor="middle" dominantBaseline="central" className="text-[4px] font-bold fill-slate-700">{q2 > 0 ? '+' : q2 < 0 ? '-' : '0'}</text>
                  <text x="90" y="8" textAnchor="middle" className="text-[4px] font-semibold fill-slate-600">S</text>

                  {/* Vectors at Probe */}
                  {(() => {
                    const px = 10 + (probeX / d) * 80;
                    const maxVectorLength = 25;
                    
                    // Scale vectors relative to the max Y of the graph
                    const scale = (val: number) => {
                      if (!isFinite(val)) return 0;
                      const scaled = (val / graphData.maxY) * 15;
                      return Math.max(-maxVectorLength, Math.min(maxVectorLength, scaled));
                    };

                    const v1 = scale(currentE1);
                    const v2 = scale(currentE2);
                    const vNet = scale(currentEnet);

                    return (
                      <g>
                        {/* E1 Vector */}
                        {showComponents && Math.abs(v1) > 0.5 && (
                          <line x1={px} y1="16" x2={px + v1} y2="16" stroke="#ef4444" strokeWidth="0.5" markerEnd="url(#arrow-e1)" />
                        )}
                        {/* E2 Vector */}
                        {showComponents && Math.abs(v2) > 0.5 && (
                          <line x1={px} y1="24" x2={px + v2} y2="24" stroke="#3b82f6" strokeWidth="0.5" markerEnd="url(#arrow-e2)" />
                        )}
                        {/* Enet Vector */}
                        {Math.abs(vNet) > 0.5 && (
                          <line x1={px} y1="20" x2={px + vNet} y2="20" stroke="#1e293b" strokeWidth="0.75" markerEnd="url(#arrow-enet)" />
                        )}
                        
                        {/* Probe Dot */}
                        <circle cx={px} cy="20" r="1.5" className="fill-amber-400 stroke-white" strokeWidth="0.5" />
                      </g>
                    );
                  })()}
                </svg>
              </div>

              {/* Probe Slider */}
              <div className="mt-4 bg-amber-50 p-4 rounded-xl border border-amber-100">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                    <Info size={16} /> Drag to move probe & plot graph
                  </label>
                  <span className="text-sm font-mono text-amber-700"><InlineMath math="x =" /> {probeX.toFixed(3)} m</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={d}
                  step="0.001"
                  value={probeX}
                  onChange={(e) => setProbeX(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Current Values Readout */}
              <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                {showComponents && (
                  <>
                    <div className="p-2 rounded bg-red-50 border border-red-100">
                      <div className="text-xs text-red-600 font-semibold mb-1"><InlineMath math="E" /> from R</div>
                      <div className="text-sm font-mono text-red-700">{formatSci(currentE1)} N/C</div>
                    </div>
                    <div className="p-2 rounded bg-blue-50 border border-blue-100">
                      <div className="text-xs text-blue-600 font-semibold mb-1"><InlineMath math="E" /> from S</div>
                      <div className="text-sm font-mono text-blue-700">{formatSci(currentE2)} N/C</div>
                    </div>
                  </>
                )}
                <div className={cn("p-2 rounded border", showComponents ? "bg-slate-50 border-slate-200" : "col-span-3 bg-slate-50 border-slate-200")}>
                  <div className="text-xs text-slate-600 font-semibold mb-1">Resultant <InlineMath math="E" /></div>
                  <div className="text-sm font-mono text-slate-800 font-bold">{formatSci(currentEnet)} N/C</div>
                </div>
              </div>
            </div>

            {/* Graph */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Electric Field vs Distance</h2>
              
              <div className="relative w-full overflow-hidden" style={{ height: svgHeight }}>
                <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none">
                  
                  {/* Shaded Regions for Spheres */}
                  <rect x={padding.left} y={padding.top} width={xToSvg(r1) - padding.left} height={plotHeight} fill="#f1f5f9" opacity="0.5" />
                  <rect x={xToSvg(d - r2)} y={padding.top} width={svgWidth - padding.right - xToSvg(d - r2)} height={plotHeight} fill="#f1f5f9" opacity="0.5" />

                  {/* Grid and Axes */}
                  <g className="stroke-slate-200" strokeWidth="1">
                    {/* Y Grid Lines */}
                    {[0.25, 0.5, 0.75].map(ratio => (
                      <line key={ratio} x1={padding.left} y1={padding.top + plotHeight * ratio} x2={svgWidth - padding.right} y2={padding.top + plotHeight * ratio} strokeDasharray="4 4" />
                    ))}
                    {/* X-Axis (y=0) */}
                    <line x1={padding.left} y1={padding.top + plotHeight / 2} x2={svgWidth - padding.right} y2={padding.top + plotHeight / 2} stroke="#94a3b8" strokeWidth="2" />
                    {/* Y-Axis (x=0) */}
                    <line x1={padding.left} y1={padding.top} x2={padding.left} y2={svgHeight - padding.bottom} stroke="#94a3b8" strokeWidth="2" />
                    {/* End Boundary (x=d) */}
                    <line x1={svgWidth - padding.right} y1={padding.top} x2={svgWidth - padding.right} y2={svgHeight - padding.bottom} stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
                    
                    {/* Sphere Boundaries */}
                    <line x1={xToSvg(r1)} y1={padding.top} x2={xToSvg(r1)} y2={svgHeight - padding.bottom} stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
                    <line x1={xToSvg(d - r2)} y1={padding.top} x2={xToSvg(d - r2)} y2={svgHeight - padding.bottom} stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
                    
                  </g>

                  {/* Axis Labels */}
                  <text x={padding.left - 10} y={padding.top + 10} textAnchor="end" className="text-xs fill-slate-500">E (N/C)</text>
                  <text x={padding.left - 10} y={padding.top + plotHeight / 2 + 4} textAnchor="end" className="text-xs fill-slate-400">0</text>
                  <text x={svgWidth - padding.right + 10} y={padding.top + plotHeight / 2 + 4} className="text-xs fill-slate-500">x (m)</text>
                  <text x={padding.left} y={svgHeight - 15} textAnchor="middle" className="text-xs fill-slate-500">0</text>
                  <text x={svgWidth - padding.right} y={svgHeight - 15} textAnchor="middle" className="text-xs fill-slate-500">{d.toFixed(3)}</text>

                  {/* Max E Field Strength on Y-axis where it cuts */}
                  {probeX >= r1 && (
                    <>
                      <line x1={padding.left} y1={yToSvg(graphData.maxEnetR1)} x2={xToSvg(r1)} y2={yToSvg(graphData.maxEnetR1)} stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
                      <text x={padding.left - 5} y={yToSvg(graphData.maxEnetR1) + 4} textAnchor="end" className="text-[10px] font-bold fill-slate-700">{formatSci(graphData.maxEnetR1)}</text>
                    </>
                  )}
                  
                  {probeX >= d - r2 && (
                    <>
                      <line x1={padding.left} y1={yToSvg(graphData.maxEnetR2)} x2={xToSvg(d - r2)} y2={yToSvg(graphData.maxEnetR2)} stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
                      <text x={padding.left - 5} y={yToSvg(graphData.maxEnetR2) + 4} textAnchor="end" className="text-[10px] font-bold fill-slate-700">{formatSci(graphData.maxEnetR2)}</text>
                    </>
                  )}

                  {/* Minimum E Field Strength Coordinates */}
                  {probeX >= graphData.minEnetPoint.x && (
                    <>
                      <line x1={xToSvg(graphData.minEnetPoint.x)} y1={padding.top + plotHeight / 2} x2={xToSvg(graphData.minEnetPoint.x)} y2={yToSvg(graphData.minEnetPoint.enet)} stroke="#10b981" strokeWidth="1" strokeDasharray="2 2" />
                      <line x1={padding.left} y1={yToSvg(graphData.minEnetPoint.enet)} x2={xToSvg(graphData.minEnetPoint.x)} y2={yToSvg(graphData.minEnetPoint.enet)} stroke="#10b981" strokeWidth="1" strokeDasharray="2 2" />
                      <circle cx={xToSvg(graphData.minEnetPoint.x)} cy={yToSvg(graphData.minEnetPoint.enet)} r="3" className="fill-emerald-500" />
                      <text x={xToSvg(graphData.minEnetPoint.x)} y={padding.top + plotHeight / 2 + 15} textAnchor="middle" className="text-[10px] font-bold fill-emerald-600">{graphData.minEnetPoint.x.toFixed(3)}</text>
                      <text x={padding.left - 5} y={yToSvg(graphData.minEnetPoint.enet) + 4} textAnchor="end" className="text-[10px] font-bold fill-emerald-600">{formatSci(graphData.minEnetPoint.enet)}</text>
                    </>
                  )}

                  {/* Dynamic Y-Axis Max/Min Labels */}
                  <text x={padding.left - 10} y={padding.top + 25} textAnchor="end" className="text-[10px] fill-slate-400">{formatSci(graphData.maxY)}</text>
                  <text x={padding.left - 10} y={svgHeight - padding.bottom - 10} textAnchor="end" className="text-[10px] fill-slate-400">-{formatSci(graphData.maxY)}</text>

                  {/* Clip Path for revealing graph */}
                  <defs>
                    <clipPath id="reveal-clip">
                      <rect x={padding.left} y="0" width={xToSvg(probeX) - padding.left} height={svgHeight} />
                    </clipPath>
                  </defs>

                  {/* Data Curves (Clipped) */}
                  <g clipPath="url(#reveal-clip)">
                    {/* E=0 lines inside spheres */}
                    <line x1={padding.left} y1={padding.top + plotHeight / 2} x2={xToSvg(r1)} y2={padding.top + plotHeight / 2} stroke="#1e293b" strokeWidth="3" />
                    <line x1={xToSvg(d - r2)} y1={padding.top + plotHeight / 2} x2={svgWidth - padding.right} y2={padding.top + plotHeight / 2} stroke="#1e293b" strokeWidth="3" />

                    {showComponents && (
                      <>
                        <path d={generatePath('e1')} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="6 4" opacity="0.6" />
                        <path d={generatePath('e2')} fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 4" opacity="0.6" />
                      </>
                    )}
                    <path d={generatePath('enet')} fill="none" stroke="#1e293b" strokeWidth="3" />
                  </g>

                  {/* Current Probe Position Marker on Graph */}
                  <line 
                    x1={xToSvg(probeX)} 
                    y1={padding.top} 
                    x2={xToSvg(probeX)} 
                    y2={svgHeight - padding.bottom} 
                    stroke="#f59e0b" 
                    strokeWidth="1" 
                    strokeDasharray="4 4" 
                  />
                  <circle 
                    cx={xToSvg(probeX)} 
                    cy={yToSvg(currentEnet)} 
                    r="5" 
                    className="fill-amber-400 stroke-white" 
                    strokeWidth="2" 
                  />
                </svg>
              </div>

              {/* Legend */}
              <div className="flex justify-center gap-6 mt-4">
                {showComponents && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0.5 border-t-2 border-dashed border-red-500"></div>
                      <span className="text-xs text-slate-600"><InlineMath math="E_1" /> (from R)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0.5 border-t-2 border-dashed border-blue-500"></div>
                      <span className="text-xs text-slate-600"><InlineMath math="E_2" /> (from S)</span>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-slate-800 rounded-full"></div>
                  <span className="text-xs font-semibold text-slate-800">Resultant <InlineMath math="E" /></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-semibold text-emerald-600">Minimum <InlineMath math="|E|" /></span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
