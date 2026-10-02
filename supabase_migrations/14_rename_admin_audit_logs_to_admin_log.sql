-- Migration: 14_rename_admin_audit_logs_to_admin_log.sql
-- Applied 2026-10-02 via Supabase MCP. Do not re-run.
--
-- admin_audit_logs becomes admin_log. A rename keeps every row (30 at the
-- time), the primary key, indexes, RLS policies and grants. The dashboard
-- code reads and writes admin_log from this commit on.
--
-- The old login-only table admin_login_logs is no longer written or read:
-- every login and 2FA attempt is already in admin_log. It is dropped in 15.

ALTER TABLE public.admin_audit_logs RENAME TO admin_log;
ALTER TABLE public.admin_log RENAME CONSTRAINT admin_audit_logs_pkey TO admin_log_pkey;
ALTER INDEX public.idx_admin_audit_logs_created_at RENAME TO idx_admin_log_created_at;
ALTER INDEX public.idx_admin_audit_logs_action_type RENAME TO idx_admin_log_action_type;

-- TEMPORARY bridge while Vercel switched to the new code (removed in 15):
-- the old name kept reading and writing admin_log, server (service role) only.
CREATE VIEW public.admin_audit_logs WITH (security_invoker = on) AS SELECT * FROM public.admin_log;
REVOKE ALL ON public.admin_audit_logs FROM anon, authenticated;
