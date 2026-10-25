# VibeDev AI

Platform generator PRD (Product Requirement Document), hierarki fitur teknis, dan skema database otomatis berbasis AI Coding Agent (Cursor, Claude Code, Windsurf).

## Arsitektur
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Marked
- **Backend**: FastAPI (Python), Better-Auth standard session, Uvicorn
- **AI Gateway**: 9router RafllyLabs (Model: `vibedev`)
- **OAuth**: Google OAuth 2.0 Webflow

## Cara Jalankan Lokal
```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
pip install fastapi uvicorn requests pydantic
python main.py
```
