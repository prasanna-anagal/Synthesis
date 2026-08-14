"""
Agent Evaluator — Step 3 of the reasoning loop.
Determines whether the retrieved context is sufficient to answer the query,
or whether another retrieval round is needed.
"""
import json
from typing import List
from groq import Groq
from services.embedder import RetrievedChunk
from config import get_settings

settings = get_settings()


class EvaluationResult:
    def __init__(
        self,
        is_sufficient: bool,
        confidence: float,       # 0.0–1.0
        missing_aspects: List[str],
        follow_up_queries: List[str],
        reasoning: str,
    ):
        self.is_sufficient = is_sufficient
        self.confidence = confidence
        self.missing_aspects = missing_aspects
        self.follow_up_queries = follow_up_queries
        self.reasoning = reasoning


EVALUATOR_SYSTEM_PROMPT = """You are the evaluation module of an AI research agent.
Your job is to assess whether the retrieved document chunks contain enough information to answer the user's question.

Output a JSON object with this exact structure:
{
  "is_sufficient": true | false,
  "confidence": 0.0 to 1.0,
  "missing_aspects": ["aspect 1", "aspect 2"],
  "follow_up_queries": ["query 1", "query 2"],
  "reasoning": "1-2 sentences"
}

Be strict: if key parts of the question are not addressed in the context, is_sufficient = false.
follow_up_queries: only needed if is_sufficient = false. Suggest different search queries to find the missing info.
Output ONLY valid JSON."""


def evaluate_context(
    query: str,
    retrieved_chunks: List[RetrievedChunk],
    min_confidence: float = 0.6,
) -> EvaluationResult:
    """
    Evaluate whether retrieved chunks are sufficient to answer the query.
    Uses the LLM for semantic evaluation (not just keyword matching).
    """
    if not retrieved_chunks:
        return EvaluationResult(
            is_sufficient=False,
            confidence=0.0,
            missing_aspects=["No relevant content found in the documents"],
            follow_up_queries=[query],
            reasoning="No chunks were retrieved.",
        )

    # Use top chunks only for evaluation (to keep prompt size manageable)
    top_chunks = retrieved_chunks[:6]
    context_preview = "\n\n---\n\n".join(
        f"[{c.document_name}, p.{c.page_number or 'N/A'}]\n{c.content[:500]}"
        for c in top_chunks
    )

    client = Groq(api_key=settings.groq_api_key)

    try:
        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": EVALUATOR_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Question: {query}\n\nRetrieved Context:\n{context_preview}\n\nIs this context sufficient?",
                },
            ],
            temperature=0.1,
            max_tokens=400,
        )

        raw = response.choices[0].message.content.strip()
        raw = raw.strip("`").strip()
        if raw.startswith("json"):
            raw = raw[4:].strip()

        data = json.loads(raw)

        return EvaluationResult(
            is_sufficient=data.get("is_sufficient", True),
            confidence=float(data.get("confidence", 0.7)),
            missing_aspects=data.get("missing_aspects", []),
            follow_up_queries=data.get("follow_up_queries", []),
            reasoning=data.get("reasoning", ""),
        )

    except Exception as e:
        # If evaluation fails, assume sufficient and proceed to synthesis
        avg_score = sum(c.relevance_score for c in top_chunks) / len(top_chunks)
        return EvaluationResult(
            is_sufficient=avg_score >= 0.4,
            confidence=avg_score,
            missing_aspects=[],
            follow_up_queries=[],
            reasoning=f"Evaluation error, falling back to relevance score: {avg_score:.2f}",
        )
