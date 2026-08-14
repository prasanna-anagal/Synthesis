# Synthesis

**Synthesis** is an AI-powered multi-document research and study agent built as a final-year engineering capstone project. Users upload PDFs, DOCX, and TXT files into subject folders. A multi-step reasoning agent answers questions by searching across all documents, citing exact sources (document name + page number), visualizing concept relationships as an interactive knowledge graph, and generating adaptive quizzes.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite, Tailwind CSS, shadcn/ui, D3.js |
| Backend | FastAPI (Python 3.11+) |
| LLM | Groq API (`llama-3.3-70b-versatile` — swappable via `GROQ_MODEL` env var) |
| Vector DB | ChromaDB (local, embedded mode) |
| Embeddings | `sentence-transformers` (local, no API cost) |
| Relational DB | PostgreSQL via Supabase |
| Auth | Supabase Auth (email/password) |
| File Storage | Local `/uploads` directory |
| Doc Parsing | `pdfplumber` (PDF), `python-docx` (DOCX) |

---

## Agent Architecture

Synthesis uses an **explicit multi-step agentic reasoning loop** rather than a single-shot RAG call. The agent lives in `backend/agent/` and works as follows:

1. **Planner** (`agent/planner.py`) — Analyzes the user query and decides: which document(s) to search, how many retrieval rounds are needed, or whether to ask the user a clarifying question first.
2. **Retriever** (`agent/retriever.py`) — Executes semantic vector searches against ChromaDB, potentially across multiple documents in a folder.
3. **Evaluator** (`agent/evaluator.py`) — Determines whether the retrieved context is sufficient to answer the query, or whether another retrieval round is needed.
4. **Synthesizer** (`agent/synthesizer.py`) — Calls the Groq API to generate a final markdown-formatted answer with inline citations (document name + page number).

Each step streams its status to the frontend via **Server-Sent Events (SSE)**, so users see the agent's reasoning live ("Searching Chapter 3 - Normalization.pdf...", "Cross-referencing with Research Paper.pdf...").

---

## Project Structure

```
synthesis/
├── frontend/              # React + Vite app
│   ├── src/
│   │   ├── components/    # UI components (layout, chat, documents, graph, quiz)
│   │   ├── pages/         # Route-level pages
│   │   ├── hooks/         # Custom React hooks (useAuth, useSSE)
│   │   ├── lib/           # Supabase client, API helpers
│   │   └── store/         # Zustand state management
│   └── ...
├── backend/               # FastAPI app
│   ├── agent/             # Multi-step reasoning: planner, retriever, evaluator, synthesizer
│   ├── routes/            # API route handlers
│   ├── models/            # Pydantic models
│   ├── services/          # Document parsing, embedding, graph extraction, quiz generation
│   ├── main.py
│   └── requirements.txt
├── .env.example
└── README.md
```

---

## Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key

### 1. Clone the repository

```bash
git clone https://github.com/prasanna-anagal/Synthesis.git
cd Synthesis
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Fill in your GROQ_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, and DATABASE_URL
```

### 3. Set up the database

Run the SQL in `backend/migrations/001_initial_schema.sql` in your Supabase SQL editor.

### 4. Run the backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend API docs available at: `http://localhost:8000/docs`

### 5. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend available at: `http://localhost:5173`

---

## Environment Variables

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Your Groq API key from console.groq.com |
| `GROQ_MODEL` | LLM model to use (default: `llama-3.3-70b-versatile`) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (backend only) |
| `DATABASE_URL` | PostgreSQL connection string from Supabase |
| `SECRET_KEY` | Random secret for internal token signing |
| `UPLOAD_DIR` | Local directory for uploaded files (default: `uploads`) |
| `CHROMA_PERSIST_DIR` | ChromaDB persistence directory (default: `chroma_db`) |
| `FRONTEND_URL` | Frontend URL for CORS (default: `http://localhost:5173`) |

---

## Features

- **Multi-document RAG** — Ask questions that span multiple uploaded documents
- **Agentic reasoning** — Multi-step plan → retrieve → evaluate → synthesize loop
- **Live reasoning stream** — See the agent's thought process in real time via SSE
- **Source citations** — Every answer cites the exact document and page number
- **Knowledge graph** — Interactive D3.js visualization of concepts across documents
- **Adaptive quizzes** — AI-generated questions that adjust difficulty based on your performance
- **Folder organization** — Organize documents by subject/course

---

## Deployment (future)

- **Frontend** → Vercel (`npm run build`, set `VITE_API_URL` env var)
- **Backend** → Render (set all env vars in Render dashboard)
