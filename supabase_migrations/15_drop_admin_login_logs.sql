-- Migration: 15_drop_admin_login_logs.sql
-- Applied 2026-10-02 by hand in the Supabase SQL editor (verified). Do not re-run.
--
-- Last step of 14 (admin_audit_logs -> admin_log). Safe once the dashboard
-- deploy with commit 4a61efd is live (checked 2026-10-02): that code only
-- uses admin_log and no longer touches either name below.
--
-- * admin_audit_logs: the temporary view that kept the old name working
--   during the deploy.
-- * admin_login_logs: the old login-only log. Every login and 2FA attempt is
--   in admin_log. Its 12 rows are backed up in
--   N8N_Dashboard/backups/admin_login_logs_before_rename.json.

DROP VIEW public.admin_audit_logs;
DROP TABLE public.admin_login_logs;
