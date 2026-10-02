-- Migration: 18_sop_owners.sql
-- Applied 2026-10-02 via Supabase MCP execute_sql (verified). Do not re-run.
-- FALLBACK_FIX_05 (option 2): when the SOP search finds a file but not the
-- detail asked, the bot may point to that file's owner — read from this
-- table, never guessed from the question.
--
-- The "แผนกเจ้าของเอกสาร / ผู้ดูแลระบบ" line sits at the top of each file,
-- but search returns only the matching chunks, so the model rarely sees it.
-- match_documents now puts the owner on top of every chunk it returns
-- (looked up by metadata.title). A file with no row here gets no line, and
-- the bot then names no one.
--
-- When an SOP file is added or renamed, add or update its row here.

create table if not exists public.sop_owners (
  title text primary key,          -- documents1.metadata->>'title'
  owner text not null              -- written the way the bot should say it
);
alter table public.sop_owners enable row level security;
drop policy if exists "Anyone can read sop_owners" on public.sop_owners;
create policy "Anyone can read sop_owners" on public.sop_owners for select using (true);

insert into public.sop_owners (title, owner) values
  ('IT-NET-01_Guest_WiFi_Gateway_MikroTik.md', 'IT Manager (Executive Office)'),
  ('IT-NET-02_Aruba_Instant_AP.md',            'IT Manager (Executive Office)'),
  ('IT-BKP-01_TrueNAS_ESXi_Backup.md',         'IT Manager (Executive Office)'),
  ('Front_Office.md',                          'FOM (Front Office Manager)'),
  ('Closing_Baan_Sukees_Procedure.md',         'แผนก FB (Food and Beverage)'),
  ('How_to_Assist_Kid_While_at_Play.md',       'แผนก FB (Food and Beverage)'),
  ('Paper_Frog_Racing.md',                     'แผนก FB (Food and Beverage)'),
  ('Hygiene_and_Cleanliness.md',               'แผนก FB (Food and Beverage) และ HK (Housekeeping)'),
  ('Sukees_Wonderland.md',                     'แผนก FB (Food and Beverage)'),
  ('Sukees_Wonderland_Announcement.md',        'แผนก FB (Food and Beverage)')
on conflict (title) do update set owner = excluded.owner;

-- Same as before except the owner line and the left join.
CREATE OR REPLACE FUNCTION public.match_documents(query_embedding vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb, match_threshold double precision DEFAULT 0.6)
 RETURNS TABLE(id uuid, content text, metadata jsonb, similarity double precision)
 LANGUAGE plpgsql
AS $function$
#variable_conflict use_column
declare
  asker_level text := nullif(filter->>'asker_level', '');
  asker_dept text := nullif(filter->>'asker_department', '');
  meta_filter jsonb := coalesce(filter, '{}'::jsonb) - 'asker_level' - 'asker_department';
begin
  return query
  select
    d.id,
    case
      when asker_level is null
        or asker_level = 'manager'
        or coalesce(d.sop_access, 'all') = 'all'
        -- "Housekeeping (Service)" staff may read a "Housekeeping" file
        or split_part(coalesce(d.sop_group, ''), ' (', 1) = split_part(coalesce(asker_dept, ''), ' (', 1)
      then coalesce('[ผู้รับผิดชอบคู่มือฉบับนี้: ' || o.owner || E']\n', '')
        || regexp_replace(d.content, '!\[([^]]*)\]\(IMG:([^)[:space:]]+)\)', '[รูปประกอบ IMG:\2 — \1]', 'g')
      else 'คำตอบของคำถามนี้อยู่ในคู่มือเฉพาะแผนก ' || d.sop_group
        || ' ผู้ถามไม่มีสิทธิ์เข้าถึงข้อมูลนี้ ให้ตอบว่า "ผู้ถามไม่มีสิทธิ์เข้าถึงข้อมูลนี้ เพราะเป็นคู่มือเฉพาะแผนก '
        || d.sop_group || '" เท่านั้น'
    end,
    d.metadata,
    1 - (d.embedding <=> query_embedding)
  from public.documents1 d
  left join public.sop_owners o on o.title = d.metadata->>'title'
  where d.metadata @> meta_filter
    and 1 - (d.embedding <=> query_embedding) > match_threshold
  order by d.embedding <=> query_embedding
  limit match_count;
end;
$function$;
