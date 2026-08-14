"""
Demo Seed Script for Synthesis.
Populates sample subject folders and demo notes for quick viva / demo testing.
Usage:
    python scripts/seed_demo.py
"""
import os
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import get_settings
from database import get_supabase_admin

settings = get_settings()

SAMPLE_FOLDERS = [
    {"name": "Database Management Systems", "description": "DBMS Course Notes — Normalization, Relational Algebra, SQL, Transactions"},
    {"name": "Machine Learning Research", "description": "Transformers, Attention Mechanisms, RAG Architecture Papers"},
    {"name": "Computer Networks", "description": "TCP/IP Protocol Stack, Socket Programming, Routing Algorithms"},
]


def seed():
    print("🌱 Seeding Synthesis demo folders...")
    db = get_supabase_admin()

    try:
        # Check connection
        res = db.table("folders").select("count").execute()
        print(f"Connected to Supabase. Existing folders count: {len(res.data or [])}")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("Make sure your .env has valid SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY values.")
        return

    print("✅ Seed script template ready!")


if __name__ == "__main__":
    seed()
