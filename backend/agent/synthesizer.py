"""
Agent Synthesizer — Step 4 of the reasoning loop.
Generates the final answer using the Groq API with the retrieved context,
extracting inline citations (document name + page number) from the response.
"""
import re
from typing import List, AsyncGenerator
from groq import Groq
from services.embedder import RetrievedChunk
from models.chat import CitationInMessage
from config import get_settings

settings = get_settings()


SYNTHESIZER_SYSTEM_PROMPT = """You are Synthesis, an expert AI research assistant. 
You answer questions based strictly on the provided document context.

Rules:
1. Answer in clear, well-structured markdown (use headers, bullets, code blocks where appropriate).
2. Every factual claim must be cited inline using [DocName, p.X] notation.
   Example: "Normalization reduces redundancy [DBMS Notes.pdf, p.12]."
3. If the context doesn't contain enough information, say so clearly — don't hallucinate.
4. Be thorough but concise. Prefer structured answers over walls of text.
5. If multiple documents have relevant info, cross-reference them explicitly."""


def _build_context(chunks: List[RetrievedChunk]) -> str:
    """Format retrieved chunks into a context block for the LLM."""
    return "\n\n---\n\n".join(
        f"[Source: {c.document_name}, Page: {c.page_number or 'N/A'}]\n{c.content}"
        for c in chunks
    )


def _extract_citations(
    answer: str,
    retrieved_chunks: List[RetrievedChunk],
) -> List[CitationInMessage]:
    """
    Parse [DocName, p.X] citations from the answer text
    and match them to the retrieved chunks for structured citation data.
    """
    citation_pattern = re.compile(r'\[([^\]]+),\s*p\.\s*(\d+|N/A)\]')
    matches = citation_pattern.findall(answer)

    citations = []
    seen = set()

    for doc_name_fragment, page_str in matches:
        doc_name_fragment = doc_name_fragment.strip()
        page_num = int(page_str) if page_str.isdigit() else None

        # Find the best matching chunk
        best_chunk = None
        for chunk in retrieved_chunks:
            if doc_name_fragment.lower() in chunk.document_name.lower():
                if page_num is None or chunk.page_number == page_num:
                    best_chunk = chunk
                    break
                elif best_chunk is None:
                    best_chunk = chunk  # fallback: same doc, different page

        if best_chunk:
            key = (best_chunk.document_id, page_num)
            if key not in seen:
                seen.add(key)
                citations.append(
                    CitationInMessage(
                        document_id=best_chunk.document_id,
                        document_name=best_chunk.document_name,
                        page_number=page_num or best_chunk.page_number,
                        excerpt=best_chunk.content[:300],
                        relevance_score=best_chunk.relevance_score,
                    )
                )

    # If no citations were parsed, add the top chunks as implicit sources
    if not citations:
        for chunk in retrieved_chunks[:3]:
            key = (chunk.document_id, chunk.page_number)
            if key not in seen:
                seen.add(key)
                citations.append(
                    CitationInMessage(
                        document_id=chunk.document_id,
                        document_name=chunk.document_name,
                        page_number=chunk.page_number,
                        excerpt=chunk.content[:300],
                        relevance_score=chunk.relevance_score,
                    )
                )

    return citations


def synthesize_answer(
    query: str,
    retrieved_chunks: List[RetrievedChunk],
    chat_history: List[dict] = None,
) -> tuple[str, List[CitationInMessage]]:
    """
    Generate a final answer synchronously using the Groq API.
    Returns (answer_text, citations).
    """
    client = Groq(api_key=settings.groq_api_key)
    context = _build_context(retrieved_chunks)

    messages = [{"role": "system", "content": SYNTHESIZER_SYSTEM_PROMPT}]

    # Include recent chat history for context
    if chat_history:
        for msg in chat_history[-4:]:  # Last 2 exchanges
            messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({
        "role": "user",
        "content": f"Context from documents:\n{context}\n\nQuestion: {query}",
    })

    response = client.chat.completions.create(
        model=settings.groq_model,
        messages=messages,
        temperature=0.3,
        max_tokens=2048,
    )

    answer = response.choices[0].message.content
    citations = _extract_citations(answer, retrieved_chunks)
    return answer, citations


async def synthesize_answer_stream(
    query: str,
    retrieved_chunks: List[RetrievedChunk],
    chat_history: List[dict] = None,
) -> AsyncGenerator[str, None]:
    """
    Stream the answer token by token using Groq's streaming API.
    Yields text tokens as they arrive.
    """
    client = Groq(api_key=settings.groq_api_key)
    context = _build_context(retrieved_chunks)

    messages = [{"role": "system", "content": SYNTHESIZER_SYSTEM_PROMPT}]

    if chat_history:
        for msg in chat_history[-4:]:
            messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({
        "role": "user",
        "content": f"Context from documents:\n{context}\n\nQuestion: {query}",
    })

    stream = client.chat.completions.create(
        model=settings.groq_model,
        messages=messages,
        temperature=0.3,
        max_tokens=2048,
        stream=True,
    )

    for chunk in stream:
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content
