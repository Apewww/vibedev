import React, { useState } from 'react';
import { Terminal, Copy, Check, X, Sparkles } from 'lucide-react';

interface AgentPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  projectTitle?: string; title?: string; idea?: string; tasks?: any[];
}

export const AgentPromptModal: React.FC<AgentPromptModalProps> = ({
  isOpen,
  onClose,
  planId,
  projectTitle
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const promptContent = `Kamu adalah Senior Fullstack Software Engineer otonom. Kamu akan mengerjakan proyek "${projectTitle}" secara tuntas dan mandiri di repository ini dengan panduan PRD dan Task dari VibeDev AI.

API Endpoint Telemetry VibeDev:
Base URL: https://vibedev.raflylabs.com
Plan ID: ${planId}

Ikuti loop pengerjaan ini secara disiplin sampai selesai 100%:

1. BACA PRD PROYEK:
Jalankan perintah ini di terminal untuk membaca PRD dan arsitektur database/API:
curl -s "https://vibedev.raflylabs.com/api/plan/${planId}"

2. AUTONOMOUS TASK LOOP (Kerjakan task satu per satu):
Ulangi langkah a-e berikut:
a. Ambil 1 task fokus berikutnya:
   TASK_DATA=$(curl -s "https://vibedev.raflylabs.com/api/plan/${planId}/tasks/next")
   (Jika "done": true, hentikan loop dan buat laporan final ke user bahwa semua fitur selesai).
   
b. Catat ID Task yang didapat, lalu tandai bahwa kamu mulai mengerjakannya:
   curl -s -X POST "https://vibedev.raflylabs.com/api/plan/${planId}/tasks/<TASK_ID>/start"

c. Implementasikan kode yang diminta oleh task tersebut di file lokal proyek ini.

d. Jalankan validasi / test / build lokal untuk memastikan tidak ada bug atau syntax error.

e. Setelah kode berhasil bekerja, tandai task selesai di VibeDev:
   curl -s -X POST "https://vibedev.raflylabs.com/api/plan/${planId}/tasks/<TASK_ID>/complete"

f. Lanjutkan kembali ke langkah (a) untuk mengambil task berikutnya.

PENTING: Jangan berhenti atau meminta input user di tengah jalan kecuali terjadi blocker fatal. Tulis kode bersih, teruji, dan langsung implementasikan ke file proyek.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(promptContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#121215] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#27272a] bg-[#18181b]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#ff5c20]/10 border border-[#ff5c20]/20 flex items-center justify-center text-[#ff5c20]">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Prompt Otomatisasi AI Coding Agent
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ff5c20]/15 text-[#ff5c20] font-semibold border border-[#ff5c20]/30">
                  Zero Download
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Salin prompt ini ke Cursor, Claude Code, Windsurf, atau Antigravity</p>
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
          <div className="p-3.5 rounded-xl border border-zinc-800 bg-[#18181b] text-xs text-zinc-300 space-y-2">
            <div className="flex items-center gap-2 text-zinc-200 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#ff5c20]" />
              Cara Kerja Realtime Telemetry:
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Begitu prompt ini ditempel di Cursor / Claude Code di laptop kakak, AI agent akan membaca PRD dan mengambil task satu per satu secara otomatis. Status di Kanban Board website VibeDev ini akan <strong>bergerak sendiri secara live</strong> saat task dikerjakan dan selesai!
            </p>
          </div>

          <div className="relative">
            <pre className="p-4 rounded-xl border border-zinc-800 bg-[#09090b] text-zinc-300 font-mono text-[11px] leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-72">
              {promptContent}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#27272a] bg-[#18181b]/50 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 font-mono">Plan ID: {planId}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3.5 py-2 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 bg-[#ff5c20] hover:bg-[#e04f18] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-md shadow-[#ff5c20]/20 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Tersalin ke Clipboard!' : 'Salin Prompt Agent'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
