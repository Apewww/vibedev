import os
import json
import uuid
import time
import requests
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
def load_env_file(filepath: str):
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and k not in os.environ:
                            os.environ[k] = v
        except Exception:
            pass

load_env_file(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
load_env_file("/var/www/.env")
load_env_file("/var/www/vibedev.env")

app = FastAPI(title="VibeDev Backend", description="PRD Generator API Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROUTER_URL = os.getenv("ROUTER_URL", "https://9router.raflylabs.com/v1/chat/completions")
ROUTER_KEY = os.getenv("ROUTER_KEY", "sk-135ab29b75e9590d-zxgcfe-1cf93bca")
ROUTER_MODEL = os.getenv("ROUTER_MODEL", "vibedev")

DB_FILE = os.getenv(
    "DB_FILE",
    "/var/www/vibedev_data.json" if os.path.exists("/var/www") else os.path.join(os.path.dirname(os.path.abspath(__file__)), "vibedev_data.json")
)

def load_db() -> dict:
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"plans": {}, "workspaces": {}, "users": {}, "sessions": {}}

def save_db(data: dict):
    os.makedirs(os.path.dirname(os.path.abspath(DB_FILE)), exist_ok=True)
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def call_llm(messages: list, response_json: bool = True) -> str:
    headers = {
        "Authorization": f"Bearer {ROUTER_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": ROUTER_MODEL,
        "messages": messages,
        "temperature": 0.4
    }
    if response_json:
        payload["response_format"] = {"type": "json_object"}
    
    res = requests.post(ROUTER_URL, headers=headers, json=payload, timeout=60)
    if not res.ok:
        raise HTTPException(status_code=500, detail=f"LLM Gateway Error: {res.text}")
    
    # 9router response handling (standard or SSE format)
    res.encoding = "utf-8"
    raw = res.text
    if raw.startswith("data:"):
        # Accumulate SSE chunks
        full_content = ""
        for line in raw.splitlines():
            line = line.strip()
            if line.startswith("data:") and not line.endswith("[DONE]"):
                data_str = line[5:].strip()
                try:
                    c_json = json.loads(data_str)
                    delta = c_json.get("choices", [{}])[0].get("delta", {})
                    full_content += delta.get("content", "")
                except Exception:
                    pass
        return full_content.strip()
    else:
        resp_json = res.json()
        return resp_json["choices"][0]["message"]["content"]

class PlanCreate(BaseModel):
    idea: str
    language: Optional[str] = "id"
    templateSlug: Optional[str] = None

class QuestionsRequest(BaseModel):
    planId: str

@app.get("/api/account/tokens")
async def list_tokens():
    return {"tokens": []}

@app.get("/api/workspaces")
async def list_workspaces():
    return {"workspaces": []}

@app.get("/api/auth/attribute-me")
async def attribute_me():
    return {"id": "user_local", "name": "Ivoni", "email": "ivoni@raflylabs.com", "role": "admin"}

MAX_CREDITS_PER_USER = 5

def check_user_credits(request: Request, db: dict, consume: bool = True) -> dict:
    token = request.cookies.get("better-auth.session_token")
    if not token:
        auth_hdr = request.headers.get("Authorization", "")
        if auth_hdr.startswith("Bearer "):
            token = auth_hdr[7:].strip()
    
    session = db.get("sessions", {}).get(token) if token else None
    if not session:
        raise HTTPException(
            status_code=401, 
            detail="Silakan login dengan Google terlebih dahulu untuk mendapatkan akses gratis (maksimal 5x request per akun)."
        )
    
    user = db.get("users", {}).get(session["userId"])
    if not user:
        raise HTTPException(status_code=401, detail="Sesi login tidak valid. Silakan login kembali.")
    
    is_admin = (user.get("email") or "").lower() == "apewinaja@gmail.com" or user.get("role") == "admin"
    credits_total = 999999 if is_admin else MAX_CREDITS_PER_USER
    credits_used = user.get("credits_used", 0)
    
    if not is_admin and credits_used >= credits_total:
        raise HTTPException(
            status_code=429,
            detail=f"Batas kuota gratis akun Anda ({credits_total}/{credits_total}) telah habis. Hubungi admin untuk menambah kuota."
        )
    
    if consume:
        user["credits_used"] = credits_used + 1
        user["credits_total"] = credits_total
        save_db(db)
        
    return user

@app.get("/api/user/credits")
async def get_user_credits(request: Request):
    db = load_db()
    try:
        user = check_user_credits(request, db, consume=False)
        is_admin = (user.get("email") or "").lower() == "apewinaja@gmail.com" or user.get("role") == "admin"
        total = 999999 if is_admin else user.get("credits_total", MAX_CREDITS_PER_USER)
        used = user.get("credits_used", 0)
        return {
            "total": total,
            "used": used,
            "remaining": max(0, total - used),
            "isAdmin": is_admin,
            "guest": False
        }
    except HTTPException:
        return {
            "total": MAX_CREDITS_PER_USER,
            "used": 0,
            "remaining": MAX_CREDITS_PER_USER,
            "isAdmin": False,
            "guest": True
        }

@app.get("/api/subscription/status")
async def subscription_status(request: Request):
    db = load_db()
    try:
        user = check_user_credits(request, db, consume=False)
        is_admin = user.get("email") == "Apewinaja@gmail.com" or user.get("role") == "admin"
        total = 999999 if is_admin else user.get("credits_total", MAX_CREDITS_PER_USER)
        used = user.get("credits_used", 0)
        return {
            "planType": "free",
            "prdCredits": max(0, total - used),
            "usedPrds": used,
            "totalCredits": total,
            "isAdmin": is_admin
        }
    except HTTPException:
        return {
            "planType": "free",
            "prdCredits": MAX_CREDITS_PER_USER,
            "usedPrds": 0,
            "totalCredits": MAX_CREDITS_PER_USER,
            "isAdmin": False
        }

@app.get("/api/templates")
async def list_templates():
    return []

@app.get("/api/templates/activity")
async def template_activity():
    return []

@app.get("/api/stats")
async def stats():
    return {"totalUsers": 1250, "totalPrds": 3480}

@app.get("/api/plan/list")
async def list_plans():
    db = load_db()
    plans = list(db["plans"].values())
    return {"plans": plans}

@app.post("/api/plan/create")
async def create_plan(body: PlanCreate):
    db = load_db()
    plan_id = str(uuid.uuid4())[:8]
    plan_obj = {
        "id": plan_id,
        "planId": plan_id,
        "title": body.idea[:50] + ("..." if len(body.idea) > 50 else ""),
        "idea": body.idea,
        "language": body.language,
        "templateSlug": body.templateSlug,
        "step": 2,
        "createdAt": int(time.time()),
        "techStack": {"frontend": "ai-pilih", "backend": "ai-pilih", "database": "ai-pilih", "deployment": "ai-pilih"},
        "extras": [],
        "questionAnswers": {},
        "generatedPrd": None,
        "features": [],
        "subFeatures": [],
        "tasks": [],
        "workspaceId": f"ws_{plan_id}",
        "workspaceName": "Default Workspace"
    }
    db["plans"][plan_id] = plan_obj
    save_db(db)
    return {"planId": plan_id, "plan": plan_obj}

@app.get("/api/plan/{plan_id}")
async def get_plan(plan_id: str):
    db = load_db()
    if plan_id not in db["plans"]:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan = db["plans"][plan_id]
    return {
        "plan": plan,
        "documents": [{"version": 1, "content": plan.get("generatedPrd") or ""}] if plan.get("generatedPrd") else [],
        "chatMessages": [],
        "attachments": []
    }

@app.patch("/api/plan/{plan_id}")
async def update_plan(plan_id: str, request: Request):
    db = load_db()
    if plan_id not in db["plans"]:
        raise HTTPException(status_code=404, detail="Plan not found")
    body = await request.json()
    db["plans"][plan_id].update(body)
    save_db(db)
    return {"plan": db["plans"][plan_id]}

@app.post("/api/plan/{plan_id}/workspace")
async def connect_workspace(plan_id: str):
    db = load_db()
    plan = db["plans"].get(plan_id, {})
    return {"workspaceId": plan.get("workspaceId", f"ws_{plan_id}")}

@app.post("/api/plan/questions")
async def generate_questions(body: QuestionsRequest, request: Request):
    db = load_db()
    check_user_credits(request, db, consume=True)
    plan = db["plans"].get(body.planId)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    idea = plan.get("idea", "")
    lang = plan.get("language", "id")

    prompt = f"""Kamu adalah Lead Technical Product Manager.
Berdasarkan ide aplikasi: "{idea}"

Buat tepat 5 pertanyaan spesifikasi teknis dan bisnis dalam format input teks, DI MANA setiap pertanyaan dilengkapi dengan 3-4 opsi rekomendasi jawaban (suggested pills) yang relevan dan mendalam untuk mendukung pembuatan PRD kelas industri.
Aspek yang harus dicakup:
1. Target Pengguna & Problem Statement utama
2. Alur Pengguna Utama (Core User Flow) & Fitur Kunci
3. Metode Autentikasi & Hak Akses (Role/Permission)
4. Integrasi Pihak Ketiga & External APIs (Payment, WhatsApp, Maps, OAuth, dll)
5. Estimasi Skala & Kebutuhan Khusus (Kapasitas, Keamanan, Offline-support, dll)

Kembalikan HANYA format JSON valid berikut:
{{
  "questions": [
    {{
      "id": "target_user",
      "question": "Siapa target pengguna utama aplikasi ini?",
      "suggestions": ["Mahasiswa & freelancer yang sering split bill", "Keluarga atau pasangan dengan budget bersama", "UMKM / Pengusaha kecil"]
    }},
    {{
      "id": "core_flow",
      "question": "Bagaimana alur utama pengguna saat mencatat atau menggunakan fitur?",
      "suggestions": ["Kirim pesan singkat via WhatsApp lalu bot auto-categorize", "Foto struk fisik via kamera dan OCR parsing otomatis", "Input manual form via web dashboard"]
    }},
    {{
      "id": "auth_roles",
      "question": "Metode login dan tingkatan hak akses apa yang dibutuhkan?",
      "suggestions": ["Tanpa login (berdasarkan nomor WhatsApp)", "Login Google OAuth + Single User", "Multi-user role: Admin, Staff, dan Viewer"]
    }},
    {{
      "id": "integrations",
      "question": "Layanan pihak ketiga atau API apa saja yang akan diintegrasikan?",
      "suggestions": ["WhatsApp Business Cloud API + Meta Webhook", "Payment Gateway Midtrans / Xendit", "Google Drive / Cloud Storage untuk backup file"]
    }},
    {{
      "id": "scale_infra",
      "question": "Berapa target pengguna awal dan apa kebutuhan keamanan/infrastruktur khusus?",
      "suggestions": ["< 1.000 pengguna aktif dengan PostgreSQL single instance", "Target viral (>10k user) butuh Redis cache + background worker", "Wajib end-to-end encryption untuk data finansial sensitif"]
    }}
  ]
}}
Gunakan Bahasa Indonesia.
"""

    content = call_llm([{"role": "user", "content": prompt}], response_json=True)
    try:
        data = json.loads(content)
        return {"questions": data.get("questions", [])}
    except Exception:
        return {
            "questions": [
                {
                    "id": "target_user",
                    "question": "Siapa target pengguna utama aplikasi ini?",
                    "suggestions": ["Mahasiswa & pekerja muda", "Pelaku UMKM / toko online", "Pengguna umum sehari-hari"]
                },
                {
                    "id": "core_flow",
                    "question": "Bagaimana alur utama interaksi pengguna dalam aplikasi?",
                    "suggestions": ["Kirim pesan teks atau foto struk lalu bot mencatat otomatis", "Buka web dashboard dan isi form pengeluaran", "Notifikasi pengingat terjadwal via chat"]
                },
                {
                    "id": "auth_roles",
                    "question": "Metode autentikasi dan tingkatan hak akses apa yang dibutuhkan?",
                    "suggestions": ["Verifikasi nomor WhatsApp (OTP / nomor WA)", "Login Google OAuth 2.0", "Role: Admin toko & Kasir"]
                },
                {
                    "id": "integrations",
                    "question": "Layanan eksternal atau API apa yang harus terhubung?",
                    "suggestions": ["Meta WhatsApp Cloud API", "Payment Gateway (QRIS / Midtrans)", "AI Vision OCR untuk baca struk belanja"]
                },
                {
                    "id": "scale_infra",
                    "question": "Berapa target pengguna awal dan apakah ada kebutuhan keamanan data khusus?",
                    "suggestions": ["Kapasitas 1.000 pengguna pertama, database Postgres", "Skala besar (>10.000 user) butuh worker asynchronous", "Enkripsi data transaksi pribadi"]
                }
            ]
        }

@app.post("/api/plan/roadmap/generate")
async def start_roadmap(request: Request):
    db = load_db()
    check_user_credits(request, db, consume=True)
    body = await request.json()
    plan_id = body.get("planId")
    plan = db["plans"].get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Generate feature skeleton
    idea = plan.get("idea", "")
    prompt = f"""Kamu adalah Principal Architect. Berdasarkan ide aplikasi ini: "{idea}".
Susun daftar 3 sampai 6 Fitur Utama dan untuk setiap fitur buat 2 sampai 4 sub-fitur.
Kembalikan HANYA format JSON valid berikut:
{{
  "title": "Nama Aplikasi yang Catchy",
  "features": [
    {{
      "name": "Nama Fitur",
      "summary": "1 kalimat manfaat untuk pengguna",
      "icon": "dashboard",
      "priority": "high",
      "subFeatures": [
        {{ "name": "Sub Fitur", "summary": "1 kalimat penjelasan", "icon": "settings", "priority": "high" }}
      ]
    }}
  ]
}}
Icon yang diperbolehkan hanya: lock, dashboard, chat, bell, export, users, chart, calendar, settings, search, file, payment, shield, box."""

    content = call_llm([{"role": "user", "content": prompt}], response_json=True)
    try:
        res_json = json.loads(content)
        title = res_json.get("title", plan.get("title"))
        features_raw = res_json.get("features", [])
        
        flat_features = []
        flat_subs = []
        for i, f in enumerate(features_raw):
            f_id = f"feat_{i+1}"
            flat_features.append({
                "id": f_id,
                "name": f.get("name"),
                "summary": f.get("summary"),
                "icon": f.get("icon", "box"),
                "priority": f.get("priority", "high"),
                "phase": "core"
            })
            for j, sf in enumerate(f.get("subFeatures", [])):
                flat_subs.append({
                    "id": f"sub_{i+1}_{j+1}",
                    "featureId": f_id,
                    "name": sf.get("name"),
                    "summary": sf.get("summary"),
                    "icon": sf.get("icon", "box"),
                    "priority": sf.get("priority", "high"),
                    "state": "planned"
                })
        
        plan["title"] = title
        plan["features"] = flat_features
        plan["subFeatures"] = flat_subs
        save_db(db)

        return {
            "status": "ready",
            "title": title,
            "features": flat_features,
            "subFeatures": flat_subs
        }
    except Exception as e:
        print("Roadmap error:", e)
        return {"status": "error", "error": str(e)}

@app.get("/api/plan/roadmap/generate")
async def roadmap_status(planId: str):
    db = load_db()
    plan = db["plans"].get(planId)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if plan.get("features"):
        return {
            "status": "ready",
            "title": plan.get("title"),
            "features": plan.get("features"),
            "subFeatures": plan.get("subFeatures")
        }
    return {"status": "idle"}

@app.post("/api/plan/generate")
async def generate_prd(request: Request):
    db = load_db()
    check_user_credits(request, db, consume=True)
    body = await request.json()
    plan_id = body.get("planId")
    plan = db["plans"].get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    idea = plan.get("idea")
    features = plan.get("features", [])
    
    prompt = """Kamu adalah Senior Product Manager & Principal Software Architect.
Tulis Product Requirement Document (PRD) yang komprehensif, terstruktur, presisi tinggi, dan siap dieksekusi oleh AI Coding Agent (Cursor, Claude Code, Windsurf).
Nama Proyek: __TITLE__
Ide Dasar: __IDEA__
Pohon Modul Fitur: __FEATURES__

ATURAN FORMAT DOKUMEN (SANGAT PENTING):
1. Wajib gunakan format Heading Markdown resmi: # untuk Judul Utama (# PRD — __TITLE__), ## untuk Bab (Level 2), ### untuk Sub-bab (Level 3).
2. Setiap butir poin list (-) WAJIB ditulis pada baris baru terpisah (DILARANG menggabungkan beberapa tanda '-' dalam satu paragraf/baris).
3. Gunakan Tabel Markdown (GFM Table) yang rapi untuk Requirements Matrix (Kode FR, Modul, Deskripsi Kebutuhan, Prioritas), Skema Database, dan Endpoint API.
4. Gunakan diagram Mermaid yang valid (Sequence Diagram & ER Diagram).

Wajib ikuti struktur 7 bab standar berikut secara presisi:
# PRD — __TITLE__

## 1. Overview
- **Ringkasan Eksekutif**: Ringkasan produk dan target pengguna.
- **Latar Belakang Masalah**: Masalah nyata yang diselesaikan.
- **Nilai Proposisi**: Keunggulan kompetitif unik.
- **Tujuan Utama**: Metrik keberhasilan aplikasi.

## 2. Requirements
### 2.1 Kebutuhan Fungsional
Buat tabel GFM Requirements Matrix lengkap:
| Kode FR | Modul | Deskripsi Kebutuhan | Prioritas | Acceptance Criteria |
|---|---|---|---|---|
| FR-001 | Modul Inti | Deskripsi fitur... | High | Kriteria pengujian... |

### 2.2 Kebutuhan Non-Fungsional
- **Performa**: Latensi API P95 < 200ms, Core Web Vitals LCP < 1.5 detik.
- **Keamanan**: Autentikasi JWT/OAuth, sanitasi DOMPurify / SQL parameterization.
- **Ketersediaan**: Target SLA 99.9%, database connection pooling.

## 3. Core Features
Pecah setiap modul fitur dari input di atas menjadi spesifikasi teknis mendalam dengan sub-fitur dan acceptance criteria.
Format tiap fitur:
### 3.1 [Nama Modul]
- **Deskripsi & Nilai Tambah**: Penjelasan fungsi bisnis modul.
- **Sub-Fitur & Spesifikasi Teknis**:
  - *Sub-fitur 1*: Detail implementasi teknis.
  - *Sub-fitur 2*: Detail implementasi teknis.
- **Validasi & Edge Cases**: Penanganan skenario kegagalan atau input abnormal.

## 4. User Flow
Langkah-langkah interaksi pengguna end-to-end dari landing page/auth hingga eksekusi alur utama dan umpan balik sistem.

## 5. Architecture
Jelaskan pola arsitektur sistem, pemisahan layer client-server, dan alur pemrosesan data.
WAJIB sertakan diagram sequence Mermaid yang valid dan detail:
```mermaid
sequenceDiagram
    autonumber
    actor User as User / Visitor
    participant Client as Browser Client
    participant Server as App Server (Next.js / FastAPI)
    participant DB as PostgreSQL Database
    participant External as External Service / API

    User->>Client: Akses Aplikasi / Input Form
    Client->>Server: HTTP Request / Server Action
    Server->>DB: Query / Simpan Data
    DB-->>Server: Return Data Record
    Server-->>Client: Return JSON / Hydration HTML
    Client-->>User: Tampilkan Feedback UI
```

## 6. Database Schema
Penyimpanan relational terpusat yang terstruktur dan hemat query.
WAJIB sertakan diagram ERD Mermaid yang valid serta tabel kamus data lengkap:
```mermaid
erDiagram
    USERS ||--o{ ITEMS : owns
    USERS {
        uuid id PK
        string email
        string name
        timestamp created_at
    }
```

Tabel Relasi & Kamus Data:
| Nama Tabel | Kolom Kunci | Tipe Data | Constraint | Deskripsi & Relasi |
|---|---|---|---|---|
| users | id | UUID | PRIMARY KEY | ID unik pengguna |

## 7. Tech Stack & Constraints
### 7.1 Rekomendasi Tech Stack
Tabel Pilihan Teknologi:
| Layer | Teknologi | Alasan Pemilihan |
|---|---|---|
| Frontend | Next.js / Vite React | Performa tinggi, SSR/CSR fleksibel |
| Styling | TailwindCSS | Kecepatan iterasi dan konsistensi token |
| Database | PostgreSQL (Supabase) | Relational integrity, auth built-in |

### 7.2 Panduan Eksekusi AI Coding Agent
Instruksi tegas bagi coding agent (Cursor, Windsurf, Claude Code):
- Wajib memprioritaskan pembuatan Frontend Mock UI dan State Management terlebih dahulu.
- Error handling terpusat dengan toast notifikasi interaktif.
- Struktur kode modular dan clean architecture.
""".replace("__TITLE__", plan.get("title", "Project Plan")).replace("__IDEA__", str(idea)).replace("__FEATURES__", json.dumps(features, ensure_ascii=False))

    prd_md = call_llm([{"role": "user", "content": prompt}], response_json=False)
    plan["generatedPrd"] = prd_md
    save_db(db)
    
    return JSONResponse(content={"status": "complete", "content": prd_md})

@app.post("/api/plan/revise")
async def revise_prd(request: Request):
    db = load_db()
    check_user_credits(request, db, consume=True)
    body = await request.json()
    plan_id = body.get("planId")
    instruction = body.get("instruction", "")
    
    plan = db["plans"].get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    current_prd = plan.get("generatedPrd", "")
    prompt = f"""Kamu adalah Lead Software Architect.
Berikut adalah PRD saat ini:
\"\"\"
{current_prd}
\"\"\"

Instruksi revisi dari pengguna:
"{instruction}"

Revisi dan perbarui PRD di atas sesuai instruksi secara presisi. Kembalikan HANYA dokumen Markdown yang telah direvisi secara utuh tanpa komentar tambahan di luar markdown.
"""
    updated_prd = call_llm([{"role": "user", "content": prompt}], response_json=False)
    plan["generatedPrd"] = updated_prd
    save_db(db)
    return JSONResponse(content={"status": "complete", "content": updated_prd})


GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
REDIRECT_URI = os.getenv("REDIRECT_URI", "https://vibedev.raflylabs.com/api/auth/callback/google")


from fastapi.responses import RedirectResponse

@app.post("/api/auth/sign-in/social")
async def sign_in_social(request: Request):
    body = await request.json()
    callback_url = body.get("callbackURL") or "/"
    redirect_uri = os.getenv("REDIRECT_URI", REDIRECT_URI)
    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={redirect_uri}&"
        "response_type=code&"
        "scope=openid%20email%20profile&"
        "prompt=select_account&"
        f"state={callback_url}"
    )
    return {"url": auth_url, "redirect": True}

@app.get("/api/auth/callback/google")
async def google_callback(request: Request, code: str, state: str = "/"):
    token_url = "https://oauth2.googleapis.com/token"
    redirect_uri = os.getenv("REDIRECT_URI", REDIRECT_URI)
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    r = requests.post(token_url, data=data)
    if not r.ok:
        raise HTTPException(status_code=400, detail=f"Failed to get token from Google: {r.text}")
    
    tokens = r.json()
    access_token = tokens.get("access_token")

    user_info = requests.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"}
    ).json()

    user_id = user_info.get("sub", str(uuid.uuid4()))
    email = user_info.get("email")
    name = user_info.get("name")
    picture = user_info.get("picture")

    db = load_db()
    if "users" not in db:
        db["users"] = {}
    if "sessions" not in db:
        db["sessions"] = {}

    existing_user = db["users"].get(user_id, {})
    is_admin = (email or "").lower() == "apewinaja@gmail.com"
    credits_total = 999999 if is_admin else MAX_CREDITS_PER_USER
    credits_used = existing_user.get("credits_used", 0)

    db["users"][user_id] = {
        "id": user_id,
        "email": email,
        "name": name,
        "image": picture,
        "role": "admin" if is_admin else "user",
        "onboardingCompleted": True,
        "credits_total": credits_total,
        "credits_used": credits_used
    }

    session_token = str(uuid.uuid4())
    db["sessions"][session_token] = {
        "sessionToken": session_token,
        "userId": user_id,
        "expiresAt": int(time.time()) + (30 * 86400)
    }
    save_db(db)

    # Attach session_token to redirect URL for cross-environment compatibility
    target_url = state or "/"
    sep = "&" if "?" in target_url else "?"
    redirect_url = f"{target_url}{sep}session_token={session_token}"

    is_https = request.url.scheme == "https"
    response = RedirectResponse(url=redirect_url)
    response.set_cookie(
        key="better-auth.session_token",
        value=session_token,
        max_age=30 * 86400,
        httponly=False,
        secure=is_https,
        samesite="lax"
    )
    return response

@app.get("/api/auth/get-session")
async def get_session(request: Request):
    token = request.cookies.get("better-auth.session_token")
    if not token:
        auth_hdr = request.headers.get("Authorization", "")
        if auth_hdr.startswith("Bearer "):
            token = auth_hdr[7:].strip()
    
    db = load_db()
    session = db.get("sessions", {}).get(token) if token else None
    if not session:
        return None

    user = db.get("users", {}).get(session["userId"])
    if not user:
        return None

    is_admin = (user.get("email") or "").lower() == "apewinaja@gmail.com" or user.get("role") == "admin"
    total = 999999 if is_admin else user.get("credits_total", MAX_CREDITS_PER_USER)
    used = user.get("credits_used", 0)
    user["credits_total"] = total

    return {
        "session": session,
        "user": user,
        "credits": {
            "total": total,
            "used": used,
            "remaining": max(0, total - used),
            "isAdmin": is_admin
        }
    }

@app.post("/api/auth/sign-out")
async def sign_out(request: Request):
    token = request.cookies.get("better-auth.session_token")
    if not token:
        auth_hdr = request.headers.get("Authorization", "")
        if auth_hdr.startswith("Bearer "):
            token = auth_hdr[7:].strip()
    if token:
        db = load_db()
        if "sessions" in db and token in db["sessions"]:
            del db["sessions"][token]
            save_db(db)
    res = JSONResponse(content={"success": True})
    res.delete_cookie("better-auth.session_token")
    return res


@app.get("/api/youtube/subscriber-count")
async def get_yt_subscribers():
    return {"count": 12800}

@app.get("/api/stats-stream")
async def get_stats_stream():
    def event_stream():
        yield "data: {\"users\": 1250, \"prds\": 3480}\n\n"
    return StreamingResponse(event_stream(), media_type="text/event-stream")

@app.post("/api/plan/tasks/generate")
async def generate_tasks(request: Request):
    db = load_db()
    check_user_credits(request, db, consume=True)
    body = await request.json()
    plan_id = body.get("planId")
    plan = db["plans"].get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    idea = plan.get("idea", "")
    features = plan.get("features", [])

    prompt = f"""Kamu adalah Lead Software Architect & Tech Lead.
Berdasarkan ide aplikasi: "{idea}"
Dan fitur-fitur ini: {json.dumps(features, ensure_ascii=False)}

Pecah implementasi sistem ke dalam 6 sampai 9 task teknis yang konkret untuk tim developer.
Kembalikan HANYA format JSON valid berikut:
{{
  "tasks": [
    {{
      "id": "t1",
      "title": "Nama Task Singkat",
      "description": "Langkah implementasi jelas",
      "status": "todo",
      "priority": "high"
    }}
  ]
}}
Status HANYA salah satu dari: "todo", "in_progress", "done". Buat 1 atau 2 task awal dengan status "in_progress", 1 task "done", dan sisanya "todo".
"""

    content = call_llm([{"role": "user", "content": prompt}], response_json=True)
    try:
        res_json = json.loads(content)
        tasks = res_json.get("tasks", [])
        plan["tasks"] = tasks
        save_db(db)
        return {"tasks": tasks}
    except Exception:
        fallback_tasks = [
            {"id": "t1", "title": "Setup Repository & Inisialisasi Project", "description": "Konfigurasi boilerplate Next.js/FastAPI, ESLint, dan env secrets", "status": "done", "priority": "high"},
            {"id": "t2", "title": "Desain Skema Database & Migration", "description": "Buat model relasi database PostgreSQL & Prisma schema", "status": "in_progress", "priority": "high"},
            {"id": "t3", "title": "Integrasi Auth & Session Management", "description": "Pasang Google OAuth 2.0 dan cookie authentication", "status": "in_progress", "priority": "high"},
            {"id": "t4", "title": "Implementasi Core API & Business Logic", "description": "Buat service layer dan endpoint RESTful utama", "status": "todo", "priority": "high"},
            {"id": "t5", "title": "Slicing UI & Responsive State", "description": "Bangun komponen antarmuka modern dengan Tailwind CSS", "status": "todo", "priority": "medium"},
            {"id": "t6", "title": "Error Boundary & Automated Testing", "description": "Tulis integration unit test dan error handling global", "status": "todo", "priority": "low"}
        ]
        plan["tasks"] = fallback_tasks
        save_db(db)
        return {"tasks": fallback_tasks}

@app.patch("/api/plan/{plan_id}/tasks/{task_id}")
async def update_task_status(plan_id: str, task_id: str, request: Request):
    body = await request.json()
    new_status = body.get("status")
    db = load_db()
    plan = db["plans"].get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    tasks = plan.get("tasks", [])
    for t in tasks:
        if t["id"] == task_id:
            t["status"] = new_status
            break
    plan["tasks"] = tasks
    save_db(db)
    return {"success": True, "tasks": tasks}

@app.get("/api/pricing/plans")
async def get_pricing_plans():
    return {
        "plans": [
            {
                "id": "free",
                "slug": "free",
                "name": "Free Starter",
                "price": 0,
                "priceFormatted": "Rp 0",
                "period": "selamanya",
                "description": "Untuk eksplorasi ide awal dan belajar vibe coding.",
                "features": [
                    "3 PRD Generator per bulan",
                    "Akses 5 Kuesioner Teknis",
                    "Flow Map modul standar",
                    "Komunitas Discord VibeDev"
                ],
                "cta": "Mulai Gratis",
                "isCurrent": True,
                "highlighted": False
            },
            {
                "id": "pro",
                "slug": "pro",
                "name": "VibeDev Pro",
                "price": 149000,
                "priceFormatted": "Rp 149rb",
                "originalPrice": "Rp 200rb",
                "period": "bulan",
                "discountLabel": "25% OFF",
                "description": "Untuk solo dev & freelancer yang butuh pipeline coding agent terstruktur tanpa bocor token.",
                "features": [
                    "✨ Unlimited PRD & Roadmap Generation",
                    "🤖 Agent Checkpoint Prompt (Cursor / Claude Code)",
                    "🗄️ Skema Database Lengkap (Postgres DDL / Prisma)",
                    "🔌 Kontrak API & Acceptance Criteria Rinci",
                    "⚡ Jalur Cepat 9router AI Gateway (Low Latency)"
                ],
                "cta": "Upgrade ke Pro",
                "isCurrent": False,
                "highlighted": True
            },
            {
                "id": "bundle",
                "slug": "pro-bundle",
                "name": "VibeDev + UI Pro Bundle",
                "price": 199000,
                "priceFormatted": "Rp 199rb",
                "originalPrice": "Rp 349rb",
                "period": "30 hari",
                "discountLabel": "43% OFF",
                "description": "Paket bundling PRD Agent VibeDev + Prototyping Desain UI untuk hasil maksimal.",
                "features": [
                    "🎁 Semua Fitur VibeDev Pro",
                    "🎨 Akses Desain Prototyping Selama 30 Hari",
                    "📦 1-Click Codebase Starter Template",
                    "💬 Akses Channel Private Coaching VibeDev"
                ],
                "cta": "Pilih Bundle Spesial",
                "isCurrent": False,
                "highlighted": False
            }
        ]
    }

@app.get("/api/plan/{plan_id}/agent-prompt")
async def get_agent_prompt(plan_id: str, agent_type: str = "cursor"):
    db = load_db()
    plan = db["plans"].get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    title = plan.get("title", "Project Plan")
    idea = plan.get("idea", "")
    tech = plan.get("techStack", {})
    features = plan.get("features", [])
    tasks = plan.get("tasks", [])
    
    task_list_str = "\n".join([f"- [{t.get('status', 'todo').upper()}] {t.get('title')}: {t.get('description', '')}" for t in tasks])
    
    prompt = f"""Kamu adalah AI Senior Fullstack Engineer yang mengeksekusi proyek "{title}" dari VibeDev AI.

# 1. Konteks & Blueprint Proyek
- Ide Utama: {idea}
- Tech Stack Target:
  • Frontend: {tech.get('frontend', 'React / Next.js')}
  • Backend: {tech.get('backend', 'FastAPI / Python')}
  • Database: {tech.get('database', 'PostgreSQL')}
- Plan ID: {plan_id}

# 2. Aturan Mutlak Eksekusi (Checkpoint Protocol)
1. KERJAKAN SATU TASK DALAM SATU WAKTU. Jangan langsung membabat semua task sekaligus agar tidak halusinasi atau memboroskan token.
2. CHECKPOINT PERTAMA (Frontend & Data Tiruan/Stub):
   - Bangun antarmuka/UI terlebih dahulu menggunakan mock data di memori/state lokal.
   - Setelah UI halaman pertama selesai, BERHENTI dan beritahu pengguna:
     "✅ Frontend UI fase 1 telah selesai dengan mock data. Silakan uji coba interaksi di browser terlebih dahulu sebelum kita lanjut ke backend & database."
3. CHECKPOINT KEDUA (Backend API & Database):
   - Setelah pengguna memberi konfirmasi "lanjut", implementasikan skema database dan endpoint backend.
   - Hubungkan frontend ke API backend riil.
4. Jangan pernah membuat kode duplikat atau menulis credential/secret langsung di source code. Gunakan .env.

# 3. Task Implementation Checklist
{task_list_str}

Mulai eksekusi dari Task 1 sekarang!
"""
    return {
        "planId": plan_id,
        "agentType": agent_type,
        "prompt": prompt
    }

@app.get("/api/plan/{plan_id}/task/next")
async def get_next_task(plan_id: str):
    db = load_db()
    plan = db["plans"].get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    tasks = plan.get("tasks", [])
    todo_task = next((t for t in tasks if t.get("status") in ["todo", "in_progress"]), None)
    
    if not todo_task:
        return {"done": True, "task": None, "message": "Semua task telah selesai!"}
    
    # Check if this task is a phase boundary
    is_checkpoint = "backend" in todo_task.get("title", "").lower() or "database" in todo_task.get("title", "").lower()
    
    return {
        "done": False,
        "task": todo_task,
        "isCheckpoint": is_checkpoint,
        "checkpointMessage": "⛔ CHECKPOINT: Pastikan UI dan mock data sudah terverifikasi sebelum memulai layer ini." if is_checkpoint else None
    }


import hmac
import hashlib
import subprocess

GITHUB_WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET", "vibedev_deploy_secret_2026")

@app.post("/api/webhook/deploy")
async def github_webhook(request: Request):
    signature_header = request.headers.get("X-Hub-Signature-256")
    body_bytes = await request.body()
    
    # If secret is set, verify HMAC
    if GITHUB_WEBHOOK_SECRET and signature_header:
        expected_sig = "sha256=" + hmac.new(
            GITHUB_WEBHOOK_SECRET.encode(),
            body_bytes,
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(signature_header, expected_sig):
            raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        event = request.headers.get("X-GitHub-Event", "push")
        if event == "ping":
            return {"status": "pong"}

        payload = json.loads(body_bytes.decode())
        ref = payload.get("ref", "")
        # Only deploy on main branch push
        if ref == "refs/heads/main" or not ref:
            # Trigger background deployment script on CT 101 via SSH
            subprocess.Popen(["/bin/bash", "/var/www/trigger_remote_deploy.sh"])
            return {"status": "deploy_triggered", "ref": ref}
        return {"status": "ignored", "ref": ref}
    except Exception as e:
        return {"status": "error", "error": str(e)}
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8010, reload=True)
