-- ============================================================
-- Synthesis — Initial Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension (already enabled in Supabase by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────────────────
-- FOLDERS
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS folders (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_folders_user_id ON folders(user_id);

-- ──────────────────────────────────────────────────────────
-- DOCUMENTS
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folder_id     UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename      TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path     TEXT NOT NULL,
    file_type     TEXT NOT NULL,       -- 'pdf' | 'docx' | 'txt'
    file_size     BIGINT NOT NULL,     -- bytes
    page_count    INT,
    status        TEXT NOT NULL DEFAULT 'pending',  -- pending | processing | indexed | error
    error_message TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_folder_id ON documents(folder_id);
CREATE INDEX idx_documents_user_id   ON documents(user_id);
CREATE INDEX idx_documents_status    ON documents(status);

-- ──────────────────────────────────────────────────────────
-- DOCUMENT CHUNKS (metadata only — content is in ChromaDB)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_chunks (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index  INT NOT NULL,
    page_number  INT,
    char_start   INT,
    char_end     INT,
    chroma_id    TEXT NOT NULL UNIQUE,   -- ChromaDB document ID
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chunks_document_id ON document_chunks(document_id);

-- ──────────────────────────────────────────────────────────
-- CHATS
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chats (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id  UUID REFERENCES folders(id) ON DELETE SET NULL,
    title      TEXT NOT NULL DEFAULT 'New Chat',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chats_user_id   ON chats(user_id);
CREATE INDEX idx_chats_folder_id ON chats(folder_id);

-- ──────────────────────────────────────────────────────────
-- MESSAGES
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id         UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role            TEXT NOT NULL,   -- 'user' | 'assistant'
    content         TEXT NOT NULL,
    citations       JSONB,           -- array of CitationInMessage objects
    reasoning_steps JSONB,           -- array of step strings
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);

-- ──────────────────────────────────────────────────────────
-- QUIZ ATTEMPTS
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id        UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    score            FLOAT NOT NULL DEFAULT 0,
    total_questions  INT NOT NULL DEFAULT 0,
    correct_answers  INT NOT NULL DEFAULT 0,
    mastery_level    FLOAT NOT NULL DEFAULT 0,  -- 0.0 - 1.0
    questions_json   JSONB NOT NULL,
    answers_json     JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at     TIMESTAMPTZ
);

CREATE INDEX idx_quiz_user_id   ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_folder_id ON quiz_attempts(folder_id);

-- ──────────────────────────────────────────────────────────
-- CONCEPT GRAPH CACHE
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS concept_graph_cache (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folder_id  UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE UNIQUE,
    nodes_json JSONB NOT NULL,
    edges_json JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_graph_folder_id ON concept_graph_cache(folder_id);

-- ──────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_folders_updated_at
    BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_chats_updated_at
    BEFORE UPDATE ON chats
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ──────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────────────────
ALTER TABLE folders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats                ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_graph_cache  ENABLE ROW LEVEL SECURITY;

-- Folders: users only see their own
CREATE POLICY folders_owner ON folders
    USING (auth.uid() = user_id);

-- Documents: users only see their own
CREATE POLICY documents_owner ON documents
    USING (auth.uid() = user_id);

-- Chunks: accessible if user owns the document
CREATE POLICY chunks_owner ON document_chunks
    USING (
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = document_chunks.document_id
            AND d.user_id = auth.uid()
        )
    );

-- Chats: users only see their own
CREATE POLICY chats_owner ON chats
    USING (auth.uid() = user_id);

-- Messages: accessible if user owns the chat
CREATE POLICY messages_owner ON messages
    USING (
        EXISTS (
            SELECT 1 FROM chats c
            WHERE c.id = messages.chat_id
            AND c.user_id = auth.uid()
        )
    );

-- Quiz attempts: users only see their own
CREATE POLICY quiz_owner ON quiz_attempts
    USING (auth.uid() = user_id);

-- Graph cache: accessible if user owns the folder
CREATE POLICY graph_owner ON concept_graph_cache
    USING (
        EXISTS (
            SELECT 1 FROM folders f
            WHERE f.id = concept_graph_cache.folder_id
            AND f.user_id = auth.uid()
        )
    );
