import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SOP_STORAGE_BUCKET } from "@/lib/documents";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { file_id: fileId } = body;

    if (!fileId || typeof fileId !== "string") {
      return NextResponse.json({ success: false, error: "file_id is required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from("documents1").delete().eq("metadata->>file_id", fileId);
    if (error) throw error;

    // Best-effort: also remove the stored original file (folder named after
    // file_id). Older rows ingested via the n8n Google Drive flow never had
    // one, so a missing object here is expected and not an error.
    const { data: objects } = await admin.storage.from(SOP_STORAGE_BUCKET).list(fileId);
    if (objects && objects.length > 0) {
      await admin.storage
        .from(SOP_STORAGE_BUCKET)
        .remove(objects.map((o) => `${fileId}/${o.name}`));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete document API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
