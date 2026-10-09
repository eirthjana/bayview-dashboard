-- Migration: 20_link_requests_admin_name.sql
-- Applied 2026-10-09 via Supabase MCP execute_sql (verified). Do not re-run.
--
-- The คำขอยืนยันตัวตน history shows which admin approved or rejected each
-- request. The name is saved at decision time (like admin_log.admin_name),
-- so the history stays right after an admin is renamed or removed.
-- decided_by keeps the admin's email. The table was empty when this ran.

alter table public.link_requests add column if not exists decided_by_name text;
