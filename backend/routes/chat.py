"""
Chat routes — streaming agentic reasoning + message history.
SSE endpoint streams: reasoning steps, answer tokens, and citations live to the frontend.
"""
import json
import uuid
from datetime import datetime
from typing import AsyncGenerator, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from database import get_supabase_admin
from auth import get_current_user
from models.chat import ChatCreate, ChatResponse, MessageCreate, MessageResponse
from agent.planner import plan_retrieval
from agent.retriever import execute_retrieval
from agent.evaluator import evaluate_context
from agent.synthesizer import synthesize_answer_stream, _extract_citations
from services.embedder import search_folder
from config import get_settings

settings = get_settings()
router = APIRouter(prefix="/chat", tags=["chat"])


def _sse_event(event_type: str, data: dict) -> str:
    """Format an SSE event string."""
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


async def _run_agent_stream(
    query: str,
    folder_id: str,
    chat_id: str,
    user_id: str,
    db,
) -> AsyncGenerator[str, None]:
    """
    Full multi-step agent reasoning loop, streaming each step as SSE events.
    
    Flow: plan → retrieve → evaluate → [re-retrieve if needed] → synthesize (streamed)
    """
    all_chunks = []
    answer_tokens = []

    try:
        # ── Step 1: Plan ─────────────────────────────────────────────────────
        yield _sse_event("reasoning_step", {
            "step": "planning",
            "message": "Analyzing your question and deciding retrieval strategy...",
        })

        # Get available documents in folder
        docs_response = (
            db.table("documents")
            .select("id, original_name, file_type")
            .eq("folder_id", folder_id)
            .eq("status", "indexed")
            .execute()
        )
        available_docs = [
            {"id": d["id"], "filename": d["original_name"], "file_type": d["file_type"]}
            for d in (docs_response.data or [])
        ]

        plan = plan_retrieval(query=query, available_documents=available_docs)

        # If the agent wants to clarify, return early
        if plan.strategy == "clarify" and plan.clarification_question:
            yield _sse_event("clarification", {
                "question": plan.clarification_question,
            })
            yield _sse_event("done", {"requires_clarification": True})
            return

        yield _sse_event("reasoning_step", {
            "step": "planning",
            "message": f"Strategy: {plan.strategy}. {plan.reasoning}",
            "details": {
                "strategy": plan.strategy,
                "queries": plan.search_queries,
                "target_docs": plan.target_document_ids,
            },
        })

        # ── Step 2: Retrieve ──────────────────────────────────────────────────
        for i, query_variant in enumerate(plan.search_queries):
            doc_hint = ""
            if plan.target_document_ids and available_docs:
                target_names = [
                    d["filename"] for d in available_docs
                    if d["id"] in plan.target_document_ids
                ]
                doc_hint = f" in '{', '.join(target_names[:2])}'" if target_names else ""

            yield _sse_event("reasoning_step", {
                "step": "retrieving",
                "message": f"Searching documents{doc_hint}...",
                "query": query_variant,
            })

        all_chunks = execute_retrieval(folder_id=folder_id, plan=plan)

        yield _sse_event("reasoning_step", {
            "step": "retrieved",
            "message": f"Found {len(all_chunks)} relevant passages across {len(set(c.document_name for c in all_chunks))} document(s).",
        })

        # ── Step 3: Evaluate ──────────────────────────────────────────────────
        yield _sse_event("reasoning_step", {
            "step": "evaluating",
            "message": "Evaluating whether retrieved context is sufficient...",
        })

        evaluation = evaluate_context(query=query, retrieved_chunks=all_chunks)

        if not evaluation.is_sufficient and evaluation.follow_up_queries:
            yield _sse_event("reasoning_step", {
                "step": "re-retrieving",
                "message": f"Context incomplete. Searching for: {', '.join(evaluation.missing_aspects[:2])}...",
            })

            # Do a second retrieval pass with follow-up queries
            from agent.planner import RetrievalPlan
            followup_plan = RetrievalPlan(
                strategy="folder_wide",
                target_document_ids=[],
                search_queries=evaluation.follow_up_queries,
                clarification_question=None,
                reasoning="Second retrieval pass for missing context",
            )
            extra_chunks = execute_retrieval(folder_id=folder_id, plan=followup_plan)

            # Merge, deduplicate
            existing_ids = {c.chroma_id for c in all_chunks}
            for chunk in extra_chunks:
                if chunk.chroma_id not in existing_ids:
                    all_chunks.append(chunk)
                    existing_ids.add(chunk.chroma_id)

            all_chunks.sort(key=lambda x: x.relevance_score, reverse=True)

        yield _sse_event("reasoning_step", {
            "step": "synthesizing",
            "message": "Synthesizing answer with citations...",
        })

        # ── Step 4: Synthesize (streamed) ─────────────────────────────────────
        # Get recent chat history
        history_resp = (
            db.table("messages")
            .select("role, content")
            .eq("chat_id", chat_id)
            .order("created_at", desc=True)
            .limit(6)
            .execute()
        )
        history = list(reversed(history_resp.data or []))

        full_answer = ""
        async for token in synthesize_answer_stream(
            query=query,
            retrieved_chunks=all_chunks[:settings.top_k_chunks],
            chat_history=history,
        ):
            full_answer += token
            answer_tokens.append(token)
            yield _sse_event("token", {"text": token})

        # Extract citations from full answer
        citations = _extract_citations(full_answer, all_chunks)
        citations_data = [
            {
                "document_id": c.document_id,
                "document_name": c.document_name,
                "page_number": c.page_number,
                "excerpt": c.excerpt,
                "relevance_score": c.relevance_score,
            }
            for c in citations
        ]

        yield _sse_event("citations", {"citations": citations_data})

        # ── Save to DB ────────────────────────────────────────────────────────
        now = datetime.utcnow().isoformat()
        reasoning_steps = [
            f"Strategy: {plan.strategy} — {plan.reasoning}",
            f"Retrieved {len(all_chunks)} chunks from {len(set(c.document_name for c in all_chunks))} document(s)",
            f"Context sufficiency: {'sufficient' if evaluation.is_sufficient else 'needed extra retrieval'}",
        ]

        db.table("messages").insert({
            "id": str(uuid.uuid4()),
            "chat_id": chat_id,
            "role": "assistant",
            "content": full_answer,
            "citations": json.dumps(citations_data),
            "reasoning_steps": json.dumps(reasoning_steps),
            "created_at": now,
        }).execute()

        # Update chat title from first message if it's "New Chat"
        chat_resp = db.table("chats").select("title").eq("id", chat_id).single().execute()
        if chat_resp.data and chat_resp.data["title"] == "New Chat":
            title = query[:60] + ("..." if len(query) > 60 else "")
            db.table("chats").update({"title": title, "updated_at": now}).eq("id", chat_id).execute()

        yield _sse_event("done", {
            "citations": citations_data,
            "reasoning_steps": reasoning_steps,
        })

    except Exception as e:
        yield _sse_event("error", {"message": f"Agent error: {str(e)}"})


@router.get("/", response_model=list[ChatResponse])
async def list_chats(
    folder_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase_admin),
):
    """List all chats for the user, optionally filtered by folder."""
    query = (
        db.table("chats")
        .select("*")
        .eq("user_id", current_user["id"])
        .order("updated_at", desc=True)
    )
    if folder_id:
        query = query.eq("folder_id", folder_id)

    response = query.execute()
    return [
        ChatResponse(
            id=row["id"],
            folder_id=row.get("folder_id"),
            user_id=row["user_id"],
            title=row["title"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
        for row in (response.data or [])
    ]


@router.post("/", response_model=ChatResponse, status_code=201)
async def create_chat(
    payload: ChatCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase_admin),
):
    """Create a new chat session."""
    now = datetime.utcnow().isoformat()
    chat_id = str(uuid.uuid4())
    db.table("chats").insert({
        "id": chat_id,
        "user_id": current_user["id"],
        "folder_id": payload.folder_id,
        "title": payload.title or "New Chat",
        "created_at": now,
        "updated_at": now,
    }).execute()

    return ChatResponse(
        id=chat_id,
        folder_id=payload.folder_id,
        user_id=current_user["id"],
        title=payload.title or "New Chat",
        created_at=now,
        updated_at=now,
    )


@router.get("/{chat_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    chat_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase_admin),
):
    """Fetch all messages in a chat."""
    # Verify chat ownership
    chat = db.table("chats").select("id").eq("id", chat_id).eq("user_id", current_user["id"]).single().execute()
    if not chat.data:
        raise HTTPException(status_code=404, detail="Chat not found")

    response = (
        db.table("messages")
        .select("*")
        .eq("chat_id", chat_id)
        .order("created_at")
        .execute()
    )

    messages = []
    for row in (response.data or []):
        citations = json.loads(row["citations"]) if row.get("citations") else None
        reasoning_steps = json.loads(row["reasoning_steps"]) if row.get("reasoning_steps") else None
        messages.append(
            MessageResponse(
                id=row["id"],
                chat_id=row["chat_id"],
                role=row["role"],
                content=row["content"],
                citations=citations,
                reasoning_steps=reasoning_steps,
                created_at=row["created_at"],
            )
        )
    return messages


@router.post("/{chat_id}/message")
async def send_message(
    chat_id: str,
    payload: MessageCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase_admin),
):
    """
    Send a user message and return streaming SSE response with agent reasoning.
    Frontend should handle text/event-stream content type.
    """
    # Verify chat ownership
    chat = (
        db.table("chats")
        .select("id, folder_id")
        .eq("id", chat_id)
        .eq("user_id", current_user["id"])
        .single()
        .execute()
    )
    if not chat.data:
        raise HTTPException(status_code=404, detail="Chat not found")

    folder_id = payload.folder_id or chat.data.get("folder_id")
    if not folder_id:
        raise HTTPException(status_code=400, detail="No folder specified for this chat")

    # Save user message
    now = datetime.utcnow().isoformat()
    db.table("messages").insert({
        "id": str(uuid.uuid4()),
        "chat_id": chat_id,
        "role": "user",
        "content": payload.content,
        "created_at": now,
    }).execute()

    return StreamingResponse(
        _run_agent_stream(
            query=payload.content,
            folder_id=folder_id,
            chat_id=chat_id,
            user_id=current_user["id"],
            db=db,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete("/{chat_id}", status_code=204)
async def delete_chat(
    chat_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase_admin),
):
    """Delete a chat and all its messages."""
    db.table("chats").delete().eq("id", chat_id).eq("user_id", current_user["id"]).execute()
