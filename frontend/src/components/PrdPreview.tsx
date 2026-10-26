import React, { useState, useEffect, useRef, useMemo } from 'react';
import mermaid from 'mermaid';
import { marked } from 'marked';
import { 
  FileText, Copy, Check, Download, Sparkles, 
  Plus, Minus, Maximize2, RefreshCw, Send,
  Bookmark, Code2
} from 'lucide-react';

interface PrdPreviewProps {
  title: string;
  content: string;
  onRevise?: (instruction: string) => void;
  revising?: boolean;
}

interface OutlineItem {
  id: string;
  text: string;
  level: number;
}

interface ContentChunk {
  type: 'markdown' | 'mermaid';
  content: string;
}

// Initialize mermaid once with suppressErrorRendering to prevent default bomb SVGs
mermaid.initialize({
  startOnLoad: false,
  suppressErrorRendering: true,
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

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true
});

// Clean UTF-8 mojibake (e.g. \u00e2\u0080\u0094 into em-dash)
function cleanMojibake(text: string): string {
  if (!text) return '';
  return text
    .replace(/\u00e2\u0080\u0094|â€”/g, '—')
    .replace(/\u00e2\u0080\u0093|â€“/g, '–')
    .replace(/\u00e2\u0080\u0098|â€˜/g, '‘')
    .replace(/\u00e2\u0080\u0099|â€™/g, '’')
    .replace(/\u00e2\u0080\u009c|â€œ/g, '“')
    .replace(/\u00e2\u0080\u009d|â€ /g, '”')
    .replace(/\u00e2\u0080\u00a2|â€¢/g, '•')
    .replace(/\u00e2\u0080\u00a6|â€¦/g, '…')
    .replace(/\u00c2|Â/g, '');
}

// Normalize ONLY non-code Markdown text
function normalizeTextChunk(chunk: string): string {
  let text = cleanMojibake(chunk);
  text = text.replace(/\r\n/g, '\n');

  // Title normalization: "PRD — Title" without '#'
  text = text.replace(/^(PRD\s+[—–-].+)$/gm, '# $1');

  // Normalize un-hashed numbered headings ONLY at the beginning of lines:
  // "1. Overview" -> "## 1. Overview"
  text = text.replace(/^(?<!#\s*)(\d+)\.\s+([A-Za-z].+)$/gm, '## $1. $2');
  // "2.1 Fungsional" -> "### 2.1 Fungsional"
  text = text.replace(/^(?<!#\s*)(\d+\.\d+)\.?\s+([A-Za-z].+)$/gm, '### $1 $2');
  // "2.1.1 Sub-item" -> "#### $1 $2"
  text = text.replace(/^(?<!#\s*)(\d+\.\d+\.\d+)\.?\s+([A-Za-z].+)$/gm, '#### $1 $2');

  // Ensure double newlines around markdown headings so they are never glued to paragraphs
  text = text.replace(/([^\n])\n(#{1,4}\s+[^\n]+)/g, '$1\n\n$2');
  text = text.replace(/(#{1,4}\s+[^\n]+)\n([^\n#])/g, '$1\n\n$2');

  // Format executive highlights with double line breaks and clean bolding:
  // "Ringkasan Eksekutif: ..." -> "\n\n**Ringkasan Eksekutif**: ..."
  text = text.replace(/^([ \t]*)(Ringkasan Eksekutif|Latar Belakang Masalah|Nilai Proposisi|Tujuan Utama|Target Pengguna|Solusi Inti|Metrik Keberhasilan):\s*/gim, '\n\n**$2**: ');

  // Under "Tujuan Utama", convert unbulleted sentences into clean bullet points
  text = text.replace(/(\*\*Tujuan Utama\*\*:\s*\n)((?:[^\n-*\s][^\n]+\n?)+)/gi, (_match, header, items) => {
    const bullets = items
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0 && !line.startsWith('-') && !line.startsWith('*'))
      .map((line: string) => `- ${line}`)
      .join('\n');
    return `${header}${bullets}\n\n`;
  });

  // Fix clumped table rows: "col | | col" -> "col |\n| col" or "col | |---|..." -> "col |\n|---|..."
  text = text.replace(/\|\s*\|\s*([^\s|])/g, '|\n| $1');
  text = text.replace(/\|\s*\|\s*--/g, '|\n|--');

  // Ensure tables are separated from text by newlines
  text = text.replace(/([^\n])\n(\|.+?\|)/g, '$1\n\n$2');
  text = text.replace(/(\|.+?\|)\n([^\n|])/g, '$1\n\n$2');

  // Unclump bullet points: "...teks. - **Poin**..." -> "...teks.\n- **Poin**..."
  text = text.replace(/([^\n])\s+-\s+(\*\*|\*|`|[A-Za-z0-9])/g, '$1\n- $2');

  return text;
}

// Detect and convert ASCII box-and-arrow architecture diagrams into valid Mermaid flowcharts
function tryConvertAsciiToMermaid(code: string): string | null {
  const hasBoxChars = /[│┌┐└┘├┤▼▲►◄─]/.test(code);
  const hasBrackets = /\[\s*[^\]]+?\s*\]/.test(code);
  if (!hasBoxChars || !hasBrackets) return null;

  try {
    const lines = code.split('\n');
    const nodes: { id: string; label: string }[] = [];
    const subItems: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const boxMatches = [...rawLine.matchAll(/\[\s*([^\]]+?)\s*\]/g)];
      if (boxMatches.length > 0) {
        for (const m of boxMatches) {
          const label = m[1].trim();
          if (label && !nodes.some(n => n.label === label)) {
            nodes.push({ id: `node_${nodes.length}`, label });
          }
        }
      } else if (/[├└]──\s*(.+)/.test(line)) {
        const subMatch = line.match(/[├└]──\s*(.+)/);
        if (subMatch) {
          subItems.push(subMatch[1].trim());
        }
      }
    }

    if (nodes.length < 2) return null;

    const mermaid: string[] = ['flowchart TD'];
    nodes.forEach(n => {
      const cleanLabel = n.label.replace(/"/g, "'");
      mermaid.push(`    ${n.id}["${cleanLabel}"]`);
    });

    if (nodes.length === 2) {
      mermaid.push(`    ${nodes[0].id} --> ${nodes[1].id}`);
    } else if (nodes.length === 3) {
      mermaid.push(`    ${nodes[0].id} --> ${nodes[1].id}`);
      mermaid.push(`    ${nodes[1].id} --> ${nodes[2].id}`);
    } else if (nodes.length >= 4) {
      mermaid.push(`    ${nodes[0].id} --> ${nodes[1].id}`);
      mermaid.push(`    ${nodes[1].id} --> ${nodes[2].id}`);
      for (let i = 3; i < nodes.length; i++) {
        mermaid.push(`    ${nodes[2].id} --> ${nodes[i].id}`);
      }
    }

    if (subItems.length > 0 && nodes.length >= 3) {
      mermaid.push(`    subgraph AppLayers["Pemisahan Komponen Aplikasi"]`);
      subItems.forEach((item, idx) => {
        const cleanItem = item.replace(/"/g, "'");
        mermaid.push(`        sub_${idx}["${cleanItem}"]`);
      });
      mermaid.push(`    end`);
      mermaid.push(`    ${nodes[2].id} --- AppLayers`);
    }

    return mermaid.join('\n');
  } catch (_err) {
    return null;
  }
}

// Split into Markdown chunks and Mermaid blocks while shielding code from normalization
function parseChunks(raw: string): ContentChunk[] {
  const lines = raw.split(/\r?\n/);
  const chunks: ContentChunk[] = [];
  let currentMd: string[] = [];
  let inCode = false;
  let codeFence = '';
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Start of a code block (```mermaid or ``` or ```python etc.)
    if (!inCode && trimmed.startsWith('```')) {
      if (currentMd.length > 0) {
        chunks.push({ type: 'markdown', content: normalizeTextChunk(currentMd.join('\n')) });
        currentMd = [];
      }
      inCode = true;
      codeFence = trimmed;
      codeLines = [];
      continue;
    }

    // End of the active code block
    if (inCode && trimmed.startsWith('```')) {
      const fullCode = codeLines.join('\n');
      const lang = codeFence.replace(/^```/, '').trim().toLowerCase();

      // Check if this block should be rendered as Mermaid
      const isExplicitMermaid = lang === 'mermaid';
      const isImplicitMermaid = /^(flowchart|graph|sequenceDiagram|erDiagram|classDiagram|stateDiagram|gantt|pie|mindmap)\b/m.test(fullCode.trim());
      const asciiMermaid = (!isExplicitMermaid && !isImplicitMermaid) ? tryConvertAsciiToMermaid(fullCode) : null;

      if (isExplicitMermaid || isImplicitMermaid) {
        chunks.push({ type: 'mermaid', content: fullCode.trim() });
      } else if (asciiMermaid) {
        chunks.push({ type: 'mermaid', content: asciiMermaid });
      } else {
        // Standard markdown code block
        currentMd.push(codeFence);
        currentMd.push(...codeLines);
        currentMd.push(line);
      }

      inCode = false;
      codeFence = '';
      codeLines = [];
      continue;
    }

    if (inCode) {
      codeLines.push(line);
    } else {
      currentMd.push(line);
    }
  }

  if (currentMd.length > 0) {
    chunks.push({ type: 'markdown', content: normalizeTextChunk(currentMd.join('\n')) });
  }

  return chunks;
}

// Extract outline items strictly from markdown headings
function extractOutlineFromChunks(chunks: ContentChunk[]): OutlineItem[] {
  const items: OutlineItem[] = [];
  let counter = 0;

  for (const chunk of chunks) {
    if (chunk.type !== 'markdown') continue;

    const lines = chunk.content.split('\n');
    let inCodeBlock = false;

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

        // Skip document main title
        if (level === 1 && rawText.toLowerCase().includes('prd')) {
          continue;
        }

        const cleanText = rawText
          .replace(/`([^`]+)`/g, '$1')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\*([^*]+)\*/g, '$1')
          .trim();

        // Safety check: headings should not contain table pipes or SQL constraints
        if (cleanText && !cleanText.includes('|') && !cleanText.toLowerCase().includes('check (')) {
          const id = `prd-sec-${counter}`;
          items.push({ id, text: cleanText, level });
          counter++;
        }
      }
    }
  }

  return items;
}

// Convert markdown to HTML while embedding deterministic heading IDs
function renderMarkdownWithIds(mdText: string, startIndex: { current: number }): string {
  // 1. Let marked parse pure Markdown with full GFM support
  let html = marked.parse(mdText, { gfm: true, breaks: true }) as string;

  // 2. Process Document Main Title
  html = html.replace(/<h1[^>]*>(.*?)<\/h1>/gi, (_match, content) => {
    const rawTitle = content.replace(/<[^>]+>/g, '').trim();
    const cleanTitle = rawTitle.replace(/^PRD\s+[—–-]\s*/i, '');
    return `
      <div class="mb-12 pb-7 border-b border-zinc-800/90">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff5c20]/10 border border-[#ff5c20]/30 text-[#ff5c20] text-xs font-mono font-bold uppercase tracking-wider mb-3.5">
          <span class="size-2 rounded-full bg-[#ff5c20] animate-pulse"></span>
          <span>Spesifikasi Produk Resmi</span>
        </div>
        <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3">
          ${cleanTitle || rawTitle}
        </h1>
        <p class="text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed max-w-3xl">
          Dokumen Spesifikasi Teknis, Arsitektur Sistem, Matriks Kebutuhan Fungsional, dan Panduan Eksekusi AI Coding Agent.
        </p>
      </div>
    `;
  });

  // 3. Post-process Level 2 Headings (## 1. Overview etc.)
  html = html.replace(/<h2([^>]*)>(.*?)<\/h2>/gi, (_match, attrs, content) => {
    const id = `prd-sec-${startIndex.current}`;
    startIndex.current++;
    const textContent = content.replace(/<[^>]+>/g, '').trim();

    // Match e.g. "1. Overview" -> num: "01", title: "Overview"
    const numMatch = textContent.match(/^(\d+)\.\s*(.+)$/);
    if (numMatch) {
      const num = numMatch[1].padStart(2, '0');
      const title = numMatch[2];
      return `
        <h2 id="${id}"${attrs} class="group flex items-center gap-3 border-b border-zinc-800 pb-3 mt-14 mb-6 text-white text-xl sm:text-2xl font-bold tracking-tight">
          <span class="inline-flex items-center justify-center size-8 rounded-xl bg-[#ff5c20]/15 text-[#ff5c20] text-xs font-mono font-bold border border-[#ff5c20]/30 shrink-0 shadow-sm shadow-[#ff5c20]/20">
            ${num}
          </span>
          <span class="flex-1">${title}</span>
        </h2>
      `;
    }

    return `<h2 id="${id}"${attrs} class="border-b border-zinc-800 pb-3 mt-14 mb-6 text-white text-xl sm:text-2xl font-bold tracking-tight">${content}</h2>`;
  });

  // 4. Post-process Level 3 Headings (### 2.1 Kebutuhan Fungsional etc.)
  html = html.replace(/<h3([^>]*)>(.*?)<\/h3>/gi, (_match, attrs, content) => {
    const id = `prd-sec-${startIndex.current}`;
    startIndex.current++;
    const textContent = content.replace(/<[^>]+>/g, '').trim();

    const subMatch = textContent.match(/^(\d+\.\d+)\.?\s*(.+)$/);
    if (subMatch) {
      const subNum = subMatch[1];
      const subTitle = subMatch[2];
      return `
        <h3 id="${id}"${attrs} class="flex items-center gap-2.5 mt-9 mb-4 text-[#ff7a45] text-base sm:text-lg font-bold tracking-tight">
          <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-800/90 text-zinc-300 text-[11px] font-mono border border-zinc-700/60 shrink-0 font-semibold">
            ${subNum}
          </span>
          <span>${subTitle}</span>
        </h3>
      `;
    }

    return `<h3 id="${id}"${attrs} class="mt-9 mb-4 text-[#ff7a45] text-base sm:text-lg font-bold tracking-tight">${content}</h3>`;
  });

  // 5. Wrap all <table> elements in responsive styled containers
  html = html
    .replace(/<table[^>]*>/gi, '<div class="table-container my-8 overflow-x-auto rounded-2xl border border-zinc-800 bg-[#121217] shadow-xl"><table class="w-full border-collapse my-0 text-left text-xs sm:text-[13px] leading-relaxed text-zinc-300">')
    .replace(/<\/table>/g, '</table></div>');

  // 6. Format Priority Badges in table cells
  html = html.replace(/<td>\s*High\s*<\/td>/gi, '<td><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">High</span></td>');
  html = html.replace(/<td>\s*Medium\s*<\/td>/gi, '<td><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">Medium</span></td>');
  html = html.replace(/<td>\s*Low\s*<\/td>/gi, '<td><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">Low</span></td>');

  // 7. Format HTTP methods in tables
  html = html.replace(/<td>\s*(?:<code>)?\s*GET\s*(?:<\/code>)?\s*<\/td>/gi, '<td><span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">GET</span></td>');
  html = html.replace(/<td>\s*(?:<code>)?\s*POST\s*(?:<\/code>)?\s*<\/td>/gi, '<td><span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">POST</span></td>');
  html = html.replace(/<td>\s*(?:<code>)?\s*PUT\s*(?:<\/code>)?\s*<\/td>/gi, '<td><span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">PUT</span></td>');
  html = html.replace(/<td>\s*(?:<code>)?\s*DELETE\s*(?:<\/code>)?\s*<\/td>/gi, '<td><span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">DELETE</span></td>');

  // 8. Format FR codes like FR-001
  html = html.replace(/<td>\s*(FR-\d+)\s*<\/td>/gi, '<td><span class="font-mono text-[#ff7a45] font-semibold">$1</span></td>');

  return html;
}

// Interactive Zoomable, Pannable Mermaid Diagram Card with Graceful Fallback
const MermaidCard: React.FC<{ code: string }> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [showCodeFallback, setShowCodeFallback] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    let isMounted = true;
    async function renderDiagram() {
      try {
        setRenderError(null);
        let cleanCode = code.trim();

        // Auto-fix missing newline after diagram keyword declaration
        cleanCode = cleanCode.replace(/^(erDiagram|sequenceDiagram|flowchart\s+\w+|graph\s+\w+)\s+([A-Za-z])/m, '$1\n    $2');
        // Auto-fix subgraph titles
        cleanCode = cleanCode.replace(/^(\s*subgraph\s+)([A-Za-z_][\w-]*)\s+"([^"\r\n]+)"\s*\r?$/gm, '$1$2["$3"]');

        const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(uniqueId, cleanCode);
        if (isMounted) {
          setSvgHtml(svg);
        }
      } catch (err: any) {
        console.warn('Mermaid render issue, falling back:', err);
        if (isMounted) {
          setRenderError(err?.message || 'Diagram syntax parsing warning');
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

  // Graceful Fallback if Mermaid parser encounters syntax issues
  if (renderError) {
    return (
      <div className="my-8 rounded-2xl border border-zinc-800 bg-[#121216] p-5 shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
            <Code2 className="w-4 h-4 text-[#ff5c20]" />
            <span>Visual Diagram Arsitektur (Kode Sumber)</span>
          </div>
          <button
            onClick={() => setShowCodeFallback(!showCodeFallback)}
            className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {showCodeFallback ? 'Sembunyikan' : 'Lihat Source'}
          </button>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed mb-3">
          Spesifikasi diagram relasi dan alur arsitektur sistem tersedia dalam format Mermaid:
        </p>
        <pre className="overflow-x-auto p-4 bg-[#0a0a0d] border border-zinc-800/80 rounded-xl text-xs font-mono text-zinc-300 leading-relaxed">
          {code}
        </pre>
      </div>
    );
  }

  return (
    <div className="group relative my-8 rounded-2xl border border-[#27272a] bg-[#0c0c10] overflow-hidden shadow-2xl">
      {/* Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`relative h-[440px] xl:h-[520px] w-full flex items-center justify-center overflow-hidden select-none ${
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
  revising = false
}) => {
  const [copied, setCopied] = useState(false);
  const [activeHeading, setActiveHeading] = useState<string>('');
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionPrompt, setRevisionPrompt] = useState('');

  // Parse markdown & mermaid chunks with shielded code blocks
  const chunks = useMemo(() => parseChunks(content), [content]);

  // Extract clean outline items from markdown chunks
  const outline = useMemo(() => extractOutlineFromChunks(chunks), [chunks]);

  // Copy Markdown
  const handleCopy = () => {
    navigator.clipboard.writeText(cleanMojibake(content));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download .md
  const handleDownload = () => {
    const cleanContent = cleanMojibake(content);
    const blob = new Blob([cleanContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-prd.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Scroll to section smoothly with 90px offset to avoid sticky header collision
  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const topOffset = 90;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth'
      });
      setActiveHeading(id);
    }
  };

  // Scroll spy to highlight active outline section automatically
  useEffect(() => {
    if (outline.length === 0) return;

    const handleScroll = () => {
      const headings = outline
        .map(item => ({ id: item.id, el: document.getElementById(item.id) }))
        .filter(item => item.el !== null) as { id: string; el: HTMLElement }[];

      const scrollPos = window.scrollY + 130;

      for (let i = headings.length - 1; i >= 0; i--) {
        const h = headings[i];
        if (h.el.offsetTop <= scrollPos) {
          setActiveHeading(h.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [outline]);

  // Submit revision
  const handleSendRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionPrompt.trim() || !onRevise) return;
    onRevise(revisionPrompt.trim());
    setShowRevisionModal(false);
    setRevisionPrompt('');
  };

  // Memoize rendered HTML chunks with deterministic heading IDs across chunks
  const renderedChunks = useMemo(() => {
    const list: (
      | { type: 'mermaid'; content: string; key: string }
      | { type: 'markdown'; html: string; key: string }
    )[] = [];
    let counter = 0;

    for (let idx = 0; idx < chunks.length; idx++) {
      const chunk = chunks[idx];
      if (chunk.type === 'mermaid') {
        list.push({ type: 'mermaid', content: chunk.content, key: `mermaid-${idx}` });
      } else {
        const startIndex = { current: counter };
        const htmlContent = renderMarkdownWithIds(chunk.content, startIndex);
        counter = startIndex.current;
        list.push({ type: 'markdown', html: htmlContent, key: `md-${idx}` });
      }
    }

    return list;
  }, [chunks]);


  return (
    <div className="w-full space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-[#27272a] bg-[#121215]/90 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#ff5c20]/15 text-[#ff5c20]">
            <FileText className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white leading-tight truncate">
              {title || 'Dokumen PRD & Technical Spec'}
            </h3>
            <span className="text-[11px] text-zinc-400 font-mono block mt-0.5">
              Spesifikasi arsitektur &amp; panduan eksekusi AI Coding Agent
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={() => setShowRevisionModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Koreksi dan instruksikan revisi pada PRD"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#ff5c20]" />
            <span>Revisi PRD</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Salin Markdown Lengkap"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
            <span>{copied ? 'Tersalin' : 'Copy PRD'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Download file .md"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Unduh .md</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Document Layout (Sticky Outline Sidebar on Left + Content on Right) */}
      <div className={`grid grid-cols-1 ${outline.length > 0 ? 'lg:grid-cols-[270px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]' : ''} gap-8 items-start`}>
        {/* Left: Sticky DAFTAR ISI (OUTLINE) Sidebar */}
        {outline.length > 0 && (
          <aside className="hidden lg:block sticky top-20 self-start">
            <div className="p-4 rounded-2xl border border-zinc-800/90 bg-[#121217]/95 backdrop-blur-md shadow-xl flex flex-col gap-3">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-lg bg-[#ff5c20]/15 text-[#ff5c20]">
                    <Bookmark className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#ff5c20] font-bold">
                    DAFTAR ISI
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/50">
                  {outline.length} bagian
                </span>
              </div>

              {/* Document Subtitle */}
              <div className="px-1">
                <h4 className="text-xs font-bold text-white truncate" title={title}>
                  {title || 'Dokumen PRD'}
                </h4>
                <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                  Navigasi Struktur &amp; Arsitektur
                </span>
              </div>

              {/* Vertical Rail Navigation */}
              <nav className="relative border-l border-zinc-800/80 pl-2.5 space-y-1 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
                {outline.map((item) => {
                  const isActive = activeHeading === item.id;
                  const isLevel2 = item.level === 1 || item.level === 2;

                  // Parse numbering if available, e.g. "1. Overview" -> num: "1", label: "Overview"
                  const numMatch = item.text.match(/^(\d+(?:\.\d+)?)\.?\s*(.+)$/);
                  const numberPart = numMatch ? numMatch[1] : null;
                  const textPart = numMatch ? numMatch[2] : item.text;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => scrollToHeading(item.id)}
                      className={`group relative flex w-full items-center text-left transition-all rounded-lg cursor-pointer ${
                        isLevel2
                          ? 'text-xs font-semibold py-1.5 px-2'
                          : 'text-[11px] py-1 px-2 ml-1.5 font-normal'
                      } ${
                        isActive
                          ? 'bg-[#ff5c20]/15 text-[#ff5c20] font-bold shadow-sm'
                          : isLevel2
                          ? 'text-zinc-300 hover:text-white hover:bg-zinc-800/50'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                      }`}
                      title={item.text}
                    >
                      {/* Active Accent Bar on Rail */}
                      {isActive && (
                        <span className="absolute -left-[11px] top-1/2 -translate-y-1/2 w-1 h-4 bg-[#ff5c20] rounded-r-full shadow-sm shadow-[#ff5c20]/60" />
                      )}

                      {numberPart ? (
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={`font-mono text-[10px] shrink-0 ${isActive ? 'text-[#ff5c20] font-bold' : 'text-zinc-500'}`}>
                            {numberPart}
                          </span>
                          <span className="truncate leading-snug">{textPart}</span>
                        </span>
                      ) : (
                        <span className="truncate leading-snug">{item.text}</span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Back to top quick link */}
              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px]">
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="text-zinc-400 hover:text-[#ff5c20] transition-colors cursor-pointer flex items-center gap-1 font-mono"
                >
                  <span>&uarr; Ke Atas Dokumen</span>
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Right: Rendered Document Body with Editorial Line Spacing */}
        <div className="min-w-0 space-y-4">
          <div className="p-8 sm:p-12 lg:p-14 rounded-3xl border border-zinc-800/80 bg-[#101014] shadow-2xl">
            {renderedChunks.map((chunk) => {
              if (chunk.type === 'mermaid') {
                return <MermaidCard key={chunk.key} code={chunk.content} />;
              }

              return (
                <div
                  key={chunk.key}
                  className="prd-article prose prose-invert prose-zinc max-w-none text-zinc-300 text-[14.5px] sm:text-[15px] leading-[1.85]
                    prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight
                    prose-h1:text-2xl sm:prose-h1:text-3xl prose-h1:font-extrabold prose-h1:border-b prose-h1:border-zinc-800 prose-h1:pb-4 prose-h1:mt-2 prose-h1:mb-8
                    prose-h2:text-xl sm:prose-h2:text-2xl prose-h2:border-b prose-h2:border-zinc-800/80 prose-h2:pb-3 prose-h2:mt-14 prose-h2:mb-6 prose-h2:text-white
                    prose-h3:text-base sm:prose-h3:text-lg prose-h3:mt-10 prose-h3:mb-4 prose-h3:text-[#ff5c20] prose-h3:font-bold
                    prose-h4:text-sm sm:prose-h4:text-base prose-h4:mt-6 prose-h4:mb-3 prose-h4:text-zinc-100 prose-h4:font-semibold
                    prose-p:my-5 prose-p:leading-[1.85] prose-p:text-zinc-300
                    prose-ul:my-5 prose-ul:space-y-3 prose-ul:pl-5
                    prose-li:my-0 prose-li:leading-[1.8] prose-li:text-zinc-300
                    prose-strong:text-white prose-strong:font-semibold
                    prose-code:text-[#ff7a45] prose-code:bg-[#181820] prose-code:px-2 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-code:font-mono prose-code:border prose-code:border-zinc-800/80 prose-code:before:content-none prose-code:after:content-none
                    prose-pre:bg-[#0b0b0f] prose-pre:border prose-pre:border-zinc-800 prose-pre:rounded-2xl prose-pre:p-5 sm:prose-pre:p-6 prose-pre:my-7 prose-pre:shadow-xl prose-pre:text-xs prose-pre:leading-relaxed
                    [&_.table-container]:w-full [&_.table-container]:my-8 [&_.table-container]:overflow-x-auto [&_.table-container]:rounded-2xl [&_.table-container]:border [&_.table-container]:border-zinc-800 [&_.table-container]:bg-[#121217] [&_.table-container]:shadow-xl
                    [&_table]:w-full [&_table]:border-collapse [&_table]:my-0
                    [&_thead]:bg-[#181820] [&_th]:border-b [&_th]:border-zinc-800 [&_th]:px-5 [&_th]:py-3.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-bold [&_th]:text-white [&_th]:uppercase [&_th]:tracking-wider
                    [&_td]:border-b [&_td]:border-zinc-800/60 [&_td]:px-5 [&_td]:py-3.5 [&_td]:text-xs sm:[&_td]:text-[13px] [&_td]:leading-relaxed [&_td]:text-zinc-300 [&_tr:last-child_td]:border-b-0 [&_tr:nth-child(even)]:bg-[#15151c] [&_tr:hover]:bg-zinc-800/40"
                  dangerouslySetInnerHTML={{ __html: chunk.html }}
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
                <h3 className="font-bold text-sm text-white">Instruksi AI Revisi PRD</h3>
              </div>
              <button 
                onClick={() => setShowRevisionModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Tuliskan instruksi penyesuaian (misal: ganti database, ubah alur pembayaran, tambah validasi keamanan). AI akan menyusun ulang PRD secara presisi.
            </p>

            <form onSubmit={handleSendRevision} className="space-y-4">
              <textarea
                rows={4}
                value={revisionPrompt}
                onChange={(e) => setRevisionPrompt(e.target.value)}
                placeholder="Contoh: Tambahkan webhook Midtrans untuk verifikasi otomatis status pembayaran, ganti database ke PostgreSQL Supabase, dan perjelas alur checkout..."
                className="w-full bg-[#18181b] border border-[#27272a] focus:border-[#ff5c20] rounded-xl p-3 text-xs text-white placeholder-zinc-600 outline-none transition-all"
                autoFocus
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!revisionPrompt.trim() || revising}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff5c20] hover:bg-[#e04f18] text-white text-xs font-bold transition-all shadow-md shadow-[#ff5c20]/25 disabled:opacity-50 cursor-pointer"
                >
                  {revising ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses Revisi...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Revisi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
