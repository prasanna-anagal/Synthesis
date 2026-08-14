# Synthesis — Deployment Guide

This guide details how to deploy Synthesis to production hosting environments:
- **Frontend:** Vercel / Netlify
- **Backend:** Render / Railway / Fly.io
- **Database & Auth:** Supabase (Cloud managed)

---

## 1. Database Setup (Supabase)

1. Create a project on [Supabase](https://supabase.com).
2. Go to **SQL Editor** -> **New Query**.
3. Paste and run the contents of `backend/migrations/001_initial_schema.sql`.
4. Copy the following keys from **Project Settings -> API**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (under Connection String -> URI)

---

## 2. Backend Deployment (Render.com)

1. Create a new **Web Service** on Render connected to your GitHub repo `Synthesis`.
2. Set **Root Directory** to `backend`.
3. Set **Environment** to `Python 3`.
4. Set **Build Command**:
   ```bash
   pip install -r requirements.txt && python -m spacy download en_core_web_sm
   ```
5. Set **Start Command**:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
6. Add Environment Variables in Render Dashboard:
   - `GROQ_API_KEY`
   - `GROQ_MODEL` = `llama-3.3-70b-versatile`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
   - `FRONTEND_URL` = `https://your-app.vercel.app`

---

## 3. Frontend Deployment (Vercel)

1. Connect your GitHub repository on [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Framework Preset: **Vite**.
4. Add Environment Variables:
   - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your_anon_key`
   - `VITE_API_BASE_URL` = `https://your-backend.onrender.com`
5. Click **Deploy**.

---

## 4. Verification Checklist

- [ ] Sign up new user via Supabase Auth
- [ ] Create subject folder
- [ ] Upload sample PDF/DOCX file
- [ ] Verify background indexing completes (ChromaDB + Postgres chunks)
- [ ] Send query in Chat, verify streaming reasoning steps and citations
- [ ] Verify D3.js Knowledge Graph renders concept nodes
- [ ] Generate adaptive quiz and verify score tracking
