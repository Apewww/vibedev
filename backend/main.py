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

app = FastAPI(title="VibeDev Backend", description="PRD Generator API Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROUTER_URL = "https://9router.raflylabs.com/v1/chat/completions"
ROUTER_KEY = os.getenv("ROUTER_KEY", "")
ROUTER_MODEL = "vibedev"

DB_FILE = "/var/www/vibedev_data.json"

def load_db() -> dict:
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {"plans": {}, "workspaces": {}}

def save_db(data: dict):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=2)

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

@app.get("/api/subscription/status")
async def subscription_status():
    return {
        "planType": "pro",
        "addonCredits": {"prdCredits": 999, "chatCredits": 999},
        "limits": {"revisionChatEnabled": True}
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
async def generate_questions(body: QuestionsRequest):
    db = load_db()
    plan = db["plans"].get(body.planId)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    idea = plan.get("idea", "")
    lang = plan.get("language", "id")

    prompt = f"""Kamu adalah Technical Product Manager expert.
Berdasarkan ide aplikasi berikut, buatkan 4 sampai 5 pertanyaan kuesioner terpenting agar PRD yang dihasilkan sangat akurat.
Ide Aplikasi: "{idea}"

Kembalikan jawaban HANYA dalam JSON format persis seperti ini:
{{
  "questions": [
    {{
      "id": "target-user",
      "question": "Pertanyaan untuk target pengguna?",
      "type": "text"
    }},
    {{
      "id": "auth-method",
      "question": "Metode login apa yang diinginkan?",
      "type": "single_choice",
      "options": ["Email/Password", "Google OAuth", "Tanpa Login"]
    }},
    {{
      "id": "scale",
      "question": "Perkiraan pengguna di bulan pertama?",
      "type": "single_choice",
      "options": ["< 100", "100-1.000", "1.000+"]
    }}
  ]
}}
Gunakan Bahasa {"Indonesia" if lang == "id" else "English"}."""

    content = call_llm([{"role": "user", "content": prompt}], response_json=True)
    try:
        data = json.loads(content)
        return {"questions": data.get("questions", [])}
    except Exception:
        # Fallback
        return {
            "questions": [
                {"id": "target-user", "question": "Siapa target user utama aplikasi ini?", "type": "text"},
                {"id": "monetization", "question": "Bagaimana rencana monetisasi aplikasi ini?", "type": "single_choice", "options": ["Gratis", "Freemium", "Berbayar"]},
                {"id": "scale", "question": "Berapa banyak user yang diharapkan?", "type": "single_choice", "options": ["< 100", "100-1.000", "1.000+"]}
            ]
        }

@app.post("/api/plan/roadmap/generate")
async def start_roadmap(request: Request):
    body = await request.json()
    plan_id = body.get("planId")
    db = load_db()
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
    body = await request.json()
    plan_id = body.get("planId")
    db = load_db()
    plan = db["plans"].get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    idea = plan.get("idea")
    features = plan.get("features", [])
    
    prompt = f"""Kamu adalah Senior Product Manager & Software Architect.
Tulis Product Requirement Document (PRD) yang komprehensif, terstruktur, dan siap pakai untuk AI Coding Agent (Cursor, Claude Code, Windsurf).
Ide: {idea}
Fitur Inti: {json.dumps(features, ensure_ascii=False)}

Gunakan format Markdown lengkap dengan struktur berikut:
# PRD: {plan.get("title", "Project Plan")}
## 1. Executive Summary & Goals
## 2. User Personas & Problem Statement
## 3. Architecture & Tech Stack
## 4. Detailed Feature Specifications
## 5. Data Flow & API Contracts
## 6. Database Schema (PostgreSQL DDL / Prisma)
## 7. Implementation Roadmap & Acceptance Criteria
"""

    prd_md = call_llm([{"role": "user", "content": prompt}], response_json=False)
    plan["generatedPrd"] = prd_md
    save_db(db)
    
    return JSONResponse(content={"status": "complete", "content": prd_md})


GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
REDIRECT_URI = "https://vibedev.raflylabs.com/api/auth/callback/google"

from fastapi.responses import RedirectResponse

@app.post("/api/auth/sign-in/social")
async def sign_in_social(request: Request):
    body = await request.json()
    callback_url = body.get("callbackURL") or "/"
    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={REDIRECT_URI}&"
        "response_type=code&"
        "scope=openid%20email%20profile&"
        f"state={callback_url}"
    )
    return {"url": auth_url, "redirect": True}

@app.get("/api/auth/callback/google")
async def google_callback(code: str, state: str = "/"):
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    r = requests.post(token_url, data=data)
    if not r.ok:
        raise HTTPException(status_code=400, detail="Failed to get token from Google")
    
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

    db["users"][user_id] = {
        "id": user_id,
        "email": email,
        "name": name,
        "image": picture,
        "role": "admin" if email == "Apewinaja@gmail.com" else "user",
        "onboardingCompleted": True
    }

    session_token = str(uuid.uuid4())
    db["sessions"][session_token] = {
        "sessionToken": session_token,
        "userId": user_id,
        "expiresAt": int(time.time()) + (30 * 86400)
    }
    save_db(db)

    response = RedirectResponse(url=state or "/")
    response.set_cookie(
        key="better-auth.session_token",
        value=session_token,
        max_age=30 * 86400,
        httponly=False,
        secure=True,
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

    return {
        "session": session,
        "user": user
    }

@app.post("/api/auth/sign-out")
async def sign_out(request: Request):
    token = request.cookies.get("better-auth.session_token")
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
    body = await request.json()
    plan_id = body.get("planId")
    db = load_db()
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
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8010)
