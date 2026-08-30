-- ==============================================================================
-- 🏨 The Bayview Pattaya — ลดระดับสิทธิ์เหลือ 2 ระดับ: staff / manager
-- กติกา: position มีคำว่า "manager" (ไม่สนตัวเล็กใหญ่) = manager, นอกนั้น = staff
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1) ฟังก์ชันคำนวณ access_level อัตโนมัติจาก position
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 2) employee_registry: ปรับ constraint เหลือ staff/manager + ผูก trigger คำนวณอัตโนมัติ
-- ------------------------------------------------------------------------------
ALTER TABLE public.employee_registry DROP CONSTRAINT IF EXISTS employee_registry_access_level_check;
ALTER TABLE public.employee_registry
  ADD CONSTRAINT employee_registry_access_level_check
  CHECK (access_level IN ('staff', 'manager'));

DROP TRIGGER IF EXISTS trg_employee_registry_access_level ON public.employee_registry;
CREATE TRIGGER trg_employee_registry_access_level
BEFORE INSERT OR UPDATE OF position ON public.employee_registry
FOR EACH ROW EXECUTE FUNCTION public.derive_access_level();

-- คำนวณ access_level ใหม่ให้ทุกแถวที่มีอยู่แล้ว (รันครั้งเดียวตอนติดตั้ง)
UPDATE public.employee_registry
SET access_level = CASE WHEN position ILIKE '%manager%' THEN 'manager' ELSE 'staff' END;

-- ------------------------------------------------------------------------------
-- 3) employee_test: ทำเหมือนกัน (เผื่อกรอก position ทีหลัง trigger จะคำนวณให้เอง)
-- ------------------------------------------------------------------------------
ALTER TABLE public.employee_test DROP CONSTRAINT IF EXISTS employee_test_access_level_check;
ALTER TABLE public.employee_test
  ADD CONSTRAINT employee_test_access_level_check
  CHECK (access_level IN ('staff', 'manager'));

DROP TRIGGER IF EXISTS trg_employee_test_access_level ON public.employee_test;
CREATE TRIGGER trg_employee_test_access_level
BEFORE INSERT OR UPDATE OF position ON public.employee_test
FOR EACH ROW EXECUTE FUNCTION public.derive_access_level();

UPDATE public.employee_test
SET access_level = CASE WHEN position ILIKE '%manager%' THEN 'manager' ELSE 'staff' END
WHERE position IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 4) ตรวจสอบผลลัพธ์
-- ------------------------------------------------------------------------------
SELECT access_level, COUNT(*) FROM public.employee_registry GROUP BY access_level;
SELECT emp_id, name, position, access_level FROM public.employee_registry ORDER BY access_level, emp_id LIMIT 15;
