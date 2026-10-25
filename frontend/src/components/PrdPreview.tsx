import React, { useState, useEffect, useRef, useMemo } from 'react';
import mermaid from 'mermaid';
import { marked } from 'marked';
import { 
  FileText, Copy, Check, Download, Sparkles, 
  Plus, Minus, Maximize2, Cpu, RefreshCw, Send
} from 'lucide-react';

interface PrdPreviewProps {
  title: string;
  content: string;
  onRevise?: (instruction: string) => void;
  revising?: boolean;
  onConnectAgent?: () => void;
}

interface OutlineItem {
  id: string;
  text: string;
  level: number;
}

interface ContentChunk {
  type: 'markdown' | 'mermaid';
  content: string;
  headingIndex?: number;
}

// Initialize mermaid once
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  themeVariables: {
    darkMode: true,
    background: '#0d0d11',
    mainBkg: '#16161b',
    nodeBorder: '#ff5c20',
    primaryColor: '#ff5c20',
    primaryTextColor: '#fafafa',
    primaryBorderColor: '#ff5c20',
    lineColor: '#ff7a45',
    secondaryColor: '#1f1f26',
    tertiaryColor: '#121215',
    actorBkg: '#1c1c24',
    actorBorder: '#ff5c20',
    actorTextColor: '#ffffff',
    actorLineColor: '#52525b',
    signalColor: '#e4e4e7',
    signalTextColor: '#fafafa',
    labelBoxBkgColor: '#18181b',
    labelBoxBorderColor: '#27272a',
    labelTextColor: '#fafafa',
    loopTextColor: '#ff5c20',
    noteBorderColor: '#ff5c20',
    noteBkgColor: '#27272a',
    noteTextColor: '#ffffff',
    fontSize: '13px',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
  }
});

// Clean and extract headings from Markdown for Outline
function extractOutline(mdText: string): OutlineItem[] {
  const lines = mdText.split('\n');
  const items: OutlineItem[] = [];
  let inCodeBlock = false;
  let counter = 0;

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const rawText = match[2].trim();
      const cleanText = rawText
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/^PRD\s*[:—–-]\s*/i, '')
        .trim();

      const id = `prd-sec-${counter}`;
      items.push({ id, text: cleanText, level });
      counter++;
    }
  }

  return items;
}

// Split text into Markdown text and Mermaid code blocks
function parseChunks(raw: string): ContentChunk[] {
  const lines = raw.split('\n');
  const chunks: ContentChunk[] = [];
  let currentMd: string[] = [];
  let inMermaid = false;
  let currentMermaid: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!inMermaid && trimmed.startsWith('```mermaid')) {
      if (currentMd.length > 0) {
        chunks.push({ type: 'markdown', content: currentMd.join('\n') });
        currentMd = [];
      }
      inMermaid = true;
      continue;
    }

    if (inMermaid && trimmed.startsWith('```')) {
      chunks.push({ type: 'mermaid', content: currentMermaid.join('\n') });
      currentMermaid = [];
      inMermaid = false;
      continue;
    }

    if (inMermaid) {
      currentMermaid.push(line);
    } else {
      currentMd.push(line);
    }
  }

  if (currentMd.length > 0) {
    chunks.push({ type: 'markdown', content: currentMd.join('\n') });
  }

  return chunks;
}

// Convert markdown to HTML while embedding deterministic heading IDs
function renderMarkdownWithIds(mdText: string, startIndex: { current: number }): string {
  // Replace headings with explicit ID tags before running marked
  const lines = mdText.split('\n');
  let inCode = false;
  const processedLines: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCode = !inCode;
      processedLines.push(line);
      continue;
    }
    if (!inCode && line.match(/^(#{1,3})\s+(.+)$/)) {
      const match = line.match(/^(#{1,3})\s+(.+)$/)!;
      const tag = `h${match[1].length}`;
      const text = match[2].trim();
      const id = `prd-sec-${startIndex.current}`;
      startIndex.current++;
      processedLines.push(`<${tag} id="${id}">${text}</${tag}>`);
    } else {
      processedLines.push(line);
    }
  }

  return marked.parse(processedLines.join('\n'), { gfm: true, breaks: true }) as string;
}

// Interactive Zoomable, Pannable Mermaid Diagram Card
const MermaidCard: React.FC<{ code: string }> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    let isMounted = true;
    async function renderDiagram() {
      try {
        setRenderError(null);
        const cleanCode = code
          .replace(/^(\s*subgraph\s+)([A-Za-z_][\w-]*)\s+"([^"\r\n]+)"\s*\r?$/gm, '$1$2["$3"]')
          .trim();
        const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(uniqueId, cleanCode);
        if (isMounted) {
          setSvgHtml(svg);
        }
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        if (isMounted) {
          setRenderError(err?.message || 'Gagal merender diagram');
        }
      }
    }
    renderDiagram();
    return () => {
      isMounted = false;
    };
  }, [code]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.diagram-controls')) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPosition({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.min(3, Math.max(0.4, Number((prev + delta).toFixed(2)))));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  if (renderError) {
    return (
      <div className="my-6 rounded-2xl border border-red-900/60 bg-red-950/20 p-4 text-xs font-mono text-zinc-300">
        <span className="text-red-400 font-bold block mb-2">Diagram Source (Mermaid):</span>
        <pre className="overflow-x-auto p-3 bg-black/40 rounded-xl text-zinc-300 leading-relaxed">
          {code}
        </pre>
      </div>
    );
  }

  return (
    <div className="group relative my-6 rounded-2xl border border-[#27272a] bg-[#0c0c10] overflow-hidden shadow-2xl">
      {/* Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`relative h-[440px] xl:h-[500px] w-full flex items-center justify-center overflow-hidden select-none ${
          isPanning ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      >
        {svgHtml ? (
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: isPanning ? 'none' : 'transform 0.05s ease-out'
            }}
            className="w-full h-full flex items-center justify-center p-6 [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:drop-shadow-lg"
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        ) : (
          <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono">
            <RefreshCw className="w-4 h-4 animate-spin text-[#ff5c20]" />
            <span>Merender diagram visual arsitektur...</span>
          </div>
        )}
      </div>

      {/* Floating Controls Overlay (Top Right) */}
      <div className="diagram-controls absolute top-3 right-3 flex items-center gap-1 p-1 bg-[#121215]/90 backdrop-blur-md border border-[#27272a] rounded-xl shadow-lg opacity-85 hover:opacity-100 transition-opacity">
        <button
          onClick={() => setScale(prev => Math.min(3, Number((prev + 0.15).toFixed(2))))}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Zoom In"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setScale(prev => Math.max(0.4, Number((prev - 0.15).toFixed(2))))}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <div className="h-3.5 w-px bg-zinc-800 mx-0.5" />
        <button
          onClick={handleReset}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Reset Tampilan"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Zoom percentage tag on Bottom Left */}
      <div className="absolute bottom-3 left-3 px-2 py-1 bg-[#121215]/80 backdrop-blur-md border border-zinc-800 rounded-md text-[10px] font-mono text-zinc-400 pointer-events-none">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
};

export const PrdPreview: React.FC<PrdPreviewProps> = ({
  title,
  content,
  onRevise,
  revising = false,
  onConnectAgent
}) => {
  const [copied, setCopied] = useState(false);
  const [activeHeading, setActiveHeading] = useState<string>('');
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionPrompt, setRevisionPrompt] = useState('');

  // Extract Outline items
  const outline = useMemo(() => extractOutline(content), [content]);

  // Parse markdown & mermaid chunks
  const chunks = useMemo(() => parseChunks(content), [content]);

  // Copy Markdown
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download .md
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-prd.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Scroll to section
  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveHeading(id);
    }
  };

  // Submit revision
  const handleSendRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionPrompt.trim() || !onRevise) return;
    onRevise(revisionPrompt.trim());
    setShowRevisionModal(false);
    setRevisionPrompt('');
  };

  // Counter tracker for assigning IDs to headings across markdown chunks
  const headingIdTracker = useRef(0);
  headingIdTracker.current = 0;

  return (
    <div className="w-full space-y-4">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-[#27272a] bg-[#121215]">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-xl bg-[#ff5c20]/15 text-[#ff5c20]">
            <FileText className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white leading-tight">
              {title || 'Dokumen PRD & Technical Spec'}
            </h3>
            <span className="text-[11px] text-zinc-400 font-mono">
              Siap dieksekusi dengan AI Coding Agent (Cursor, Claude Code, Windsurf)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowRevisionModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Koreksi dan instruksikan revisi pada PRD"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#ff5c20]" />
            <span>Revisi PRD</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Salin Markdown Lengkap"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
            <span>{copied ? 'Tersalin' : 'Copy PRD'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Download file .md"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Unduh .md</span>
          </button>

          {onConnectAgent && (
            <button
              onClick={onConnectAgent}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#ff5c20] to-[#e04f18] text-white text-xs font-bold transition-all shadow-md shadow-[#ff5c20]/25 cursor-pointer"
              title="Hubungkan ke IDE Agent"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Hubungkan Agent</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Document Layout (Sticky Outline Sidebar on Left + Content on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)] gap-8 items-start">
        {/* Left: Sticky DAFTAR ISI (OUTLINE) Sidebar matching ngodingpakeai */}
        {outline.length > 0 && (
          <aside className="hidden lg:block sticky top-20 self-start">
            <div className="p-4 rounded-2xl border border-[#27272a] bg-[#121215]/80 backdrop-blur-md space-y-3 shadow-xl">
              <div className="border-b border-zinc-800 pb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#ff5c20] font-bold block">
                  DAFTAR ISI (OUTLINE)
                </span>
                <h4 className="text-xs font-bold text-zinc-200 truncate mt-0.5" title={title}>
                  PRD — {title}
                </h4>
              </div>

              <nav className="flex flex-col gap-1 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {outline.map((item) => {
                  const isActive = activeHeading === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => scrollToHeading(item.id)}
                      className={`group flex w-full items-center gap-2 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                        item.level === 1 
                          ? 'pl-0 font-bold text-zinc-200 hover:text-white' 
                          : item.level === 2 
                          ? 'pl-3 font-medium text-zinc-400 hover:text-zinc-200' 
                          : 'pl-6 text-[11px] text-zinc-500 hover:text-zinc-300'
                      } ${isActive ? 'text-[#ff5c20] font-semibold' : ''}`}
                    >
                      <span className="truncate">{item.text}</span>
                      <span 
                        aria-hidden="true" 
                        className={`h-px flex-1 transition-colors ${
                          isActive 
                            ? 'bg-[#ff5c20]' 
                            : 'bg-zinc-800/80 group-hover:bg-[#ff5c20]/40'
                        }`} 
                      />
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>
        )}

        {/* Right: Rendered Document Body */}
        <div className="min-w-0 space-y-4">
          <div className="p-6 sm:p-10 rounded-2xl border border-[#27272a] bg-[#121215]/60 backdrop-blur-md shadow-2xl">
            {chunks.map((chunk, idx) => {
              if (chunk.type === 'mermaid') {
                return <MermaidCard key={`mermaid-${idx}`} code={chunk.content} />;
              }

              const htmlContent = renderMarkdownWithIds(chunk.content, headingIdTracker);

              return (
                <div
                  key={`md-${idx}`}
                  className="prose prose-invert prose-zinc max-w-none text-zinc-300 text-sm leading-relaxed
                    prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight
                    prose-h1:text-2xl prose-h1:border-b prose-h1:border-zinc-800 prose-h1:pb-3 prose-h1:mt-2 prose-h1:mb-6
                    prose-h2:text-xl prose-h2:border-b prose-h2:border-zinc-800/60 prose-h2:pb-2.5 prose-h2:mt-8 prose-h2:mb-4 prose-h2:text-zinc-100
                    prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2 prose-h3:text-[#ff5c20]
                    prose-p:my-3 prose-p:leading-relaxed
                    prose-ul:my-3 prose-li:my-1
                    prose-code:text-[#ff7a45] prose-code:bg-zinc-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
                    prose-pre:bg-[#0c0c10] prose-pre:border prose-pre:border-[#27272a] prose-pre:rounded-xl prose-pre:p-4 prose-pre:my-4
                    prose-table:w-full prose-table:border-collapse prose-table:my-5
                    prose-th:border prose-th:border-zinc-800 prose-th:bg-zinc-900/90 prose-th:p-3 prose-th:text-left prose-th:text-xs prose-th:font-bold prose-th:text-white
                    prose-td:border prose-td:border-zinc-800/80 prose-td:p-3 prose-td:text-xs prose-td:text-zinc-300"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Revision Modal Dialog */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121215] border border-[#27272a] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#ff5c20]" />
                <h3 className="font-bold text-sm text-white">Instruksi Revisi Dokumen PRD</h3>
              </div>
              <button 
                onClick={() => setShowRevisionModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Tulis bagian apa yang ingin diubah, ditambah, atau disederhanakan. Software Architect AI akan merevisi PRD sesuai arahan Anda.
            </p>

            <form onSubmit={handleSendRevision} className="space-y-4">
              <textarea
                rows={4}
                value={revisionPrompt}
                onChange={(e) => setRevisionPrompt(e.target.value)}
                placeholder="Contoh: Tambahkan modul integrasi WhatsApp OTP, ganti database ke PostgreSQL Supabase, dan perjelas alur checkout..."
                className="w-full bg-[#18181b] border border-[#27272a] focus:border-[#ff5c20] rounded-xl p-3 text-xs text-white placeholder-zinc-600 outline-none transition-all"
                autoFocus
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!revisionPrompt.trim() || revising}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#ff5c20] hover:bg-[#e04f18] text-white text-xs font-bold transition-all shadow-md shadow-[#ff5c20]/20 cursor-pointer disabled:opacity-40"
                >
                  {revising ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{revising ? 'Sedang Merevisi...' : 'Kirim Revisi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
