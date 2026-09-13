-- ==============================================================================
-- 🏨 The Bayview Pattaya — Employee Registry (สร้างใหม่ทั้งหมด)
-- ==============================================================================
-- ไฟล์นี้ทำทุกอย่างในไฟล์เดียว: ลบของเก่า (ถ้ามี) → สร้างตารางใหม่ → ใส่ข้อมูล 136 คน
-- จาก Organization Chart (As of March 31, 2026) ครบทุกแผนก
--
-- ⚠️ คำเตือน: ถ้าตาราง employee_registry เดิมมีการผูก LINE ID ไว้แล้ว
-- ไฟล์นี้จะ "ลบทิ้งทั้งหมด" แล้วเริ่มใหม่ ถ้ามีคนผูกแล้วอยากเก็บไว้ อย่าเพิ่งรันไฟล์นี้ บอกผมก่อน
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0) ล้างของเก่า (ถ้ามี) เพื่อเริ่มสะอาด
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS public.employee_registry CASCADE;
DROP FUNCTION IF EXISTS public.set_employee_registry_updated_at() CASCADE;

-- ------------------------------------------------------------------------------
-- 1) สร้างตารางใหม่ (ไม่มีคอลัมน์ password แล้ว — ไม่ใช้ระบบยืนยันตัวตนในแชท
--    แอดมินผูก LINE ID ให้เองผ่านแดชบอร์ดเท่านั้น)
-- ------------------------------------------------------------------------------
CREATE TABLE public.employee_registry (
  emp_id       INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  department   TEXT NOT NULL,
  position     TEXT NOT NULL,
  line_id      TEXT UNIQUE,                         -- ว่างจนกว่าแอดมินจะผูกให้ในแดชบอร์ด
  status       TEXT NOT NULL DEFAULT 'unlinked'
               CHECK (status IN ('unlinked', 'linked', 'disabled')),
  access_level TEXT NOT NULL DEFAULT 'staff'
               CHECK (access_level IN ('staff', 'supervisor', 'department_manager', 'executive')),
  linked_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employee_registry_line_id ON public.employee_registry(line_id);
CREATE INDEX idx_employee_registry_department ON public.employee_registry(department);

-- อัปเดต updated_at อัตโนมัติทุกครั้งที่แก้แถว
CREATE OR REPLACE FUNCTION public.set_employee_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_employee_registry_updated_at
BEFORE UPDATE ON public.employee_registry
FOR EACH ROW EXECUTE FUNCTION public.set_employee_registry_updated_at();

-- ------------------------------------------------------------------------------
-- 2) ใส่ข้อมูลพนักงานทั้งหมด 136 คน (emp_id 1001–1136) ตรงตาม Org Chart ทุกแผนก
-- ------------------------------------------------------------------------------
INSERT INTO public.employee_registry (emp_id, name, department, position) VALUES
  (1001, 'K.Orachorn Laksanasut', 'Executive Office', 'General Manager'),
  (1002, 'K.Nanthasiri Sangthong', 'Executive Office', 'IT Manager'),
  (1003, 'K.Nontawan Kitbumrung', 'Executive Office', 'Asst. E-Distribution Manager'),
  (1004, 'Vacant (1)', 'Executive Office', 'Health and Safety Officer'),
  (1005, 'K.Kanyana Khunikakon', 'Executive Office', 'Cluster Marcom. Manager/0.5'),
  (1006, 'K.Chaloem Phiranont', 'Executive Office', 'Sales Manager'),
  (1007, 'Vacant (1)', 'Executive Office', 'Sales Coordinator'),
  (1008, 'K.Pichayada Rattanahiran', 'Accounting', 'Financial Controller'),
  (1009, 'K.Noppaporn Amhae', 'Accounting', 'General Cashier'),
  (1010, 'K.Somkiat Khoschasarn', 'Accounting', 'Assistant Chief Accountant'),
  (1011, 'K.Jintana Chaiyanupong', 'Accounting', 'Paymaster Income Auditor'),
  (1012, 'K.Sunitsa Mangkang', 'Accounting', 'Account Payable Supervisor'),
  (1013, 'K.Naruemon Yothanak', 'Accounting', 'Cluster Purchasing Mgr. /0.5'),
  (1014, 'K.Ratchaneekorn Kongklai', 'Accounting', 'Purchasing Officer'),
  (1015, 'K.Laddawan Khongasem', 'Accounting', 'Account Receivable Supervisor'),
  (1016, 'K.Noppachai Srirat', 'Accounting', 'F&B Cost Controller'),
  (1017, 'K.Chatinee Sawatmongkol', 'Accounting', 'Store & Receiving Officer'),
  (1018, 'K.Lhaksit Sarnpanich', 'Front Office', 'Front Office Manager'),
  (1019, 'K.Anusorn Phuakchawna', 'Front Office', 'Asst. Front Office Manger'),
  (1020, 'K.Phidchayada Sadao', 'Front Office', 'Duty Manager'),
  (1021, 'K.Jirakorn Thonggean', 'Front Office', 'Night Manager'),
  (1022, 'Vacant (1)', 'Front Office', 'Duty Manager'),
  (1023, 'K.Patrick Edward Winter', 'Front Office', 'Night Guest Service Agent Sup.'),
  (1024, 'K.Weena Nairuan', 'Front Office', 'Guest Relations Officer'),
  (1025, 'K.Thanawat Bunluea', 'Front Office', 'Bell Captain'),
  (1026, 'K.Nattaya Srisaeng', 'Front Office', 'Guest Service Agent'),
  (1027, 'K.Sira Jitsaymai', 'Front Office', 'Guest Service Agent'),
  (1028, 'K.Nataaon Kaewjirasin', 'Front Office', 'Guest Relations Officer'),
  (1029, 'K.Mintra Chaisri', 'Front Office', 'Guest Service Agent'),
  (1030, 'Vacant (1)', 'Front Office', 'Guest Service Agent'),
  (1031, 'K.Kosol Juntabut', 'Front Office', 'Bell Boy'),
  (1032, 'K.Kornkomsan Suankaew', 'Front Office', 'Bell Boy'),
  (1033, 'K.Lhaksit Sarnpanich', 'Front Office (Reservation)', 'Front Office Manager'),
  (1034, 'K.Areerat Jitman', 'Front Office (Reservation)', 'Revenue & Reservation Mgr.'),
  (1035, 'K.Nontawan Kitbumrung', 'Front Office (Reservation)', 'Asst. E-Distribution Manager'),
  (1036, 'K.Pornchanok Jamsuwan', 'Front Office (Reservation)', 'Reservation Agent'),
  (1037, 'K.Arunee Muanwaja', 'Front Office (Reservation)', 'Reservation Agent'),
  (1038, 'K.Jeerapat Krispin', 'Housekeeping (Service)', 'Housekeeping Manager'),
  (1039, 'K.Amornrat Kaewkhontrong', 'Housekeeping (Service)', 'Floor Supervisor'),
  (1040, 'K.Pornchan Nakthong', 'Housekeeping (Service)', 'Floor Supervisor'),
  (1041, 'K.Supaporn Buareun', 'Housekeeping (Service)', 'Floor Supervisor'),
  (1042, 'K.Parichart Cheypratup', 'Housekeeping (Service)', 'Floor Supervisor'),
  (1043, 'K.Rungnapa Boonsang', 'Housekeeping (Service)', 'Public Area Attendant'),
  (1044, 'K.Pranee Rungrae', 'Housekeeping (Service)', 'Public Area Attendant'),
  (1045, 'K.Sangarun Jantapas', 'Housekeeping (Service)', 'Room Attendant'),
  (1046, 'K.Pattana Thitiapinun', 'Housekeeping (Service)', 'Room Attendant'),
  (1047, 'K.Sukanya Kamolhat', 'Housekeeping (Service)', 'Room Attendant'),
  (1048, 'K.Kaewta Kojamnong', 'Housekeeping (Service)', 'Room Attendant'),
  (1049, 'K.Thipphawan Thongkang', 'Housekeeping (Service)', 'Room Attendant'),
  (1050, 'K.Prapasri Sane', 'Housekeeping (Service)', 'Room Attendant'),
  (1051, 'K.Kumrai Samana', 'Housekeeping (Service)', 'Room Attendant'),
  (1052, 'K.Rattanaporn Toakaew', 'Housekeeping (Service)', 'Room Attendant'),
  (1053, 'K.Naree Phonwiangkae', 'Housekeeping (Service)', 'Room Attendant'),
  (1054, '(Vacant 1)', 'Housekeeping (Service)', 'Room Attendant'),
  (1055, 'K.Kholeefah Lammah', 'Housekeeping (Service)', 'Room Attendant'),
  (1056, 'K.Camriang Tunhou *', 'Housekeeping (Service)', 'Room Attendant'),
  (1057, 'Nareumon Tothong', 'Housekeeping (Service)', 'Room Attendant'),
  (1058, 'K.Narumol Mamanee', 'Housekeeping (Service)', 'Room Attendant'),
  (1059, 'Vacant (1)', 'Housekeeping (Service)', 'Room Attendant'),
  (1060, 'K.Mouy - Outsource', 'Housekeeping (Service)', 'Room Attendant'),
  (1061, 'K.Pure - Outsource', 'Housekeeping (Service)', 'Room Attendant'),
  (1062, 'K.Sab - Outsource', 'Housekeeping (Service)', 'Room Attendant'),
  (1063, 'K.Min - Outsource', 'Housekeeping (Service)', 'Public Area Attendant'),
  (1064, 'K.Jeerapat Krispin', 'Housekeeping (Regular)', 'Housekeeping Manager'),
  (1065, 'Vacant (1)', 'Housekeeping (Regular)', 'Assistant Housekeeping Mgr.'),
  (1066, 'K.Muanfan Poonchanuan', 'Housekeeping (Regular)', 'Housekeeping Supervisor'),
  (1067, 'K.Meechaisongkran Botmart', 'Housekeeping (Regular)', 'Linen Attendant'),
  (1068, 'K.Bu-nga Chiamkhunthod', 'Housekeeping (Regular)', 'Seamstress'),
  (1069, 'K.Sayam Ropru', 'Housekeeping (Regular)', 'Gardener'),
  (1070, 'K.Nine - Outsource', 'Housekeeping (Regular)', 'Gardener'),
  (1071, 'K.Wiroad Chantasiri', 'Housekeeping (Regular)', 'Linen Attendant'),
  (1072, 'K.Somrot Norachan', 'Housekeeping (Regular)', 'Linen Attendant'),
  (1073, 'K.Natthaphong Somruen', 'Housekeeping (Regular)', 'Linen Attendant'),
  (1074, 'K.Lang - Outsource', 'Housekeeping (Regular)', 'Linen Attendant - Houseman'),
  (1075, 'K.Pradith Kuaekul', 'Food & Beverage', 'F&B Operations Manager'),
  (1076, 'K.Worayot Thongcharoenpol *', 'Food & Beverage', 'Asst. Restaurant Manager'),
  (1077, 'K.Wattana Sukkho', 'Food & Beverage', 'Sr. Supervisor'),
  (1078, 'K.Chalongchai Submoon', 'Food & Beverage', 'Captain Bar'),
  (1079, 'K.Netiphong Limsirikun', 'Food & Beverage', 'Supervisor - Coffee Shop'),
  (1080, 'K.Paitool Pamuta', 'Food & Beverage', 'Bartender'),
  (1081, 'K.Chaiwut Bualakaew', 'Food & Beverage', 'Captain - Coffee Shop'),
  (1082, 'K.Kesorn Yuongyuen', 'Food & Beverage', 'Waitress'),
  (1083, 'K.Vichittra Tapaso', 'Food & Beverage', 'Waitress'),
  (1084, 'K.Chatchawan Saelee', 'Food & Beverage', 'Waiter'),
  (1085, 'K.Prasit Panprom', 'Food & Beverage', 'Sr. Artist Supervisor'),
  (1086, 'K.Prajak Phusaen', 'Food & Beverage', 'Sr. Supervisor - Pool'),
  (1087, 'K.Datsun Pangduengkaew', 'Food & Beverage', 'Waiter - Pool'),
  (1088, 'K.Ratchadaporn Phongpakorn', 'Food & Beverage', 'Bartendy'),
  (1089, 'K.Sila Plipon', 'Food & Beverage', 'Waiter - Pool'),
  (1090, 'K.Jumlong Niyomboon', 'Main Kitchen', 'Cluster Executive Chef/0.5'),
  (1091, 'K.Rungtawan Kanhajan', 'Main Kitchen', 'Sous Chef'),
  (1092, 'K.Viroj Cherdsang', 'Main Kitchen', 'Executive Chef Consultant'),
  (1093, 'K.Songtai Kamonputh', 'Main Kitchen', 'Chef De Partie'),
  (1094, 'K.Orawan Chamchote', 'Main Kitchen', 'Chef De Partie - Bakery'),
  (1095, 'K.Nawarit Rinsansee', 'Main Kitchen', 'Demi Chef De Partie'),
  (1096, 'K.Pannom Saksawas', 'Main Kitchen', 'Commis I - Pantry'),
  (1097, 'K.Pisanu Changlek', 'Main Kitchen', 'Commis I'),
  (1098, 'K.Somphong Boonkoeng', 'Main Kitchen', 'Commis II'),
  (1099, 'K.Khomsan Ruplaoo', 'Main Kitchen', 'Cook Helper'),
  (1100, 'K.Teerat Thatthong', 'Main Kitchen', 'Cook Helper'),
  (1101, 'K.Yupin Tongdee', 'Main Kitchen', 'Commis I - Pantry'),
  (1102, 'K.Kwanjai Sata', 'Main Kitchen', 'Cook Helper Bakery'),
  (1103, 'K.Jumlong Niyomboon', 'Main Kitchen (Staff Canteen)', 'Cluster Executive Chef/0.5'),
  (1104, 'K.Rungtawan Kanhajan', 'Main Kitchen (Staff Canteen)', 'Sous Chef'),
  (1105, 'K.On-u-ma Narasarn', 'Main Kitchen (Staff Canteen)', 'Cook Staff Canteen'),
  (1106, 'K.Sulakkana Soysakul', 'Main Kitchen (Staff Canteen)', 'Steward Canteen'),
  (1107, 'K.Jumlong Niyomboon', 'Main Kitchen (Steward)', 'Cluster Executive Chef / 0.5'),
  (1108, 'K.Rungtawan Kanhajan', 'Main Kitchen (Steward)', 'Sous Chef'),
  (1109, 'K.Narong Goylampoo', 'Main Kitchen (Steward)', 'Steward Supervisor'),
  (1110, 'K.Sureethep Kangkaew', 'Main Kitchen (Steward)', 'Steward'),
  (1111, 'K.Chai Khamchop', 'Main Kitchen (Steward)', 'Steward'),
  (1112, 'K.Jarouwit Khamkhuan', 'Main Kitchen (Steward)', 'Steward'),
  (1113, 'K.Withit Unrungrueng', 'Main Kitchen (Steward)', 'Steward (Disable)'),
  (1114, 'K.Choochart Suksomjit', 'Engineering', 'Chief Engineer'),
  (1115, 'K.Niwat Likitkajonkit', 'Engineering', 'Asst. Chief Engineer'),
  (1116, 'K.Sureeporn Sermsiri', 'Engineering', 'Engineering Secretary'),
  (1117, 'K.Jarun Choosri', 'Engineering', 'Air Mechanic Supervisor'),
  (1118, 'K.Prasert Charatsathan', 'Engineering', 'Sr. Plumber Supervisor'),
  (1119, 'K.Thongplew Kumtubtim', 'Engineering', 'Preventive & Maintenance Sup.'),
  (1120, 'K.Titivud Tapsen', 'Engineering', 'Duty Engineer'),
  (1121, 'K.Sawat Pispeng *', 'Engineering', 'Sr. Chief Carpenter'),
  (1122, 'Vacant (1)', 'Engineering', 'Carpenter'),
  (1123, 'K.Apinan Sudsaw', 'Engineering', 'Painter Supervisor'),
  (1124, 'K.Kitsada Yomjaroen', 'Engineering', 'Air Mechanic'),
  (1125, 'K.Surawut Srangsomwong', 'Engineering', 'Plumber'),
  (1126, 'K.Prakrit Suksai', 'Engineering', 'Electrician'),
  (1127, 'K.Phasathon Thanphom', 'Engineering', 'Air Mechanic'),
  (1128, 'Vacant (1)', 'Engineering', 'Plumber'),
  (1129, 'K.Jirawat Malamai', 'Engineering', 'Air Mechanic'),
  (1130, 'K.Aekmanu Srikhamtui', 'Engineering', 'Air Mechanic'),
  (1131, 'K.Jetsada Kotsa', 'Engineering', 'Painter'),
  (1132, 'K.Sonram Chaitrng', 'Engineering', 'Painter'),
  (1133, 'K.Phensom Nitiboonyapun /0.5', 'Human Resources', 'Regional Human Resources Manager'),
  (1134, 'K.Natnicha Namthip', 'Human Resources', 'Human Resources Manager'),
  (1135, 'K.Wassana Inthasoi', 'Human Resources', 'HR Supervisor & Training Support'),
  (1136, 'K.Nathi Thepsen', 'Human Resources', 'Hotel Driver');

-- ------------------------------------------------------------------------------
-- 3) เตรียม admin_users + is_admin() ให้พร้อม (ถ้ายังไม่มี — ปลอดภัยรันซ้ำได้)
--    จำเป็นสำหรับ RLS policy ด้านล่าง ให้เฉพาะแอดมินที่ล็อกอินแดชบอร์ดแก้ไขข้อมูลได้
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read admin_users" ON public.admin_users;
CREATE POLICY "Allow authenticated users to read admin_users"
  ON public.admin_users FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert admin_users" ON public.admin_users;
CREATE POLICY "Allow authenticated users to insert admin_users"
  ON public.admin_users FOR INSERT TO authenticated WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4) RLS บนตาราง employee_registry — เฉพาะแอดมินที่ล็อกอินแดชบอร์ดจัดการได้เต็มสิทธิ์
--    n8n ต้องต่อด้วย "service_role key" (ไม่ใช่ anon key) เพื่อไม่ติด RLS ตอนอ่าน/เขียน
-- ------------------------------------------------------------------------------
ALTER TABLE public.employee_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to employee_registry"
  ON public.employee_registry FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 5) ตรวจสอบผลลัพธ์
-- ------------------------------------------------------------------------------
SELECT department, COUNT(*) AS headcount
FROM public.employee_registry
GROUP BY department
ORDER BY department;

SELECT COUNT(*) AS total_employees FROM public.employee_registry;
