"""
Knowledge graph extraction service.
Extracts key concepts and entities from document chunks,
then builds a graph of relationships between them for D3.js visualization.
Includes a pure-Python regex + keyphrase fallback if spaCy is not installed.
"""
import uuid
import re
from typing import List, Dict, Any, Set, Tuple
from collections import Counter, defaultdict

# Try importing spaCy, fall back gracefully if not available
_nlp = None
_spacy_available = False

try:
    import spacy
    _spacy_available = True
except ImportError:
    _spacy_available = False


def get_nlp():
    global _nlp, _spacy_available
    if not _spacy_available:
        return None
    if _nlp is None:
        try:
            _nlp = spacy.load("en_core_web_sm")
        except Exception:
            _spacy_available = False
            return None
    return _nlp


STOP_WORDS = {
    "the", "a", "an", "this", "that", "these", "those", "it", "they", "we", "you",
    "he", "she", "i", "is", "are", "was", "were", "be", "been", "being", "have",
    "has", "had", "do", "does", "did", "but", "at", "by", "with", "from", "here",
    "there", "when", "where", "why", "how", "all", "any", "both", "each", "few",
    "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own",
    "same", "so", "than", "too", "very", "can", "will", "just", "should", "now",
    "using", "used", "also", "into", "over", "after", "before", "between",
}

ENTITY_TYPES_KEEP = {"PERSON", "ORG", "GPE", "PRODUCT", "EVENT", "WORK_OF_ART", "LAW", "LANGUAGE", "NORP"}


def _extract_concepts_fallback(text: str) -> List[str]:
    """Pure-Python regex keyphrase & capitalized entity extractor."""
    concepts = []
    # 1. Capitalized words/phrases (likely proper nouns / entities)
    capitalized = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)
    for term in capitalized:
        clean = term.strip().lower()
        if len(clean) > 3 and clean not in STOP_WORDS:
            concepts.append(clean)

    # 2. Key technical terms (words of length > 4)
    words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
    for w in words:
        if w not in STOP_WORDS and not w.isnumeric():
            concepts.append(w)

    return concepts


def _extract_concepts(text: str) -> List[str]:
    """Extract entities using spaCy if installed, otherwise regex fallback."""
    nlp = get_nlp()
    if nlp is None:
        return _extract_concepts_fallback(text)

    doc = nlp(text[:10000])
    concepts = []

    for ent in doc.ents:
        if ent.label_ in ENTITY_TYPES_KEEP:
            concept = ent.text.strip().lower()
            if len(concept) > 2 and concept not in STOP_WORDS:
                concepts.append(concept)

    for chunk in doc.noun_chunks:
        concept = chunk.root.text.strip().lower()
        if len(concept) > 3 and concept not in STOP_WORDS and not concept.isnumeric():
            concepts.append(concept)

    return concepts


def extract_graph_from_chunks(
    chunks_with_meta: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Build D3.js force-directed graph JSON from document chunks."""
    concept_data: Dict[str, Dict] = defaultdict(lambda: {
        "doc_ids": set(),
        "doc_names": set(),
        "frequency": 0,
    })
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

        for i, c1 in enumerate(unique_in_chunk):
            for c2 in unique_in_chunk[i + 1:]:
                pair = tuple(sorted([c1, c2]))
                co_occurrence[pair] += 1

    significant_concepts = {
        k: v for k, v in concept_data.items()
        if v["frequency"] >= 2
    }

    top_concepts = sorted(
        significant_concepts.items(),
        key=lambda x: x[1]["frequency"],
        reverse=True,
    )[:80]

    top_concept_names = {name for name, _ in top_concepts}

    nodes = []
    for concept, data in top_concepts:
        nodes.append({
            "id": concept,
            "label": concept.title(),
            "frequency": data["frequency"],
            "doc_ids": list(data["doc_ids"]),
            "doc_names": list(data["doc_names"]),
            "group": len(data["doc_ids"]),
        })

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
