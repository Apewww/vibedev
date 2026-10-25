import React from 'react';
import { Check } from 'lucide-react';

interface VibeJourneyProps {
  currentStep: number;
  maxStepReached: number;
  onSelectStep: (step: number) => void;
  className?: string;
}

export const VibeJourney: React.FC<VibeJourneyProps> = ({ 
  currentStep, 
  maxStepReached, 
  onSelectStep,
  className = '' 
}) => {
  const steps = [
    { key: 'ide_kuis', num: 1, label: 'Ide & Kuis', shortLabel: 'Ide' },
    { key: 'prd_spec', num: 2, label: 'PRD Spec', shortLabel: 'Spec' },
    { key: 'prd_task', num: 3, label: 'Dokumen PRD + Task', shortLabel: 'PRD + Task' }
  ];

  return (
    <nav aria-label="Pipeline Progress" className={`flex items-center justify-center ${className}`}>
      <ol className="flex items-center gap-2 sm:gap-4">
        {steps.map((s, idx) => {
          const isDone = currentStep > s.num || maxStepReached > s.num;
          const isActive = currentStep === s.num;
          const isClickable = s.num <= maxStepReached;

          return (
            <li key={s.key} className="flex items-center">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onSelectStep(s.num)}
                className={`flex items-center gap-1.5 sm:gap-2 text-xs transition-all ${
                  isClickable ? 'cursor-pointer hover:opacity-90' : 'cursor-not-allowed opacity-50'
                }`}
              >
                {/* Step Circle / Badge */}
                {isDone && !isActive ? (
                  <span className="flex size-5 sm:size-5.5 shrink-0 items-center justify-center rounded-full bg-[#ff5c20] text-white shadow-sm shadow-[#ff5c20]/40">
                    <Check className="size-3 sm:size-3.5" strokeWidth={3} />
                  </span>
                ) : isActive ? (
                  <span className="relative flex size-5 sm:size-5.5 shrink-0 items-center justify-center rounded-full border-2 border-[#ff5c20] text-[#ff5c20] font-bold text-[10px] sm:text-xs bg-[#ff5c20]/15 shadow-sm shadow-[#ff5c20]/30">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff5c20] opacity-20"></span>
                    {s.num}
                  </span>
                ) : (
                  <span className="flex size-5 sm:size-5.5 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-500 text-[10px] sm:text-xs">
                    {s.num}
                  </span>
                )}

                {/* Step Label */}
                <span
                  className={`font-medium transition-colors ${
                    isActive
                      ? 'text-white font-semibold'
                      : isDone
                      ? 'text-zinc-300'
                      : 'text-zinc-500'
                  }`}
                >
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="inline sm:hidden">{s.shortLabel}</span>
                </span>
              </button>

              {/* Line Connector */}
              {idx < steps.length - 1 && (
                <span
                  className={`mx-2 sm:mx-3 h-0.5 w-6 sm:w-12 rounded-full transition-colors ${
                    maxStepReached > s.num ? 'bg-[#ff5c20]' : 'bg-zinc-800'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
