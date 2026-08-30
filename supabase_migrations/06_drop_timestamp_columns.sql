-- ==============================================================================
-- 🏨 The Bayview Pattaya — ลบคอลัมน์ linked_at, created_at, updated_at
-- ==============================================================================
-- ต้องลบ trigger ที่คอยอัปเดต updated_at ออกก่อน ไม่งั้น trigger จะ error
-- ทุกครั้งที่มีการ UPDATE แถว เพราะมันพยายามเขียนลงคอลัมน์ที่ไม่มีอยู่แล้ว
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1) employee_registry
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_employee_registry_updated_at ON public.employee_registry;
DROP FUNCTION IF EXISTS public.set_employee_registry_updated_at();

ALTER TABLE public.employee_registry
  DROP COLUMN IF EXISTS linked_at,
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS updated_at;

-- ------------------------------------------------------------------------------
-- 2) employee_test
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_employee_test_updated_at ON public.employee_test;
DROP FUNCTION IF EXISTS public.set_employee_test_updated_at();

ALTER TABLE public.employee_test
  DROP COLUMN IF EXISTS linked_at,
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS updated_at;

-- ------------------------------------------------------------------------------
-- 3) ตรวจสอบผลลัพธ์ — ควรเหลือแค่ emp_id, name, department, position,
--    line_user_id, line_name, status, access_level
-- ------------------------------------------------------------------------------
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'employee_registry'
ORDER BY ordinal_position;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'employee_test'
ORDER BY ordinal_position;
