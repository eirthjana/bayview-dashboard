import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chunkText, detectFileType, embedText, extractText, fileIdFromName } from "@/lib/documents";

export const maxDuration = 120;

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

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "ไม่พบไฟล์ที่อัปโหลด" }, { status: 400 });
    }

    const fileType = detectFileType(file.name, file.type);
    if (!fileType) {
      return NextResponse.json(
        { success: false, error: "รองรับเฉพาะไฟล์ PDF, DOCX, TXT หรือ MD เท่านั้น" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractText(buffer, fileType);

    if (!text.trim()) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อความในไฟล์นี้ (อาจเป็นไฟล์สแกน/รูปภาพล้วน)" },
        { status: 400 }
      );
    }

    const chunks = chunkText(text);
    if (chunks.length === 0) {
      return NextResponse.json({ success: false, error: "แยกเนื้อหาไฟล์ไม่สำเร็จ" }, { status: 400 });
    }

    const fileId = fileIdFromName(file.name);
    const admin = createAdminClient();

    // Replace: remove any previously-ingested chunks for this same filename.
    const { error: deleteError } = await admin
      .from("documents1")
      .delete()
      .eq("metadata->>file_id", fileId);
    if (deleteError) throw deleteError;

    const now = new Date().toISOString();
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embedText(chunks[i]);
      const { error: insertError } = await admin.from("documents1").insert({
        title: file.name,
        content: chunks[i],
        embedding,
        metadata: { file_id: fileId, title: file.name, chunk_index: i },
        created_at: now,
        updated_at: now,
      });
      if (insertError) throw insertError;
    }

    return NextResponse.json({
      success: true,
      file_id: fileId,
      title: file.name,
      chunk_count: chunks.length,
    });
  } catch (error) {
    console.error("Upload document API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
