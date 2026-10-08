import type { SupabaseClient } from "@supabase/supabase-js";
import type { LinkRequest } from "@/lib/types";

const HISTORY_DAYS = 30;

/**
 * What the คำขอยืนยันตัวตน tab lists: every open request plus the last 30 days
 * of decided ones, newest first. Used by the page (server client) and by the
 * tab's refresh (browser client); RLS lets signed-in admins read the table.
 */
export async function fetchLinkRequests(db: SupabaseClient, table: string): Promise<LinkRequest[]> {
  const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("link_requests")
    .select("*")
    .eq("employee_table", table)
    .or(`status.eq.pending,created_at.gte.${since}`)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as LinkRequest[];
}
