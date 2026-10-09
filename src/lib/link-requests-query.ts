import type { SupabaseClient } from "@supabase/supabase-js";
import type { LinkRequest } from "@/lib/types";
import { fetchAllRows } from "@/lib/supabase/fetch-all";

/**
 * Every request for this employee table, newest first: the open ones and the
 * whole history (who approved or rejected what). Used by the page (server
 * client) and by the tab's refresh (browser client); RLS lets signed-in
 * admins read the table.
 */
export async function fetchLinkRequests(db: SupabaseClient, table: string): Promise<LinkRequest[]> {
  const { data, error } = await fetchAllRows<LinkRequest>((from, to) =>
    db
      .from("link_requests")
      .select("*")
      .eq("employee_table", table)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to)
  );
  if (error) throw error;
  return data ?? [];
}
