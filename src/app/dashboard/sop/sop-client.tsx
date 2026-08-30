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
import { toast } from "sonner";
import { UploadCloud, FileText, Trash2, Loader2, AlertTriangle, Eye } from "lucide-react";
import type { SopDocumentSummary } from "@/app/api/documents/route";

interface SopClientProps {
  initialDocuments: SopDocumentSummary[];
  configError: string | null;
}

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];

export function SopClient({ initialDocuments, configError }: SopClientProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setPendingFile(e.target.files?.[0] || null);
  }

  function isAcceptedFile(file: File) {
    const name = file.name.toLowerCase();
    return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
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
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!isAcceptedFile(file)) {
      toast.error("รองรับเฉพาะไฟล์ PDF, DOCX, TXT หรือ MD เท่านั้น");
      return;
    }
    setPendingFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload() {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", pendingFile);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`อัปโหลด "${data.title}" สำเร็จ (${data.chunk_count} ส่วน)`);
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
        setPendingFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        toast.error(data.error || "อัปโหลดไม่สำเร็จ");
      }
    } catch {
      toast.error("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setUploading(false);
    }
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
            className={`rounded-lg border-2 border-dashed p-4 transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-500/5"
                : "border-zinc-300 dark:border-zinc-700/50"
            }`}
          >
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
              ลากไฟล์มาวางตรงนี้ หรือเลือกไฟล์ด้านล่าง
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                onChange={handlePickFile}
                className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-zinc-100 dark:file:bg-zinc-800 file:text-zinc-700 dark:file:text-zinc-300 file:text-sm file:font-medium hover:file:bg-zinc-200 dark:hover:file:bg-zinc-700 rounded-lg border border-zinc-300 dark:border-zinc-700/50 bg-zinc-50 dark:bg-zinc-800/50"
              />
              <Button
                onClick={handleUpload}
                disabled={!pendingFile || uploading}
                className="bg-blue-600 hover:bg-blue-500 text-white shrink-0 items-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังอัปโหลด...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    อัปโหลดและบันทึก
                  </>
                )}
              </Button>
            </div>
          </div>
          {pendingFile && (
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              เลือกไฟล์แล้ว: <span className="font-medium">{pendingFile.name}</span> (
              {(pendingFile.size / 1024).toFixed(0)} KB)
            </p>
          )}
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
                  className="border-zinc-200 dark:border-zinc-800/50 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/30"
                >
                  <TableCell className="max-w-[320px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                      <span
                        title={doc.title}
                        className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate"
                      >
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
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {doc.view_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          render={<a href={doc.view_url} target="_blank" rel="noopener noreferrer" />}
                          className="text-zinc-500 dark:text-zinc-400 hover:text-blue-500 h-8 px-2 items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          ดู
                        </Button>
                      )}
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
    </div>
  );
}
