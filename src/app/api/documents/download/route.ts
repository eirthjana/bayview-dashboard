import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SOP_STORAGE_BUCKET, sopStoragePath } from "@/lib/documents";
import { logAdminActivity } from "@/lib/admin-audit";

// Download the original SOP file that was uploaded. Admin (past 2FA) only.
// Answers with a redirect to a signed Storage link that lives one minute and
// carries download=<file name>, so Storage sends it as an attachment and the
// browser saves the file instead of opening it.
const DOWNLOAD_URL_TTL_SECONDS = 60;

export async function GET(request: NextRequest) {
  const check = await requireAdminApi();
  if (!check.ok) return check.response;

  const fileId = (request.nextUrl.searchParams.get("file_id") || "").trim();
  if (!fileId || fileId.length > 200) {
    return NextResponse.json({ success: false, error: "Bad request" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data: rows, error } = await admin
      .from("documents1")
      .select("title")
      .eq("metadata->>file_id", fileId)
      .limit(1);
    if (error) throw error;
    if (!rows?.length) {
      return NextResponse.json({ success: false, error: "ไม่พบเอกสารนี้" }, { status: 404 });
    }
    // Same title the SOP page uses to build the storage path (summarizeSopRows).
    const title: string = rows[0].title || fileId;

    const { data: signed, error: signError } = await admin.storage
      .from(SOP_STORAGE_BUCKET)
      .createSignedUrl(sopStoragePath(fileId, title), DOWNLOAD_URL_TTL_SECONDS, { download: title });
    if (signError || !signed?.signedUrl) {
      return NextResponse.json({ success: false, error: "ไม่พบไฟล์ต้นฉบับของเอกสารนี้" }, { status: 404 });
    }

    await logAdminActivity({
      action_type: "download_sop",
      target: title,
      details: `ดาวน์โหลดไฟล์ SOP ต้นฉบับ (รหัส: ${fileId})`,
      status: "success",
      email: check.user.email,
      user_id: check.user.id,
    });

    return NextResponse.redirect(signed.signedUrl);
  } catch (error) {
    console.error("SOP download error:", error);
    return NextResponse.json({ success: false, error: "ดาวน์โหลดไม่สำเร็จ" }, { status: 500 });
  }
}
