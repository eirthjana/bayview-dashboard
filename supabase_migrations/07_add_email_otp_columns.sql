-- ==============================================================================
-- 🏨 The Bayview Pattaya — เพิ่มระบบ 2FA (Email OTP) สำหรับผูก LINE ID เอง
-- ==============================================================================

ALTER TABLE public.employee_registry ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.employee_registry ADD COLUMN IF NOT EXISTS pending_otp_code TEXT;
ALTER TABLE public.employee_registry ADD COLUMN IF NOT EXISTS pending_otp_expires_at TIMESTAMPTZ;
ALTER TABLE public.employee_registry ADD COLUMN IF NOT EXISTS pending_line_user_id TEXT;

-- ทำเหมือนกันกับตารางทดสอบ (เผื่ออยากลองระบบนี้กับ employee_test ก่อน)
ALTER TABLE public.employee_test ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.employee_test ADD COLUMN IF NOT EXISTS pending_otp_code TEXT;
ALTER TABLE public.employee_test ADD COLUMN IF NOT EXISTS pending_otp_expires_at TIMESTAMPTZ;
ALTER TABLE public.employee_test ADD COLUMN IF NOT EXISTS pending_line_user_id TEXT;

-- ตรวจสอบผลลัพธ์
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'employee_registry'
ORDER BY ordinal_position;

-- ------------------------------------------------------------------------------
-- ขั้นต่อไป: ต้องกรอกอีเมลบริษัทให้พนักงานทั้ง 136 คนก่อนระบบนี้จะใช้งานได้จริง
-- ทำได้ 2 ทาง:
--   1) กรอกทีละคนผ่านแดชบอร์ด (ช่อง Email ในฟอร์มแก้ไข/เพิ่มพนักงาน)
--   2) ส่งรายชื่อ+อีเมลทั้งหมดมาให้ (เช่น export จากไฟล์ HR เดิม) จะช่วยทำ
--      SQL อัปเดตทีเดียวครบทุกคนให้
-- ------------------------------------------------------------------------------
