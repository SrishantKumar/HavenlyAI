-- ==============================================================================
-- HavenlyAI: Clinical & Behavioral Features Migration
-- Features:
--   1. PHQ-4 Psychometric Baseline Onboarding
--   2. Mindful Behavioral Activation Gamification Tracker
--   3. Longitudinal Conversation Retention (Soft-Deletion / is_archived)
--   4. Private Medical Records PDF Storage Bucket & Strict RLS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Phase 1: Table Alterations (user_profiles, profiles, users)
-- Supports public.user_profiles (primary app table) as well as public.users/profiles
-- ------------------------------------------------------------------------------

-- Ensure user_profiles table exists (primary schema in HavenlyAI)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  memory_summary TEXT,
  phq4_score INT DEFAULT NULL,
  phq4_completed_at TIMESTAMPTZ DEFAULT NULL,
  behavioral_tasks_completed INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_profiles
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

-- Add columns to public.user_profiles
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS phq4_score INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS phq4_completed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS behavioral_tasks_completed INT DEFAULT 0;

-- Also add columns to public.users if it exists in user's Supabase project
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    ALTER TABLE public.users 
      ADD COLUMN IF NOT EXISTS phq4_score INT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS phq4_completed_at TIMESTAMPTZ DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS behavioral_tasks_completed INT DEFAULT 0;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS phq4_score INT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS phq4_completed_at TIMESTAMPTZ DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS behavioral_tasks_completed INT DEFAULT 0;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- Phase 2: Conversations Soft-Deletion (is_archived) & Index
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  type TEXT NOT NULL DEFAULT 'text',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_conversations_active 
  ON public.conversations(user_id) 
  WHERE is_archived = FALSE;

-- ------------------------------------------------------------------------------
-- Phase 3: Secure Medical Records PDF Storage Bucket & RLS
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'medical_records', 
  'medical_records', 
  false,
  10485760, -- 10MB file size limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  allowed_mime_types = ARRAY['application/pdf'];

-- Note: storage.objects already has RLS enabled by default in Supabase (owned by supabase_storage_admin).

DO $$ 
BEGIN
  -- Insert policy (upload)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload their own medical records'
  ) THEN
    CREATE POLICY "Users can upload their own medical records" 
      ON storage.objects FOR INSERT 
      TO authenticated 
      WITH CHECK (
        bucket_id = 'medical_records' AND 
        (auth.uid() = owner OR (storage.foldername(name))[1] = auth.uid()::text)
      );
  END IF;

  -- Select policy (view/download)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can view their own medical records'
  ) THEN
    CREATE POLICY "Users can view their own medical records" 
      ON storage.objects FOR SELECT 
      TO authenticated 
      USING (
        bucket_id = 'medical_records' AND 
        (auth.uid() = owner OR (storage.foldername(name))[1] = auth.uid()::text)
      );
  END IF;

  -- Delete policy (remove)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their own medical records'
  ) THEN
    CREATE POLICY "Users can delete their own medical records" 
      ON storage.objects FOR DELETE 
      TO authenticated 
      USING (
        bucket_id = 'medical_records' AND 
        (auth.uid() = owner OR (storage.foldername(name))[1] = auth.uid()::text)
      );
  END IF;
END $$;

