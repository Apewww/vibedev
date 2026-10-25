import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, Copy, Check, ArrowLeft, RefreshCw, 
  Menu, Sparkles, Terminal, FileText, Cpu, 
  MessageSquare, Layers, GitFork, CheckCircle2 
} from 'lucide-react';
import { marked } from 'marked';
import { VibeJourney } from './components/VibeJourney';
import { PlanSidebar, type SavedPlan } from './components/PlanSidebar';
import { TaskKanban, type TaskItem } from './components/TaskKanban';
import { FlowMap, type FeatureNode } from './components/FlowMap';
import { PricingModal } from './components/PricingModal';
import { AgentPromptModal } from './components/AgentPromptModal';

interface QuestionItem {
  id: string;
  question: string;
  suggestions?: string[];
}

export default function App() {
  // User & Subscription state
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<{
    planType: string;
    prdCredits?: number;
    usedPrds?: number;
  }>({
    planType: 'free',
    prdCredits: 1,
    usedPrds: 0
  });

  // Sidebar & History state
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);

  // Pipeline Navigation State (1: Ide & Kuis, 2: PRD Spec, 3: Dokumen PRD + Task)
  const [step, setStep] = useState<number>(1);
  const [maxStepReached, setMaxStepReached] = useState<number>(1);

  // Active Plan State
  const [planId, setPlanId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [idea, setIdea] = useState<string>('');

  // Step 1: Questions state
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false);

  // Step 2: PRD Spec (Roadmap & Feature Tree) state
  const [features, setFeatures] = useState<FeatureNode[]>([]);
  const [loadingSpec, setLoadingSpec] = useState<boolean>(false);
  const [specViewMode, setSpecViewMode] = useState<'flow' | 'cards'>('flow');

  // Step 3: Dokumen PRD + Task state
  const [step3SubTab, setStep3SubTab] = useState<'prd' | 'tasks'>('prd');
  const [prdMarkdown, setPrdMarkdown] = useState<string>('');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loadingFinalPipeline, setLoadingFinalPipeline] = useState<boolean>(false);
  const [copiedPrd, setCopiedPrd] = useState<boolean>(false);
  const [showRevision, setShowRevision] = useState<boolean>(false);
  const [revisionPrompt, setRevisionPrompt] = useState<string>('');
  const [revisingPrd, setRevisingPrd] = useState<boolean>(false);

  // Modals state
  const [showPricing, setShowPricing] = useState<boolean>(false);
  const [showAgentPrompt, setShowAgentPrompt] = useState<boolean>(false);

  const isPro = subscription.planType === 'pro' || subscription.planType === 'bundle' || subscription.planType === 'pro-bundle';

  // Initial Data Fetching
  useEffect(() => {
    // 1. Fetch User Session
    fetch('/api/auth/get-session')
      .then(r => r.json())
      .then(data => {
        if (data && data.user) setUser(data.user);
      })
      .catch(() => {});

    // 2. Fetch Subscription Status
    fetch('/api/subscription/status')
      .then(r => r.json())
      .then(data => {
        if (data && data.planType) setSubscription(data);
      })
      .catch(() => {});

    // 3. Fetch Saved Plans History
    fetchSavedPlans();
  }, []);

  const fetchSavedPlans = async () => {
    try {
      const res = await fetch('/api/plan/list');
      const data = await res.json();
      if (data && Array.isArray(data.plans)) {
        const sorted = data.plans.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
        setSavedPlans(sorted);
      }
    } catch (e) {
      console.error('Error fetching plans:', e);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch('/api/auth/sign-in/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'google', callbackURL: window.location.pathname })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      alert('Gagal menginisialisasi login Google');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' });
    setUser(null);
  };

  // Reset to New Project
  const handleNewProject = () => {
    setPlanId('');
    setTitle('');
    setIdea('');
    setQuestions([]);
    setAnswers({});
    setFeatures([]);
    setPrdMarkdown('');
    setTasks([]);
    setStep(1);
    setMaxStepReached(1);
  };

  // Select an existing plan from sidebar
  const handleSelectPlan = async (plan: SavedPlan) => {
    try {
      const res = await fetch(`/api/plan/${plan.planId || plan.id}`);
      const data = await res.json();
      const p = data.plan || plan;

      setPlanId(p.planId || p.id);
      setTitle(p.title || '');
      setIdea(p.idea || '');
      setAnswers(p.questionAnswers || {});
      setPrdMarkdown(p.generatedPrd || '');

      // Load features
      const rawFeats: any[] = p.features || [];
      const rawSubs: any[] = p.subFeatures || [];
      if (rawFeats.length > 0) {
        setFeatures(rawFeats.map(f => ({
          ...f,
          subFeatures: rawSubs.filter(s => s.featureId === f.id)
        })));
      } else {
        setFeatures([]);
      }

      // Load tasks
      setTasks(p.tasks || []);

      // Determine step
      if (p.generatedPrd || (p.tasks && p.tasks.length > 0)) {
        setStep(3);
        setMaxStepReached(3);
      } else if (rawFeats.length > 0) {
        setStep(2);
        setMaxStepReached(2);
      } else {
        setStep(1);
        setMaxStepReached(1);
        loadQuestionsForPlan(p.planId || p.id);
      }
    } catch (e) {
      console.error('Failed to load plan:', e);
    }
  };

  const loadQuestionsForPlan = async (pId: string) => {
    setLoadingQuestions(true);
    try {
      const qRes = await fetch('/api/plan/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: pId })
      });
      const qData = await qRes.json();
      setQuestions(qData.questions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // STEP 1: Submit initial idea -> Create plan and fetch 5 questions
  const handleStartIdea = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!idea.trim()) return;

    setLoadingQuestions(true);
    try {
      const pRes = await fetch('/api/plan/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, language: 'id' })
      });
      const pData = await pRes.json();
      const newPlanId = pData.planId;
      setPlanId(newPlanId);
      setTitle(pData.plan?.title || idea.slice(0, 45));

      // Refresh sidebar list
      fetchSavedPlans();

      // Fetch 5 clarification questions
      const qRes = await fetch('/api/plan/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: newPlanId })
      });
      const qData = await qRes.json();
      setQuestions(qData.questions || []);
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan memproses ide.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  // STEP 1 -> STEP 2: Submit questions answers -> Generate PRD Spec (Feature Roadmap & Architecture Tree)
  const handleGeneratePRDSpec = async () => {
    setLoadingSpec(true);
    setStep(2);
    setMaxStepReached(prev => Math.max(prev, 2));

    try {
      // 1. Save answers
      await fetch(`/api/plan/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionAnswers: answers })
      });

      // 2. Generate roadmap / feature tree
      const rRes = await fetch('/api/plan/roadmap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });
      const rData = await rRes.json();
      if (rData.title) setTitle(rData.title);

      const rawFeats: any[] = rData.features || [];
      const rawSubs: any[] = rData.subFeatures || [];
      const featureTree: FeatureNode[] = rawFeats.map(f => ({
        ...f,
        subFeatures: rawSubs.filter(s => s.featureId === f.id)
      }));
      setFeatures(featureTree);
      fetchSavedPlans();
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan menyusun PRD Spec.');
    } finally {
      setLoadingSpec(false);
    }
  };

  // STEP 2 -> STEP 3: From PRD Spec -> Generate Comprehensive Dokumen PRD + Task Pipeline
  const handleGeneratePRDAndTasks = async () => {
    setLoadingFinalPipeline(true);
    setStep(3);
    setMaxStepReached(prev => Math.max(prev, 3));

    try {
      // 1. Generate full PRD markdown
      const prdRes = await fetch('/api/plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });
      const prdData = await prdRes.json();
      setPrdMarkdown(prdData.content || '');

      // 2. Generate phased Kanban tasks
      const tRes = await fetch('/api/plan/tasks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });
      const tData = await tRes.json();
      setTasks(tData.tasks || []);

      fetchSavedPlans();
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan membuat Dokumen PRD dan Task.');
    } finally {
      setLoadingFinalPipeline(false);
    }
  };

  // Revise PRD via AI prompt
  const handleRevisePRD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionPrompt.trim()) return;

    setRevisingPrd(true);
    try {
      const res = await fetch('/api/plan/revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, instruction: revisionPrompt })
      });
      const data = await res.json();
      if (data.content) {
        setPrdMarkdown(data.content);
        setRevisionPrompt('');
        setShowRevision(false);
      }
    } catch (e) {
      alert('Gagal merevisi PRD');
    } finally {
      setRevisingPrd(false);
    }
  };

  // Task Kanban Status Update
  const handleStatusChange = async (taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      await fetch(`/api/plan/${planId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(prdMarkdown);
    setCopiedPrd(true);
    setTimeout(() => setCopiedPrd(false), 2000);
  };

  // Pro Upgrade Callback
  const handleUpgradeSuccess = (planType: string) => {
    setSubscription({
      planType,
      prdCredits: 999,
      usedPrds: 0
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-[#fafafa] selection:bg-[#ff5c20]/30 selection:text-white">
      {/* Collapsible Left Sidebar */}
      <PlanSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        plans={savedPlans}
        activePlanId={planId}
        onSelectPlan={handleSelectPlan}
        onNewProject={handleNewProject}
        user={user}
        subscription={subscription}
        onOpenPricing={() => setShowPricing(true)}
        onLogout={handleLogout}
        onGoogleLogin={handleGoogleLogin}
      />

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-[#27272a] bg-[#09090b]/85 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: Sidebar Toggle & Brand / Project Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg border border-[#27272a] bg-[#121215] hover:bg-[#1f1f24] text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Buka Menu Riwayat PRD"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div 
            onClick={handleNewProject}
            className="flex items-center gap-2 cursor-pointer shrink-0"
            title="Kembali ke Dashboard Utama"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#ff5c20] to-[#ff8452] flex items-center justify-center font-black text-white text-sm shadow-md shadow-[#ff5c20]/25">
              V
            </div>
            <span className="font-bold tracking-tight text-base text-white font-mono hidden md:inline">
              VibeDev <span className="text-[#ff5c20]">AI</span>
            </span>
          </div>

          {/* Active Project Title Pill */}
          {title && (
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-zinc-800 min-w-0">
              <span className="text-xs text-zinc-300 font-medium truncate max-w-[200px] lg:max-w-[320px]">
                {title}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">
                {step === 1 ? '1. Ide & Kuis' : step === 2 ? '2. PRD Spec' : '3. Dokumen PRD + Task'}
              </span>
            </div>
          )}
        </div>

        {/* Center: 3-Step Journey Stepper (Ide & Kuis -> PRD Spec -> Dokumen PRD + Task) */}
        <div className="flex-1 max-w-lg mx-auto hidden sm:block">
          <VibeJourney
            currentStep={step}
            maxStepReached={maxStepReached}
            onSelectStep={(targetStep) => setStep(targetStep)}
          />
        </div>

        {/* Right: Actions, Upgrade & Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Agent Checkpoint Bridge Button (Active on Step 3) */}
          {step === 3 && (
            <button
              onClick={() => {
                if (!isPro) {
                  setShowPricing(true);
                } else {
                  setShowAgentPrompt(true);
                }
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-[#ff5c20]/40 bg-[#ff5c20]/10 hover:bg-[#ff5c20]/20 text-[#ff5c20] text-xs font-semibold transition-all shadow-sm shadow-[#ff5c20]/20 cursor-pointer"
              title="Hubungkan ke Cursor, Claude Code, atau Antigravity"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hubungkan Agent</span>
              <span className="sm:hidden">Agent</span>
              {!isPro && (
                <span className="bg-[#ff5c20] text-white text-[9px] px-1 rounded font-mono font-bold">PRO</span>
              )}
            </button>
          )}

          {/* Upgrade PRO Button for Free Users */}
          {!isPro && (
            <button
              onClick={() => setShowPricing(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-black" />
              <span>Upgrade PRO</span>
              <span className="hidden md:inline bg-black/20 text-black px-1 rounded text-[10px]">25% OFF</span>
            </button>
          )}

          {/* User Profile Avatar */}
          {user ? (
            <div className="flex items-center gap-2 pl-2">
              {user.image ? (
                <img src={user.image} alt={user.name} className="w-7 h-7 rounded-full border border-zinc-700" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#ff5c20] text-white text-xs flex items-center justify-center font-bold">
                  {user.name?.[0] || 'U'}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleGoogleLogin}
              className="text-xs bg-[#121215] hover:bg-[#1c1c21] border border-[#27272a] text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Masuk
            </button>
          )}
        </div>
      </header>

      {/* Main Responsive Canvas */}
      <main className="flex-1 flex flex-col p-4 sm:p-8 max-w-5xl mx-auto w-full">
        {/* Mobile Journey Stepper Bar */}
        <div className="sm:hidden mb-4">
          <VibeJourney
            currentStep={step}
            maxStepReached={maxStepReached}
            onSelectStep={(targetStep) => setStep(targetStep)}
          />
        </div>

        {/* ======================================================== */}
        {/* TAHAP 1: IDE DAN KUIS (Input Ide & 5 Pertanyaan Teknis)  */}
        {/* ======================================================== */}
        {step === 1 && (
          <div className="flex flex-col my-auto py-8 animate-in fade-in zoom-in-95 duration-400">
            {/* If no questions generated yet, show prompt input */}
            {questions.length === 0 ? (
              <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight max-w-2xl leading-[1.2] mb-4">
                  Dari Ide Jadi <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff5c20] to-[#ff946b]">Flow Map, Task, &amp; PRD</span> Siap Pakai.
                </h1>
                <p className="text-sm sm:text-base text-[#a1a1aa] max-w-xl mb-8 leading-relaxed">
                  Jelaskan ide aplikasi Anda. VibeDev AI akan memandu alur modul, menyusun task breakdown, dan membuat PRD lengkap untuk dieksekusi dengan AI coding agent.
                </p>

                {/* Prompt Box */}
                <form onSubmit={handleStartIdea} className="w-full relative">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={idea}
                      onChange={(e) => setIdea(e.target.value)}
                      placeholder="Contoh: Aplikasi absensi karyawan GPS & selfie anti fake-location..."
                      className="w-full bg-[#121215] border border-[#27272a] focus:border-[#ff5c20] focus:ring-1 focus:ring-[#ff5c20] rounded-xl px-4 py-3.5 pr-14 text-sm text-[#fafafa] placeholder-[#71717a] outline-none shadow-2xl transition-all"
                      disabled={loadingQuestions}
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={loadingQuestions || !idea.trim()}
                      className="absolute right-2 p-2 rounded-lg bg-[#ff5c20] hover:bg-[#e04f18] text-white disabled:opacity-40 transition-colors shadow-md shadow-[#ff5c20]/20 cursor-pointer"
                      title="Proses ide"
                    >
                      {loadingQuestions ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* If questions are ready, display the 5 questions questionnaire */
              <div className="w-full max-w-3xl mx-auto space-y-6">
                <div className="border-b border-[#27272a] pb-4">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#ff5c20] font-bold">Tahap 1: Ide &amp; Kuis</span>
                  <h2 className="text-2xl font-bold text-white mt-1">Kuesioner Klarifikasi Arsitektur</h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Jawab 5 pertanyaan terarah di bawah atau klik pill rekomendasi agar modul arsitektur dan PRD presisi.
                  </p>
                </div>

                <div className="space-y-6">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="p-4 sm:p-5 rounded-xl border border-[#27272a] bg-[#121215] space-y-3">
                      <div className="flex items-start gap-2.5">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#ff5c20]/20 text-[#ff5c20] text-xs font-bold mt-0.5">
                          {idx + 1}
                        </span>
                        <h3 className="text-sm font-semibold text-zinc-200 leading-snug">{q.question}</h3>
                      </div>

                      {/* Suggestion Chips */}
                      {q.suggestions && q.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pl-7">
                          {q.suggestions.map((sug, sIdx) => {
                            const isSelected = answers[q.id]?.includes(sug);
                            return (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => {
                                  setAnswers(prev => ({
                                    ...prev,
                                    [q.id]: prev[q.id] ? `${prev[q.id]}, ${sug}` : sug
                                  }));
                                }}
                                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all text-left cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#ff5c20]/20 border-[#ff5c20] text-[#ff5c20]'
                                    : 'bg-[#18181b] border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                                }`}
                              >
                                + {sug}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Text Input for Answer */}
                      <div className="pl-7">
                        <textarea
                          rows={2}
                          value={answers[q.id] || ''}
                          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                          placeholder="Ketik jawaban atau klik opsi rekomendasi di atas..."
                          className="w-full bg-[#18181b] border border-[#27272a] focus:border-[#ff5c20] rounded-lg p-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Primary CTA */}
                <div className="flex items-center justify-between pt-4 border-t border-[#27272a]">
                  <button
                    onClick={() => {
                      setQuestions([]);
                    }}
                    className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Ganti Ide
                  </button>

                  <button
                    onClick={handleGeneratePRDSpec}
                    disabled={loadingSpec}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff5c20] hover:bg-[#e04f18] text-white text-xs font-bold shadow-lg shadow-[#ff5c20]/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loadingSpec ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Menganalisis Spesifikasi Modul...</span>
                      </>
                    ) : (
                      <>
                        <span>Lanjut ke PRD Spec (Struktur Fitur)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAHAP 2: PRD SPEC (Struktur Modul & Arsitektur Fitur)    */}
        {/* ======================================================== */}
        {step === 2 && (
          <div className="flex flex-col space-y-6 animate-in fade-in duration-300">
            {/* Stage Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#27272a]">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#ff5c20] font-bold">Tahap 2: PRD Spec</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">{title || 'Struktur Modul & Arsitektur Fitur'}</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Hierarki modul sistem dan alur pemrosesan sebelum dieksekusi menjadi Dokumen PRD dan Task Kanban.
                </p>
              </div>

              {/* View Switcher & Primary Action */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex p-1 bg-[#121215] border border-[#27272a] rounded-lg">
                  <button
                    onClick={() => setSpecViewMode('flow')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                      specViewMode === 'flow' ? 'bg-[#ff5c20] text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 inline mr-1" /> Flow Map
                  </button>
                  <button
                    onClick={() => setSpecViewMode('cards')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                      specViewMode === 'cards' ? 'bg-[#ff5c20] text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <GitFork className="w-3.5 h-3.5 inline mr-1" /> Daftar Modul
                  </button>
                </div>

                <button
                  onClick={handleGeneratePRDAndTasks}
                  disabled={loadingFinalPipeline}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff5c20] hover:bg-[#e04f18] text-white text-xs font-bold transition-all shadow-lg shadow-[#ff5c20]/25 cursor-pointer disabled:opacity-50"
                >
                  {loadingFinalPipeline ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Membuat Dokumen PRD &amp; Task...</span>
                    </>
                  ) : (
                    <>
                      <span>Generate Dokumen PRD &amp; Task</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Spec Content: Flow Map or Modular Feature Cards */}
            {loadingSpec ? (
              <div className="py-24 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-[#ff5c20] animate-spin mx-auto" />
                <p className="text-sm font-semibold text-zinc-200">Menganalisis pohon modul fitur...</p>
                <p className="text-xs text-zinc-500">Membangun hierarki modul inti dan relasi arsitektur sistem.</p>
              </div>
            ) : specViewMode === 'flow' ? (
              <div className="rounded-xl border border-[#27272a] bg-[#121215] p-5 shadow-2xl">
                <FlowMap 
                  title={title} 
                  features={features} 
                  onContinue={handleGeneratePRDAndTasks} 
                />
              </div>
            ) : (
              /* Feature Cards Grid */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {features.map((feat, idx) => (
                    <div key={feat.id || idx} className="p-5 rounded-xl border border-[#27272a] bg-[#121215] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-[#ff5c20]/20 text-[#ff5c20] text-xs font-mono font-bold">
                            {idx + 1}
                          </span>
                          <h3 className="font-semibold text-sm text-zinc-100">{feat.name}</h3>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase bg-zinc-800 text-zinc-300">
                          {feat.priority || 'high'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{feat.summary}</p>

                      {/* Sub features */}
                      {feat.subFeatures && feat.subFeatures.length > 0 && (
                        <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                          <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold tracking-wider block">
                            Sub-Fitur Pelaksana ({feat.subFeatures.length})
                          </span>
                          <div className="space-y-1.5">
                            {feat.subFeatures.map((sub, sIdx) => (
                              <div key={sub.id || sIdx} className="flex items-start gap-2 bg-[#18181b] p-2 rounded-lg border border-zinc-800/60">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#ff5c20] shrink-0 mt-0.5" />
                                <div className="text-[11px]">
                                  <span className="font-medium text-zinc-200">{sub.name}: </span>
                                  <span className="text-zinc-400">{sub.summary}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleGeneratePRDAndTasks}
                    disabled={loadingFinalPipeline}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff5c20] hover:bg-[#e04f18] text-white text-xs font-bold shadow-md shadow-[#ff5c20]/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span>Lanjut: Buat Dokumen PRD &amp; Task Pipeline</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAHAP 3: DOKUMEN PRD + TASK PIPELINE (Siap Eksekusi Coding Agent)  */}
        {/* ================================================================= */}
        {step === 3 && (
          <div className="flex flex-col space-y-5 animate-in fade-in duration-300">
            {/* Stage Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#27272a]">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#ff5c20] font-bold">Tahap 3: Dokumen PRD + Task</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">{title || 'Spesifikasi & Pipeline Task'}</h2>
              </div>

              {/* Subtabs Switcher & Agent Bridge Button */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex p-1 bg-[#121215] border border-[#27272a] rounded-lg">
                  <button
                    onClick={() => setStep3SubTab('prd')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                      step3SubTab === 'prd' ? 'bg-[#ff5c20] text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 inline mr-1" /> Dokumen PRD
                  </button>
                  <button
                    onClick={() => setStep3SubTab('tasks')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                      step3SubTab === 'tasks' ? 'bg-[#ff5c20] text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 inline mr-1" /> Task Kanban ({tasks.length})
                  </button>
                </div>

                {step3SubTab === 'prd' && (
                  <>
                    <button
                      onClick={() => setShowRevision(!showRevision)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#27272a] bg-[#121215] hover:bg-[#18181c] text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                      <span>Revisi AI</span>
                    </button>

                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#27272a] bg-[#121215] hover:bg-[#18181c] text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      {copiedPrd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPrd ? 'Tersalin' : 'Salin PRD'}</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    if (!isPro) {
                      setShowPricing(true);
                    } else {
                      setShowAgentPrompt(true);
                    }
                  }}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#ff5c20] hover:bg-[#e04f18] text-white text-xs font-bold transition-all shadow-md shadow-[#ff5c20]/25 cursor-pointer"
                >
                  <Cpu className="w-4 h-4" />
                  <span>Hubungkan AI Agent</span>
                  {!isPro && <span className="bg-black/25 px-1 py-0.5 rounded text-[10px]">PRO</span>}
                </button>
              </div>
            </div>

            {/* Expandable Revision Form */}
            {showRevision && step3SubTab === 'prd' && (
              <form onSubmit={handleRevisePRD} className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Instruksi AI Revisi PRD
                  </span>
                  <button type="button" onClick={() => setShowRevision(false)} className="text-xs text-zinc-500 hover:text-zinc-300">
                    Tutup
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={revisionPrompt}
                  onChange={(e) => setRevisionPrompt(e.target.value)}
                  placeholder="Contoh: Tambahkan webhook Midtrans untuk verifikasi otomatis status pembayaran..."
                  className="w-full bg-[#121215] border border-[#27272a] focus:border-amber-500 rounded-lg p-2.5 text-xs text-white placeholder-zinc-600 outline-none"
                  disabled={revisingPrd}
                />
                <button
                  type="submit"
                  disabled={revisingPrd || !revisionPrompt.trim()}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {revisingPrd ? 'Memproses Revisi...' : 'Terapkan Revisi'}
                </button>
              </form>
            )}

            {/* Sub-tab 1: DOKUMEN PRD */}
            {step3SubTab === 'prd' && (
              <div className="relative rounded-xl border border-[#27272a] bg-[#121215] p-6 sm:p-8 shadow-2xl">
                {loadingFinalPipeline ? (
                  <div className="py-24 text-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-[#ff5c20] animate-spin mx-auto" />
                    <p className="text-sm font-semibold text-zinc-200">Menyusun dokumen PRD lengkap...</p>
                    <p className="text-xs text-zinc-500">Menganalisis DDL database, arsitektur modul, dan spesifikasi API.</p>
                  </div>
                ) : (
                  <>
                    <div 
                      className="prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed 
                        prose-headings:text-zinc-100 prose-headings:font-bold prose-headings:tracking-tight 
                        prose-h1:text-xl sm:prose-h1:text-2xl prose-h1:border-b prose-h1:border-zinc-800 prose-h1:pb-2
                        prose-h2:text-base sm:prose-h2:text-lg prose-h2:text-[#ff7842] prose-h2:mt-6 prose-h2:mb-3
                        prose-p:text-zinc-300 prose-ul:text-zinc-300 prose-li:my-1
                        prose-pre:bg-[#09090b] prose-pre:border prose-pre:border-[#27272a] prose-pre:rounded-lg
                        prose-code:text-[#ff8452] prose-code:font-mono prose-code:text-[11px]"
                      dangerouslySetInnerHTML={{ __html: marked.parse(prdMarkdown || '# PRD Kosong') as string }}
                    />

                    {/* Pro Paywall Teaser Banner if user is Free */}
                    {!isPro && (
                      <div className="mt-8 p-4 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[#18181b] to-amber-500/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> Buka Akses Agent Checkpoint Protocol &amp; DDL Penuh
                          </span>
                          <p className="text-[11px] text-zinc-400">
                            Upgrade ke VibeDev Pro untuk mendapatkan instruksi step-by-step coding agent tanpa limit token.
                          </p>
                        </div>
                        <button
                          onClick={() => setShowPricing(true)}
                          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold transition-all shrink-0 cursor-pointer"
                        >
                          Lihat Paket Pro
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Sub-tab 2: TASK KANBAN PIPELINE */}
            {step3SubTab === 'tasks' && (
              <div className="space-y-4">
                {/* Checkpoint Protocol STOP Alert */}
                <div className="p-4 rounded-xl border border-[#ff5c20]/40 bg-[#ff5c20]/5 flex items-start gap-3">
                  <Terminal className="w-5 h-5 text-[#ff5c20] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white">
                      Protokol Checkpoint AI Agent (Anti-Bocor Token)
                    </h4>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      Agent lokal Anda diwajibkan menyelesaikan antarmuka <strong>Frontend UI dengan mock data terlebih dahulu</strong>. Agent <strong>DIHARUSKAN BERHENTI</strong> dan meminta Anda menguji tampilan di browser sebelum melangkah ke skema Database dan API backend.
                    </p>
                  </div>
                </div>

                {loadingFinalPipeline ? (
                  <div className="py-24 text-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-[#ff5c20] animate-spin mx-auto" />
                    <p className="text-sm font-semibold text-zinc-200">Menyusun task breakdown eksekusi...</p>
                    <p className="text-xs text-zinc-500">Membagi alur ke dalam fase Frontend Mock, Backend API, dan Database.</p>
                  </div>
                ) : (
                  <TaskKanban tasks={tasks} onStatusChange={handleStatusChange} />
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Pricing & Upgrade Modal */}
      <PricingModal 
        isOpen={showPricing} 
        onClose={() => setShowPricing(false)} 
        onUpgradeSuccess={handleUpgradeSuccess}
      />

      {/* AI Agent Checkpoint Prompt Modal */}
      <AgentPromptModal 
        isOpen={showAgentPrompt} 
        onClose={() => setShowAgentPrompt(false)} 
        planId={planId}
        title={title}
        idea={idea}
        tasks={tasks}
      />
    </div>
  );
}
