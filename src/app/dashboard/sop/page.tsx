import type { Metadata } from "next";
import { SopClient } from "./sop-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { SOP_STORAGE_BUCKET, sopStoragePath } from "@/lib/documents";
import { SOP_ROW_COLUMNS, summarizeSopRows, type SopDocumentSummary, type SopRow } from "@/lib/sop-groups";

export const metadata: Metadata = { title: "เอกสาร SOP" };

export const dynamic = "force-dynamic";

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export default async function SopPage() {
  let documents: SopDocumentSummary[] = [];
  let configError: string | null = null;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("documents1")
      .select(SOP_ROW_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) throw error;

    documents = summarizeSopRows((data || []) as SopRow[]);

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
  } catch (error) {
    console.error("Failed to load documents1:", error);
    configError = error instanceof Error ? error.message : "โหลดรายการเอกสารไม่สำเร็จ";
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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
