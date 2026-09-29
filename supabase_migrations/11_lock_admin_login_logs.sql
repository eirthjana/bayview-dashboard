-- Migration: 11_lock_admin_login_logs.sql
-- Applied 2026-09-28 via Supabase MCP (migration "11_lock_admin_login_logs"). Do not re-run.
--
-- Live policy on admin_login_logs is ALL for anon + authenticated with
-- USING (true). The anon key ships in the browser bundle, so anyone could read
-- every admin email and IP address in the log, or rewrite and delete entries.
--
-- The dashboard reads and writes this table only with the service role
-- (src/lib/admin-manage.ts), which bypasses RLS, so no client policy is needed
-- beyond letting signed-in admins read it. Nobody can edit or delete entries
-- except through the service role, which keeps the log append-only.

ALTER TABLE public.admin_login_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all actions for authenticated and service roles" ON public.admin_login_logs;
DROP POLICY IF EXISTS "Allow authenticated read admin_login_logs" ON public.admin_login_logs;
DROP POLICY IF EXISTS "Allow insert admin_login_logs" ON public.admin_login_logs;

CREATE POLICY "Admins can read admin_login_logs"
    ON public.admin_login_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());

REVOKE ALL ON public.admin_login_logs FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.admin_login_logs FROM authenticated;
