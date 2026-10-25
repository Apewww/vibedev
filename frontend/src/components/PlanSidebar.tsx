import React from 'react';
import { 
  Plus, FileText, Sparkles, 
  X, LogOut, User as UserIcon, Shield 
} from 'lucide-react';

export interface SavedPlan {
  id: string;
  planId: string;
  title: string;
  idea?: string;
  createdAt?: number;
  step?: number;
  generatedPrd?: string;
}

interface PlanSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  plans: SavedPlan[];
  activePlanId: string;
  onSelectPlan: (plan: SavedPlan) => void;
  onNewProject: () => void;
  user: any;
  subscription: {
    planType: string;
    prdCredits?: number;
    usedPrds?: number;
  };
  onOpenPricing: () => void;
  onLogout: () => void;
  onGoogleLogin: () => void;
}

export const PlanSidebar: React.FC<PlanSidebarProps> = ({
  isOpen,
  onClose,
  plans,
  activePlanId,
  onSelectPlan,
  onNewProject,
  user,
  subscription,
  onOpenPricing,
  onLogout,
  onGoogleLogin
}) => {
  const isPro = subscription.planType === 'pro' || subscription.planType === 'bundle' || subscription.planType === 'pro-bundle';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 sm:w-80 bg-[#0d0d10] border-r border-[#222226] flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header */}
        <div className="p-4 border-b border-[#222226]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#ff5c20] to-[#ff8452] flex items-center justify-center font-black text-white text-sm shadow-md shadow-[#ff5c20]/25">
                V
              </div>
              <span className="font-bold tracking-tight text-white font-mono text-sm">
                VibeDev <span className="text-[#ff5c20]">AI</span>
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Tutup Menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* New Project Button */}
          <button
            onClick={() => {
              onNewProject();
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#ff5c20] hover:bg-[#e04f18] text-white text-xs font-semibold shadow-md shadow-[#ff5c20]/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Proyek Baru</span>
          </button>
        </div>

        {/* Middle Plan History List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
          <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            <span>Riwayat PRD ({plans.length})</span>
            <span className="text-[10px] text-zinc-600">Terbaru</span>
          </div>

          {plans.length === 0 ? (
            <div className="text-center py-10 px-4 text-zinc-500 text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 text-zinc-700 stroke-[1.5]" />
              <p>Belum ada proyek tersimpan.</p>
              <p className="text-[11px] text-zinc-600 mt-1">Buat ide pertamamu untuk mulai membuat PRD.</p>
            </div>
          ) : (
            plans.map((p) => {
              const isActive = p.planId === activePlanId || p.id === activePlanId;
              const dateStr = p.createdAt 
                ? new Date(p.createdAt * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                : '';

              return (
                <button
                  key={p.planId || p.id}
                  onClick={() => {
                    onSelectPlan(p);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start justify-between gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-[#18181c] border-[#ff5c20]/40 text-white shadow-sm'
                      : 'bg-[#121215]/50 border-transparent hover:border-[#27272a] hover:bg-[#18181c] text-zinc-300'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#ff5c20]' : 'text-zinc-500'}`} />
                      <span className="text-xs font-medium truncate block">
                        {p.title || 'Proyek Tanpa Judul'}
                      </span>
                    </div>
                    {p.idea && (
                      <p className="text-[11px] text-zinc-500 truncate mt-1 pl-5">
                        {p.idea}
                      </p>
                    )}
                  </div>
                  {dateStr && (
                    <span className="text-[10px] text-zinc-600 shrink-0 font-mono mt-0.5">
                      {dateStr}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Bottom Membership & Account Card */}
        <div className="p-3 border-t border-[#222226] bg-[#09090b]/50 space-y-3">
          {/* Subscription Tier Banner */}
          <div className="p-3 rounded-xl border border-[#27272a] bg-[#121215]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Shield className={`w-3.5 h-3.5 ${isPro ? 'text-[#ff5c20]' : 'text-amber-400'}`} />
                <span className="text-xs font-semibold text-white">
                  {isPro ? 'VibeDev PRO' : 'Free Starter'}
                </span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                isPro ? 'bg-[#ff5c20]/20 text-[#ff5c20]' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {isPro ? 'UNLIMITED' : '1 KUOTA'}
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-tight mb-2.5">
              {isPro
                ? 'Akses penuh DDL Database, API contracts, dan Agent Checkpoint Prompt.'
                : '1 PRD gratis. Buka semua fitur eksekusi AI coding dengan Pro.'}
            </p>

            {!isPro && (
              <button
                onClick={() => {
                  onOpenPricing();
                  if (window.innerWidth < 1024) onClose();
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Upgrade PRO</span>
                <span className="bg-black/20 text-black px-1 rounded text-[9px]">25% OFF</span>
              </button>
            )}
          </div>

          {/* User Account Bar */}
          {user ? (
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#121215] border border-[#222226]">
              <div className="flex items-center gap-2 min-w-0">
                {user.image ? (
                  <img src={user.image} alt={user.name} className="w-7 h-7 rounded-full shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#ff5c20] text-xs flex items-center justify-center font-bold text-white shrink-0">
                    {user.name?.[0] || 'U'}
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-xs font-medium text-white block truncate">{user.name}</span>
                  <span className="text-[10px] text-zinc-500 block truncate">{user.email}</span>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Keluar"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onGoogleLogin}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-[#27272a] bg-[#121215] hover:bg-[#1a1a1f] text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Masuk dengan Google</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
