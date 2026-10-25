import React from 'react';
import { Check } from 'lucide-react';

interface VibeJourneyProps {
  currentStep: number;
}

export const VibeJourney: React.FC<VibeJourneyProps> = ({ currentStep }) => {
  const steps = [
    { num: 1, label: 'Ide' },
    { num: 2, label: 'Kuesioner' },
    { num: 3, label: 'Roadmap & Fitur' },
    { num: 4, label: 'PRD Final' }
  ];

  return (
    <div className="flex items-center justify-center my-6">
      <ol className="flex items-center gap-2 sm:gap-4">
        {steps.map((s, idx) => {
          const isDone = currentStep > s.num;
          const isActive = currentStep === s.num;

          return (
            <li key={s.num} className="flex items-center">
              <div className="flex items-center gap-2">
                {isDone ? (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#ff5c20] text-white">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                ) : isActive ? (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-[#ff5c20] text-[#ff5c20] font-bold text-xs bg-[#ff5c20]/10">
                    {s.num}
                  </span>
                ) : (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-zinc-500 text-xs">
                    {s.num}
                  </span>
                )}
                <span className={`text-xs sm:text-sm font-medium ${isActive ? 'text-white font-semibold' : isDone ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <span className={`mx-2 sm:mx-3 h-0.5 w-6 sm:w-12 rounded-full ${isDone ? 'bg-[#ff5c20]' : 'bg-zinc-800'}`} />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};
