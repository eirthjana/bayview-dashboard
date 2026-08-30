-- ==============================================================================
-- 🏨 The Bayview Pattaya — เพิ่มคอลัมน์เก็บชื่อ LINE ของผู้ใช้ (Line Name)
-- ==============================================================================
-- หมายเหตุการตั้งชื่อ: ผมตั้งชื่อคอลัมน์จริงในฐานข้อมูลว่า "line_name" (ตัวเล็กทั้งหมด
-- ตามธรรมเนียม Postgres/ชื่อคอลัมน์อื่นในตารางนี้ เช่น line_user_id, emp_id)
-- แล้วไปตั้งเป็นหัวตาราง/label ในแดชบอร์ดว่า "Line Name" ให้แทน
-- ถ้าตั้งชื่อคอลัมน์จริงเป็น "Line Name" (มีช่องว่าง+ตัวใหญ่) ทุกครั้งที่ n8n/dashboard
-- เรียกใช้คอลัมน์นี้จะต้องใส่เครื่องหมายคำพูดครอบเสมอ ("Line Name") เสี่ยง error ง่ายกว่ามาก
-- ==============================================================================

ALTER TABLE public.employee_registry ADD COLUMN IF NOT EXISTS line_name TEXT;
ALTER TABLE public.employee_test ADD COLUMN IF NOT EXISTS line_name TEXT;

-- ตรวจสอบผลลัพธ์
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'employee_registry'
ORDER BY ordinal_position;
