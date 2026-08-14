"""
Agent Planner — Step 1 of the reasoning loop.
Analyzes the user query and decides the retrieval strategy before any search.
"""
import json
from typing import Optional, List
from groq import Groq
from config import get_settings

settings = get_settings()


class RetrievalPlan:
    """The output of the planner — a structured strategy for retrieval."""
    def __init__(
        self,
        strategy: str,           # "single_doc" | "multi_doc" | "folder_wide" | "clarify"
        target_document_ids: Optional[List[str]],
        search_queries: List[str],
        clarification_question: Optional[str],
        reasoning: str,
    ):
        self.strategy = strategy
        self.target_document_ids = target_document_ids or []
        self.search_queries = search_queries
        self.clarification_question = clarification_question
        self.reasoning = reasoning


PLANNER_SYSTEM_PROMPT = """You are the planning module of an AI research agent. 
Your job is to analyze a user's question and decide the best retrieval strategy.

You will receive:
- The user's question
- A list of available documents in the folder (name, id, type)

You must output a JSON object with this exact structure:
{
  "strategy": "single_doc" | "multi_doc" | "folder_wide" | "clarify",
  "target_document_ids": ["id1", "id2"] or [],
  "search_queries": ["query variant 1", "query variant 2"],
  "clarification_question": "string or null",
  "reasoning": "1-2 sentences explaining your choice"
}

Strategy guide:
- "single_doc": Question clearly targets one specific document (user names it, or it's obviously about one topic)
- "multi_doc": Question needs info from 2-3 specific documents (cross-reference, compare)
- "folder_wide": Question is broad or cross-cutting across all documents
- "clarify": Question is ambiguous and needs a follow-up before searching

search_queries: Generate 1-3 semantic search queries that will find the most relevant chunks.
Make queries slightly different to catch different phrasings in the documents.

Output ONLY valid JSON. No markdown, no explanation outside the JSON."""


def plan_retrieval(
    query: str,
    available_documents: List[dict],  # [{"id": str, "filename": str, "file_type": str}]
) -> RetrievalPlan:
    """
    Call the LLM to decide the retrieval strategy for this query.
    Returns a RetrievalPlan with the strategy and search queries.
    """
    client = Groq(api_key=settings.groq_api_key)

    doc_list = "\n".join(
        f"- ID: {d['id']} | Name: {d['filename']} | Type: {d['file_type']}"
        for d in available_documents
    ) if available_documents else "No documents available"

    user_message = f"""User Question: {query}

Available Documents:
{doc_list}

Decide the retrieval strategy and output the JSON plan."""

    try:
        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.2,  # Low temperature for consistent structured output
            max_tokens=500,
        )

        raw = response.choices[0].message.content.strip()
        # Strip markdown fences
        raw = raw.strip("`").strip()
        if raw.startswith("json"):
            raw = raw[4:].strip()

        plan_data = json.loads(raw)

        return RetrievalPlan(
            strategy=plan_data.get("strategy", "folder_wide"),
            target_document_ids=plan_data.get("target_document_ids", []),
            search_queries=plan_data.get("search_queries", [query]),
            clarification_question=plan_data.get("clarification_question"),
            reasoning=plan_data.get("reasoning", ""),
        )

    except Exception as e:
        # Fallback: folder-wide search with original query
        return RetrievalPlan(
            strategy="folder_wide",
            target_document_ids=[],
            search_queries=[query],
            clarification_question=None,
            reasoning=f"Fallback to folder-wide search due to planning error: {e}",
        )
