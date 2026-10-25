import React from 'react';
import { Check } from 'lucide-react';

interface VibeJourneyProps {
  currentStep: number;
}

export const VibeJourney: React.FC<VibeJourneyProps> = ({ currentStep }) => {
  const steps = [
    { num: 1, label: '1. Ide' },
    { num: 2, label: '2. Kuesioner' },
    { num: 3, label: '3. Flow Map' },
    { num: 4, label: '4. Task Kanban' },
    { num: 5, label: '5. PRD Final' }
  ];

  return (
    <div className="flex items-center justify-center my-6 px-4">
      <ol className="flex items-center gap-1.5 sm:gap-3 flex-wrap justify-center">
        {steps.map((s, idx) => {
          const isDone = currentStep > s.num;
          const isActive = currentStep === s.num;

          return (
            <li key={s.num} className="flex items-center">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {isDone ? (
                  <span className="flex size-5 sm:size-6 shrink-0 items-center justify-center rounded-full bg-[#ff5c20] text-white">
                    <Check className="size-3 sm:size-3.5" strokeWidth={3} />
                  </span>
                ) : isActive ? (
                  <span className="flex size-5 sm:size-6 shrink-0 items-center justify-center rounded-full border-2 border-[#ff5c20] text-[#ff5c20] font-bold text-[10px] sm:text-xs bg-[#ff5c20]/10">
                    {s.num}
                  </span>
                ) : (
                  <span className="flex size-5 sm:size-6 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-zinc-500 text-[10px] sm:text-xs">
                    {s.num}
                  </span>
                )}
                <span className={`text-[11px] sm:text-xs font-medium ${isActive ? 'text-white font-semibold' : isDone ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <span className={`mx-1.5 sm:mx-2.5 h-0.5 w-4 sm:w-8 rounded-full ${isDone ? 'bg-[#ff5c20]' : 'bg-zinc-800'}`} />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};
