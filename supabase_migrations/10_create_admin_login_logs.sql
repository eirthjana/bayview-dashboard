-- Migration: 10_create_admin_login_logs.sql (added upstream as 08; renumbered
-- because 08 is already 08_liff_otp_hardening.sql)
--
-- RECORD ONLY: this table was created by hand in the Supabase SQL editor.
-- The live database does NOT have the two policies below — it has a single
-- "Allow all actions for authenticated and service roles" policy (ALL, roles
-- anon + authenticated + service_role, USING true). 11_lock_admin_login_logs.sql
-- replaces it; the dashboard only reaches this table through the service role.
-- Create admin_login_logs table for tracking administrator authentication attempts and audit logs

CREATE TABLE IF NOT EXISTS public.admin_login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    admin_name TEXT,
    email TEXT,
    ip_address TEXT,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
    notes TEXT
);

-- Indices for fast searching and sorting
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_created_at ON public.admin_login_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_email ON public.admin_login_logs (email);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_status ON public.admin_login_logs (status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.admin_login_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated admins to view login logs
DROP POLICY IF EXISTS "Allow authenticated read admin_login_logs" ON public.admin_login_logs;
CREATE POLICY "Allow authenticated read admin_login_logs"
    ON public.admin_login_logs FOR SELECT
    TO authenticated
    USING (true);

-- Allow login processes (service_role, anon, authenticated) to record login logs
DROP POLICY IF EXISTS "Allow insert admin_login_logs" ON public.admin_login_logs;
CREATE POLICY "Allow insert admin_login_logs"
    ON public.admin_login_logs FOR INSERT
    TO authenticated, anon, service_role
    WITH CHECK (true);
