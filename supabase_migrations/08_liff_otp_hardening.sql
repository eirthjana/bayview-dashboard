-- ==============================================================================
-- 🏨 The Bayview Pattaya — LIFF authentication (Phase 1)
-- ยืนยันตัวตนผ่านหน้า LIFF: เก็บ OTP แบบ hash, เก็บรูป LINE, และบันทึกคำขอ OTP
-- ไว้ทำ rate limit — เพิ่มคอลัมน์/ตารางอย่างเดียว ไม่แตะข้อมูลเดิม
-- ==============================================================================

-- เก็บ OTP แบบ hash (HMAC-SHA256) แทน plaintext
ALTER TABLE public.employee_test     ADD COLUMN IF NOT EXISTS pending_otp_hash TEXT;
ALTER TABLE public.employee_registry ADD COLUMN IF NOT EXISTS pending_otp_hash TEXT;

-- รูปโปรไฟล์ LINE (ได้จาก ID token ตอนลงทะเบียน)
ALTER TABLE public.employee_test     ADD COLUMN IF NOT EXISTS line_picture_url TEXT;
ALTER TABLE public.employee_registry ADD COLUMN IF NOT EXISTS line_picture_url TEXT;

-- บันทึกการขอ OTP สำหรับ rate limit
CREATE TABLE IF NOT EXISTS public.otp_requests (
  id           BIGSERIAL PRIMARY KEY,
  emp_id       INTEGER,
  line_user_id TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_requests_line_user ON public.otp_requests (line_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_requests_emp       ON public.otp_requests (emp_id, created_at DESC);

-- เปิด RLS โดยไม่มี policy = เข้าถึงได้เฉพาะ service role เท่านั้น
ALTER TABLE public.otp_requests ENABLE ROW LEVEL SECURITY;

-- pending_otp_code ยังห้ามลบ: n8n flow OTP แบบแชทเดิมยังใช้อยู่ (ลบใน Phase 4)
