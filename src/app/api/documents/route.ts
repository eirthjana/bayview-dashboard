import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireMfa } from "@/lib/require-mfa";
import { createAdminClient } from "@/lib/supabase/admin";
import { SOP_STORAGE_BUCKET, sopStoragePath } from "@/lib/documents";
import { SOP_ROW_COLUMNS, summarizeSopRows, type SopRow } from "@/lib/sop-groups";

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type { SopDocumentSummary } from "@/lib/sop-groups";

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

    const mfaBlocked = await requireMfa(supabase);
    if (mfaBlocked) return mfaBlocked;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("documents1")
      .select(SOP_ROW_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const documents = summarizeSopRows((data || []) as SopRow[]);

    // Best-effort: attach a signed preview URL for docs that have a stored
    // original file. Docs ingested via the older n8n Google Drive flow never
    // had one uploaded, so a failure here just leaves view_url as null.
    await Promise.all(
      documents.map(async (doc) => {
        const { data } = await admin.storage
          .from(SOP_STORAGE_BUCKET)
          .createSignedUrl(sopStoragePath(doc.file_id, doc.title), SIGNED_URL_TTL_SECONDS);
        doc.view_url = data?.signedUrl ?? null;
      })
    );

    return NextResponse.json({ success: true, documents });
  } catch (error) {
    console.error("List documents API error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
