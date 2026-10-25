import React, { useState, useEffect } from 'react';
import { 
  Sparkles, ArrowRight, CheckCircle2, Copy, Check, 
  Terminal, Layers, ArrowLeft, RefreshCw, LogOut, Code2, 
  HelpCircle
} from 'lucide-react';
import { marked } from 'marked';
import { VibeJourney } from './components/VibeJourney';

interface Question {
  id: string;
  question: string;
  type: string;
  options?: string[];
}

interface Feature {
  id: string;
  name: string;
  summary: string;
  icon?: string;
  priority?: string;
  phase?: string;
}

interface SubFeature {
  id: string;
  featureId: string;
  name: string;
  summary: string;
  priority?: string;
  state?: string;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState<number>(1); // 1: Landing/Ide, 2: Kuesioner, 3: Roadmap/Fitur, 4: PRD
  const [idea, setIdea] = useState<string>('');
  const [planId, setPlanId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  
  // Tech stack choices (like ngodingpakeai)
  const [frontendTech, setFrontendTech] = useState<string>('Next.js / React (TypeScript)');
  const [backendTech, setBackendTech] = useState<string>('FastAPI / Python');
  const [databaseTech, setDatabaseTech] = useState<string>('PostgreSQL + Prisma / SQLAlchemy');

  // Questionnaire state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false);

  // Roadmap state
  const [features, setFeatures] = useState<Feature[]>([]);
  const [subFeatures, setSubFeatures] = useState<SubFeature[]>([]);
  const [loadingRoadmap, setLoadingRoadmap] = useState<boolean>(false);

  // PRD state
  const [prdMarkdown, setPrdMarkdown] = useState<string>('');
  const [loadingPrd, setLoadingPrd] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Check Auth Session
  useEffect(() => {
    fetch('/api/auth/get-session')
      .then(r => r.json())
      .then(data => {
        if (data && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch('/api/auth/sign-in/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'google', callbackURL: window.location.pathname })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      alert('Gagal menginisialisasi login Google');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' });
    setUser(null);
  };

  // Step 1: Submit Idea
  const handleStartIdea = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!idea.trim()) return;

    setLoadingQuestions(true);
    setStep(2);

    try {
      const pRes = await fetch('/api/plan/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          idea, 
          language: 'id',
          techStack: { frontend: frontendTech, backend: backendTech, database: databaseTech }
        })
      });
      const pData = await pRes.json();
      const newPlanId = pData.planId;
      setPlanId(newPlanId);
      setTitle(pData.plan?.title || idea);

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

  // Step 2: Submit Answers & Generate Roadmap
  const handleGenerateRoadmap = async () => {
    setLoadingRoadmap(true);
    setStep(3);

    try {
      await fetch(`/api/plan/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionAnswers: answers })
      });

      const rRes = await fetch('/api/plan/roadmap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });
      const rData = await rRes.json();
      setTitle(rData.title || title);
      setFeatures(rData.features || []);
      setSubFeatures(rData.subFeatures || []);
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan menyusun roadmap fitur.');
    } finally {
      setLoadingRoadmap(false);
    }
  };

  // Step 3: Generate Final PRD
  const handleGeneratePRD = async () => {
    setLoadingPrd(true);
    setStep(4);

    try {
      const res = await fetch('/api/plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });
      const data = await res.json();
      setPrdMarkdown(data.content || '');
    } catch (err) {
      console.error(err);
      alert('Gagal membuat dokumen PRD.');
    } finally {
      setLoadingPrd(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(prdMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-[#fafafa] selection:bg-[#ff5c20]/30 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#27272a] bg-[#09090b]/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setStep(1)}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#ff5c20] to-[#ff8452] flex items-center justify-center font-black text-white text-lg shadow-lg shadow-[#ff5c20]/20">
            V
          </div>
          <span className="font-bold tracking-tight text-lg text-white font-mono">
            VibeDev <span className="text-[#ff5c20]">AI</span>
          </span>
        </div>

        {/* Auth / Profile Area */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#121215] border border-[#27272a] px-3 py-1.5 rounded-full text-xs">
                {user.image ? (
                  <img src={user.image} alt={user.name} className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#ff5c20] text-[10px] flex items-center justify-center font-bold">
                    {user.name?.[0] || 'U'}
                  </div>
                )}
                <span className="font-medium text-zinc-200">{user.name}</span>
                <span className="bg-[#ff5c20]/20 text-[#ff5c20] text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">PRO</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-1.5 rounded-lg border border-[#27272a] hover:bg-[#27272a] text-[#a1a1aa] hover:text-white transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleLogin}
              className="flex items-center gap-2 bg-[#18181b] hover:bg-[#27272a] text-zinc-200 hover:text-white border border-[#27272a] text-xs font-medium px-3.5 py-1.5 rounded-lg transition-all"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Masuk
            </button>
          )}
        </div>
      </header>

      {/* Stepper Progress Bar */}
      {step > 1 && <VibeJourney currentStep={step} />}

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-center max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8">
        
        {/* STEP 1: LANDING & PROMPT INPUT */}
        {step === 1 && (
          <div className="flex flex-col items-center text-center my-auto py-10 animate-in fade-in zoom-in-95 duration-500">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#ff5c20]/30 bg-[#ff5c20]/10 text-[#ff5c20] text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Generator PRD Standar AI Coding Agent (Cursor, Claude Code, Windsurf)
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-3xl leading-[1.15] mb-5">
              Dari Ide Jadi Dokumen <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff5c20] to-[#ff946b]">PRD & Arsitektur</span> Siap Pakai.
            </h1>

            <p className="text-base sm:text-lg text-[#a1a1aa] max-w-2xl mb-10">
              Buat spesifikasi teknis, skema database, roadmap fitur, dan task execution loop untuk AI Coding Agent dalam hitungan detik.
            </p>

            {/* Input Form */}
            <form onSubmit={handleStartIdea} className="w-full max-w-2xl relative group">
              <div className="relative flex items-center rounded-2xl border-2 border-[#27272a] bg-[#121215] focus-within:border-[#ff5c20] shadow-2xl transition-all p-2">
                <input
                  type="text"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="Ceritakan ide aplikasimu... (contoh: Aplikasi split-bill otomatis via WhatsApp)"
                  className="w-full bg-transparent px-4 py-3 text-sm sm:text-base outline-none text-white placeholder:text-zinc-600"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!idea.trim()}
                  className="shrink-0 bg-[#ff5c20] hover:bg-[#e04f18] disabled:opacity-40 text-white font-medium p-3 rounded-xl transition-all flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shadow-md shadow-[#ff5c20]/20"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>

            {/* Tech Stack Customizer */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-400">
              <span className="text-zinc-500 font-medium">Tech Stack Target:</span>
              <select 
                value={frontendTech} 
                onChange={e => setFrontendTech(e.target.value)}
                className="bg-[#18181b] border border-[#27272a] rounded px-2.5 py-1 text-zinc-300 outline-none"
              >
                <option value="Next.js / React (TypeScript)">Frontend: Next.js (TS)</option>
                <option value="Vite + React (Tailwind)">Frontend: Vite + React</option>
                <option value="Vue 3 + Nuxt">Frontend: Nuxt 3</option>
              </select>
              <select 
                value={backendTech} 
                onChange={e => setBackendTech(e.target.value)}
                className="bg-[#18181b] border border-[#27272a] rounded px-2.5 py-1 text-zinc-300 outline-none"
              >
                <option value="FastAPI / Python">Backend: FastAPI (Python)</option>
                <option value="Node.js / Express">Backend: Node.js (Express)</option>
                <option value="Go / Gin">Backend: Go (Gin)</option>
              </select>
              <select 
                value={databaseTech} 
                onChange={e => setDatabaseTech(e.target.value)}
                className="bg-[#18181b] border border-[#27272a] rounded px-2.5 py-1 text-zinc-300 outline-none"
              >
                <option value="PostgreSQL + Prisma">Database: PostgreSQL</option>
                <option value="MongoDB + Mongoose">Database: MongoDB</option>
                <option value="SQLite / Supabase">Database: Supabase</option>
              </select>
            </div>

            {/* Example Ideas */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 max-w-2xl">
              <span className="text-xs text-zinc-600">Coba ide:</span>
              {[
                'Aplikasi absensi karyawan GPS & selfie anti fake-location',
                'SaaS generator invoice & tracking status bayar via WhatsApp',
                'Marketplace sewa alat outdoor & camping peer-to-peer'
              ].map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => setIdea(sample)}
                  className="text-xs bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-white px-3 py-1.5 rounded-full border border-[#27272a] transition-all"
                >
                  {sample}
                </button>
              ))}
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 w-full text-left">
              <div className="p-5 rounded-xl border border-[#27272a] bg-[#121215]/50">
                <Terminal className="w-5 h-5 text-[#ff5c20] mb-3" />
                <h3 className="font-semibold text-sm mb-1 text-zinc-200">Kuesioner Teknis AI</h3>
                <p className="text-xs text-[#a1a1aa] leading-relaxed">AI menanyakan detail arsitektur, autentikasi, dan target kapasitas untuk menghasilkan spec presisi.</p>
              </div>
              <div className="p-5 rounded-xl border border-[#27272a] bg-[#121215]/50">
                <Layers className="w-5 h-5 text-[#ff5c20] mb-3" />
                <h3 className="font-semibold text-sm mb-1 text-zinc-200">Pohon Fitur & Roadmap</h3>
                <p className="text-xs text-[#a1a1aa] leading-relaxed">Pecah ide aplikasi menjadi modul fitur inti, sub-fitur modular, dan prioritas implementasi.</p>
              </div>
              <div className="p-5 rounded-xl border border-[#27272a] bg-[#121215]/50">
                <Code2 className="w-5 h-5 text-[#ff5c20] mb-3" />
                <h3 className="font-semibold text-sm mb-1 text-zinc-200">Ekspor PRD & DDL DB</h3>
                <p className="text-xs text-[#a1a1aa] leading-relaxed">Langsung menghasilkan file PRD Markdown lengkap dengan skema relasi database Postgres/Prisma.</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: QUESTIONNAIRE */}
        {step === 2 && (
          <div className="w-full max-w-2xl mx-auto py-4 animate-in fade-in duration-300">
            <button 
              onClick={() => setStep(1)} 
              className="inline-flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Ganti Ide
            </button>

            <div className="mb-6">
              <span className="text-xs font-mono text-[#ff5c20] font-semibold tracking-wider uppercase">Spesifikasi Kebutuhan</span>
              <h2 className="text-2xl font-bold mt-1 text-white">Pertanyaan Teknis Kunci</h2>
              <p className="text-xs sm:text-sm text-[#a1a1aa] mt-1">Ide: <span className="text-zinc-200 font-medium">"{idea}"</span></p>
            </div>

            {loadingQuestions ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 bg-[#121215] border border-[#27272a] rounded-2xl">
                <RefreshCw className="w-8 h-8 text-[#ff5c20] animate-spin" />
                <p className="text-sm text-zinc-300 font-medium">Model 9router VibeDev sedang menganalisis ide...</p>
                <p className="text-xs text-[#a1a1aa]">Menyusun daftar pertanyaan kuesioner terpenting untuk sistem ini.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {questions.map((q, idx) => (
                  <div key={q.id || idx} className="p-5 rounded-xl border border-[#27272a] bg-[#121215]">
                    <div className="flex items-center gap-2 mb-3">
                      <HelpCircle className="w-4 h-4 text-[#ff5c20]" />
                      <label className="text-sm font-semibold text-zinc-200">
                        {idx + 1}. {q.question}
                      </label>
                    </div>

                    {q.options && q.options.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                            className={`p-3 rounded-lg border text-left text-xs sm:text-sm transition-all flex items-center justify-between ${
                              answers[q.id] === opt 
                                ? 'border-[#ff5c20] bg-[#ff5c20]/10 text-white font-medium' 
                                : 'border-[#27272a] bg-[#18181b] text-[#a1a1aa] hover:border-zinc-700'
                            }`}
                          >
                            <span>{opt}</span>
                            {answers[q.id] === opt && <Check className="w-4 h-4 text-[#ff5c20]" />}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder="Ketik jawabanmu..."
                        className="w-full bg-[#18181b] border border-[#27272a] focus:border-[#ff5c20] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none"
                      />
                    )}
                  </div>
                ))}

                <button
                  onClick={handleGenerateRoadmap}
                  className="w-full bg-[#ff5c20] hover:bg-[#e04f18] text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#ff5c20]/20"
                >
                  Lanjut ke Pohon Fitur & Roadmap <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: ROADMAP / FEATURE TREE */}
        {step === 3 && (
          <div className="w-full max-w-3xl mx-auto py-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs font-mono text-[#ff5c20] font-semibold tracking-wider uppercase">Pohon Fitur Produk</span>
                <h2 className="text-2xl font-bold mt-1 text-white">{title || 'Arsitektur Fitur'}</h2>
                <p className="text-xs sm:text-sm text-[#a1a1aa] mt-0.5">Daftar modul fitur utama dan sub-fitur modular</p>
              </div>
              <button 
                onClick={() => setStep(2)} 
                className="text-xs border border-[#27272a] bg-[#18181b] hover:bg-[#27272a] px-3 py-1.5 rounded-lg text-[#a1a1aa] hover:text-white transition-colors"
              >
                Ubah Jawaban
              </button>
            </div>

            {loadingRoadmap ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 bg-[#121215] border border-[#27272a] rounded-2xl">
                <RefreshCw className="w-8 h-8 text-[#ff5c20] animate-spin" />
                <p className="text-sm text-zinc-300 font-medium">Principal Architect AI sedang memecah pohon fitur...</p>
                <p className="text-xs text-[#a1a1aa]">Mengelompokkan sub-fitur, dependensi, dan prioritas sprint.</p>
              </div>
            ) : (
              <div className="space-y-4 mb-8">
                {features.map((feat) => {
                  const subs = subFeatures.filter(s => s.featureId === feat.id);
                  return (
                    <div key={feat.id} className="border border-[#27272a] bg-[#121215] rounded-xl p-5 hover:border-zinc-700 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#ff5c20]/10 border border-[#ff5c20]/20 flex items-center justify-center text-[#ff5c20]">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-base text-zinc-100">{feat.name}</h3>
                            <p className="text-xs text-[#a1a1aa] mt-0.5">{feat.summary}</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase">
                          {feat.priority || 'high'}
                        </span>
                      </div>

                      {/* Subfeatures */}
                      {subs.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-[#27272a]/60 pl-4 space-y-2.5">
                          {subs.map(sub => (
                            <div key={sub.id} className="flex items-start gap-2.5 text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#ff5c20] shrink-0 mt-0.5" />
                              <div>
                                <span className="font-medium text-zinc-200">{sub.name}</span>
                                <span className="text-[#a1a1aa] ml-2">— {sub.summary}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  onClick={handleGeneratePRD}
                  className="w-full bg-[#ff5c20] hover:bg-[#e04f18] text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#ff5c20]/20 mt-6"
                >
                  Generate Dokumen PRD Lengkap <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: FINAL PRD VIEWER */}
        {step === 4 && (
          <div className="w-full max-w-4xl mx-auto py-4 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-mono text-[#ff5c20] font-semibold tracking-wider uppercase">PRD & Engineering Spec</span>
                <h2 className="text-2xl font-bold mt-1 text-white">Product Requirement Document</h2>
                <p className="text-xs sm:text-sm text-[#a1a1aa]">Dokumen siap tempel langsung ke AI coding agent.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  disabled={loadingPrd}
                  className="flex items-center gap-1.5 bg-[#ff5c20] hover:bg-[#e04f18] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-md shadow-[#ff5c20]/20"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Tersalin ke Clipboard!' : 'Salin Semua PRD'}
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs border border-[#27272a] bg-[#18181b] hover:bg-[#27272a] px-3.5 py-2 rounded-lg text-[#a1a1aa] hover:text-white transition-colors"
                >
                  Buat Plan Baru
                </button>
              </div>
            </div>

            {loadingPrd ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 bg-[#121215] border border-[#27272a] rounded-2xl">
                <RefreshCw className="w-8 h-8 text-[#ff5c20] animate-spin" />
                <p className="text-sm text-zinc-300 font-medium">Menyusun dokumen PRD teknis lengkap...</p>
                <p className="text-xs text-[#a1a1aa]">Menuliskan executive summary, API contract, skema database, dan checklist implementasi.</p>
              </div>
            ) : (
              <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-6 sm:p-8 text-zinc-200">
                <div 
                  className="prose prose-invert max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h2:border-b prose-h2:border-zinc-800 prose-h2:pb-2 prose-h3:text-lg prose-pre:bg-[#18181b] prose-pre:border prose-pre:border-[#27272a] prose-code:text-[#ff946b]"
                  dangerouslySetInnerHTML={{ __html: marked.parse(prdMarkdown) as string }}
                />
              </div>
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-[#27272a] py-4 text-center text-xs text-[#a1a1aa]">
        VibeDev AI — Designed by Apew &amp; Stellochron • RafllyLabs Homelab Engine
      </footer>
    </div>
  );
}
