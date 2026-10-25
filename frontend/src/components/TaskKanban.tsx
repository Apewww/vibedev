import React, { useState } from 'react';
import { 
  CheckCircle2, Clock, CircleDashed, ArrowRight, 
  ArrowLeft, LayoutGrid, Table as TableIcon 
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
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  const columns: { id: 'todo' | 'in_progress' | 'done'; title: string; icon: any; color: string; badgeColor: string }[] = [
    { 
      id: 'todo', 
      title: 'To-Do (Rencana)', 
      icon: CircleDashed, 
      color: 'text-zinc-400',
      badgeColor: 'bg-zinc-800 text-zinc-300'
    },
    { 
      id: 'in_progress', 
      title: 'On-Going (Sedang Dikerjakan)', 
      icon: Clock, 
      color: 'text-amber-400',
      badgeColor: 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
    },
    { 
      id: 'done', 
      title: 'Done (Selesai)', 
      icon: CheckCircle2, 
      color: 'text-emerald-400',
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
    }
  ];

  return (
    <div className="w-full space-y-4">
      {/* View Mode Switcher */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400 font-medium">
          Total Task: <span className="text-zinc-200 font-semibold">{tasks.length} item</span>
        </span>

        <div className="inline-flex p-1 bg-[#121215] border border-[#27272a] rounded-lg">
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'kanban' ? 'bg-[#ff5c20] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Papan Kanban
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'table' ? 'bg-[#ff5c20] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" /> Tabel Task
          </button>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
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
      ) : (
        /* TABLE VIEW */
        <div className="rounded-xl border border-[#27272a] bg-[#121215] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#18181c] border-b border-[#27272a] text-zinc-400 font-medium uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Task &amp; Rincian</th>
                  <th className="py-3 px-4 w-28">Prioritas</th>
                  <th className="py-3 px-4 w-36">Status</th>
                  <th className="py-3 px-4 w-36 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222226]">
                {tasks.map((task, idx) => {
                  const col = columns.find(c => c.id === task.status);
                  return (
                    <tr key={task.id} className="hover:bg-[#18181c]/50 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-zinc-500">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-200">{task.title}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">{task.description}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded font-semibold ${
                          task.priority === 'high' ? 'bg-red-950/50 text-red-400 border border-red-900/40' : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {task.priority || 'high'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${col?.badgeColor}`}>
                          {task.status === 'todo' && 'To-Do'}
                          {task.status === 'in_progress' && 'On-Going'}
                          {task.status === 'done' && 'Done (Selesai)'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <select
                          value={task.status}
                          onChange={(e) => onStatusChange(task.id, e.target.value as any)}
                          className="bg-[#18181b] border border-[#27272a] rounded px-2 py-1 text-[11px] text-zinc-300 outline-none cursor-pointer hover:border-zinc-700"
                        >
                          <option value="todo">To-Do</option>
                          <option value="in_progress">On-Going</option>
                          <option value="done">Done</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
