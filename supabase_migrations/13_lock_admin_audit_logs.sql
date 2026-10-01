-- Migration: 13_lock_admin_audit_logs.sql
-- NOT APPLIED YET — run it once in the Supabase SQL editor.
--
-- Same problem 11_lock_admin_login_logs.sql fixed for the login log.
-- Live policies on admin_audit_logs (checked 2026-09-29) are SELECT and
-- INSERT for every role with USING/CHECK (true). The anon key ships in the
-- browser bundle, so anyone could read every admin's email, IP address and
-- actions, or insert fake activity entries.
--
-- The dashboard reads and writes this table only through the service role
-- (src/lib/admin-audit.ts), which bypasses RLS, so signed-in admins reading
-- it is the only client access needed. Entries cannot be edited or deleted
-- from any client, which keeps the log append-only.

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated or service role read access" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Allow authenticated or service role insert access" ON public.admin_audit_logs;

CREATE POLICY "Admins can read admin_audit_logs"
    ON public.admin_audit_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());

REVOKE ALL ON public.admin_audit_logs FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.admin_audit_logs FROM authenticated;
