import React, { useState, useRef, useCallback } from 'react';
import { 
  Box, CheckCircle2, ArrowRight,
  Cpu, Plus, Minus, Maximize2,
  X, ChevronRight, ChevronLeft, Sparkles, Layers,
  FileText, Info, GitFork
} from 'lucide-react';

export interface SubFeature {
  id: string;
  name: string;
  summary: string;
  icon?: string;
  priority?: string;
  state?: 'planned' | 'in_progress' | 'done';
}

export interface FeatureNode {
  id: string;
  name: string;
  summary: string;
  icon?: string;
  priority?: string;
  phase?: string | number;
  subFeatures?: SubFeature[];
}

interface FlowMapProps {
  title: string;
  features: FeatureNode[];
  onContinue: () => void;
  idea?: string;
}

export const FlowMap: React.FC<FlowMapProps> = ({ 
  title, 
  features, 
  onContinue,
  idea
}) => {
  // View mode: interactive canvas or list grid
  const [viewMode, setViewMode] = useState<'canvas' | 'grid'>('canvas');
  
  // Selected node for detail drawer
  const [selectedNode, setSelectedNode] = useState<{
    type: 'root' | 'feature' | 'subgroup';
    featureIndex?: number;
    subIndex?: number;
  } | null>(null);

  // Top hint banner state
  const [showHint, setShowHint] = useState<boolean>(true);

  // Canvas pan and zoom state
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 80, y: 40 });
  const [zoom, setZoom] = useState<number>(0.95);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Center nodes initially or on reset
  const handleFitView = useCallback(() => {
    setPan({ x: 60, y: 40 });
    setZoom(0.95);
  }, []);

  const handleZoomIn = () => setZoom(prev => Math.min(1.6, prev + 0.15));
  const handleZoomOut = () => setZoom(prev => Math.max(0.45, prev - 0.15));
  const handleResetZoom = () => setZoom(1.0);

  // Mouse drag handlers for canvas panning
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking canvas background (not on buttons or cards)
    if ((e.target as HTMLElement).closest('.interactive-node') || 
        (e.target as HTMLElement).closest('.canvas-control')) {
      return;
    }
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setZoom(prev => Math.min(1.6, Math.max(0.45, prev + delta)));
    } else {
      // Normal wheel pans vertically
      setPan(prev => ({
        x: prev.x - e.deltaX * 0.5,
        y: prev.y - e.deltaY * 0.5
      }));
    }
  };

  // Node Layout Dimensions
  const ROOT_X = 40;
  const FEAT_X = 380;
  const SUB_X = 720;
  const NODE_W = 260;
  const ROW_GAP = 130;

  // Total canvas height based on features
  const totalRows = Math.max(features.length, 3);
  const rootCenterY = Math.max(120, (totalRows * ROW_GAP) / 2 - 20);

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-300">
      {/* Top Banner Toolbar & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121215] border border-[#27272a] p-3 sm:px-4 sm:py-2.5 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-lg bg-[#ff5c20]/15 text-[#ff5c20]">
            <GitFork className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-semibold text-zinc-200">
            Arsitektur &amp; Flow Canvas
          </span>
          <span className="text-zinc-600 hidden sm:inline">|</span>
          <span className="text-xs text-zinc-400 hidden sm:inline">
            {features.length} Modul Terpetakan
          </span>
        </div>

        {/* View Toggle Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="inline-flex p-1 bg-[#18181b] border border-[#27272a] rounded-lg">
            <button
              onClick={() => setViewMode('canvas')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'canvas' 
                  ? 'bg-[#ff5c20] text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Canvas Flow</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-[#ff5c20] text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Daftar Modul</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dismissible Hint Banner matching ngodingpakeai */}
      {showHint && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-zinc-800/80 bg-[#141418] text-xs text-zinc-400">
          <div className="flex items-center gap-2 min-w-0">
            <Info className="w-4 h-4 text-[#ff5c20] shrink-0" />
            <p className="truncate">
              Peta proyek kamu: dari <strong className="text-zinc-200">Perencanaan</strong> ke tiap <strong className="text-zinc-200">Modul Fitur</strong>. Klik kotak mana pun pada canvas untuk melihat detail arsitektur di panel samping.
            </p>
          </div>
          <button 
            onClick={() => setShowHint(false)}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer shrink-0"
            title="Sembunyikan petunjuk"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 1: INTERACTIVE CANVAS FLOW MAP (ReactFlow style)    */}
      {/* ======================================================== */}
      {viewMode === 'canvas' ? (
        <div className="relative w-full h-[620px] rounded-2xl border border-[#27272a] bg-[#09090b] overflow-hidden select-none shadow-2xl">
          {/* Subtle Grid Dot Pattern Background that moves with pan */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 1.2px, transparent 1.2px)',
              backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`
            }}
          />

          {/* Draggable & Pannable Interactive Canvas Layer */}
          <div
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className={`w-full h-full relative ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          >
            {/* Transformed Stage */}
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                transition: isDragging ? 'none' : 'transform 0.08s ease-out',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '1800px',
                height: `${Math.max(800, totalRows * ROW_GAP + 200)}px`
              }}
            >
              {/* Dynamic Curved SVG Connecting Edges */}
              <svg 
                className="absolute inset-0 pointer-events-none overflow-visible"
                style={{ width: '100%', height: '100%' }}
              >
                <defs>
                  {/* Linear Gradient for Edge Connectors */}
                  <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ff5c20" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#ff7a45" stopOpacity="0.4" />
                  </linearGradient>

                  {/* Marker Arrow */}
                  <marker
                    id="arrowhead"
                    markerWidth="6"
                    markerHeight="6"
                    refX="5"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 6 3, 0 6" fill="#ff5c20" opacity="0.7" />
                  </marker>
                </defs>

                {/* Edges from Root to Feature Nodes */}
                {features.map((_feat, idx) => {
                  const x1 = ROOT_X + NODE_W;
                  const y1 = rootCenterY + 45;
                  const x2 = FEAT_X;
                  const y2 = 40 + idx * ROW_GAP + 45;

                  const dx = (x2 - x1) * 0.55;
                  const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

                  const isHighlighted = selectedNode?.featureIndex === idx;

                  return (
                    <g key={`edge-root-${idx}`}>
                      {/* Glow path if selected */}
                      {isHighlighted && (
                        <path
                          d={pathData}
                          fill="none"
                          stroke="#ff5c20"
                          strokeWidth="4"
                          strokeOpacity="0.3"
                        />
                      )}
                      <path
                        d={pathData}
                        fill="none"
                        stroke={isHighlighted ? "#ff5c20" : "rgba(161, 161, 170, 0.25)"}
                        strokeWidth={isHighlighted ? "2" : "1.5"}
                        strokeDasharray={isHighlighted ? undefined : "4 4"}
                        markerEnd="url(#arrowhead)"
                      />
                    </g>
                  );
                })}

                {/* Edges from Feature Nodes to Sub-Feature Group Nodes */}
                {features.map((feat, idx) => {
                  if (!feat.subFeatures || feat.subFeatures.length === 0) return null;
                  const x1 = FEAT_X + NODE_W;
                  const y1 = 40 + idx * ROW_GAP + 45;
                  const x2 = SUB_X;
                  const y2 = y1;

                  const isHighlighted = selectedNode?.featureIndex === idx;

                  return (
                    <g key={`edge-sub-${idx}`}>
                      <path
                        d={`M ${x1} ${y1} L ${x2} ${y2}`}
                        fill="none"
                        stroke={isHighlighted ? "#ff5c20" : "rgba(161, 161, 170, 0.25)"}
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        markerEnd="url(#arrowhead)"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* ---------------------------------------------------- */}
              {/* NODE 1: PERENCANAAN (Root / PRD Node)                */}
              {/* ---------------------------------------------------- */}
              <div
                onClick={() => setSelectedNode({ type: 'root' })}
                style={{
                  position: 'absolute',
                  left: `${ROOT_X}px`,
                  top: `${rootCenterY}px`,
                  width: `${NODE_W}px`
                }}
                className={`interactive-node cursor-pointer rounded-2xl border p-4 bg-[#121215] shadow-xl transition-all duration-200 hover:scale-[1.02] ${
                  selectedNode?.type === 'root'
                    ? 'border-[#ff5c20] ring-2 ring-[#ff5c20]/30 shadow-[#ff5c20]/15'
                    : 'border-[#27272a] hover:border-zinc-700'
                }`}
              >
                {/* Header */}
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-xl bg-[#ff5c20]/15 border border-[#ff5c20]/30 flex items-center justify-center text-[#ff5c20] shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#ff5c20] font-bold block">
                      Perencanaan
                    </span>
                    <h4 className="text-sm font-bold text-white truncate" title={title}>
                      {title || 'Perencanaan Sistem'}
                    </h4>
                  </div>
                </div>

                {/* Sub info */}
                <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#ff5c20]" />
                    <span>{features.length} Modul Fitur</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300">
                    CORE
                  </span>
                </div>

                {/* Connection Output Handle Dot */}
                <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 size-3 rounded-full bg-[#ff5c20] border-2 border-[#121215]" />
              </div>

              {/* ---------------------------------------------------- */}
              {/* NODE 2: MODUL FITUR NODES (Column 2)                 */}
              {/* ---------------------------------------------------- */}
              {features.map((feat, idx) => {
                const isSelected = selectedNode?.type === 'feature' && selectedNode?.featureIndex === idx;
                const topPos = 40 + idx * ROW_GAP;
                const subCount = feat.subFeatures?.length || 0;

                return (
                  <div
                    key={`feat-node-${feat.id || idx}`}
                    onClick={() => setSelectedNode({ type: 'feature', featureIndex: idx })}
                    style={{
                      position: 'absolute',
                      left: `${FEAT_X}px`,
                      top: `${topPos}px`,
                      width: `${NODE_W}px`
                    }}
                    className={`interactive-node cursor-pointer rounded-2xl border p-3.5 bg-[#121215] shadow-lg transition-all duration-200 hover:scale-[1.02] ${
                      isSelected
                        ? 'border-[#ff5c20] ring-2 ring-[#ff5c20]/30 shadow-[#ff5c20]/15'
                        : 'border-[#27272a] hover:border-zinc-700'
                    }`}
                  >
                    {/* Input Connection Handle Dot */}
                    <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 size-3 rounded-full bg-[#ff5c20] border-2 border-[#121215]" />

                    {/* Top Phase Tag */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#ff5c20] font-semibold">
                        Modul {idx + 1}
                      </span>
                      <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-semibold">
                        {feat.priority || 'HIGH'}
                      </span>
                    </div>

                    {/* Module Title */}
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
                        <Box className="w-3.5 h-3.5 text-[#ff5c20]" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate flex-1" title={feat.name}>
                        {feat.name}
                      </h4>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    </div>

                    {/* Module 1-line Summary */}
                    <p className="text-[11px] text-zinc-400 mt-2 line-clamp-1 leading-normal">
                      {feat.summary}
                    </p>

                    {/* Sub-feature stats pill */}
                    <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1 font-mono text-zinc-400">
                        <CheckCircle2 className="w-3 h-3 text-[#ff5c20]" />
                        <span>{subCount} sub-fitur</span>
                      </span>
                      <span className="text-zinc-500">Klik detail &rarr;</span>
                    </div>

                    {/* Output Connection Handle Dot */}
                    {subCount > 0 && (
                      <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 size-3 rounded-full bg-[#ff5c20] border-2 border-[#121215]" />
                    )}
                  </div>
                );
              })}

              {/* ---------------------------------------------------- */}
              {/* NODE 3: SUB-FITUR NODES (Column 3)                   */}
              {/* ---------------------------------------------------- */}
              {features.map((feat, idx) => {
                if (!feat.subFeatures || feat.subFeatures.length === 0) return null;
                const topPos = 40 + idx * ROW_GAP;
                const isSelected = selectedNode?.featureIndex === idx;

                return (
                  <div
                    key={`sub-node-${feat.id || idx}`}
                    onClick={() => setSelectedNode({ type: 'feature', featureIndex: idx })}
                    style={{
                      position: 'absolute',
                      left: `${SUB_X}px`,
                      top: `${topPos}px`,
                      width: '280px'
                    }}
                    className={`interactive-node cursor-pointer rounded-2xl border p-3 bg-[#16161a] shadow-md transition-all duration-200 hover:scale-[1.01] ${
                      isSelected
                        ? 'border-[#ff5c20]/60 ring-1 ring-[#ff5c20]/20'
                        : 'border-[#27272a] hover:border-zinc-700'
                    }`}
                  >
                    {/* Input Connection Handle Dot */}
                    <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 size-3 rounded-full bg-[#ff5c20] border-2 border-[#16161a]" />

                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-[#ff5c20]" />
                        Sub-Fitur Eksekusi
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {feat.subFeatures.length} item
                      </span>
                    </div>

                    {/* Sub-features list pill */}
                    <div className="space-y-1.5">
                      {feat.subFeatures.slice(0, 3).map((sub, sIdx) => (
                        <div 
                          key={sub.id || sIdx}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#111113] border border-zinc-800/80 text-[11px]"
                        >
                          <span className="size-1.5 rounded-full bg-[#ff5c20] shrink-0" />
                          <span className="truncate text-zinc-200 font-medium">{sub.name}</span>
                        </div>
                      ))}
                      {feat.subFeatures.length > 3 && (
                        <span className="text-[10px] text-zinc-500 pl-2 block font-mono">
                          +{feat.subFeatures.length - 3} sub-fitur lainnya...
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floating Canvas Controls Toolbar (Zoom, Pan, Fit) */}
          <div className="canvas-control absolute bottom-4 left-4 z-20 flex items-center gap-1 p-1 bg-[#121215]/90 backdrop-blur-md border border-[#27272a] rounded-xl shadow-xl">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 rounded-md text-[11px] font-mono font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Reset Zoom 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <div className="h-4 w-px bg-zinc-800 mx-0.5" />
            <button
              onClick={handleFitView}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Pusatkan Tampilan (Fit View)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Floating Hint Overlay on Bottom Right */}
          <div className="absolute bottom-4 right-4 z-20 hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#121215]/80 backdrop-blur-md border border-[#27272a] rounded-lg text-[11px] text-zinc-400 pointer-events-none">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Interactive Canvas · Drag untuk menggeser, Scroll untuk zoom</span>
          </div>

          {/* -------------------------------------------------------- */}
          {/* DETAIL INSPECTOR DRAWER (Slides in when node is clicked) */}
          {/* -------------------------------------------------------- */}
          {selectedNode && (
            <div className="absolute top-0 right-0 h-full w-full sm:w-[380px] bg-[#121215]/95 backdrop-blur-xl border-l border-[#27272a] shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#27272a]">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-lg bg-[#ff5c20]/20 text-[#ff5c20]">
                    <Box className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs font-mono uppercase font-bold text-zinc-200">
                    {selectedNode.type === 'root' ? 'Detail Perencanaan' : `Modul ${(selectedNode.featureIndex || 0) + 1} of ${features.length}`}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {selectedNode.type === 'feature' && (
                    <>
                      <button
                        disabled={(selectedNode.featureIndex || 0) <= 0}
                        onClick={() => setSelectedNode(prev => ({
                          ...prev!,
                          featureIndex: (prev?.featureIndex || 0) - 1
                        }))}
                        className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Modul Sebelumnya"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        disabled={(selectedNode.featureIndex || 0) >= features.length - 1}
                        onClick={() => setSelectedNode(prev => ({
                          ...prev!,
                          featureIndex: (prev?.featureIndex || 0) + 1
                        }))}
                        className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Modul Berikutnya"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer ml-1"
                    title="Tutup Panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-zinc-300">
                {selectedNode.type === 'root' ? (
                  /* Root Node Details */
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[#ff5c20] font-semibold">Tujuan Proyek</span>
                      <h3 className="text-lg font-bold text-white mt-1">{title}</h3>
                      {idea && <p className="text-zinc-400 text-xs mt-2 leading-relaxed">{idea}</p>}
                    </div>

                    <div className="p-3.5 rounded-xl border border-zinc-800 bg-[#18181b] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Total Modul Utama</span>
                        <span className="font-mono font-bold text-white">{features.length} Modul</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Total Sub-Fitur</span>
                        <span className="font-mono font-bold text-white">
                          {features.reduce((acc, f) => acc + (f.subFeatures?.length || 0), 0)} Sub-Fitur
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Status Validasi</span>
                        <span className="text-emerald-400 font-medium">Siap Dieksekusi</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Feature Node Details */
                  (() => {
                    const feat = features[selectedNode.featureIndex || 0];
                    if (!feat) return null;

                    return (
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase bg-[#ff5c20]/15 text-[#ff5c20] font-bold">
                              Modul {(selectedNode.featureIndex || 0) + 1}
                            </span>
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                              {feat.priority || 'HIGH'}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-white">{feat.name}</h3>
                          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{feat.summary}</p>
                        </div>

                        {/* Sub-Features Breakdown */}
                        <div className="space-y-2.5 pt-3 border-t border-zinc-800">
                          <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold tracking-wider block">
                            Sub-Fitur Eksekusi ({feat.subFeatures?.length || 0})
                          </span>

                          <div className="space-y-2">
                            {feat.subFeatures?.map((sub, sIdx) => (
                              <div
                                key={sub.id || sIdx}
                                className="p-3 rounded-xl border border-zinc-800/80 bg-[#18181b] space-y-1"
                              >
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#ff5c20] shrink-0" />
                                  <h5 className="font-semibold text-zinc-100 text-xs">{sub.name}</h5>
                                </div>
                                <p className="text-[11px] text-zinc-400 pl-5 leading-relaxed">
                                  {sub.summary}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Drawer Footer CTA */}
              <div className="p-4 border-t border-[#27272a] bg-[#121215]">
                <button
                  onClick={onContinue}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#ff5c20] hover:bg-[#e04f18] text-white text-xs font-bold transition-all shadow-lg shadow-[#ff5c20]/25 cursor-pointer"
                >
                  <span>Generate Dokumen PRD &amp; Task</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ======================================================== */
        /* VIEW 2: DAFTAR MODUL GRID (Alternative clean card view) */
        /* ======================================================== */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feat, idx) => (
              <div 
                key={feat.id || idx} 
                className="p-5 rounded-2xl border border-[#27272a] bg-[#121215] space-y-3.5 hover:border-zinc-700 transition-all shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-[#ff5c20]/15 text-[#ff5c20] text-xs font-mono font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="text-[10px] font-mono text-[#ff5c20] uppercase font-semibold">MODUL {idx + 1}</span>
                      <h3 className="font-bold text-sm text-zinc-100">{feat.name}</h3>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md uppercase bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-semibold">
                    {feat.priority || 'HIGH'}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">{feat.summary}</p>

                {/* Sub features */}
                {feat.subFeatures && feat.subFeatures.length > 0 && (
                  <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold tracking-wider block">
                      Sub-Fitur &amp; Rincian ({feat.subFeatures.length})
                    </span>
                    <div className="space-y-1.5">
                      {feat.subFeatures.map((sub, sIdx) => (
                        <div key={sub.id || sIdx} className="flex items-start gap-2 bg-[#18181b] p-2.5 rounded-lg border border-zinc-800/60">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#ff5c20] shrink-0 mt-0.5" />
                          <div className="text-[11px]">
                            <span className="font-semibold text-zinc-200">{sub.name}: </span>
                            <span className="text-zinc-400">{sub.summary}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Action Button to Continue to Stage 3 */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-zinc-500">
          Klik tombol di sebelah kanan untuk menyusun Dokumen PRD dan Task Kanban otomatis.
        </p>

        <button
          onClick={onContinue}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#ff5c20] hover:bg-[#e04f18] text-white text-xs font-bold transition-all shadow-lg shadow-[#ff5c20]/25 cursor-pointer"
        >
          <span>Generate Dokumen PRD &amp; Task</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
