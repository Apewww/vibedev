#!/usr/bin/env node

/**
 * VibeDev CLI & Autonomous Coding Agent Runner
 * Zero-dependency realtime task telemetry for Cursor, Windsurf, Claude Code, Antigravity.
 *
 * Usage:
 *   npx github:Apewww/vibedev init <planId>
 *   npx github:Apewww/vibedev next
 *   npx github:Apewww/vibedev start <taskId>
 *   npx github:Apewww/vibedev done <taskId>
 *   npx github:Apewww/vibedev status
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_BASE_URL = 'https://vibedev.raflylabs.com';
const CONFIG_FILE = '.vibedev.json';

// Find or read .vibedev.json
function loadConfig() {
  let curr = process.cwd();
  while (curr) {
    const configPath = path.join(curr, CONFIG_FILE);
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf8');
        return { ...JSON.parse(raw), configDir: curr };
      } catch (e) {}
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return null;
}

// Save .vibedev.json
function saveConfig(planId, apiUrl = DEFAULT_BASE_URL) {
  const configPath = path.join(process.cwd(), CONFIG_FILE);
  const data = {
    planId: planId.trim(),
    apiUrl: (apiUrl || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
  return data;
}

// Resolve Plan ID from args or config
function resolvePlanId(passedId, config) {
  if (passedId && passedId !== 'null' && passedId !== 'undefined') {
    return passedId.trim();
  }
  if (config && config.planId) {
    return config.planId.trim();
  }
  return null;
}

// Fetch helper with error handling
async function apiRequest(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`❌ VibeDev API Error: ${err.message}`);
    process.exit(1);
  }
}

// Print colored banner
function printBanner() {
  console.log(`
\x1b[38;2;255;92;32m   __   ___ __          ____            \x1b[0m
\x1b[38;2;255;92;32m   \\ \\ / (_) /  ___ ___/ / /____ __     \x1b[0m
\x1b[38;2;255;92;32m    \\ V / / _ \\/ -_) _  / __/ -_) \\ /     \x1b[0m
\x1b[38;2;255;92;32m     \\_/ /_/_.__/\\__/\\_,_/\\__/\\__/\\_\\     \x1b[0m
\x1b[90m   Live Agent Telemetry & Autonomous Task Pipeline\x1b[0m
`);
}

// Print help
function printHelp() {
  printBanner();
  console.log(`\x1b[1mPerintah yang Tersedia:\x1b[0m

  \x1b[36minit <planId> [apiUrl]\x1b[0m
    Inisialisasi proyek di folder ini, download PRD.md & simpan .vibedev.json.
    Contoh: \x1b[33mnpx github:Apewww/vibedev init a8afa2f5\x1b[0m

  \x1b[36mnext [planId]\x1b[0m
    Ambil task fokus berikutnya (format JSON untuk AI Coding Agent).
    Contoh: \x1b[33mnpx github:Apewww/vibedev next\x1b[0m

  \x1b[36mstart <taskId> [planId]\x1b[0m
    Tandai task sedang dikerjakan (otomatis live update status di dashboard VibeDev).
    Contoh: \x1b[33mnpx github:Apewww/vibedev start task-01\x1b[0m

  \x1b[36mdone <taskId> [planId]\x1b[0m (alias: \x1b[36mcomplete\x1b[0m)
    Tandai task selesai (otomatis live update status ke DONE di VibeDev).
    Contoh: \x1b[33mnpx github:Apewww/vibedev done task-01\x1b[0m

  \x1b[36mstatus [planId]\x1b[0m (alias: \x1b[36mlist\x1b[0m)
    Tampilkan tabel ringkasan progres seluruh task pipeline.
    Contoh: \x1b[33mnpx github:Apewww/vibedev status\x1b[0m

  \x1b[36mprd [planId]\x1b[0m
    Download atau segarkan file PRD.md lokal dari VibeDev.
    Contoh: \x1b[33mnpx github:Apewww/vibedev prd\x1b[0m

  \x1b[36mprompt [planId]\x1b[0m
    Cetak prompt AI Coding Agent siap salin untuk Cursor / Claude Code.
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = (args[0] || '').toLowerCase();
  const config = loadConfig();

  // Handle direct plan ID shortcut: "npx vibedev a8afa2f5" -> treated as "init a8afa2f5"
  if (command && !['init', 'next', 'start', 'done', 'complete', 'status', 'list', 'prd', 'prompt', 'help', '--help', '-h'].includes(command) && /^[a-f0-9]{8}$/i.test(command)) {
    return handleInit(command, args[1]);
  }

  switch (command) {
    case 'init':
      await handleInit(args[1], args[2]);
      break;

    case 'next':
      await handleNext(args[1], config);
      break;

    case 'start':
      await handleStart(args[1], args[2], config);
      break;

    case 'done':
    case 'complete':
      await handleComplete(args[1], args[2], config);
      break;

    case 'status':
    case 'list':
      await handleStatus(args[1], config);
      break;

    case 'prd':
      await handlePrd(args[1], config);
      break;

    case 'prompt':
      handlePrompt(args[1], config);
      break;

    case 'help':
    case '--help':
    case '-h':
    case '':
      printHelp();
      break;

    default:
      console.error(`\x1b[31mPerintah tidak dikenal: ${command}\x1b[0m`);
      printHelp();
      process.exit(1);
  }
}

// 1. INIT COMMAND
async function handleInit(passedPlanId, passedUrl) {
  if (!passedPlanId) {
    console.error(`\x1b[31mError: Plan ID wajib disertakan!\x1b[0m`);
    console.log(`Contoh: \x1b[33mnpx github:Apewww/vibedev init a8afa2f5\x1b[0m\n`);
    process.exit(1);
  }

  printBanner();
  const baseUrl = (passedUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  console.log(`📡 Menghubungkan ke VibeDev API: \x1b[36m${baseUrl}\x1b[0m...`);

  const data = await apiRequest(`${baseUrl}/api/plan/${passedPlanId}`);
  const plan = data.plan || data;

  if (!plan) {
    console.error(`\x1b[31mPlan "${passedPlanId}" tidak ditemukan di VibeDev.\x1b[0m`);
    process.exit(1);
  }

  // Save config
  saveConfig(passedPlanId, baseUrl);
  console.log(`💾 Konfigurasi disimpan ke: \x1b[32m.vibedev.json\x1b[0m`);

  // Save PRD.md
  if (plan.generatedPrd) {
    const prdPath = path.join(process.cwd(), 'PRD.md');
    fs.writeFileSync(prdPath, plan.generatedPrd, 'utf8');
    console.log(`📄 Dokumen PRD disimpan ke: \x1b[32mPRD.md\x1b[0m (${plan.generatedPrd.length} karakter)`);
  }

  const tasks = plan.tasks || [];
  console.log(`📋 Total Task Pipeline: \x1b[33m${tasks.length} task\x1b[0m`);

  console.log(`
\x1b[32m✔ Proyek "${plan.title || passedPlanId}" berhasil dihubungkan ke VibeDev!\x1b[0m
AI Coding Agent Anda sekarang dapat menjalankan:
  • \x1b[36mnpx github:Apewww/vibedev next\x1b[0m          (Ambil task pertama)
  • \x1b[36mnpx github:Apewww/vibedev start <id>\x1b[0m     (Mulai pengerjaan)
  • \x1b[36mnpx github:Apewww/vibedev done <id>\x1b[0m      (Tandai selesai)
`);
}

// 2. NEXT TASK COMMAND
async function handleNext(passedPlanId, config) {
  const planId = resolvePlanId(passedPlanId, config);
  if (!planId) {
    console.error(`\x1b[31mError: Plan ID tidak ditemukan! Jalankan 'init <planId>' terlebih dahulu atau berikan argumen planId.\x1b[0m`);
    process.exit(1);
  }

  const baseUrl = (config?.apiUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const data = await apiRequest(`${baseUrl}/api/plan/${planId}/tasks/next`);

  // Output raw JSON so coding agent can read directly via stdin/stdout
  console.log(JSON.stringify(data, null, 2));
}

// 3. START TASK COMMAND
async function handleStart(taskId, passedPlanId, config) {
  if (!taskId) {
    console.error(`\x1b[31mError: Task ID wajib disertakan!\x1b[0m`);
    console.log(`Contoh: \x1b[33mnpx github:Apewww/vibedev start t1\x1b[0m`);
    process.exit(1);
  }

  const planId = resolvePlanId(passedPlanId, config);
  if (!planId) {
    console.error(`\x1b[31mError: Plan ID tidak ditemukan! Jalankan 'init <planId>' terlebih dahulu.\x1b[0m`);
    process.exit(1);
  }

  const baseUrl = (config?.apiUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const res = await apiRequest(`${baseUrl}/api/plan/${planId}/tasks/${taskId}/start`, {
    method: 'POST'
  });

  if (res.success) {
    console.log(`\x1b[32m✔ Task [${taskId}] ditandai sebagai IN_PROGRESS di VibeDev Live Telemetry.\x1b[0m`);
  } else {
    console.log(JSON.stringify(res));
  }
}

// 4. COMPLETE TASK COMMAND
async function handleComplete(taskId, passedPlanId, config) {
  if (!taskId) {
    console.error(`\x1b[31mError: Task ID wajib disertakan!\x1b[0m`);
    console.log(`Contoh: \x1b[33mnpx github:Apewww/vibedev done t1\x1b[0m`);
    process.exit(1);
  }

  const planId = resolvePlanId(passedPlanId, config);
  if (!planId) {
    console.error(`\x1b[31mError: Plan ID tidak ditemukan! Jalankan 'init <planId>' terlebih dahulu.\x1b[0m`);
    process.exit(1);
  }

  const baseUrl = (config?.apiUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const res = await apiRequest(`${baseUrl}/api/plan/${planId}/tasks/${taskId}/complete`, {
    method: 'POST'
  });

  if (res.success) {
    console.log(`\x1b[32m✔ Task [${taskId}] ditandai sebagai DONE di VibeDev Live Telemetry.\x1b[0m`);
  } else {
    console.log(JSON.stringify(res));
  }
}

// 5. STATUS COMMAND
async function handleStatus(passedPlanId, config) {
  const planId = resolvePlanId(passedPlanId, config);
  if (!planId) {
    console.error(`\x1b[31mError: Plan ID tidak ditemukan!\x1b[0m`);
    process.exit(1);
  }

  const baseUrl = (config?.apiUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const data = await apiRequest(`${baseUrl}/api/plan/${planId}/tasks`);
  const tasks = data.tasks || [];

  printBanner();
  console.log(`\x1b[1mProgres Task Pipeline (Plan ID: ${planId})\x1b[0m\n`);

  tasks.forEach((t, i) => {
    let statusBadge = '\x1b[90m[TODO]\x1b[0m';
    if (t.status === 'in_progress') statusBadge = '\x1b[33m[IN PROGRESS]\x1b[0m';
    if (t.status === 'done') statusBadge = '\x1b[32m[DONE]\x1b[0m';

    console.log(`  ${(i + 1).toString().padStart(2, ' ')}. ${statusBadge.padEnd(20, ' ')} \x1b[1m${t.id}\x1b[0m: ${t.title}`);
  });

  const doneCount = tasks.filter(t => t.status === 'done').length;
  console.log(`\nProgres: \x1b[32m${doneCount}\x1b[0m / \x1b[33m${tasks.length}\x1b[0m selesai (${Math.round((doneCount / (tasks.length || 1)) * 100)}%)\n`);
}

// 6. PRD COMMAND
async function handlePrd(passedPlanId, config) {
  const planId = resolvePlanId(passedPlanId, config);
  if (!planId) {
    console.error(`\x1b[31mError: Plan ID tidak ditemukan!\x1b[0m`);
    process.exit(1);
  }

  const baseUrl = (config?.apiUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const data = await apiRequest(`${baseUrl}/api/plan/${planId}`);
  const prd = data.plan?.generatedPrd || data.generatedPrd || '';

  if (!prd) {
    console.error(`\x1b[31mDokumen PRD belum dibuat untuk Plan ID ini.\x1b[0m`);
    process.exit(1);
  }

  const prdPath = path.join(process.cwd(), 'PRD.md');
  fs.writeFileSync(prdPath, prd, 'utf8');
  console.log(`\x1b[32m✔ File PRD.md berhasil diperbarui (${prd.length} karakter).\x1b[0m`);
}

// 7. PROMPT COMMAND
function handlePrompt(passedPlanId, config) {
  const planId = resolvePlanId(passedPlanId, config) || '<PLAN_ID>';
  console.log(`
Kamu adalah Senior Fullstack Software Engineer otonom. Kamu akan mengerjakan proyek ini secara tuntas dan mandiri dengan panduan PRD dan Task dari VibeDev AI.

Inisialisasi telemetry:
npx github:Apewww/vibedev init ${planId}

Ikuti loop pengerjaan ini sampai selesai 100%:
1. Jalankan perintah ini di terminal untuk mengambil task fokus berikutnya:
   TASK_DATA=$(npx github:Apewww/vibedev next)
   (Jika "done": true, hentikan loop dan buat laporan final ke user bahwa semua fitur selesai).

2. Catat ID Task yang didapat, lalu tandai kamu mulai mengerjakannya:
   npx github:Apewww/vibedev start <TASK_ID>

3. Implementasikan kode yang diminta oleh task tersebut di file proyek lokal ini.

4. Jalankan validasi/test/build lokal untuk memastikan tidak ada bug atau error.

5. Setelah kode berhasil bekerja, tandai task selesai:
   npx github:Apewww/vibedev done <TASK_ID>

6. Ulangi kembali ke langkah 1 untuk task selanjutnya.
`);
}

main().catch(err => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
