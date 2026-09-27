-- ==============================================================================
-- 🏨 The Bayview Pattaya — 08_liff_otp_hardening
-- RECORD ONLY — already applied to Supabase as migration version 20260927083611.
-- Do not run again. Copied verbatim from supabase_migrations.schema_migrations.
--
-- LIFF registration: OTP stored as an HMAC hash, LINE picture, and a log of
-- OTP requests for rate limiting. Adds columns/table only; no data touched.
-- pending_otp_code stays until the old n8n chat OTP flow is removed (Phase 4).
-- ==============================================================================

ALTER TABLE public.employee_test     ADD COLUMN IF NOT EXISTS pending_otp_hash TEXT;
ALTER TABLE public.employee_registry ADD COLUMN IF NOT EXISTS pending_otp_hash TEXT;

ALTER TABLE public.employee_test     ADD COLUMN IF NOT EXISTS line_picture_url TEXT;
ALTER TABLE public.employee_registry ADD COLUMN IF NOT EXISTS line_picture_url TEXT;

CREATE TABLE IF NOT EXISTS public.otp_requests (
  id           BIGSERIAL PRIMARY KEY,
  emp_id       INTEGER,
  line_user_id TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_requests_line_user ON public.otp_requests (line_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_requests_emp       ON public.otp_requests (emp_id, created_at DESC);

ALTER TABLE public.otp_requests ENABLE ROW LEVEL SECURITY;
