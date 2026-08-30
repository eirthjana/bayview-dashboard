-- ==============================================================================
-- 🚀 Supabase Database Schema & RLS Setup for Admin Dashboard (Updated & Safe)
-- ==============================================================================
-- Run this script directly in the Supabase SQL Editor (https://app.supabase.com)
-- ==============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 2. Create / Update Admin Users Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. Create / Update Users Profile Table (LINE OA Users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  picture_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  total_tokens_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all columns exist (if table already existed previously)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users_profile' AND column_name='status') THEN
    ALTER TABLE public.users_profile ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users_profile' AND column_name='total_tokens_used') THEN
    ALTER TABLE public.users_profile ADD COLUMN total_tokens_used INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users_profile' AND column_name='picture_url') THEN
    ALTER TABLE public.users_profile ADD COLUMN picture_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users_profile' AND column_name='display_name') THEN
    ALTER TABLE public.users_profile ADD COLUMN display_name TEXT;
  END IF;
END $$;

-- Add check constraint for status safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_profile_status_check') THEN
    ALTER TABLE public.users_profile ADD CONSTRAINT users_profile_status_check CHECK (status IN ('active', 'blocked'));
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Index for fast lookup by line_user_id
CREATE INDEX IF NOT EXISTS idx_users_profile_line_user_id ON public.users_profile(line_user_id);

-- ------------------------------------------------------------------------------
-- 4. Create / Update Chat Logs Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
  line_user_id TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  user_message TEXT,
  ai_response TEXT,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all columns exist (if chat_logs already existed previously)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='chat_logs' AND column_name='status') THEN
    ALTER TABLE public.chat_logs ADD COLUMN status TEXT NOT NULL DEFAULT 'success';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='chat_logs' AND column_name='tokens_used') THEN
    ALTER TABLE public.chat_logs ADD COLUMN tokens_used INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='chat_logs' AND column_name='message_type') THEN
    ALTER TABLE public.chat_logs ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='chat_logs' AND column_name='user_message') THEN
    ALTER TABLE public.chat_logs ADD COLUMN user_message TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='chat_logs' AND column_name='ai_response') THEN
    ALTER TABLE public.chat_logs ADD COLUMN ai_response TEXT;
  END IF;
END $$;

-- Add check constraint for status safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_logs_status_check') THEN
    ALTER TABLE public.chat_logs ADD CONSTRAINT chat_logs_status_check CHECK (status IN ('success', 'error'));
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Indexes for querying chat logs
CREATE INDEX IF NOT EXISTS idx_chat_logs_line_user_id ON public.chat_logs(line_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON public.chat_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_logs_status ON public.chat_logs(status);

-- ------------------------------------------------------------------------------
-- 5. Create / Update System Settings Table (AI Dynamic Config)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Insert Default Settings safely
INSERT INTO public.system_settings (key, value) VALUES
  ('ai_enabled', 'true'::jsonb),
  ('system_prompt', '"คุณคือผู้ช่วย AI ที่เป็นมิตรและช่วยเหลือลูกค้า ตอบคำถามอย่างสุภาพ กระชับ และเป็นประโยชน์ ใช้ภาษาไทยในการตอบ"'::jsonb),
  ('selected_model', '"gpt-4o"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 6. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old policies if they exist before recreating (avoids "policy already exists" error)
DROP POLICY IF EXISTS "Admins can view admin_users list" ON public.admin_users;
DROP POLICY IF EXISTS "Admins or initial user can insert admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Allow authenticated users to read admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Allow authenticated users to insert admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins have full access to users_profile" ON public.users_profile;
DROP POLICY IF EXISTS "Admins have full access to chat_logs" ON public.chat_logs;
DROP POLICY IF EXISTS "Admins have full access to system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Service and n8n read access to system_settings" ON public.system_settings;

-- Policies for admin_users (Simple, non-recursive)
CREATE POLICY "Allow authenticated users to read admin_users"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert admin_users"
  ON public.admin_users FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for users_profile
CREATE POLICY "Admins have full access to users_profile"
  ON public.users_profile FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Policies for chat_logs
CREATE POLICY "Admins have full access to chat_logs"
  ON public.chat_logs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Policies for system_settings
CREATE POLICY "Admins have full access to system_settings"
  ON public.system_settings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Allow read access to system_settings for service role / n8n
CREATE POLICY "Service and n8n read access to system_settings"
  ON public.system_settings FOR SELECT
  USING (true);
