import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SOP_STORAGE_BUCKET,
  chunkText,
  detectFileType,
  embedText,
  extractText,
  fileIdFromName,
  sopStoragePath,
} from "@/lib/documents";

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

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

    if (file.size === 0) {
      return NextResponse.json({ success: false, error: "ไฟล์นี้ว่างเปล่า" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: "ไฟล์มีขนาดใหญ่เกินไป (จำกัดไม่เกิน 25 MB)" },
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

    // Store the original file so admins can open/preview it later without
    // re-downloading — upsert so re-uploading the same filename replaces it.
    const storagePath = sopStoragePath(fileId, file.name);
    const { error: storageError } = await admin.storage
      .from(SOP_STORAGE_BUCKET)
      .upload(storagePath, buffer, { contentType: file.type || undefined, upsert: true });
    if (storageError) throw storageError;

    const { data: signedUrlData } = await admin.storage
      .from(SOP_STORAGE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    const now = new Date().toISOString();
    try {
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
    } catch (error) {
      // Don't leave a half-ingested doc behind (some chunks searchable, rest
      // missing) — clean up whatever this attempt already wrote and let the
      // user retry from a clean slate.
      await admin.from("documents1").delete().eq("metadata->>file_id", fileId);
      await admin.storage.from(SOP_STORAGE_BUCKET).remove([storagePath]);
      throw error;
    }

    return NextResponse.json({
      success: true,
      file_id: fileId,
      title: file.name,
      chunk_count: chunks.length,
      view_url: signedUrlData?.signedUrl ?? null,
    });
  } catch (error) {
    console.error("Upload document API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
