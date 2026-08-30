import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SopDocumentSummary {
  file_id: string;
  title: string;
  chunk_count: number;
  updated_at: string;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!adminUser) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("documents1")
      .select("title, metadata, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const byFile = new Map<string, SopDocumentSummary>();
    for (const row of data || []) {
      const fileId = (row.metadata as Record<string, unknown> | null)?.file_id as
        | string
        | undefined;
      if (!fileId) continue;

      const existing = byFile.get(fileId);
      if (existing) {
        existing.chunk_count += 1;
        if (row.updated_at > existing.updated_at) existing.updated_at = row.updated_at;
      } else {
        byFile.set(fileId, {
          file_id: fileId,
          title: row.title || fileId,
          chunk_count: 1,
          updated_at: row.updated_at || row.created_at,
        });
      }
    }

    const documents = Array.from(byFile.values()).sort((a, b) =>
      b.updated_at.localeCompare(a.updated_at)
    );

    return NextResponse.json({ success: true, documents });
  } catch (error) {
    console.error("List documents API error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
