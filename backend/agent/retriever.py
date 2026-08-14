"""
Agent Retriever — Step 2 of the reasoning loop.
Executes vector searches based on the planner's strategy.
"""
from typing import List, Optional
from agent.planner import RetrievalPlan
from services.embedder import search_folder, RetrievedChunk
from config import get_settings

settings = get_settings()


def execute_retrieval(
    folder_id: str,
    plan: RetrievalPlan,
    top_k: Optional[int] = None,
) -> List[RetrievedChunk]:
    """
    Execute retrieval based on the plan's strategy.
    
    - single_doc: search within each targeted document
    - multi_doc: search within each targeted document, merge results
    - folder_wide: search entire folder collection
    
    Returns deduplicated chunks sorted by relevance.
    """
    k = top_k or settings.top_k_chunks
    all_results: List[RetrievedChunk] = []
    seen_ids = set()

    def _add_unique(chunks: List[RetrievedChunk]):
        for chunk in chunks:
            if chunk.chroma_id not in seen_ids:
                seen_ids.add(chunk.chroma_id)
                all_results.append(chunk)

    if plan.strategy == "single_doc" and plan.target_document_ids:
        # Search each targeted document with each search query
        for doc_id in plan.target_document_ids:
            for query in plan.search_queries:
                results = search_folder(
                    folder_id=folder_id,
                    query=query,
                    top_k=k,
                    document_id=doc_id,
                )
                _add_unique(results)

    elif plan.strategy == "multi_doc" and plan.target_document_ids:
        # Search each targeted document
        for doc_id in plan.target_document_ids:
            for query in plan.search_queries:
                results = search_folder(
                    folder_id=folder_id,
                    query=query,
                    top_k=max(2, k // len(plan.target_document_ids)),
                    document_id=doc_id,
                )
                _add_unique(results)

    else:
        # folder_wide: search entire collection with all query variants
        for query in plan.search_queries:
            results = search_folder(
                folder_id=folder_id,
                query=query,
                top_k=k,
            )
            _add_unique(results)

    # Sort by relevance and cap total
    all_results.sort(key=lambda x: x.relevance_score, reverse=True)
    return all_results[:k * 2]  # Return up to 2x top_k for evaluator to assess
