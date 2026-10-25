import React, { useState } from 'react';
import { X, Copy, Check, Terminal, ShieldAlert, Cpu } from 'lucide-react';

interface AgentPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  title: string;
  idea: string;
  techStack: { frontend: string; backend: string; database: string };
  tasks: Array<{ id: string; title: string; description?: string; status: string }>;
}

export const AgentPromptModal: React.FC<AgentPromptModalProps> = ({
  isOpen,
  onClose,
  planId,
  title,
  idea,
  techStack,
  tasks
}) => {
  const [selectedAgent, setSelectedAgent] = useState<'cursor' | 'claudecode' | 'antigravity'>('cursor');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const taskList = tasks.map((t, idx) => `  ${idx + 1}. [${t.status.toUpperCase()}] ${t.title} - ${t.description || ''}`).join('\n');

  const generatedPrompt = `Kamu adalah AI Senior Fullstack Engineer yang mengeksekusi proyek "${title}" dari VibeDev AI.

# 1. Konteks Proyek & Tech Stack
- Ide Utama: ${idea}
- Frontend: ${techStack.frontend}
- Backend: ${techStack.backend}
- Database: ${techStack.database}
- Plan ID: ${planId}

# 2. Aturan Mutlak Eksekusi (Checkpoint Protocol Anti Boros Token)
1. KERJAKAN SATU TASK DALAM SATU WAKTU. Jangan membabat banyak task sekaligus.
2. CHECKPOINT 1 (Frontend & Mock Data):
   - Bangun antarmuka/UI halaman pertama menggunakan data tiruan (in-memory mock/stub).
   - Setelah UI halaman pertama selesai, BERHENTI dan beritahu pengguna:
     "✅ Frontend fase 1 selesai dengan mock data. Silakan klik-klik dan uji coba di browser terlebih dahulu sebelum kita lanjut ke backend & database."
   - TUNGGU pengguna membalas "lanjut" sebelum menyentuh backend.
3. CHECKPOINT 2 (Database & Backend REST APIs):
   - Setelah pengguna memberi konfirmasi, susun skema database dan buat endpoint backend.
   - Hubungkan UI frontend ke API backend riil.
4. JANGAN menaruh credential/secret langsung di kode; selalu gunakan .env.

# 3. Daftar Task Implementasi:
${taskList}

Instruksi: Mulai dari Task 1 sekarang!`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#121215] border border-[#27272a] rounded-2xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1.5 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#ff5c20]/30 bg-[#ff5c20]/10 text-[#ff5c20] text-xs font-semibold">
            <Cpu className="w-3.5 h-3.5" /> AI Coding Agent Bridge
          </div>
          <h2 className="text-2xl font-bold text-white">Hubungkan ke AI Coding Agent</h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Salin prompt terstruktur dengan protokol checkpoint otomatis untuk Cursor, Claude Code, Windsurf, atau Antigravity.
          </p>
        </div>

        {/* Agent Selector Tabs */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setSelectedAgent('cursor')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedAgent === 'cursor' 
                ? 'bg-[#ff5c20] text-white shadow-md' 
                : 'bg-[#18181b] border border-[#27272a] text-zinc-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> Cursor Composer (Ctrl+I)
          </button>
          <button
            onClick={() => setSelectedAgent('claudecode')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedAgent === 'claudecode' 
                ? 'bg-[#ff5c20] text-white shadow-md' 
                : 'bg-[#18181b] border border-[#27272a] text-zinc-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> Claude Code CLI
          </button>
          <button
            onClick={() => setSelectedAgent('antigravity')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedAgent === 'antigravity' 
                ? 'bg-[#ff5c20] text-white shadow-md' 
                : 'bg-[#18181b] border border-[#27272a] text-zinc-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> Antigravity / Windsurf
          </button>
        </div>

        {/* Checkpoint Protocol Highlight */}
        <div className="p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/10 mb-4 flex items-start gap-3 text-xs text-amber-200">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-300">Protokol Checkpoint Aktif:</strong> Agent dipaksa berhenti setelah Frontend UI mock selesai, sehingga kamu bisa mencoba klik-klik di browser terlebih dahulu sebelum agent menghabiskan token untuk backend!
          </div>
        </div>

        {/* Prompt Codebox */}
        <div className="relative rounded-xl border border-[#27272a] bg-[#18181b] p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-72 mb-6">
          <pre className="whitespace-pre-wrap">{generatedPrompt}</pre>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            Paste prompt ini langsung di chat prompt editor/terminal agent kamu.
          </span>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 bg-[#ff5c20] hover:bg-[#e04f18] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-[#ff5c20]/25 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Tersalin ke Clipboard!' : 'Salin Prompt Agent'}
          </button>
        </div>
      </div>
    </div>
  );
};
