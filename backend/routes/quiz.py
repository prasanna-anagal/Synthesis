"""
Quiz routes — generate questions, track attempts, and adapt difficulty.
"""
import json
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from database import get_supabase_admin
from auth import get_current_user
from models.quiz import QuizGenerateRequest, QuizAttemptCreate, QuizAnswerSubmit, QuizAttemptResponse, Difficulty
from services.quiz_generator import generate_quiz_questions, calculate_next_difficulty, calculate_mastery_level
from services.embedder import get_or_create_collection

router = APIRouter(prefix="/quiz", tags=["quiz"])


@router.post("/generate")
async def generate_quiz(
    payload: QuizGenerateRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase_admin),
):
    """Generate quiz questions from a folder's documents."""
    folder = (
        db.table("folders")
        .select("id")
        .eq("id", payload.folder_id)
        .eq("user_id", current_user["id"])
        .execute()
    )
    if not folder.data:
        raise HTTPException(status_code=404, detail="Folder not found")

    collection = get_or_create_collection(payload.folder_id)
    try:
        all_data = collection.get(include=["documents", "metadatas"])
    except Exception:
        raise HTTPException(status_code=400, detail="No indexed documents found. Upload and process documents first.")

    if not all_data.get("documents"):
        raise HTTPException(status_code=400, detail="No content indexed for this folder yet.")

    chunks_with_meta = []
    seen_pages = set()
    for i, content in enumerate(all_data["documents"]):
        meta = all_data["metadatas"][i] if all_data.get("metadatas") else {}
        page_key = (meta.get("document_id", ""), meta.get("page_number", i))
        if page_key not in seen_pages:
            chunks_with_meta.append({
                "content": content,
                "document_id": meta.get("document_id", ""),
                "document_name": meta.get("document_name", "Document"),
                "page_number": meta.get("page_number"),
            })
            seen_pages.add(page_key)

    questions = generate_quiz_questions(
        chunks_with_meta=chunks_with_meta[:20],
        num_questions=payload.num_questions,
        difficulty=payload.difficulty,
    )

    if not questions:
        raise HTTPException(status_code=500, detail="Failed to generate quiz questions. Check GROQ_API_KEY.")

    attempt_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    questions_json = [q.dict() for q in questions]

    db.table("quiz_attempts").insert({
        "id": attempt_id,
        "user_id": current_user["id"],
        "folder_id": payload.folder_id,
        "score": 0,
        "total_questions": len(questions),
        "correct_answers": 0,
        "mastery_level": 0,
        "questions_json": json.dumps(questions_json),
        "created_at": now,
    }).execute()

    return {
        "attempt_id": attempt_id,
        "questions": questions_json,
        "total": len(questions),
    }


@router.post("/submit")
async def submit_answer(
    payload: QuizAnswerSubmit,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase_admin),
):
    """Submit an answer for a quiz question and get adaptive next difficulty."""
    attempt = (
        db.table("quiz_attempts")
        .select("*")
        .eq("id", payload.attempt_id)
        .eq("user_id", current_user["id"])
        .execute()
    )

    if not attempt.data:
        raise HTTPException(status_code=404, detail="Quiz attempt not found")

    attempt_data = attempt.data[0]
    questions = json.loads(attempt_data["questions_json"])

    question = next((q for q in questions if q["id"] == payload.question_id), None)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    is_correct = payload.selected_index == question["correct_index"]

    answers = json.loads(attempt_data.get("answers_json") or "[]")
    answers.append({
        "question_id": payload.question_id,
        "selected_index": payload.selected_index,
        "is_correct": is_correct,
        "time_taken_seconds": payload.time_taken_seconds,
    })

    correct_total = sum(1 for a in answers if a["is_correct"])
    score = (correct_total / len(questions)) * 100

    db.table("quiz_attempts").update({
        "correct_answers": correct_total,
        "score": score,
        "answers_json": json.dumps(answers),
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("id", payload.attempt_id).execute()

    recent_answers = answers[-5:]
    recent_correct = sum(1 for a in recent_answers if a["is_correct"])
    current_diff = Difficulty(question.get("difficulty", "medium"))
    next_difficulty = calculate_next_difficulty(current_diff, recent_correct, len(recent_answers))

    return {
        "is_correct": is_correct,
        "correct_index": question["correct_index"],
        "explanation": question["explanation"],
        "next_difficulty": next_difficulty,
        "current_score": score,
        "correct_answers": correct_total,
    }


@router.post("/{attempt_id}/complete")
async def complete_quiz(
    attempt_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase_admin),
):
    """Mark a quiz attempt as complete and calculate mastery level."""
    attempt = (
        db.table("quiz_attempts")
        .select("*")
        .eq("id", attempt_id)
        .eq("user_id", current_user["id"])
        .execute()
    )

    if not attempt.data:
        raise HTTPException(status_code=404, detail="Attempt not found")

    attempt_data = attempt.data[0]
    past_attempts = (
        db.table("quiz_attempts")
        .select("score, total_questions")
        .eq("folder_id", attempt_data["folder_id"])
        .eq("user_id", current_user["id"])
        .order("created_at")
        .execute()
    )

    mastery = calculate_mastery_level(past_attempts.data or [])
    now = datetime.utcnow().isoformat()

    db.table("quiz_attempts").update({
        "mastery_level": mastery,
        "completed_at": now,
    }).eq("id", attempt_id).execute()

    return {
        "mastery_level": mastery,
        "final_score": attempt_data["score"],
        "total_questions": attempt_data["total_questions"],
        "correct_answers": attempt_data["correct_answers"],
    }


@router.get("/history/{folder_id}")
async def get_quiz_history(
    folder_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_supabase_admin),
):
    """Get quiz attempt history for a folder."""
    response = (
        db.table("quiz_attempts")
        .select("id, score, total_questions, correct_answers, mastery_level, created_at, completed_at")
        .eq("folder_id", folder_id)
        .eq("user_id", current_user["id"])
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )
    return response.data or []
