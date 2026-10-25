import React from 'react';
import { 
  GitFork, CheckCircle2, ArrowRight, Database, 
  Server, Cpu, Box
} from 'lucide-react';

export interface FeatureNode {
  id: string;
  name: string;
  summary: string;
  icon?: string;
  priority?: string;
  subFeatures?: { id: string; name: string; summary: string }[];
}

interface FlowMapProps {
  title: string;
  features: FeatureNode[];
  onContinue: () => void;
}

export const FlowMap: React.FC<FlowMapProps> = ({ title, features, onContinue }) => {
  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* Title & Banner */}
      <div className="p-6 rounded-2xl border border-[#27272a] bg-gradient-to-b from-[#121215] to-[#09090b]">
        <div className="flex items-center gap-2.5 text-[#ff5c20] text-xs font-semibold uppercase tracking-wider mb-2">
          <GitFork className="w-4 h-4" />
          Arsitektur Flow Map Sistem
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{title || 'Arsitektur & Flow Map Produk'}</h2>
        <p className="text-xs sm:text-sm text-[#a1a1aa] mt-1.5 max-w-2xl">
          Visualisasi pohon modul fitur, dependency layer, dan alur pemrosesan data sebelum dieksekusi menjadi task implementasi dan PRD final.
        </p>

        {/* Global Pipeline Visual Flow */}
        <div className="mt-6 pt-6 border-t border-zinc-800/80 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <div className="flex items-center gap-2 bg-[#18181b] border border-[#27272a] px-3 py-1.5 rounded-lg text-zinc-300">
            <Cpu className="w-3.5 h-3.5 text-[#ff5c20]" /> Client & Webhook Entry
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
          <div className="flex items-center gap-2 bg-[#18181b] border border-[#27272a] px-3 py-1.5 rounded-lg text-zinc-300">
            <Server className="w-3.5 h-3.5 text-[#ff5c20]" /> Core Logic & Parsing Engine
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
          <div className="flex items-center gap-2 bg-[#18181b] border border-[#27272a] px-3 py-1.5 rounded-lg text-zinc-300">
            <Database className="w-3.5 h-3.5 text-[#ff5c20]" /> Storage & Relational DB
          </div>
        </div>
      </div>

      {/* Feature Nodes Grid */}
      <div className="space-y-4">
        {features.map((feat, idx) => (
          <div 
            key={feat.id || idx}
            className="rounded-xl border border-[#27272a] bg-[#121215] p-5 sm:p-6 hover:border-zinc-700 transition-all shadow-md relative group"
          >
            {/* Main Feature Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#ff5c20]/10 border border-[#ff5c20]/20 flex items-center justify-center text-[#ff5c20] shrink-0 mt-0.5">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#ff5c20] font-semibold">MODUL {idx + 1}</span>
                    <span className="text-xs text-zinc-600">•</span>
                    <h3 className="text-base sm:text-lg font-bold text-white">{feat.name}</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-[#a1a1aa] mt-1 leading-relaxed">
                    {feat.summary}
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 font-semibold shrink-0">
                {feat.priority || 'CORE'}
              </span>
            </div>

            {/* Sub-Features / Branch Flow */}
            {feat.subFeatures && feat.subFeatures.length > 0 && (
              <div className="mt-5 pt-4 border-t border-zinc-800/80">
                <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-3">
                  Sub-Fitur &amp; Cabang Eksekusi:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {feat.subFeatures.map((sub, sIdx) => (
                    <div 
                      key={sub.id || sIdx}
                      className="flex items-start gap-2.5 p-3 rounded-lg bg-[#18181b] border border-zinc-800/60 text-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#ff5c20] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-zinc-200">{sub.name}</span>
                        <p className="text-[11px] text-[#a1a1aa] mt-0.5 leading-normal">{sub.summary}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action to continue */}
      <div className="pt-4 flex justify-end">
        <button
          onClick={onContinue}
          className="w-full sm:w-auto bg-[#ff5c20] hover:bg-[#e04f18] text-white font-semibold text-sm px-8 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#ff5c20]/20 cursor-pointer"
        >
          Lanjut ke Pembuatan Task &amp; PRD <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
