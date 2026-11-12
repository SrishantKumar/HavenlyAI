-- Migration: 20261112_quest_progress.sql
-- Description: Grounding Quests & Gamification progress tracking with RLS

CREATE TABLE IF NOT EXISTS public.quest_progress (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_quest_date DATE,
    badges JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for lookup efficiency
CREATE INDEX IF NOT EXISTS idx_quest_progress_user_id ON public.quest_progress(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view only their own quest progress
DROP POLICY IF EXISTS "Users can view own quest progress" ON public.quest_progress;
CREATE POLICY "Users can view own quest progress"
    ON public.quest_progress
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own quest progress
DROP POLICY IF EXISTS "Users can insert own quest progress" ON public.quest_progress;
CREATE POLICY "Users can insert own quest progress"
    ON public.quest_progress
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own quest progress
DROP POLICY IF EXISTS "Users can update own quest progress" ON public.quest_progress;
CREATE POLICY "Users can update own quest progress"
    ON public.quest_progress
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

