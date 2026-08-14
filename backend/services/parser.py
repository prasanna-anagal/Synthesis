"""
Document parsing service.
Handles PDF (pdfplumber), DOCX (python-docx), and plain TXT files.
Returns a list of chunks with page number metadata for accurate citations.
"""
import os
import re
from pathlib import Path
from typing import List, Dict, Optional
import pdfplumber
from docx import Document as DocxDocument
from config import get_settings

settings = get_settings()


class ParsedChunk:
    """A chunk of text from a document with source metadata."""
    def __init__(
        self,
        content: str,
        page_number: Optional[int],
        chunk_index: int,
        char_start: int,
        char_end: int,
    ):
        self.content = content
        self.page_number = page_number
        self.chunk_index = chunk_index
        self.char_start = char_start
        self.char_end = char_end


def _chunk_text(
    text: str,
    page_number: Optional[int],
    chunk_size: int,
    chunk_overlap: int,
    start_chunk_index: int = 0,
    char_offset: int = 0,
) -> List[ParsedChunk]:
    """Split a block of text into overlapping chunks."""
    chunks = []
    start = 0
    chunk_index = start_chunk_index

    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunk_text = text[start:end].strip()
        if chunk_text:
            chunks.append(
                ParsedChunk(
                    content=chunk_text,
                    page_number=page_number,
                    chunk_index=chunk_index,
                    char_start=char_offset + start,
                    char_end=char_offset + end,
                )
            )
            chunk_index += 1
        start += chunk_size - chunk_overlap

    return chunks


def parse_pdf(file_path: str) -> tuple[List[ParsedChunk], int]:
    """
    Parse a PDF with pdfplumber, preserving page numbers for accurate citations.
    Returns (chunks, page_count).
    """
    chunks: List[ParsedChunk] = []
    chunk_size = settings.chunk_size
    chunk_overlap = settings.chunk_overlap

    with pdfplumber.open(file_path) as pdf:
        page_count = len(pdf.pages)
        global_chunk_index = 0

        for page_num, page in enumerate(pdf.pages, start=1):
            text = page.extract_text()
            if not text:
                continue
            text = re.sub(r'\n{3,}', '\n\n', text).strip()
            page_chunks = _chunk_text(
                text=text,
                page_number=page_num,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                start_chunk_index=global_chunk_index,
            )
            chunks.extend(page_chunks)
            global_chunk_index += len(page_chunks)

    return chunks, page_count


def parse_docx(file_path: str) -> tuple[List[ParsedChunk], int]:
    """
    Parse a DOCX file paragraph by paragraph.
    Page numbers are approximated (Word doesn't expose exact page breaks easily).
    Returns (chunks, estimated_page_count).
    """
    doc = DocxDocument(file_path)
    full_text = "\n".join(
        para.text for para in doc.paragraphs if para.text.strip()
    )
    # Rough page estimate: ~300 words per page
    word_count = len(full_text.split())
    page_count = max(1, word_count // 300)

    chunks = _chunk_text(
        text=full_text,
        page_number=None,  # DOCX doesn't have reliable page numbers
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )
    return chunks, page_count


def parse_txt(file_path: str) -> tuple[List[ParsedChunk], int]:
    """Parse a plain text file."""
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        full_text = f.read()

    word_count = len(full_text.split())
    page_count = max(1, word_count // 300)

    chunks = _chunk_text(
        text=full_text,
        page_number=None,
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )
    return chunks, page_count


def parse_document(file_path: str, file_type: str) -> tuple[List[ParsedChunk], int]:
    """
    Dispatch to the appropriate parser based on file type.
    Returns (chunks, page_count).
    """
    file_type = file_type.lower().lstrip(".")
    if file_type == "pdf":
        return parse_pdf(file_path)
    elif file_type == "docx":
        return parse_docx(file_path)
    elif file_type == "txt":
        return parse_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")
