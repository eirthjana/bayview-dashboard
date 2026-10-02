-- Migration: 13_lock_admin_audit_logs.sql
-- Applied 2026-10-02 by hand in the Supabase SQL editor (verified). Do not re-run.
-- The table was renamed to admin_log in 14; this file uses the new name.
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

ALTER TABLE public.admin_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated or service role read access" ON public.admin_log;
DROP POLICY IF EXISTS "Allow authenticated or service role insert access" ON public.admin_log;

CREATE POLICY "Admins can read admin_log"
    ON public.admin_log FOR SELECT
    TO authenticated
    USING (public.is_admin());

REVOKE ALL ON public.admin_log FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.admin_log FROM authenticated;
