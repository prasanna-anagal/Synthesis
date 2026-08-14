# Synthesis — AI-Powered Multi-Document Research & Study Agent

**Synthesis** is a full-stack, agentic AI-powered multi-document research and study assistant built as a final-year engineering capstone project. Users upload PDFs, DOCX, and TXT files into subject folders. A multi-step reasoning agent answers questions across all documents, citing exact sources (document name + page number), visualizing concept relationships as an interactive knowledge graph, and generating adaptive quizzes.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite, JavaScript (JSX), Tailwind CSS v4, shadcn/ui design, D3.js |
| Backend | FastAPI (Python 3.11+) |
| LLM | Groq API (`llama-3.3-70b-versatile` — swappable via `GROQ_MODEL` env var) |
| Vector DB | ChromaDB (local embedded mode) |
| Embeddings | `sentence-transformers` (`all-MiniLM-L6-v2`, local execution, free) |
| Relational DB | PostgreSQL via Supabase |
| Auth | Supabase Auth (email/password signup & login) |
| File Storage | Local `/uploads` directory |
| Doc Parsing | `pdfplumber` (PDFs with per-page tracking), `python-docx` (Word) |

---

## Agent Architecture

Synthesis uses an **explicit 4-step agentic reasoning loop** located in `backend/agent/`:

```
User Query ──► [1. Planner] ──► [2. Retriever] ──► [3. Evaluator] ──► [4. Synthesizer] ──► SSE Stream
                (Strategy)      (ChromaDB Search)  (Sufficiency)       (Citations)
```

1. **Planner (`agent/planner.py`):** Analyzes query intent to select a strategy (`single_doc`, `multi_doc`, `folder_wide`, or `clarify`).
2. **Retriever (`agent/retriever.py`):** Executes semantic vector searches against ChromaDB per targeted document or folder-wide.
3. **Evaluator (`agent/evaluator.py`):** Evaluates retrieved context for completeness and triggers a second retrieval pass if necessary.
4. **Synthesizer (`agent/synthesizer.py`):** Calls Groq API to stream answers token-by-token with inline source citations (`[DocName, p.X]`).

---

## Quick Start (Local Setup)

### 1. Clone the repository

```bash
git clone https://github.com/prasanna-anagal/Synthesis.git
cd Synthesis
```

### 2. Set environment variables

Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```
Fill in your `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `DATABASE_URL`.

### 3. Run database migrations

Copy and run the SQL from `backend/migrations/001_initial_schema.sql` inside your Supabase project's **SQL Editor**.

### 4. Start the Backend (FastAPI)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
API Documentation: `http://localhost:8000/docs`

### 5. Start the Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```
Frontend Web App: `http://localhost:5173`

---

## Project Documentation

- 📘 [VIVA_GUIDE.md](file:///d:/Desktop/Projects/Synthesis/VIVA_GUIDE.md) — Capstone project defense Q&A guide and architecture rationale.
- 🚀 [DEPLOYMENT.md](file:///d:/Desktop/Projects/Synthesis/DEPLOYMENT.md) — Production deployment instructions (Vercel + Render + Supabase).
- 🗄️ [001_initial_schema.sql](file:///d:/Desktop/Projects/Synthesis/backend/migrations/001_initial_schema.sql) — Supabase PostgreSQL database schema.

---

## Running Tests

Run backend unit tests for parsing, chunking, and adaptive quiz calculation:

```bash
cd backend
pytest
```
