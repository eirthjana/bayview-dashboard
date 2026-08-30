-- ==============================================================================
-- 🏨 The Bayview Pattaya — Update: line_id → line_user_id + ตาราง employee_test
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1) เปลี่ยนชื่อคอลัมน์ line_id → line_user_id ในตาราง employee_registry (ตัวจริง)
--    ปลอดภัยรันซ้ำได้ (เช็คก่อนว่ามีคอลัมน์เดิมอยู่ไหม)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'employee_registry' AND column_name = 'line_id'
  ) THEN
    ALTER TABLE public.employee_registry RENAME COLUMN line_id TO line_user_id;
  END IF;
END $$;

-- เปลี่ยนชื่อ index ให้ตรงกันด้วย (ถ้ามี index เดิมอยู่)
DROP INDEX IF EXISTS idx_employee_registry_line_id;
CREATE INDEX IF NOT EXISTS idx_employee_registry_line_user_id
  ON public.employee_registry(line_user_id);

-- ------------------------------------------------------------------------------
-- 2) สร้างตารางทดสอบใหม่ employee_test
--    โครงสร้างคอลัมน์เหมือน employee_registry ทุกอย่าง (ใช้ line_user_id แล้ว)
--    ใส่แค่ emp_id + name ให้ 136 คน — department/position เว้นว่างไว้ให้กรอกเอง
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS public.employee_test CASCADE;

CREATE TABLE public.employee_test (
  emp_id       INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  department   TEXT,                                 -- เว้นว่างไว้ก่อน กรอกเองทีหลัง
  position     TEXT,                                 -- เว้นว่างไว้ก่อน กรอกเองทีหลัง
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
CREATE INDEX idx_employee_test_department ON public.employee_test(department);

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

-- ใส่ emp_id + name ให้ครบ 136 คน (department, position เว้นว่างไว้ตามที่ขอ)
INSERT INTO public.employee_test (emp_id, name) VALUES
  (1001, 'K.Orachorn Laksanasut'),
  (1002, 'K.Nanthasiri Sangthong'),
  (1003, 'K.Nontawan Kitbumrung'),
  (1004, 'Vacant (1)'),
  (1005, 'K.Kanyana Khunikakon'),
  (1006, 'K.Chaloem Phiranont'),
  (1007, 'Vacant (1)'),
  (1008, 'K.Pichayada Rattanahiran'),
  (1009, 'K.Noppaporn Amhae'),
  (1010, 'K.Somkiat Khoschasarn'),
  (1011, 'K.Jintana Chaiyanupong'),
  (1012, 'K.Sunitsa Mangkang'),
  (1013, 'K.Naruemon Yothanak'),
  (1014, 'K.Ratchaneekorn Kongklai'),
  (1015, 'K.Laddawan Khongasem'),
  (1016, 'K.Noppachai Srirat'),
  (1017, 'K.Chatinee Sawatmongkol'),
  (1018, 'K.Lhaksit Sarnpanich'),
  (1019, 'K.Anusorn Phuakchawna'),
  (1020, 'K.Phidchayada Sadao'),
  (1021, 'K.Jirakorn Thonggean'),
  (1022, 'Vacant (1)'),
  (1023, 'K.Patrick Edward Winter'),
  (1024, 'K.Weena Nairuan'),
  (1025, 'K.Thanawat Bunluea'),
  (1026, 'K.Nattaya Srisaeng'),
  (1027, 'K.Sira Jitsaymai'),
  (1028, 'K.Nataaon Kaewjirasin'),
  (1029, 'K.Mintra Chaisri'),
  (1030, 'Vacant (1)'),
  (1031, 'K.Kosol Juntabut'),
  (1032, 'K.Kornkomsan Suankaew'),
  (1033, 'K.Lhaksit Sarnpanich'),
  (1034, 'K.Areerat Jitman'),
  (1035, 'K.Nontawan Kitbumrung'),
  (1036, 'K.Pornchanok Jamsuwan'),
  (1037, 'K.Arunee Muanwaja'),
  (1038, 'K.Jeerapat Krispin'),
  (1039, 'K.Amornrat Kaewkhontrong'),
  (1040, 'K.Pornchan Nakthong'),
  (1041, 'K.Supaporn Buareun'),
  (1042, 'K.Parichart Cheypratup'),
  (1043, 'K.Rungnapa Boonsang'),
  (1044, 'K.Pranee Rungrae'),
  (1045, 'K.Sangarun Jantapas'),
  (1046, 'K.Pattana Thitiapinun'),
  (1047, 'K.Sukanya Kamolhat'),
  (1048, 'K.Kaewta Kojamnong'),
  (1049, 'K.Thipphawan Thongkang'),
  (1050, 'K.Prapasri Sane'),
  (1051, 'K.Kumrai Samana'),
  (1052, 'K.Rattanaporn Toakaew'),
  (1053, 'K.Naree Phonwiangkae'),
  (1054, '(Vacant 1)'),
  (1055, 'K.Kholeefah Lammah'),
  (1056, 'K.Camriang Tunhou *'),
  (1057, 'Nareumon Tothong'),
  (1058, 'K.Narumol Mamanee'),
  (1059, 'Vacant (1)'),
  (1060, 'K.Mouy - Outsource'),
  (1061, 'K.Pure - Outsource'),
  (1062, 'K.Sab - Outsource'),
  (1063, 'K.Min - Outsource'),
  (1064, 'K.Jeerapat Krispin'),
  (1065, 'Vacant (1)'),
  (1066, 'K.Muanfan Poonchanuan'),
  (1067, 'K.Meechaisongkran Botmart'),
  (1068, 'K.Bu-nga Chiamkhunthod'),
  (1069, 'K.Sayam Ropru'),
  (1070, 'K.Nine - Outsource'),
  (1071, 'K.Wiroad Chantasiri'),
  (1072, 'K.Somrot Norachan'),
  (1073, 'K.Natthaphong Somruen'),
  (1074, 'K.Lang - Outsource'),
  (1075, 'K.Pradith Kuaekul'),
  (1076, 'K.Worayot Thongcharoenpol *'),
  (1077, 'K.Wattana Sukkho'),
  (1078, 'K.Chalongchai Submoon'),
  (1079, 'K.Netiphong Limsirikun'),
  (1080, 'K.Paitool Pamuta'),
  (1081, 'K.Chaiwut Bualakaew'),
  (1082, 'K.Kesorn Yuongyuen'),
  (1083, 'K.Vichittra Tapaso'),
  (1084, 'K.Chatchawan Saelee'),
  (1085, 'K.Prasit Panprom'),
  (1086, 'K.Prajak Phusaen'),
  (1087, 'K.Datsun Pangduengkaew'),
  (1088, 'K.Ratchadaporn Phongpakorn'),
  (1089, 'K.Sila Plipon'),
  (1090, 'K.Jumlong Niyomboon'),
  (1091, 'K.Rungtawan Kanhajan'),
  (1092, 'K.Viroj Cherdsang'),
  (1093, 'K.Songtai Kamonputh'),
  (1094, 'K.Orawan Chamchote'),
  (1095, 'K.Nawarit Rinsansee'),
  (1096, 'K.Pannom Saksawas'),
  (1097, 'K.Pisanu Changlek'),
  (1098, 'K.Somphong Boonkoeng'),
  (1099, 'K.Khomsan Ruplaoo'),
  (1100, 'K.Teerat Thatthong'),
  (1101, 'K.Yupin Tongdee'),
  (1102, 'K.Kwanjai Sata'),
  (1103, 'K.Jumlong Niyomboon'),
  (1104, 'K.Rungtawan Kanhajan'),
  (1105, 'K.On-u-ma Narasarn'),
  (1106, 'K.Sulakkana Soysakul'),
  (1107, 'K.Jumlong Niyomboon'),
  (1108, 'K.Rungtawan Kanhajan'),
  (1109, 'K.Narong Goylampoo'),
  (1110, 'K.Sureethep Kangkaew'),
  (1111, 'K.Chai Khamchop'),
  (1112, 'K.Jarouwit Khamkhuan'),
  (1113, 'K.Withit Unrungrueng'),
  (1114, 'K.Choochart Suksomjit'),
  (1115, 'K.Niwat Likitkajonkit'),
  (1116, 'K.Sureeporn Sermsiri'),
  (1117, 'K.Jarun Choosri'),
  (1118, 'K.Prasert Charatsathan'),
  (1119, 'K.Thongplew Kumtubtim'),
  (1120, 'K.Titivud Tapsen'),
  (1121, 'K.Sawat Pispeng *'),
  (1122, 'Vacant (1)'),
  (1123, 'K.Apinan Sudsaw'),
  (1124, 'K.Kitsada Yomjaroen'),
  (1125, 'K.Surawut Srangsomwong'),
  (1126, 'K.Prakrit Suksai'),
  (1127, 'K.Phasathon Thanphom'),
  (1128, 'Vacant (1)'),
  (1129, 'K.Jirawat Malamai'),
  (1130, 'K.Aekmanu Srikhamtui'),
  (1131, 'K.Jetsada Kotsa'),
  (1132, 'K.Sonram Chaitrng'),
  (1133, 'K.Phensom Nitiboonyapun /0.5'),
  (1134, 'K.Natnicha Namthip'),
  (1135, 'K.Wassana Inthasoi'),
  (1136, 'K.Nathi Thepsen');

-- RLS เหมือนตารางหลัก (ต้อง is_admin() มีอยู่แล้วจากไฟล์ก่อนหน้า)
ALTER TABLE public.employee_test ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to employee_test" ON public.employee_test;
CREATE POLICY "Admins have full access to employee_test"
  ON public.employee_test FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3) ตรวจสอบผลลัพธ์
-- ------------------------------------------------------------------------------
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'employee_registry'
ORDER BY ordinal_position;

SELECT COUNT(*) AS total_in_employee_test FROM public.employee_test;
SELECT emp_id, name, department, position FROM public.employee_test ORDER BY emp_id LIMIT 5;
