-- ==============================================================================
-- 🏨 The Bayview Pattaya — 09_restore_employee_triggers
-- RECORD ONLY — already applied to Supabase as migration version 20260927083623.
-- Do not run again. Copied verbatim from supabase_migrations.schema_migrations.
--
-- Restores the two triggers on employee_test and employee_registry:
--   derive_access_level           access_level = manager when position contains "manager"
--   sync_status_with_line_user_id status = unlinked when line_user_id is NULL (unless disabled)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.derive_access_level()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.position ILIKE '%manager%' THEN
    NEW.access_level := 'manager';
  ELSE
    NEW.access_level := 'staff';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.sync_status_with_line_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.line_user_id IS NULL AND NEW.status IS DISTINCT FROM 'disabled' THEN
    NEW.status := 'unlinked';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employee_test_access_level ON public.employee_test;
CREATE TRIGGER trg_employee_test_access_level
BEFORE INSERT OR UPDATE OF position ON public.employee_test
FOR EACH ROW EXECUTE FUNCTION public.derive_access_level();

DROP TRIGGER IF EXISTS trg_employee_registry_access_level ON public.employee_registry;
CREATE TRIGGER trg_employee_registry_access_level
BEFORE INSERT OR UPDATE OF position ON public.employee_registry
FOR EACH ROW EXECUTE FUNCTION public.derive_access_level();

DROP TRIGGER IF EXISTS trg_sync_status_employee_test ON public.employee_test;
CREATE TRIGGER trg_sync_status_employee_test
BEFORE INSERT OR UPDATE ON public.employee_test
FOR EACH ROW EXECUTE FUNCTION public.sync_status_with_line_user_id();

DROP TRIGGER IF EXISTS trg_sync_status_employee_registry ON public.employee_registry;
CREATE TRIGGER trg_sync_status_employee_registry
BEFORE INSERT OR UPDATE ON public.employee_registry
FOR EACH ROW EXECUTE FUNCTION public.sync_status_with_line_user_id();
