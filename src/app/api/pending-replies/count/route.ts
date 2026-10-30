import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { correctStatus } from "@/lib/answer-status";

export const dynamic = "force-dynamic";

let cachedResult: { count: number; at: number } | null = null;
const CACHE_TTL_MS = 3000;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const isFreshRequested = request.nextUrl.searchParams.get("fresh") === "1";
    if (!isFreshRequested && cachedResult && Date.now() - cachedResult.at < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, count: cachedResult.count, cached: true });
    }

    const { data, error } = await fetchAllRows((from, to) =>
      supabase
        .from("chat_logs")
        .select("id, user_message, ai_response, status, admin_replied_at")
        .in("status", ["success", "not_found"])
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to)
    );

    if (error) {
      console.error("Error fetching chat_logs for pending replies count:", error);
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    }

    const notFound = (data || [])
      .map(correctStatus)
      .filter((log) => log.status === "not_found" && log.user_message?.trim());

    const pendingCount = notFound.filter((q) => !q.admin_replied_at).length;

    cachedResult = { count: pendingCount, at: Date.now() };

    return NextResponse.json({ success: true, count: pendingCount });
  } catch (err) {
    console.error("Failed to count pending replies:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
