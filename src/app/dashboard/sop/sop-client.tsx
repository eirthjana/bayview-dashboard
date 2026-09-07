"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { UploadCloud, FileText, Trash2, Loader2, AlertTriangle, X } from "lucide-react";
import type { SopDocumentSummary } from "@/app/api/documents/route";

interface SopClientProps {
  initialDocuments: SopDocumentSummary[];
  configError: string | null;
}

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];

function fileExtension(fileName: string): string {
  return fileName.toLowerCase().split(".").pop() || "";
}

export function SopClient({ initialDocuments, configError }: SopClientProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewDoc, setPreviewDoc] = useState<SopDocumentSummary | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);

  async function openPreview(doc: SopDocumentSummary) {
    if (!doc.view_url) return;
    setPreviewDoc(doc);
    setPreviewHtml(null);
    setPreviewText(null);
    setPreviewError(null);

    const ext = fileExtension(doc.title);
    if (ext === "pdf") return; // rendered directly via <iframe>, nothing to fetch

    setPreviewLoading(true);
    try {
      if (ext === "docx") {
        const [mammoth, res] = await Promise.all([import("mammoth"), fetch(doc.view_url)]);
        if (!res.ok) throw new Error();
        const arrayBuffer = await res.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setPreviewHtml(result.value);
      } else {
        const res = await fetch(doc.view_url);
        if (!res.ok) throw new Error();
        setPreviewText(await res.text());
      }
    } catch {
      setPreviewError("โหลดไฟล์เพื่อแสดงตัวอย่างไม่สำเร็จ");
    } finally {
      setPreviewLoading(false);
    }
  }

  function isAcceptedFile(file: File) {
    const name = file.name.toLowerCase();
    return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
  }

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files);
    const rejected = incoming.filter((f) => !isAcceptedFile(f));
    if (rejected.length > 0) {
      toast.error(`รองรับเฉพาะไฟล์ PDF, DOCX, TXT หรือ MD เท่านั้น (ข้าม ${rejected.length} ไฟล์ที่ไม่รองรับ)`);
    }
    const accepted = incoming.filter(isAcceptedFile);
    if (accepted.length === 0) return;

    setPendingFiles((prev) => {
      // Skip files already queued (same name + size) so re-dropping the same
      // selection doesn't duplicate entries in the list.
      const existingKeys = new Set(prev.map((f) => `${f.name}:${f.size}`));
      const deduped = accepted.filter((f) => !existingKeys.has(`${f.name}:${f.size}`));
      return [...prev, ...deduped];
    });
  }

  function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) addFiles(e.target.files);
    e.target.value = "";
  }

  function removePendingFile(e: React.MouseEvent, index: number) {
    e.stopPropagation();
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }

  async function handleUpload() {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    const total = pendingFiles.length;
    let successCount = 0;
    const failed: string[] = [];

    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i];
      setUploadProgress({ current: i + 1, total });
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (data.success) {
          successCount++;
          setDocuments((prev) => {
            const withoutOld = prev.filter((d) => d.file_id !== data.file_id);
            return [
              {
                file_id: data.file_id,
                title: data.title,
                chunk_count: data.chunk_count,
                updated_at: new Date().toISOString(),
                view_url: data.view_url ?? null,
              },
              ...withoutOld,
            ];
          });
        } else {
          failed.push(`${file.name}: ${data.error || "อัปโหลดไม่สำเร็จ"}`);
        }
      } catch {
        failed.push(`${file.name}: เชื่อมต่อไม่สำเร็จ`);
      }
    }

    if (successCount > 0) {
      toast.success(`อัปโหลดสำเร็จ ${successCount} จาก ${total} ไฟล์`);
    }
    failed.forEach((msg) => toast.error(msg));

    setPendingFiles([]);
    setUploadProgress(null);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(doc: SopDocumentSummary) {
    if (!confirm(`ลบเอกสาร "${doc.title}" ออกจากฐานความรู้ของ AI ใช่หรือไม่?`)) return;
    setDeletingId(doc.file_id);
    try {
      const res = await fetch("/api/documents/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: doc.file_id }),
      });
      const data = await res.json();
      if (data.success) {
        setDocuments((prev) => prev.filter((d) => d.file_id !== doc.file_id));
        toast.success(`ลบ "${doc.title}" แล้ว`);
      } else {
        toast.error(data.error || "ลบไม่สำเร็จ");
      }
    } catch {
      toast.error("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {configError && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            โหลดรายการเอกสารไม่สำเร็จ: {configError} — ตรวจสอบว่าตั้งค่า{" "}
            <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> ใน{" "}
            <code className="font-mono">.env.local</code> แล้วหรือยัง
          </span>
        </div>
      )}

      {/* Upload Card */}
      <Card className="border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-400" />
            อัปโหลดไฟล์ SOP
          </CardTitle>
          <CardDescription className="text-zinc-600 dark:text-zinc-400">
            รองรับไฟล์ PDF, DOCX, TXT, MD — ถ้าอัปโหลดไฟล์ชื่อเดิมซ้ำ ระบบจะแทนที่เนื้อหาเก่าให้อัตโนมัติ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            className={`rounded-lg border-2 border-dashed p-4 cursor-pointer transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-500/5"
                : "border-zinc-300 dark:border-zinc-700/50 hover:border-zinc-400 dark:hover:border-zinc-600"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
              onChange={handlePickFile}
              onClick={(e) => e.stopPropagation()}
              className="hidden"
            />

            {pendingFiles.length > 0 ? (
              <div className="space-y-2">
                {pendingFiles.map((file, i) => (
                  <div
                    key={`${file.name}-${file.size}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-300 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-800/50 p-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {(file.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => removePendingFile(e, i)}
                      className="shrink-0 p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-800 dark:hover:text-zinc-200"
                      aria-label="เอาไฟล์ออก"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center pt-1">
                  คลิกเพื่อเพิ่มไฟล์อื่นอีก
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1.5 py-6 text-center">
                <UploadCloud className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  ลากไฟล์มาวางตรงนี้ (เลือกได้หลายไฟล์) หรือคลิกเพื่อเลือกไฟล์
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">รองรับ PDF, DOCX, TXT, MD</p>
              </div>
            )}
          </div>

          <Button
            onClick={handleUpload}
            disabled={pendingFiles.length === 0 || uploading}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white items-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังอัปโหลด{uploadProgress ? ` (${uploadProgress.current}/${uploadProgress.total})` : "..."}
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                อัปโหลดและบันทึก{pendingFiles.length > 0 ? ` (${pendingFiles.length} ไฟล์)` : ""}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Document List */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 dark:border-zinc-800/50 hover:bg-transparent">
              <TableHead className="text-zinc-500 dark:text-zinc-400">ชื่อไฟล์</TableHead>
              <TableHead className="text-zinc-500 dark:text-zinc-400">จำนวนส่วน</TableHead>
              <TableHead className="text-zinc-500 dark:text-zinc-400">อัปเดตล่าสุด</TableHead>
              <TableHead className="text-zinc-500 dark:text-zinc-400 text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-zinc-500 dark:text-zinc-400 py-12">
                  ยังไม่มีเอกสาร SOP ในฐานความรู้
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow
                  key={doc.file_id}
                  onClick={() => doc.view_url && openPreview(doc)}
                  title={doc.view_url ? `ดู ${doc.title}` : doc.title}
                  className={`border-zinc-200 dark:border-zinc-800/50 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/30 ${
                    doc.view_url ? "cursor-pointer" : ""
                  }`}
                >
                  <TableCell className="max-w-[20rem]">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                        {doc.title}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                    {doc.chunk_count}
                  </TableCell>
                  <TableCell className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(doc.updated_at).toLocaleString("th-TH")}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc)}
                        disabled={deletingId === doc.file_id}
                        className="text-zinc-500 dark:text-zinc-400 hover:text-rose-500 h-8 px-2 items-center gap-1.5"
                      >
                        {deletingId === doc.file_id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        ลบ
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="sm:max-w-4xl w-full max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">{previewDoc?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800/50">
            {previewDoc && fileExtension(previewDoc.title) === "pdf" ? (
              <iframe
                src={previewDoc.view_url ?? undefined}
                title={previewDoc.title}
                className="w-full h-[75vh] bg-white"
              />
            ) : previewLoading ? (
              <div className="flex items-center justify-center h-[50vh] text-zinc-500 dark:text-zinc-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                กำลังโหลดตัวอย่าง...
              </div>
            ) : previewError ? (
              <div className="flex items-center justify-center h-[50vh] text-rose-500 text-sm">
                {previewError}
              </div>
            ) : previewHtml !== null ? (
              <div
                className="p-6 text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1 [&_strong]:font-semibold [&_table]:border-collapse [&_table]:w-full [&_table]:mb-3 [&_td]:border [&_td]:border-zinc-300 [&_td]:dark:border-zinc-700 [&_td]:p-2 [&_th]:border [&_th]:border-zinc-300 [&_th]:dark:border-zinc-700 [&_th]:p-2 [&_th]:bg-zinc-100 [&_th]:dark:bg-zinc-800 [&_img]:max-w-full"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : previewText !== null ? (
              <pre className="p-6 text-sm whitespace-pre-wrap text-zinc-800 dark:text-zinc-200 font-mono">
                {previewText}
              </pre>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
