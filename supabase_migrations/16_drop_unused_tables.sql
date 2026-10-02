-- Migration: 16_drop_unused_tables.sql
-- Applied 2026-10-02 by hand in the Supabase SQL editor (verified). Do not re-run.
--
-- Tables nothing used: no code, workflow, view or function referenced them.
-- * chat_last_turn: never written (an unused idea to replace n8n Simple Memory)
-- * documents1_backup_20260926 / _20260927: copies of the SOP vectors
-- * system_settings_backup: old prompt copies, with RLS off (readable by anyone)
-- Data backed up first in N8N_Dashboard/backups/<table>.json.
-- The same day the stale system_settings key admin_login_logs was deleted
-- (backup: N8N_Dashboard/backups/system_settings_admin_login_logs.json).

DROP TABLE public.chat_last_turn;
DROP TABLE public.documents1_backup_20260926;
DROP TABLE public.documents1_backup_20260927;
DROP TABLE public.system_settings_backup;
