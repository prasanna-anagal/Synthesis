"""
Unit tests for quiz generator difficulty adaptation and mastery logic.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.quiz_generator import calculate_next_difficulty, calculate_mastery_level
from models.quiz import Difficulty


def test_calculate_next_difficulty_upgrade():
    next_diff = calculate_next_difficulty(Difficulty.EASY, recent_correct=5, recent_total=5)
    assert next_diff == Difficulty.MEDIUM

    next_diff_hard = calculate_next_difficulty(Difficulty.MEDIUM, recent_correct=5, recent_total=5)
    assert next_diff_hard == Difficulty.HARD


def test_calculate_next_difficulty_downgrade():
    next_diff = calculate_next_difficulty(Difficulty.HARD, recent_correct=1, recent_total=5)
    assert next_diff == Difficulty.MEDIUM

    next_diff_easy = calculate_next_difficulty(Difficulty.MEDIUM, recent_correct=1, recent_total=5)
    assert next_diff_easy == Difficulty.EASY


def test_calculate_mastery_level():
    history = [
        {"score": 50.0, "total_questions": 10},
        {"score": 80.0, "total_questions": 10},
        {"score": 90.0, "total_questions": 10},
    ]
    mastery = calculate_mastery_level(history)
    assert 0.0 <= mastery <= 1.0
    assert mastery > 0.7
