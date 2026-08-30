-- ==============================================================================
-- 🏨 The Bayview Pattaya — ปรับ employee_test เหลือ 5 คน + จัดตำแหน่งคอลัมน์ employee_registry
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1) employee_test: เหลือแค่ 5 คน (emp_id + name เท่านั้น department/position ว่างไว้)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS public.employee_test CASCADE;

CREATE TABLE public.employee_test (
  emp_id       INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  department   TEXT,
  position     TEXT,
  line_user_id TEXT UNIQUE,
  status       TEXT NOT NULL DEFAULT 'unlinked'
               CHECK (status IN ('unlinked', 'linked', 'disabled')),
  access_level TEXT NOT NULL DEFAULT 'staff'
               CHECK (access_level IN ('staff', 'supervisor', 'department_manager', 'executive')),
  linked_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employee_test_line_user_id ON public.employee_test(line_user_id);

CREATE OR REPLACE FUNCTION public.set_employee_test_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_employee_test_updated_at
BEFORE UPDATE ON public.employee_test
FOR EACH ROW EXECUTE FUNCTION public.set_employee_test_updated_at();

-- 5 คนจริงจาก Executive Office (ข้าม "Vacant" เพราะไม่ใช่คนจริง)
INSERT INTO public.employee_test (emp_id, name) VALUES
  (1001, 'K.Orachorn Laksanasut'),
  (1002, 'K.Nanthasiri Sangthong'),
  (1003, 'K.Nontawan Kitbumrung'),
  (1005, 'K.Kanyana Khunikakon'),
  (1006, 'K.Chaloem Phiranont');

ALTER TABLE public.employee_test ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to employee_test" ON public.employee_test;
CREATE POLICY "Admins have full access to employee_test"
  ON public.employee_test FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 2) employee_registry: ย้ายคอลัมน์ line_user_id กลับไปตำแหน่งเดิม (ลำดับที่ 5 ต่อจาก position)
--    Postgres ไม่มีคำสั่งสลับตำแหน่งคอลัมน์ตรงๆ ต้องสร้างตารางใหม่ตามลำดับที่ต้องการ
--    แล้วย้ายข้อมูล + index/trigger/policy มาให้ครบ (รองรับทั้งกรณีคอลัมน์ชื่อ line_id หรือ line_user_id อยู่ตอนนี้)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_line_col TEXT;
BEGIN
  -- เช็คว่าตอนนี้คอลัมน์ LINE ID ชื่ออะไรอยู่ (เผื่อยังไม่เคย rename หรือ rename ไปแล้ว)
  SELECT column_name INTO v_line_col
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'employee_registry'
    AND column_name IN ('line_id', 'line_user_id')
  LIMIT 1;

  IF v_line_col IS NULL THEN
    RAISE EXCEPTION 'ไม่พบคอลัมน์ line_id หรือ line_user_id ในตาราง employee_registry';
  END IF;

  -- สร้างตารางใหม่ตามลำดับคอลัมน์ที่ต้องการ
  CREATE TABLE public.employee_registry_reordered (
    emp_id       INTEGER PRIMARY KEY,
    name         TEXT NOT NULL,
    department   TEXT NOT NULL,
    position     TEXT NOT NULL,
    line_user_id TEXT UNIQUE,
    status       TEXT NOT NULL DEFAULT 'unlinked'
                 CHECK (status IN ('unlinked', 'linked', 'disabled')),
    access_level TEXT NOT NULL DEFAULT 'staff'
                 CHECK (access_level IN ('staff', 'supervisor', 'department_manager', 'executive')),
    linked_at    TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  EXECUTE format(
    'INSERT INTO public.employee_registry_reordered
       (emp_id, name, department, position, line_user_id, status, access_level, linked_at, created_at, updated_at)
     SELECT emp_id, name, department, position, %I, status, access_level, linked_at, created_at, updated_at
     FROM public.employee_registry',
    v_line_col
  );

  DROP TABLE public.employee_registry CASCADE;
  ALTER TABLE public.employee_registry_reordered RENAME TO employee_registry;
END $$;

-- สร้าง index / trigger / policy ใหม่ให้ตารางที่เพิ่ง rename กลับมา
CREATE INDEX idx_employee_registry_line_user_id ON public.employee_registry(line_user_id);
CREATE INDEX idx_employee_registry_department ON public.employee_registry(department);

CREATE OR REPLACE FUNCTION public.set_employee_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employee_registry_updated_at ON public.employee_registry;
CREATE TRIGGER trg_employee_registry_updated_at
BEFORE UPDATE ON public.employee_registry
FOR EACH ROW EXECUTE FUNCTION public.set_employee_registry_updated_at();

ALTER TABLE public.employee_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to employee_registry" ON public.employee_registry;
CREATE POLICY "Admins have full access to employee_registry"
  ON public.employee_registry FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3) ตรวจสอบผลลัพธ์
-- ------------------------------------------------------------------------------
SELECT ordinal_position, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'employee_registry'
ORDER BY ordinal_position;

SELECT COUNT(*) AS total_in_registry FROM public.employee_registry;
SELECT emp_id, name FROM public.employee_test ORDER BY emp_id;
