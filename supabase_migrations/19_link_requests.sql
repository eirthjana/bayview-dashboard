-- Migration: 19_link_requests.sql
-- Applied 2026-10-08 via Supabase MCP execute_sql (verified). Do not re-run.
--
-- Fallback for employees with no email that can receive the OTP: from the
-- LIFF register page they ask an admin to verify them instead. Each row is
-- one such request. An admin checks the staff card and the 4-digit ref_code
-- shown on the employee's phone, then approves (the LINE account is linked
-- to emp_id) or rejects it from Employees Management > คำขอยืนยันตัวตน.
--
-- Only the service role writes here (src/lib/liff/link-requests.ts and
-- /api/admin/link-requests); signed-in admins may read.

create table if not exists public.link_requests (
  id               bigserial primary key,
  ref_code         text not null,                  -- 4 digits, shown to the employee and the admin
  employee_table   text not null check (employee_table in ('employee_test', 'employee_registry')),
  emp_id           integer not null,               -- as typed by the employee; may not exist
  line_user_id     text not null,                  -- from the verified LINE ID token
  line_name        text,
  line_picture_url text,
  status           text not null default 'pending'
                     check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_at       timestamptz not null default now(),
  decided_at       timestamptz,
  decided_by       text,                           -- admin email
  note             text
);

-- One open request per LINE account.
create unique index if not exists link_requests_one_pending_per_line
  on public.link_requests (line_user_id) where status = 'pending';
create index if not exists idx_link_requests_status on public.link_requests (status, created_at desc);
create index if not exists idx_link_requests_line_user on public.link_requests (line_user_id, created_at desc);

alter table public.link_requests enable row level security;

drop policy if exists "Admins can read link_requests" on public.link_requests;
create policy "Admins can read link_requests"
  on public.link_requests for select
  to authenticated
  using (public.is_admin());

revoke all on public.link_requests from anon;
revoke insert, update, delete, truncate on public.link_requests from authenticated;
