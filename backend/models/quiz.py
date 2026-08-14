from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class QuizQuestion(BaseModel):
    id: str
    question: str
    options: List[str]
    correct_index: int
    explanation: str
    difficulty: Difficulty
    source_document: str
    source_page: Optional[int] = None


class QuizGenerateRequest(BaseModel):
    folder_id: str
    num_questions: int = 10
    difficulty: Difficulty = Difficulty.MEDIUM


class QuizAttemptCreate(BaseModel):
    folder_id: str
    questions: List[QuizQuestion]


class QuizAnswerSubmit(BaseModel):
    attempt_id: str
    question_id: str
    selected_index: int
    time_taken_seconds: Optional[int] = None


class QuizAttemptResponse(BaseModel):
    id: str
    folder_id: str
    user_id: str
    score: float
    total_questions: int
    correct_answers: int
    mastery_level: float  # 0.0 - 1.0
    questions_json: List[Dict[str, Any]]
    created_at: datetime
    completed_at: Optional[datetime] = None
