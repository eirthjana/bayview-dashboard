import { SopClient } from "./sop-client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SopDocumentSummary } from "@/app/api/documents/route";

export const dynamic = "force-dynamic";

export default async function SopPage() {
  let documents: SopDocumentSummary[] = [];
  let configError: string | null = null;

  try {
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

    documents = Array.from(byFile.values()).sort((a, b) =>
      b.updated_at.localeCompare(a.updated_at)
    );
  } catch (error) {
    console.error("Failed to load documents1:", error);
    configError = error instanceof Error ? error.message : "โหลดรายการเอกสารไม่สำเร็จ";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">SOP Documents</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          อัปโหลดไฟล์ SOP เข้าฐานความรู้ของ AI โดยตรง — ไม่ต้องเข้า Google Drive หรือกด File
          Create/Update ใน n8n เอง
        </p>
      </div>

      <SopClient initialDocuments={documents} configError={configError} />
    </div>
  );
}
