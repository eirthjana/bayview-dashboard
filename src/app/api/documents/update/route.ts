import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseSopGroup } from "@/lib/sop-groups";

/**
 * Change which department / topic an uploaded SOP file belongs to and who may
 * read it, without re-uploading. Every chunk row of the file is updated, and
 * match_documents applies the new access on the bot's next search.
 */
export async function POST(request: NextRequest) {
  try {
    const check = await requireAdminApi();
    if (!check.ok) return check.response;

    const body = await request.json();
    const fileId = typeof body.file_id === "string" ? body.file_id : "";
    if (!fileId) {
      return NextResponse.json({ success: false, error: "file_id is required" }, { status: 400 });
    }

    const choice = parseSopGroup({ groupType: body.group_type, group: body.group, access: body.access });
    if (!choice.ok) {
      return NextResponse.json({ success: false, error: choice.error }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("documents1")
      .update({
        sop_group: choice.group,
        sop_group_type: choice.groupType,
        sop_access: choice.access,
      })
      .eq("metadata->>file_id", fileId)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, error: "ไม่พบไฟล์นี้" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      sop_group: choice.group,
      sop_group_type: choice.groupType,
      sop_access: choice.access,
    });
  } catch (error) {
    console.error("Update document API error:", error);
    return NextResponse.json({ success: false, error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  }
}
