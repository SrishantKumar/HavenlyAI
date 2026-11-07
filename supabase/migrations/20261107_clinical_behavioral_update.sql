-- ==============================================================================
-- HavenlyAI: Clinical & Behavioral Architecture Migration
-- Phases Covered:
--   Phase 1: Psychometric Baseline (PHQ-4) Onboarding
--   Phase 2: Medical History PDF Storage Bucket & RLS
--   Phase 4: Soft Deletion (Longitudinal Memory Retention)
--   Phase 5: Mindful Gamification (Behavioral Tasks Completed)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Ensure user_profiles Table & RLS Setup
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  memory_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile" 
      ON public.user_profiles FOR SELECT 
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile" 
      ON public.user_profiles FOR INSERT 
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" 
      ON public.user_profiles FOR UPDATE 
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- Phase 1 & Phase 5: Psychometric Baseline & Behavioral Tasks Completed
-- ------------------------------------------------------------------------------
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS phq4_score INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS phq4_completed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS behavioral_tasks_completed INT DEFAULT 0;

-- Optional support if the project also uses a 'profiles' table alias
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS phq4_score INT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS phq4_completed_at TIMESTAMPTZ DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS behavioral_tasks_completed INT DEFAULT 0;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- Phase 2: Private Storage Bucket for Medical Records & Strict RLS
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical_records',
  'medical_records',
  false,
  10485760, -- 10MB limit per file
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  allowed_mime_types = ARRAY['application/pdf'];

-- RLS Policy on storage.objects for medical_records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'User can only access own medical records'
  ) THEN
    CREATE POLICY "User can only access own medical records" 
      ON storage.objects 
      FOR ALL 
      TO authenticated
      USING (
        bucket_id = 'medical_records' 
        AND (
          auth.uid() = owner 
          OR (storage.foldername(name))[1] = auth.uid()::text
        )
      )
      WITH CHECK (
        bucket_id = 'medical_records' 
        AND (
          auth.uid() = owner 
          OR (storage.foldername(name))[1] = auth.uid()::text
        )
      );
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- Phase 4: Soft Deletion on Conversations Table
-- ------------------------------------------------------------------------------
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_conversations_user_archived 
  ON public.conversations (user_id, is_archived);

