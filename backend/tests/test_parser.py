"""
Unit tests for document parsing and text chunking logic.
"""
import os
import tempfile
import pytest
from services.parser import parse_txt, _chunk_text


def test_chunk_text_basic():
    text = "Sentence one. Sentence two. Sentence three. Sentence four. Sentence five."
    chunks = _chunk_text(text, page_number=1, chunk_size=30, chunk_overlap=10)
    assert len(chunks) > 0
    assert chunks[0].page_number == 1
    assert chunks[0].chunk_index == 0


def test_parse_txt_file():
    with tempfile.NamedTemporaryFile(mode="w+", delete=False, suffix=".txt", encoding="utf-8") as f:
        f.write("This is a sample document for testing Synthesis RAG ingestion.\n" * 10)
        temp_path = f.name

    try:
        chunks, page_count = parse_txt(temp_path)
        assert len(chunks) > 0
        assert page_count >= 1
        assert "sample document" in chunks[0].content
    finally:
        os.remove(temp_path)


def test_chunk_indexing_sequence():
    text = "A " * 500
    chunks = _chunk_text(text, page_number=2, chunk_size=100, chunk_overlap=20, start_chunk_index=5)
    assert len(chunks) > 0
    assert chunks[0].chunk_index == 5
    assert chunks[1].chunk_index == 6
