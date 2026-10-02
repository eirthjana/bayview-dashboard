-- Migration: 17_chat_logs_status_timeout.sql
-- Applied 2026-10-02 via Supabase MCP execute_sql (verified). Do not re-run.
--
-- chat_logs.status "error" becomes "timeout". The only failure the bot logs is
-- the AI (Google Gemini) not answering in time — n8n "Log Timeout (No Reply)",
-- fed by the error outputs of "RAG AI Agent" and "HTTP Request7" — not an
-- outage of our own system. Both existing error rows (2026-09-03, 2026-09-28)
-- have an empty AI answer, i.e. exactly that case.
--
-- Run this, then import n8n Main.liff-menu-21.json (it writes "timeout").

ALTER TABLE public.chat_logs DROP CONSTRAINT chat_logs_status_check;

UPDATE public.chat_logs SET status = 'timeout' WHERE status = 'error';

ALTER TABLE public.chat_logs
  ADD CONSTRAINT chat_logs_status_check
  CHECK (status = ANY (ARRAY['success'::text, 'not_found'::text, 'unauthorized'::text, 'timeout'::text]));
