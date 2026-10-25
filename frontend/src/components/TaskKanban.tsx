import React from 'react';
import { 
  CheckCircle2, Clock, CircleDashed, ArrowRight, ArrowLeft
} from 'lucide-react';

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority?: string;
}

interface TaskKanbanProps {
  tasks: TaskItem[];
  onStatusChange: (taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => void;
}

export const TaskKanban: React.FC<TaskKanbanProps> = ({ tasks, onStatusChange }) => {
  const columns: { id: 'todo' | 'in_progress' | 'done'; title: string; icon: any; color: string }[] = [
    { 
      id: 'todo', 
      title: 'To-Do (Rencana)', 
      icon: CircleDashed, 
      color: 'text-zinc-400'
    },
    { 
      id: 'in_progress', 
      title: 'On-Going (Sedang Dikerjakan)', 
      icon: Clock, 
      color: 'text-amber-400'
    },
    { 
      id: 'done', 
      title: 'Done (Selesai)', 
      icon: CheckCircle2, 
      color: 'text-emerald-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
      {columns.map(col => {
        const colTasks = tasks.filter(t => t.status === col.id);
        const Icon = col.icon;

        return (
          <div 
            key={col.id} 
            className="flex flex-col rounded-xl border border-[#27272a] bg-[#121215] p-4 min-h-[420px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#27272a]">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${col.color}`} />
                <h3 className="font-semibold text-xs text-zinc-200">{col.title}</h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium">
                {colTasks.length}
              </span>
            </div>

            {/* Task Cards Container */}
            <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
              {colTasks.length === 0 ? (
                <div className="h-28 flex items-center justify-center border border-dashed border-zinc-800 rounded-lg text-[11px] text-zinc-600">
                  Tidak ada task
                </div>
              ) : (
                colTasks.map(task => (
                  <div 
                    key={task.id}
                    className="p-3.5 rounded-lg border border-[#27272a] bg-[#18181b] hover:border-zinc-700 transition-all shadow-sm group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-xs font-semibold text-zinc-200 leading-snug">{task.title}</h4>
                      <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                        task.priority === 'high' ? 'bg-red-950/50 text-red-400 border border-red-900/50' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {task.priority || 'high'}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2 mb-3">
                      {task.description}
                    </p>

                    {/* Move Status Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-[10px]">
                      {col.id !== 'todo' ? (
                        <button 
                          onClick={() => onStatusChange(task.id, col.id === 'done' ? 'in_progress' : 'todo')}
                          className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                          title="Geser mundur"
                        >
                          <ArrowLeft className="w-3 h-3" /> Mundur
                        </button>
                      ) : <div />}

                      {col.id !== 'done' && (
                        <button 
                          onClick={() => onStatusChange(task.id, col.id === 'todo' ? 'in_progress' : 'done')}
                          className="flex items-center gap-1 text-[#ff5c20] hover:text-[#ff7e4f] font-medium transition-colors ml-auto cursor-pointer"
                          title="Lanjut status berikutnya"
                        >
                          {col.id === 'todo' ? 'Mulai' : 'Selesai'} <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
