"""
Knowledge graph extraction service.
Extracts named entities and key concepts from document chunks,
then builds a graph of relationships between them for D3.js visualization.
Uses spaCy for NER + noun chunk extraction (no API calls needed).
"""
import uuid
import re
from typing import List, Dict, Any, Set, Tuple
from collections import Counter, defaultdict
import spacy

# Load spaCy model (english, small — install with: python -m spacy download en_core_web_sm)
_nlp = None


def get_nlp():
    global _nlp
    if _nlp is None:
        try:
            _nlp = spacy.load("en_core_web_sm")
        except OSError:
            # Fallback: download model if not present
            import subprocess
            subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"])
            _nlp = spacy.load("en_core_web_sm")
    return _nlp


STOP_ENTITIES = {
    "the", "a", "an", "this", "that", "these", "those",
    "it", "they", "we", "you", "he", "she", "i",
}

ENTITY_TYPES_KEEP = {"PERSON", "ORG", "GPE", "PRODUCT", "EVENT", "WORK_OF_ART", "LAW", "LANGUAGE", "NORP"}


def _extract_concepts(text: str) -> List[str]:
    """Extract named entities and key noun phrases from text."""
    nlp = get_nlp()
    doc = nlp(text[:10000])  # limit for performance

    concepts = []

    # Named entities
    for ent in doc.ents:
        if ent.label_ in ENTITY_TYPES_KEEP:
            concept = ent.text.strip().lower()
            if len(concept) > 2 and concept not in STOP_ENTITIES:
                concepts.append(concept)

    # Noun chunks (key phrases)
    for chunk in doc.noun_chunks:
        concept = chunk.root.text.strip().lower()
        if (
            len(concept) > 3
            and concept not in STOP_ENTITIES
            and not concept.isnumeric()
        ):
            concepts.append(concept)

    return concepts


def extract_graph_from_chunks(
    chunks_with_meta: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Build a concept graph from document chunks.
    
    Args:
        chunks_with_meta: list of dicts with keys:
            - content: str
            - document_id: str
            - document_name: str
            - page_number: int | None
    
    Returns:
        {"nodes": [...], "edges": [...]}
        Compatible with D3.js force-directed graph.
    """
    # concept → {doc_ids, doc_names, frequency}
    concept_data: Dict[str, Dict] = defaultdict(lambda: {
        "doc_ids": set(),
        "doc_names": set(),
        "frequency": 0,
    })

    # co-occurrence: (concept_a, concept_b) → count
    co_occurrence: Counter = Counter()

    for chunk in chunks_with_meta:
        text = chunk["content"]
        doc_id = chunk["document_id"]
        doc_name = chunk["document_name"]

        concepts = _extract_concepts(text)
        unique_in_chunk = list(set(concepts))

        for concept in unique_in_chunk:
            concept_data[concept]["doc_ids"].add(doc_id)
            concept_data[concept]["doc_names"].add(doc_name)
            concept_data[concept]["frequency"] += 1

        # Build co-occurrence pairs within this chunk
        for i, c1 in enumerate(unique_in_chunk):
            for c2 in unique_in_chunk[i + 1:]:
                pair = tuple(sorted([c1, c2]))
                co_occurrence[pair] += 1

    # Filter to concepts that appear at least twice (reduce noise)
    significant_concepts = {
        k: v for k, v in concept_data.items()
        if v["frequency"] >= 2
    }

    # Take top 80 concepts by frequency for visualization
    top_concepts = sorted(
        significant_concepts.items(),
        key=lambda x: x[1]["frequency"],
        reverse=True,
    )[:80]

    top_concept_names = {name for name, _ in top_concepts}

    # Build D3 nodes
    nodes = []
    for concept, data in top_concepts:
        nodes.append({
            "id": concept,
            "label": concept.title(),
            "frequency": data["frequency"],
            "doc_ids": list(data["doc_ids"]),
            "doc_names": list(data["doc_names"]),
            "group": len(data["doc_ids"]),  # color by number of documents it spans
        })

    # Build D3 edges (only between top concepts, with min co-occurrence of 1)
    edges = []
    seen_pairs: Set[Tuple] = set()
    for (c1, c2), count in co_occurrence.most_common(200):
        if c1 in top_concept_names and c2 in top_concept_names:
            pair = tuple(sorted([c1, c2]))
            if pair not in seen_pairs:
                edges.append({
                    "source": c1,
                    "target": c2,
                    "weight": count,
                })
                seen_pairs.add(pair)

    return {"nodes": nodes, "edges": edges}
