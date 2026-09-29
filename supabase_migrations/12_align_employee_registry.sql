-- Migration: 12_align_employee_registry.sql
-- NOT APPLIED YET — run it once in the Supabase SQL editor.
--
-- Brings employee_registry in line with employee_test (checked 2026-09-29).
-- Already identical: all 19 columns (names, types, defaults), primary key,
-- UNIQUE (line_user_id), status CHECK, RLS policy, and both triggers
-- (derive_access_level, sync_status_with_line_user_id).
--
-- The one difference that matters: employee_registry's access_level CHECK
-- still allows the old 5-level values (supervisor, department_manager,
-- executive). employee_test allows only staff / manager, which is all the
-- derive_access_level trigger ever writes. Every one of the 136 rows is
-- already staff (118) or manager (18), so this changes no data.
--
-- Left as they are on purpose:
-- * department / position are NOT NULL here but nullable in employee_test.
--   The dashboard always sends both, so keeping NOT NULL on the real table
--   only guards against incomplete rows.
-- * otp_attempts sits at a different column position; Postgres cannot
--   reorder columns without rebuilding the table, and no code depends on it.
-- * the extra idx_employee_registry_department index is harmless.

ALTER TABLE public.employee_registry DROP CONSTRAINT employee_registry_access_level_check;
ALTER TABLE public.employee_registry
  ADD CONSTRAINT employee_registry_access_level_check
  CHECK (access_level = ANY (ARRAY['staff'::text, 'manager'::text]));
