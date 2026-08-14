"""
Quiz generation service.
Uses Groq API to generate multiple-choice questions from document chunks,
with adaptive difficulty tracking.
"""
import json
import uuid
from typing import List, Optional
from groq import Groq
from config import get_settings
from models.quiz import QuizQuestion, Difficulty

settings = get_settings()


def _get_groq_client() -> Groq:
    return Groq(api_key=settings.groq_api_key)


DIFFICULTY_PROMPTS = {
    Difficulty.EASY: "basic comprehension, definitions, and simple facts",
    Difficulty.MEDIUM: "application, comparison, and understanding of relationships between concepts",
    Difficulty.HARD: "analysis, synthesis, edge cases, and deeper conceptual reasoning",
}

QUIZ_SYSTEM_PROMPT = """You are an expert educational quiz creator. Your job is to create high-quality multiple-choice questions from provided document content. 

Rules:
- Questions must be directly answerable from the provided content
- All 4 options should be plausible but only one correct
- Distractors should be believable, not obviously wrong
- Include a brief explanation for the correct answer
- Return ONLY valid JSON, no markdown fences, no extra text"""

QUIZ_USER_TEMPLATE = """Generate {num_questions} multiple-choice quiz questions from the following document content.

Focus on: {difficulty_desc}
Document: {doc_name}
Page: {page_info}

Content:
{content}

Return a JSON array with this exact structure:
[
  {{
    "question": "What is...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": 0,
    "explanation": "The answer is A because...",
    "difficulty": "{difficulty}"
  }}
]"""


def generate_quiz_questions(
    chunks_with_meta: List[dict],
    num_questions: int = 10,
    difficulty: Difficulty = Difficulty.MEDIUM,
) -> List[QuizQuestion]:
    """
    Generate quiz questions from document chunks using the Groq API.
    Distributes questions across chunks proportionally.
    """
    if not chunks_with_meta:
        return []

    client = _get_groq_client()
    all_questions: List[QuizQuestion] = []

    num_chunks = min(len(chunks_with_meta), num_questions)
    questions_per_chunk = max(1, num_questions // num_chunks)
    remaining = num_questions

    for i, chunk in enumerate(chunks_with_meta[:num_chunks]):
        if remaining <= 0:
            break

        q_count = questions_per_chunk if i < num_chunks - 1 else remaining

        page_info = f"Page {chunk.get('page_number', 'N/A')}" if chunk.get('page_number') else "N/A"
        
        prompt = QUIZ_USER_TEMPLATE.format(
            num_questions=q_count,
            difficulty_desc=DIFFICULTY_PROMPTS[difficulty],
            doc_name=chunk.get("document_name", "Document"),
            page_info=page_info,
            content=chunk["content"][:3000],
            difficulty=difficulty.value,
        )

        try:
            response = client.chat.completions.create(
                model=settings.groq_model,
                messages=[
                    {"role": "system", "content": QUIZ_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                max_tokens=2000,
            )

            raw = response.choices[0].message.content.strip()
            raw = raw.strip("`").strip()
            if raw.startswith("json"):
                raw = raw[4:]

            questions_data = json.loads(raw)

            for q_data in questions_data[:q_count]:
                all_questions.append(
                    QuizQuestion(
                        id=str(uuid.uuid4()),
                        question=q_data["question"],
                        options=q_data["options"],
                        correct_index=q_data["correct_index"],
                        explanation=q_data["explanation"],
                        difficulty=Difficulty(q_data.get("difficulty", difficulty.value)),
                        source_document=chunk.get("document_name", "Document"),
                        source_page=chunk.get("page_number"),
                    )
                )
                remaining -= 1

        except Exception as e:
            print(f"Quiz generation error for chunk {i}: {e}")
            continue

    return all_questions


def calculate_next_difficulty(
    current_difficulty: Difficulty,
    recent_correct: int,
    recent_total: int,
) -> Difficulty:
    if recent_total == 0:
        return current_difficulty

    accuracy = recent_correct / recent_total

    if accuracy >= 0.8:
        if current_difficulty == Difficulty.EASY:
            return Difficulty.MEDIUM
        elif current_difficulty == Difficulty.MEDIUM:
            return Difficulty.HARD
        return Difficulty.HARD
    elif accuracy <= 0.4:
        if current_difficulty == Difficulty.HARD:
            return Difficulty.MEDIUM
        elif current_difficulty == Difficulty.MEDIUM:
            return Difficulty.EASY
        return Difficulty.EASY
    else:
        return current_difficulty


def calculate_mastery_level(
    attempt_history: List[dict],
) -> float:
    """
    Calculate a mastery level (0.0–1.0) based on quiz attempt history.
    Weighted toward recent attempts.
    """
    if not attempt_history:
        return 0.0

    total_weight = 0.0
    weighted_score = 0.0
    decay = 0.7

    for i, attempt in enumerate(reversed(attempt_history)):
        weight = decay ** i
        raw_score = attempt.get("score", 0)
        # Normalize percentage score (0-100) to ratio (0.0-1.0)
        score_ratio = (raw_score / 100.0) if raw_score > 1.0 else raw_score
        weighted_score += score_ratio * weight
        total_weight += weight

    return min(1.0, round(weighted_score / total_weight, 3)) if total_weight > 0 else 0.0
