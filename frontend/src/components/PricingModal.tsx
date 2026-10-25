import React, { useState } from 'react';
import { X, Check, Sparkles, Tag, ShieldCheck, Zap } from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeSuccess?: (planType: string) => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onUpgradeSuccess }) => {
  const [billingCycle, setBillingCycle] = useState<'1bulan' | '3bulan' | 'tahunan'>('1bulan');
  const [voucherCode, setVoucherCode] = useState<string>('');
  const [voucherApplied, setVoucherApplied] = useState<boolean>(false);
  const [voucherDiscount, setVoucherDiscount] = useState<number>(0);
  const [upgrading, setUpgrading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleUpgrade = async (planType: 'pro' | 'bundle') => {
    try {
      setUpgrading(true);
      const res = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType })
      });
      if (res.ok) {
        if (onUpgradeSuccess) onUpgradeSuccess(planType);
        onClose();
      }
    } catch (e) {
      console.error('Upgrade error:', e);
    } finally {
      setUpgrading(false);
    }
  };

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (voucherCode.trim().toUpperCase() === 'VIBEDEV20' || voucherCode.trim().toUpperCase() === 'FEEDBACK20') {
      setVoucherApplied(true);
      setVoucherDiscount(20);
    } else {
      alert('Voucher tidak valid. Coba gunakan: VIBEDEV20');
    }
  };

  const calculatePrice = (base: number) => {
    let p = base;
    if (billingCycle === '3bulan') p = p * 0.85;
    if (billingCycle === 'tahunan') p = p * 0.70;
    if (voucherApplied) p = p * ((100 - voucherDiscount) / 100);
    return Math.floor(p);
  };

  const proPrice = calculatePrice(149000);
  const bundlePrice = calculatePrice(199000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#121215] border border-[#27272a] rounded-2xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-500 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Promo Eksklusif Launching VibeDev
          </div>
          <h2 className="text-3xl font-extrabold text-white">Pilih Paket Eksekusi AI Coding</h2>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto">
            Optimalkan proses coding dengan PRD presisi industri, flow map modular, dan checkpoint agent anti boros token.
          </p>

          {/* Billing Cycle Tabs */}
          <div className="inline-flex p-1 bg-[#18181b] border border-[#27272a] rounded-xl mt-4">
            {(['1bulan', '3bulan', 'tahunan'] as const).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  billingCycle === cycle 
                    ? 'bg-[#ff5c20] text-white shadow-md' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {cycle === '1bulan' && '1 Bulan'}
                {cycle === '3bulan' && '3 Bulan (15% OFF)'}
                {cycle === 'tahunan' && '1 Tahun (30% OFF)'}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {/* FREE TIER */}
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Starter</span>
              <h3 className="text-xl font-bold text-white mt-1">Free</h3>
              <div className="my-4">
                <span className="text-3xl font-black text-white">Rp 0</span>
                <span className="text-xs text-zinc-500"> / selamanya</span>
              </div>
              <p className="text-xs text-zinc-400 mb-6">Cocok untuk eksplorasi ide dasar dan mencoba vibe coding.</p>
              
              <ul className="space-y-2.5 text-xs text-zinc-300">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> 3 PRD Generator / bulan</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Akses 5 Kuesioner Teknis</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Flow Map Modul Dasar</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Komunitas Discord VibeDev</li>
              </ul>
            </div>

            <button 
              onClick={onClose}
              className="mt-6 w-full py-2.5 rounded-lg border border-[#27272a] text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
            >
              Plan Saat Ini
            </button>
          </div>

          {/* PRO TIER (HIGHLIGHTED) */}
          <div className="relative rounded-xl border-2 border-[#ff5c20] bg-gradient-to-b from-[#ff5c20]/10 to-[#18181b] p-5 flex flex-col justify-between shadow-xl shadow-[#ff5c20]/10">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#ff5c20] text-white text-[10px] font-bold uppercase tracking-wider">
              Paling Populer
            </span>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#ff5c20] font-bold">Recommended</span>
              <h3 className="text-xl font-bold text-white mt-1">VibeDev Pro</h3>
              <div className="my-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">Rp {Math.floor(proPrice / 1000)}rb</span>
                  <span className="text-xs text-zinc-500 line-through">Rp 200rb</span>
                </div>
                <span className="text-xs text-zinc-400">/ bulan {voucherApplied && '(Voucher 20% Terpasang)'}</span>
              </div>
              <p className="text-xs text-zinc-300 mb-6">Untuk engineer &amp; solopreneur yang ingin agent coding fokus dan hemat token.</p>
              
              <ul className="space-y-2.5 text-xs text-zinc-200">
                <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-[#ff5c20] shrink-0" /> <strong>Unlimited</strong> PRD &amp; Flow Map</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#ff5c20] shrink-0" /> Agent Checkpoint Prompt Generator</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#ff5c20] shrink-0" /> Skema Database Lengkap (DDL/Prisma)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#ff5c20] shrink-0" /> Kontrak API &amp; Acceptance Criteria</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#ff5c20] shrink-0" /> Model AI Prioritas 9router Gateway</li>
              </ul>
            </div>

            <button 
              onClick={() => handleUpgrade('pro')}
              disabled={upgrading}
              className="mt-6 w-full py-2.5 rounded-lg bg-[#ff5c20] hover:bg-[#e04f18] text-white text-xs font-bold transition-all shadow-md shadow-[#ff5c20]/25 cursor-pointer disabled:opacity-50"
            >
              {upgrading ? 'Memproses Aktivasi...' : 'Langganan Pro Sekarang'}
            </button>
          </div>

          {/* BUNDLE TIER */}
          <div className="rounded-xl border border-purple-500/30 bg-[#18181b] p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-purple-400 font-semibold">Special Bundle</span>
              <h3 className="text-xl font-bold text-white mt-1">Pro + UI Bundle</h3>
              <div className="my-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">Rp {Math.floor(bundlePrice / 1000)}rb</span>
                  <span className="text-xs text-zinc-500 line-through">Rp 349rb</span>
                </div>
                <span className="text-xs text-zinc-400">/ 30 hari akses ganda</span>
              </div>
              <p className="text-xs text-zinc-400 mb-6">Paket komplit PRD + Prototyping Desain UI dalam satu harga hemat.</p>
              
              <ul className="space-y-2.5 text-xs text-zinc-300">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400 shrink-0" /> Semua Fitur VibeDev Pro</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400 shrink-0" /> Akses UI Mockup Generator 30 Hari</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400 shrink-0" /> 1-Click Codebase Starter Template</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-400 shrink-0" /> Channel Discord Private Coaching</li>
              </ul>
            </div>

            <button 
              onClick={() => handleUpgrade('bundle')}
              disabled={upgrading}
              className="mt-6 w-full py-2.5 rounded-lg border border-purple-500/50 hover:bg-purple-500/20 text-purple-300 hover:text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              {upgrading ? 'Memproses Aktivasi...' : 'Ambil Paket Bundle'}
            </button>
          </div>
        </div>

        {/* Voucher Form & Security guarantee */}
        <div className="pt-6 border-t border-[#27272a] flex flex-col sm:flex-row items-center justify-between gap-4">
          <form onSubmit={handleApplyVoucher} className="flex items-center gap-2 w-full sm:w-auto">
            <Tag className="w-4 h-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Kode Voucher (cth: VIBEDEV20)"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value)}
              className="bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-1.5 text-xs text-white uppercase outline-none focus:border-[#ff5c20]"
            />
            <button
              type="submit"
              className="bg-[#27272a] hover:bg-zinc-700 text-xs px-3 py-1.5 rounded-lg text-white font-medium transition-colors cursor-pointer"
            >
              Gunakan
            </button>
            {voucherApplied && <span className="text-xs text-emerald-400 font-medium">Aktif!</span>}
          </form>

          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Pembayaran Aman via Midtrans Snap (QRIS, VA, GoPay, Kartu Kredit)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
