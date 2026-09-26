import { DEPARTMENTS } from "@/lib/types";

// Every SOP file belongs either to a department or, for material every
// employee may read, to a free-text topic under "อื่นๆ" (e.g. "Baan Sukee").
// Stored on documents1 as sop_group / sop_group_type / sop_access; the
// match_documents function uses them to keep department-only files away from
// staff of other departments (managers can read everything).

export type SopGroupType = "department" | "other";
export type SopAccess = "all" | "department";

/**
 * Departments offered for SOP files: the employee departments without their
 * sub-unit suffix ("Housekeeping (Service)" -> "Housekeeping"). match_documents
 * compares on the same base name, so a Housekeeping file reaches staff of
 * every Housekeeping unit.
 */
export const SOP_DEPARTMENTS: string[] = Array.from(
  new Set(Object.keys(DEPARTMENTS).map((d) => d.split(" (")[0]))
);

export const MAX_TOPIC_LENGTH = 100;

export interface SopDocumentSummary {
  file_id: string;
  title: string;
  chunk_count: number;
  updated_at: string;
  /** Admin who uploaded the current version; null for files from before this was recorded. */
  uploaded_by: string | null;
  sop_group: string | null;
  sop_group_type: SopGroupType | null;
  sop_access: SopAccess | null;
  view_url: string | null;
}

export interface SopRow {
  title: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string | null;
  uploaded_by: string | null;
  sop_group: string | null;
  sop_group_type: SopGroupType | null;
  sop_access: SopAccess | null;
}

/** documents1 has one row per chunk; fold them into one entry per file, newest first. */
export function summarizeSopRows(rows: SopRow[]): SopDocumentSummary[] {
  const byFile = new Map<string, SopDocumentSummary>();
  for (const row of rows) {
    const fileId = (row.metadata as Record<string, unknown> | null)?.file_id as string | undefined;
    if (!fileId) continue;
    const updatedAt = row.updated_at || row.created_at;

    const existing = byFile.get(fileId);
    if (existing) {
      existing.chunk_count += 1;
      if (updatedAt > existing.updated_at) {
        existing.updated_at = updatedAt;
        existing.uploaded_by = row.uploaded_by ?? null;
      }
    } else {
      byFile.set(fileId, {
        file_id: fileId,
        title: row.title || fileId,
        chunk_count: 1,
        updated_at: updatedAt,
        uploaded_by: row.uploaded_by ?? null,
        sop_group: row.sop_group ?? null,
        sop_group_type: row.sop_group_type ?? null,
        sop_access: row.sop_access ?? null,
        view_url: null,
      });
    }
  }
  return Array.from(byFile.values()).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export const SOP_ROW_COLUMNS =
  "title, metadata, created_at, updated_at, uploaded_by, sop_group, sop_group_type, sop_access";
