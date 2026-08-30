# Bayview Dashboard + LINE Bot — Setup

## ⚠️ ตอนนี้ต่อกับตาราง `employee_test` ไม่ใช่ `employee_registry`

ทั้ง Dashboard และ n8n workflow ที่แนบมาชี้ไปที่ตาราง **`employee_test`** แล้ว (สลับจาก `employee_registry` ตามคำขอล่าสุด)

`employee_test` ตอนนี้มีข้อมูลแค่ 5 คน (emp_id 1001, 1002, 1003, 1005, 1006) และ `department`/`position` เป็นค่าว่างอยู่ — ถ้าจะทดสอบให้ครบ ต้องกรอกแผนก/ตำแหน่ง/อีเมลของทั้ง 5 คนนี้ผ่านแดชบอร์ดก่อน

**ถ้าต้องการสลับกลับไปใช้ `employee_registry`** (ตารางจริง 136 คน) ทีหลัง แจ้งได้เลย จะสลับ tableId ในทุกจุดกลับให้

---

## 2FA สำหรับผู้ใช้ LINE Bot (Email OTP)

พนักงานผูก LINE ID เองผ่านแชท โดยต้องยืนยันด้วยอีเมลบริษัท (2 ปัจจัย: คุม LINE ID + เข้าถึงอีเมลได้จริง)

**ขั้นตอนของพนักงาน:**
1. พิมพ์รหัสพนักงาน 4 หลัก (เช่น `1001`) ในแชท LINE
2. บอทส่งรหัส OTP 6 หลักไปที่อีเมลบริษัทที่มีอยู่ในระบบ
3. พิมพ์รหัส 6 หลักที่ได้รับกลับมาในแชทภายใน 10 นาที
4. ยืนยันสำเร็จ → ผูก LINE ID อัตโนมัติ ใช้งานได้ทันที

**กติกาความปลอดภัย:**
- รหัสพนักงานที่ผูก LINE ไว้แล้ว ผูกซ้ำเองไม่ได้ ต้องให้แอดมินจัดการผ่านแดชบอร์ด
- รหัสพนักงานที่ถูกปิดใช้งาน (`disabled`) ผูกเองไม่ได้เช่นกัน
- OTP หมดอายุใน 10 นาที

---

## สิ่งที่ต้องทำก่อนใช้งานได้จริง

### 1) รัน SQL ตามลำดับ (Supabase SQL Editor)

`supabase_schema.sql` → `supabase_migrations/01` ถึง `07`

### 2) กรอกอีเมล + แผนก/ตำแหน่ง ให้ครบใน `employee_test`

ผ่านแดชบอร์ด → หน้า Employees → กด "แก้ไข" ทีละคน (มีแค่ 5 คนตอนนี้)

### 3) ตั้งค่า SMTP credential ใน n8n

n8n → Settings → Credentials → New → "SMTP" → กรอก Host/Port/User/Password ของบริการส่งอีเมลที่ใช้ (Gmail App Password, Office 365, SendGrid ฯลฯ)

### 4) Import `Main_fixed.json` เข้า n8n

**Node ที่ต้องเลือก credential เอง:**
- `Send OTP Email` → เลือก SMTP credential จากขั้นตอนที่ 3 (ยังไม่ได้ตั้งไว้ล่วงหน้า)
- แก้ From Email ในโหนดนี้ให้ตรงกับโดเมนจริงของคุณ

Node อื่นที่เพิ่มมาใหม่ใช้ credential เดิมที่ตั้งไว้แล้วทั้งหมด (Supabase + LINE Header Auth)

---

## ติดตั้งทั่วไป

```bash
npm install
cp .env.example .env.local
npm run dev
```

ระบบ 2FA สำหรับแอดมิน (TOTP ผ่านแอป Authenticator) ยังทำงานเหมือนเดิม คนละชั้นกับ Email OTP ของ LINE bot — แอดมินใช้ TOTP เข้าแดชบอร์ด, พนักงานใช้ Email OTP ผูก LINE

## Deploy (Vercel)

Push repo ขึ้น GitHub → Import เข้า Vercel → ใส่ Environment Variables 3 ตัวเดียวกับ `.env.local` → Deploy
