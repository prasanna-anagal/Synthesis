# Synthesis — Capstone Project Defense & Viva Guide

This document contains key technical explanations, design decisions, and answers to common examiner questions for your viva presentation.

---

## 1. Core Architecture Overview

### Q: How is Synthesis different from standard Chat-with-PDF (Naive RAG)?
**Answer:**
Naive RAG performs a single static vector search for every query, feeds the top $K$ chunks to an LLM, and generates an answer. This fails when queries require multi-document synthesis, comparison, or clarification.

Synthesis uses an **explicit 4-step Agentic Reasoning Loop**:
1. **Planner (`agent/planner.py`):** Uses LLM function-style planning to evaluate whether the query needs a single-document search, cross-document comparison (`multi_doc`), folder-wide retrieval, or user clarification.
2. **Retriever (`agent/retriever.py`):** Executes targeted semantic searches in ChromaDB based on the planner's query variants.
3. **Evaluator (`agent/evaluator.py`):** Evaluates retrieved context for completeness. If key aspects are missing, it formulates follow-up queries and triggers a second retrieval pass.
4. **Synthesizer (`agent/synthesizer.py`):** Generates structured markdown answers with strict inline citations (`[DocName, p.X]`) parsed via regex.

---

## 2. Technical Stack Justification

| Component | Choice | Why Chosen? |
|---|---|---|
| **LLM Provider** | Groq API (`llama-3.3-70b-versatile`) | Ultra-fast inference latency (< 500ms TTFT) required for real-time SSE streaming. |
| **Vector DB** | ChromaDB (embedded mode) | Zero external database cost, fast local HNSW index persistence per folder. |
| **Embedding Model** | `all-MiniLM-L6-v2` (`sentence-transformers`) | Local 384-dim embeddings (80MB footprint), free execution without OpenAI API costs. |
| **Document Parsing** | `pdfplumber` + `python-docx` | Preserves exact page numbers for PDF citations, unlike standard `PyPDF2`. |
| **Database & Auth** | Supabase (PostgreSQL + Auth) | Out-of-the-box Row-Level Security (RLS) policies for user data isolation. |
| **Knowledge Graph** | spaCy NER + D3.js Force Simulation | Extracts entities & noun chunks locally; D3 renders dynamic interactive concept maps. |

---

## 3. Key Examiner Questions & Answers

### Q1: How do you prevent citation hallucinations?
**Answer:**
Citations are extracted programmatically by comparing the LLM's inline `[DocName, p.X]` tags with the actual chunk metadata returned by ChromaDB (`document_id`, `page_number`, `excerpt`). If a cited document tag does not match the retrieved chunks, it is discarded or fallback-verified.

### Q2: How does the Adaptive Quiz algorithm work?
**Answer:**
The adaptive engine tracks performance over a rolling window of recent attempts:
- $\ge 80\%$ accuracy $\rightarrow$ Upgrades difficulty (`EASY` $\rightarrow$ `MEDIUM` $\rightarrow$ `HARD`).
- $\le 40\%$ accuracy $\rightarrow$ Downgrades difficulty (`HARD` $\rightarrow$ `MEDIUM` $\rightarrow$ `EASY`).
- Mastery level is calculated using exponential recency decay ($\text{decay} = 0.7$), giving higher weight to recent performance.

### Q3: How is real-time agent reasoning displayed to the user?
**Answer:**
We use **Server-Sent Events (SSE)** via FastAPI's `StreamingResponse`. As each phase completes in the backend agent loop, SSE events (`reasoning_step`, `token`, `citations`, `done`) are pushed to the frontend, where the `useSSE` hook updates the UI live without polling.
