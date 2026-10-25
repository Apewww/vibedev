import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, ArrowLeft, RefreshCw, 
  Menu, Sparkles, Terminal, FileText, Cpu, 
  Layers, Box,
  User as UserIcon, X, ShieldAlert
} from 'lucide-react';

import { VibeJourney } from './components/VibeJourney';
import { PlanSidebar, type SavedPlan } from './components/PlanSidebar';
import { TaskKanban, type TaskItem } from './components/TaskKanban';
import { FlowMap, type FeatureNode } from './components/FlowMap';
import { AgentPromptModal } from './components/AgentPromptModal';
import { PrdPreview } from './components/PrdPreview';


interface QuestionItem {
  id: string;
  question: string;
  suggestions?: string[];
}

export default function App() {
  // User & Credits Quota state
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<{
    total: number;
    used: number;
    remaining: number;
    isAdmin?: boolean;
  }>({
    total: 5,
    used: 0,
    remaining: 5,
    isAdmin: false
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

  // Step 3: Dokumen PRD + Task state
  const [step3SubTab, setStep3SubTab] = useState<'prd' | 'tasks'>('prd');
  const [prdMarkdown, setPrdMarkdown] = useState<string>('');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loadingFinalPipeline, setLoadingFinalPipeline] = useState<boolean>(false);
  const [revisionPrompt, setRevisionPrompt] = useState<string>('');
  const [revisingPrd, setRevisingPrd] = useState<boolean>(false);
  const [specViewMode, setSpecViewMode] = useState<'canvas' | 'grid'>('canvas');

  // Modals state
  const [showAgentPrompt, setShowAgentPrompt] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('vibedev_session_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Initial Data Fetching
  useEffect(() => {
    // 0. Handle OAuth redirect session_token param in URL if returned from Google
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('session_token');
      if (token) {
        document.cookie = `better-auth.session_token=${token}; path=/; max-age=${30 * 86400}; SameSite=Lax`;
        localStorage.setItem('vibedev_session_token', token);
        const newUrl = window.location.pathname + (window.location.hash || '');
        window.history.replaceState({}, document.title, newUrl);
      }
    } catch (e) {
      console.error('Error handling session token from URL:', e);
    }

    // 1. Fetch User Session & Credits
    fetchSessionAndCredits();

    // 2. Fetch Saved Plans History
    fetchSavedPlans();
  }, []);

  const fetchSessionAndCredits = async () => {
    try {
      const token = localStorage.getItem('vibedev_session_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/auth/get-session', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data && data.user) {
          setUser(data.user);
          if (data.credits) {
            setCredits(data.credits);
          }
        } else {
          setUser(null);
        }
      }
    } catch (e) {
      console.error('Session fetch error:', e);
    }
  };

  const fetchSavedPlans = async () => {
    try {
      const res = await fetch('/api/plan/list', { headers: getAuthHeaders() });
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
      const callbackURL = window.location.origin + window.location.pathname;
      const res = await fetch('/api/auth/sign-in/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'google', callbackURL })
      });
      const data = await res.json();
      if (data && data.url) {
        window.location.href = data.url;
      } else {
        alert('Gagal mendapatkan link login Google.');
      }
    } catch (e) {
      console.error('Google login error:', e);
      alert('Gagal menginisialisasi login Google. Periksa backend server.');
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('vibedev_session_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      await fetch('/api/auth/sign-out', { method: 'POST', headers });
    } catch (e) {
      console.error('Logout error:', e);
    }
    document.cookie = "better-auth.session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    localStorage.removeItem('vibedev_session_token');
    setUser(null);
    setCredits({ total: 5, used: 0, remaining: 5, isAdmin: false });
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
    setErrorMessage('');
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
        headers: getAuthHeaders(),
        body: JSON.stringify({ planId: pId })
      });
      if (qRes.status === 401) {
        setShowAuthModal(true);
        return;
      }
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

    // Check if user is logged in
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setLoadingQuestions(true);
    setErrorMessage('');

    try {
      const pRes = await fetch('/api/plan/create', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ idea, language: 'id' })
      });
      const pData = await pRes.json();
      const newPlanId = pData.planId;
      setPlanId(newPlanId);
      setTitle(pData.plan?.title || idea.slice(0, 45));

      fetchSavedPlans();

      // Fetch 5 clarification questions
      const qRes = await fetch('/api/plan/questions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ planId: newPlanId })
      });

      if (qRes.status === 401) {
        setShowAuthModal(true);
        return;
      }

      if (qRes.status === 429) {
        const errJson = await qRes.json();
        setErrorMessage(errJson.detail || 'Batas kuota gratis akun Anda telah habis.');
        return;
      }

      const qData = await qRes.json();
      setQuestions(qData.questions || []);
      fetchSessionAndCredits();
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan memproses ide.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  // STEP 1 -> STEP 2: Submit questions answers -> Generate PRD Spec (Feature Roadmap & Architecture Tree)
  const handleGeneratePRDSpec = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setLoadingSpec(true);
    setStep(2);
    setMaxStepReached(prev => Math.max(prev, 2));
    setErrorMessage('');

    try {
      await fetch(`/api/plan/${planId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ questionAnswers: answers })
      });

      const rRes = await fetch('/api/plan/roadmap/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ planId })
      });

      if (rRes.status === 401) {
        setShowAuthModal(true);
        return;
      }

      if (rRes.status === 429) {
        const errJson = await rRes.json();
        setErrorMessage(errJson.detail || 'Batas kuota gratis akun Anda telah habis.');
        return;
      }

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
      fetchSessionAndCredits();
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan menyusun PRD Spec.');
    } finally {
      setLoadingSpec(false);
    }
  };

  // STEP 2 -> STEP 3: From PRD Spec -> Generate Comprehensive Dokumen PRD + Task Pipeline
  const handleGeneratePRDAndTasks = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setLoadingFinalPipeline(true);
    setStep(3);
    setMaxStepReached(prev => Math.max(prev, 3));
    setErrorMessage('');

    try {
      // 1. Generate full PRD markdown
      const prdRes = await fetch('/api/plan/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ planId })
      });

      if (prdRes.status === 401) {
        setShowAuthModal(true);
        return;
      }
      if (prdRes.status === 429) {
        const errJson = await prdRes.json();
        setErrorMessage(errJson.detail || 'Batas kuota gratis akun Anda telah habis.');
        return;
      }

      const prdData = await prdRes.json();
      setPrdMarkdown(prdData.content || '');

      // 2. Generate phased Kanban tasks
      const tRes = await fetch('/api/plan/tasks/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ planId })
      });
      const tData = await tRes.json();
      setTasks(tData.tasks || []);

      fetchSavedPlans();
      fetchSessionAndCredits();
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan membuat Dokumen PRD dan Task.');
    } finally {
      setLoadingFinalPipeline(false);
    }
  };

  // Revise PRD via AI prompt
  const handleRevisePRD = async (eOrInstruction?: React.FormEvent | string) => {
    if (eOrInstruction && typeof eOrInstruction !== 'string' && 'preventDefault' in eOrInstruction) {
      eOrInstruction.preventDefault();
    }
    const instruction = typeof eOrInstruction === 'string' ? eOrInstruction : revisionPrompt;
    if (!instruction.trim()) return;

    setRevisingPrd(true);
    try {
      const res = await fetch('/api/plan/revise', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ planId, instruction })
      });
      if (res.status === 401) {
        setShowAuthModal(true);
        return;
      }
      if (res.status === 429) {
        const errJson = await res.json();
        setErrorMessage(errJson.detail || 'Batas kuota gratis akun Anda telah habis.');
        return;
      }
      const data = await res.json();
      if (data.content) {
        setPrdMarkdown(data.content);
        setRevisionPrompt('');
      }
      fetchSessionAndCredits();
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
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {
      console.error(e);
    }
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
        credits={credits}
        onLogout={handleLogout}
        onGoogleLogin={handleGoogleLogin}
      />

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-[#27272a] bg-[#09090b]/85 backdrop-blur-md px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Sidebar Toggle & Brand / Project Title */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-zinc-800/60 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Buka Menu Riwayat PRD"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div 
            onClick={handleNewProject}
            className="flex items-center gap-2 cursor-pointer shrink-0"
            title="Kembali ke Dashboard Utama"
          >
            <img 
              src="/logo.png" 
              alt="VibeDev AI Logo" 
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain" 
            />
            <span className="font-bold tracking-tight text-sm sm:text-base text-white font-mono hidden sm:inline">
              VibeDev <span className="text-[#ff5c20]">AI</span>
            </span>
          </div>

          {/* Active Project Title Pill */}
          {title && (
            <div className="hidden lg:flex items-center gap-2 pl-2.5 border-l border-zinc-800/80 min-w-0">
              <span className="text-xs text-zinc-300 font-medium truncate max-w-[160px] xl:max-w-[240px]">
                {title}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 shrink-0">
                {step === 1 ? '1. Ide & Kuis' : step === 2 ? '2. PRD Spec' : '3. Dokumen PRD + Task'}
              </span>
            </div>
          )}
        </div>

        {/* Right: Actions, Quota Counter & Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
          {/* Agent Checkpoint Bridge Button (Active on Step 3) */}
          {step === 3 && (
            <button
              onClick={() => setShowAgentPrompt(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ff5c20]/40 bg-[#ff5c20]/10 hover:bg-[#ff5c20]/20 text-[#ff5c20] text-xs font-semibold transition-all shadow-sm shadow-[#ff5c20]/20 cursor-pointer"
              title="Hubungkan ke Cursor, Claude Code, atau Antigravity"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hubungkan Agent</span>
              <span className="sm:hidden">Agent</span>
            </button>
          )}

          {/* Free Quota Badge */}
          {user && (
            <div className="hidden sm:flex items-center gap-1.5 bg-[#121215] border border-[#27272a] px-2.5 py-1 rounded-full text-xs text-zinc-300">
              <Sparkles className="w-3.5 h-3.5 text-[#ff5c20]" />
              {credits.isAdmin ? (
                <span className="font-mono text-zinc-200 font-bold">Admin Unlimited</span>
              ) : (
                <span>
                  Sisa Kuota: <strong className="font-mono text-white">{credits.remaining}</strong>/5
                </span>
              )}
            </div>
          )}

          {/* User Profile Avatar */}
          {user ? (
            <div className="flex items-center gap-2 pl-1">
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
              className="flex items-center gap-1.5 text-xs bg-[#ff5c20] hover:bg-[#e04f18] text-white px-3 py-1.5 rounded-lg font-semibold shadow-md shadow-[#ff5c20]/25 transition-all cursor-pointer"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Masuk Google</span>
            </button>
          )}
        </div>
      </header>

      {/* Quota Exceeded Alert Banner (if any) */}
      {errorMessage && (
        <div className="bg-red-950/80 border-b border-red-800 text-red-200 px-4 py-2.5 text-xs text-center flex items-center justify-center gap-2 animate-in fade-in">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="ml-2 underline font-bold cursor-pointer">
            Tutup
          </button>
        </div>
      )}

      {/* Main Responsive Canvas - Full Width */}
      <main className="flex-1 flex flex-col w-full px-4 sm:px-6 lg:px-8 py-5">
        {/* Pipeline Stepper - Clean, Centered inside Main Content */}
        <div className="w-full flex items-center justify-center pb-5 mb-5 border-b border-[#27272a]/60">
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
              <div className="flex flex-col items-center text-center max-w-3xl mx-auto py-8">
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
          <div className="flex flex-col space-y-4 animate-in fade-in duration-300">
            {/* Stage Header matching ngodingpakeai layout */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3.5 border-b border-[#27272a]">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#ff5c20] font-bold">Tahap 2: PRD Spec</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">{title || 'Struktur Modul & Arsitektur Fitur'}</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Hierarki modul sistem dan alur pemrosesan sebelum dieksekusi menjadi Dokumen PRD dan Task Kanban.
                </p>
              </div>

              {/* Header Right: Flow Map / Daftar Modul toggle + Generate Button */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <div className="inline-flex p-1 bg-[#121215] border border-[#27272a] rounded-xl shadow-inner">
                  <button
                    onClick={() => setSpecViewMode('canvas')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      specViewMode === 'canvas'
                        ? 'bg-[#ff5c20] text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Flow Map</span>
                  </button>
                  <button
                    onClick={() => setSpecViewMode('grid')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      specViewMode === 'grid'
                        ? 'bg-[#ff5c20] text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>Daftar Modul</span>
                  </button>
                </div>

                <button
                  onClick={handleGeneratePRDAndTasks}
                  disabled={loadingFinalPipeline}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5c20] to-[#e04f18] hover:opacity-95 text-white text-xs font-bold transition-all shadow-lg shadow-[#ff5c20]/25 cursor-pointer disabled:opacity-50"
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

            {/* Spec Content: Interactive FlowMap Canvas */}
            {loadingSpec ? (
              <div className="py-24 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-[#ff5c20] animate-spin mx-auto" />
                <p className="text-sm font-semibold text-zinc-200">Menganalisis pohon modul fitur...</p>
                <p className="text-xs text-zinc-500">Membangun hierarki modul inti dan relasi arsitektur sistem.</p>
              </div>
            ) : (
              <FlowMap 
                title={title} 
                features={features} 
                idea={idea}
                viewMode={specViewMode}
                onViewModeChange={setSpecViewMode}
                onContinue={handleGeneratePRDAndTasks} 
              />
            )}
          </div>
        )}


        {/* ================================================================= */}
        {/* TAHAP 3: DOKUMEN PRD + TASK PIPELINE (Siap Eksekusi Coding Agent)  */}
        {/* ================================================================= */}
        {step === 3 && (
          <div className="flex flex-col space-y-5 animate-in fade-in duration-300">
            {/* Stage Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3.5 border-b border-[#27272a]">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#ff5c20] font-bold">Tahap 3: Dokumen PRD + Task</span>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">{title || 'Spesifikasi & Pipeline Task'}</h2>
              </div>

              {/* Subtabs Switcher & Agent Bridge Button */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="inline-flex p-1 bg-[#121215] border border-[#27272a] rounded-xl shadow-inner">
                  <button
                    onClick={() => setStep3SubTab('prd')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      step3SubTab === 'prd' ? 'bg-[#ff5c20] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Dokumen PRD</span>
                  </button>
                  <button
                    onClick={() => setStep3SubTab('tasks')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      step3SubTab === 'tasks' ? 'bg-[#ff5c20] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Task Pipeline ({tasks.length})</span>
                  </button>
                </div>

                <button
                  onClick={() => setShowAgentPrompt(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff5c20] to-[#e04f18] text-white text-xs font-bold transition-all shadow-md shadow-[#ff5c20]/25 cursor-pointer"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Hubungkan AI Agent</span>
                </button>
              </div>
            </div>

            {/* Sub-tab 1: DOKUMEN PRD WITH MERMAID & OUTLINE */}
            {step3SubTab === 'prd' && (
              <div className="w-full">
                {loadingFinalPipeline ? (
                  <div className="py-24 text-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-[#ff5c20] animate-spin mx-auto" />
                    <p className="text-sm font-semibold text-zinc-200">Menyusun dokumen PRD lengkap...</p>
                    <p className="text-xs text-zinc-500">Menganalisis DDL database, arsitektur modul, dan spesifikasi API.</p>
                  </div>
                ) : (
                  <PrdPreview
                    title={title}
                    content={prdMarkdown}
                    onRevise={(inst) => handleRevisePRD(inst)}
                    revising={revisingPrd}
                    onConnectAgent={() => setShowAgentPrompt(true)}
                  />
                )}
              </div>
            )}

            {/* Sub-tab 2: TASK KANBAN & TABLE PIPELINE */}
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

      {/* Google Login Required Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#121215] border border-[#27272a] rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <img 
              src="/logo.png" 
              alt="VibeDev Logo" 
              className="w-14 h-14 mx-auto object-contain shadow-lg shadow-[#ff5c20]/25 rounded-xl"
            />

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Masuk dengan Akun Google</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Untuk mengamankan kuota AI dan mencegah bot, silakan login dengan Google. Setiap akun mendapatkan <strong>5x kuota generator gratis</strong> untuk PRD, Flow Map, dan Task Pipeline.
              </p>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-bold shadow-lg transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Lanjutkan dengan Google</span>
            </button>

            <p className="text-[10px] text-zinc-500">
              100% Gratis • Tanpa Kartu Kredit • Langsung Pakai
            </p>
          </div>
        </div>
      )}

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
