-- Re-file old "not in the SOP" answers that the old status check logged as success.
-- Run once in the Supabase SQL editor (project kvkpvcowchqaptsibhvg).
-- Same rule as Build LINE Messages in Main.sop-gaps.json and src/lib/answer-status.ts.

-- 1) Back up current statuses so step 2 can be reverted.
create table if not exists public.chat_logs_status_backup_20260922 as
  select id, status from public.chat_logs where status = 'success';

-- 2) success -> not_found
update public.chat_logs set status = 'not_found'
where status = 'success'
  and ai_response not like '%นอกเหนือขอบเขต SOP%'
  and (
    left(ai_response, 150) ~ '(ไม่มีข้อมูล|ไม่มีระบุ|ไม่ได้ระบุ|ไม่มีการระบุ|ยังไม่มีการกำหนด|ไม่ได้กำหนด|ไม่พบข้อมูล|ไม่มีการกำหนด)'
    or (left(ai_response, 90) ~ '(ยังไม่มี|ไม่มี|ไม่พบ)'
        and ai_response ~ '(ติดต่อ(ที่)?แผนก|สอบถาม(ได้)?(ที่|กับ|ผ่าน)แผนก)')
  );

-- Revert step 2 if needed:
-- update public.chat_logs c set status = b.status
-- from public.chat_logs_status_backup_20260922 b where c.id = b.id;
