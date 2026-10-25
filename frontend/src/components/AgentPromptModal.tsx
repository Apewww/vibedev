import React, { useState } from 'react';
import { Terminal, Copy, Check, X, Sparkles, Cpu, Layers, Download } from 'lucide-react';

interface AgentPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  projectTitle?: string;
  title?: string;
  idea?: string;
  tasks?: any[];
}

export const AgentPromptModal: React.FC<AgentPromptModalProps> = ({
  isOpen,
  onClose,
  planId,
  projectTitle
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'npx' | 'curl' | 'script'>('npx');

  if (!isOpen) return null;

  const npxCommand = `npx github:Apewww/vibedev init ${planId}`;

  const npxPrompt = `Kamu adalah Senior Fullstack Software Engineer otonom. Kamu akan mengerjakan proyek "${projectTitle || 'VibeDev Project'}" secara mandiri dan tuntas di repository ini dengan panduan PRD dan Task dari VibeDev AI.

# 1. SETUP TELEMETRY & PRD (Jalankan sekali di terminal):
npx github:Apewww/vibedev init ${planId}

(Perintah di atas akan mendownload PRD.md ke root repository dan menyimpan file konfigurasi .vibedev.json).

# 2. AUTONOMOUS TASK LOOP (Ulangi langkah ini sampai 100% selesai):
Ulangi langkah a-e secara berulang:
a. Ambil task fokus berikutnya dalam format JSON:
   npx github:Apewww/vibedev next
   (Jika output "done": true, hentikan loop dan laporkan ke user bahwa semua fitur telah selesai dibuat).

b. Tandai bahwa kamu mulai mengerjakan task tersebut (live update di dashboard web):
   npx github:Apewww/vibedev start <TASK_ID>

c. Baca spesifikasi detail di PRD.md dan implementasikan kode yang diminta pada file lokal proyek ini.

d. Jalankan validasi/test/build lokal (misal: npm run build / npm test) untuk memastikan tidak ada error sintaks.

e. Setelah kode berfungsi dengan baik, tandai task selesai:
   npx github:Apewww/vibedev done <TASK_ID>

f. Lanjutkan kembali ke langkah (a) untuk mengambil task berikutnya.

PENTING: Jangan berhenti di tengah jalan. Tulis kode bersih, modular, tangani edge cases, dan eksekusi task demi task sampai selesai!`;

  const curlPrompt = `Kamu adalah Senior Fullstack Software Engineer otonom. Kamu akan mengerjakan proyek "${projectTitle || 'VibeDev Project'}" secara tuntas dengan panduan PRD dan Task dari VibeDev AI.

Base URL: https://vibedev.raflylabs.com
Plan ID: ${planId}

Loop Pengerjaan:
1. BACA PRD:
   curl -s "https://vibedev.raflylabs.com/api/plan/${planId}"

2. LOOP TASK:
   a. Ambil task berikutnya:
      TASK_DATA=$(curl -s "https://vibedev.raflylabs.com/api/plan/${planId}/tasks/next")
   b. Tandai mulai mengerjakan:
      curl -s -X POST "https://vibedev.raflylabs.com/api/plan/${planId}/tasks/<TASK_ID>/start"
   c. Implementasikan kode & validasi di lokal.
   d. Tandai selesai:
      curl -s -X POST "https://vibedev.raflylabs.com/api/plan/${planId}/tasks/<TASK_ID>/complete"
   e. Ulangi kembali ke (a) sampai semua task berstatus selesai.`;

  const scriptPrompt = `# 1. Download VibeDev CLI standalone ke folder proyek:
curl -sO https://vibedev.raflylabs.com/cli.js

# 2. Inisialisasi PRD & config:
node cli.js init ${planId}

# 3. Autonomous loop:
node cli.js next
node cli.js start <TASK_ID>
node cli.js done <TASK_ID>`;

  const currentPrompt = activeTab === 'npx' ? npxPrompt : activeTab === 'curl' ? curlPrompt : scriptPrompt;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(currentPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(npxCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#121215] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#27272a] bg-[#18181b]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#ff5c20]/10 border border-[#ff5c20]/20 flex items-center justify-center text-[#ff5c20]">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Hubungkan AI Coding Agent &amp; Realtime Telemetry
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30">
                  Live Telemetry
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Jalankan di Cursor, Claude Code, Windsurf, atau Antigravity IDE</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Quick One-Line Command Box */}
          <div className="p-4 rounded-xl border border-[#ff5c20]/30 bg-[#ff5c20]/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#ff5c20]" />
                Perintah Instan 1-Baris (Tanpa Buat File Sendiri)
              </span>
              <span className="text-[10px] font-mono text-zinc-400">Zero-Config CLI</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2 font-mono text-xs text-emerald-400 overflow-x-auto select-all">
                {npxCommand}
              </div>
              <button
                onClick={handleCopyCmd}
                className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg bg-[#ff5c20] hover:bg-[#e04f18] text-white text-xs font-semibold transition-all shadow-md shadow-[#ff5c20]/20 cursor-pointer"
                title="Salin Perintah NPX"
              >
                {copiedCmd ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCmd ? 'Tersalin!' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Cukup jalankan perintah di atas di folder proyek. File <code className="text-zinc-200 bg-zinc-800 px-1 rounded">PRD.md</code> akan otomatis terunduh dan agent bisa langsung membaca task satu per satu!
            </p>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#18181b] border border-zinc-800 rounded-xl">
            <button
              onClick={() => setActiveTab('npx')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'npx' ? 'bg-[#ff5c20] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>⚡ NPX CLI (Rekomendasi)</span>
            </button>
            <button
              onClick={() => setActiveTab('script')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'script' ? 'bg-[#ff5c20] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>📥 Standalone Script</span>
            </button>
            <button
              onClick={() => setActiveTab('curl')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'curl' ? 'bg-[#ff5c20] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>🌐 cURL Langsung</span>
            </button>
          </div>

          {/* Prompt Preview Card */}
          <div className="relative">
            <div className="flex items-center justify-between pb-2 text-xs text-zinc-400">
              <span>Prompt Instruksi AI Coding Agent:</span>
              <span className="font-mono text-[10px] text-zinc-500">Plan ID: {planId}</span>
            </div>
            <pre className="p-4 rounded-xl border border-zinc-800 bg-[#09090b] text-zinc-300 font-mono text-[11px] leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-60 select-all">
              {currentPrompt}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#27272a] bg-[#18181b]/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Dashboard realtime aktif (SSE live sync)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={handleCopyPrompt}
              className="flex items-center gap-2 bg-[#ff5c20] hover:bg-[#e04f18] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-md shadow-[#ff5c20]/20 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Prompt Agent Lengkap'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
