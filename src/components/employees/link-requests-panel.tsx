"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EmployeeRegistry, LinkRequest } from "@/lib/types";
import { LOAD_FAILED_EMPTY_TEXT } from "@/components/dashboard/load-error-banner";

const STATUS_BADGE: Record<LinkRequest["status"], { label: string; className: string }> = {
  pending: { label: "รออนุมัติ", className: "border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10" },
  approved: { label: "อนุมัติแล้ว", className: "border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10" },
  rejected: { label: "ไม่อนุมัติ", className: "border-rose-500/30 text-rose-700 dark:text-rose-300 bg-rose-500/10" },
  cancelled: { label: "ยกเลิกแล้ว", className: "border-zinc-500/30 text-zinc-500 dark:text-zinc-400 bg-zinc-500/10" },
};

const dateFormat = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
  month: "short",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(iso: string | null) {
  return iso ? dateFormat.format(new Date(iso)) : "-";
}

/** Why this request can't be approved as it stands, or null when it can. */
function problemOf(request: LinkRequest, employee: EmployeeRegistry | undefined, employees: EmployeeRegistry[]) {
  if (!employee) return `ไม่พบรหัสพนักงาน ${request.emp_id} ในระบบ`;
  if (employee.status === "disabled") return "พนักงานคนนี้ถูกปิดใช้งานอยู่";
  if (employee.line_user_id && employee.line_user_id !== request.line_user_id) {
    return "รหัสนี้ผูก LINE บัญชีอื่นอยู่แล้ว ต้องยกเลิกการผูกเดิมก่อน";
  }
  const other = employees.find((e) => e.line_user_id === request.line_user_id);
  if (other) return `บัญชี LINE นี้ผูกกับรหัส ${other.emp_id} อยู่แล้ว`;
  return null;
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-700" />;
  }
  return (
    <div aria-hidden className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
      {(name.trim()[0] || "?").toUpperCase()}
    </div>
  );
}

/** Who approved or rejected the request, when, and the reason given. */
function Decision({ request: r }: { request: LinkRequest }) {
  if (r.status === "pending") return <span className="text-sm text-zinc-500 dark:text-zinc-400">-</span>;
  const byAdmin = r.status === "approved" || r.status === "rejected";
  return (
    <div className="text-sm">
      {byAdmin ? (
        <>
          <div className="font-medium text-zinc-900 dark:text-zinc-100">
            {r.decided_by_name || r.decided_by || "ไม่ทราบชื่อแอดมิน"}
          </div>
          {r.decided_by_name && r.decided_by && (
            <div className="break-all text-xs text-zinc-500 dark:text-zinc-400">{r.decided_by}</div>
          )}
        </>
      ) : (
        <div className="text-zinc-600 dark:text-zinc-300">{r.note || "ยกเลิก"}</div>
      )}
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(r.decided_at)}</div>
      {byAdmin && r.note && (
        <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
          {r.status === "rejected" ? "เหตุผล: " : ""}
          {r.note}
        </div>
      )}
    </div>
  );
}

interface LinkRequestsPanelProps {
  requests: LinkRequest[];
  employees: EmployeeRegistry[];
  loadFailed?: boolean;
  /** Called after an approve/reject so the page reloads both lists. */
  onChanged: () => Promise<void> | void;
}

export function LinkRequestsPanel({ requests, employees, loadFailed = false, onChanged }: LinkRequestsPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const [approving, setApproving] = useState<LinkRequest | null>(null);
  const [rejecting, setRejecting] = useState<LinkRequest | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState(false);

  const byEmpId = useMemo(() => new Map(employees.map((e) => [e.emp_id, e])), [employees]);
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const shown = showAll ? requests : requests.filter((r) => r.status === "pending");

  async function decide(request: LinkRequest, action: "approve" | "reject", note?: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/link-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: request.id, action, note }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`);

      if (action === "approve") {
        const name = data.employee?.name_th || data.employee?.name || `รหัส ${request.emp_id}`;
        toast.success(`ยืนยันตัวตนให้ ${name} แล้ว`, { description: "ผูกบัญชี LINE เรียบร้อย พนักงานใช้บอทได้ทันที" });
        if (data.menuWarning) {
          toast.warning("ผูกบัญชีแล้ว แต่เปลี่ยนเป็นเมนูพนักงานไม่สำเร็จ", { description: data.menuWarning });
        }
        setApproving(null);
      } else {
        toast.success("ปฏิเสธคำขอแล้ว");
        setRejecting(null);
      }
      await onChanged();
    } catch (err) {
      toast.error(action === "approve" ? "อนุมัติไม่สำเร็จ" : "ปฏิเสธไม่สำเร็จ", {
        description: err instanceof Error ? err.message : undefined,
      });
      // The request may have been handled meanwhile; show the current state.
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  const approvingEmployee = approving ? byEmpId.get(approving.emp_id) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-zinc-700 dark:text-zinc-300 sm:flex-row sm:items-center sm:justify-between">
        <p className="leading-relaxed">
          สำหรับพนักงานที่ไม่มีอีเมลรับรหัส OTP: พนักงานส่งคำขอจากหน้ายืนยันตัวตนใน LINE
          ก่อนกดอนุมัติ <span className="font-semibold">ให้ดูบัตรพนักงานตัวจริง</span> และ
          <span className="font-semibold">รหัสคำขอ 4 หลักบนมือถือของพนักงาน</span> ให้ตรงกับในตารางนี้
        </p>
        <div className="flex shrink-0 gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900/50">
          {[
            { value: false, label: `รออนุมัติ (${pendingCount})` },
            { value: true, label: `ทั้งหมด (${requests.length})` },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              aria-pressed={showAll === opt.value}
              onClick={() => setShowAll(opt.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                showAll === opt.value
                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/50 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 dark:border-zinc-800/50 hover:bg-transparent">
              <TableHead className="h-12 px-4 text-sm text-zinc-500 dark:text-zinc-400 w-28">รหัสคำขอ</TableHead>
              <TableHead className="h-12 px-4 text-sm text-zinc-500 dark:text-zinc-400">บัญชี LINE</TableHead>
              <TableHead className="h-12 px-4 text-sm text-zinc-500 dark:text-zinc-400">พนักงานตามรหัสที่แจ้ง</TableHead>
              <TableHead className="h-12 px-4 text-sm text-zinc-500 dark:text-zinc-400 w-36">ส่งคำขอเมื่อ</TableHead>
              <TableHead className="h-12 px-4 text-sm text-zinc-500 dark:text-zinc-400 w-28">สถานะ</TableHead>
              <TableHead className="h-12 px-4 text-sm text-zinc-500 dark:text-zinc-400 w-52">ผู้อนุมัติ / ไม่อนุมัติ</TableHead>
              <TableHead className="h-12 px-4 text-sm text-zinc-500 dark:text-zinc-400 text-right w-48">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-zinc-500 dark:text-zinc-400 py-12">
                  {loadFailed
                    ? LOAD_FAILED_EMPTY_TEXT
                    : showAll
                      ? "ยังไม่มีคำขอ"
                      : "ไม่มีคำขอที่รออนุมัติ"}
                </TableCell>
              </TableRow>
            ) : (
              shown.map((r) => {
                const employee = byEmpId.get(r.emp_id);
                const problem = r.status === "pending" ? problemOf(r, employee, employees) : null;
                const badge = STATUS_BADGE[r.status];
                return (
                  <TableRow key={r.id} className="border-zinc-200 dark:border-zinc-800/50 align-top">
                    <TableCell className="px-4 py-4">
                      <span className="font-mono text-lg font-bold tracking-widest text-zinc-900 dark:text-zinc-100">
                        {r.ref_code}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar url={r.line_picture_url} name={r.line_name || "?"} />
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {r.line_name || <span className="text-zinc-500 dark:text-zinc-400">(ไม่มีชื่อ LINE)</span>}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="text-sm">
                        <span className="font-mono text-zinc-500 dark:text-zinc-400">{r.emp_id}</span>
                        {employee ? (
                          <>
                            <span className="ml-2 font-medium text-zinc-900 dark:text-zinc-100">
                              {employee.name_th || employee.name}
                            </span>
                            {employee.name_th && employee.name && (
                              <div className="text-xs text-zinc-500 dark:text-zinc-400">{employee.name}</div>
                            )}
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {[employee.department, employee.position].filter(Boolean).join(" / ") || "-"}
                            </div>
                          </>
                        ) : null}
                        {problem && (
                          <div className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                            {problem}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400">{formatDate(r.created_at)}</TableCell>
                    <TableCell className="px-4 py-4">
                      <Badge variant="outline" className={badge.className}>
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <Decision request={r} />
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right">
                      {r.status === "pending" && (
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            disabled={!!problem || busy}
                            onClick={() => setApproving(r)}
                            className="h-10 sm:h-8 gap-1 bg-blue-600 text-white hover:bg-blue-700"
                          >
                            <Check className="h-4 w-4" aria-hidden />
                            อนุมัติ
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => {
                              setRejectNote("");
                              setRejecting(r);
                            }}
                            className="h-10 sm:h-8 gap-1 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                          >
                            <X className="h-4 w-4" aria-hidden />
                            ปฏิเสธ
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Approve */}
      <Dialog open={!!approving} onOpenChange={(o) => !o && !busy && setApproving(null)}>
        <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>อนุมัติคำขอ {approving?.ref_code}?</DialogTitle>
            <DialogDescription className="text-zinc-600 dark:text-zinc-400">
              ตรวจให้ครบก่อนกดอนุมัติ ระบบจะผูกบัญชี LINE นี้กับพนักงานคนนี้ และเปลี่ยนเป็นเมนูพนักงานทันที
            </DialogDescription>
          </DialogHeader>
          {approving && (
            <div className="space-y-3 text-sm">
              <ul className="list-disc space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
                <li>
                  บัตรพนักงานตัวจริงเป็นของ{" "}
                  <span className="font-semibold">
                    {approvingEmployee?.name_th || approvingEmployee?.name} (รหัส {approving.emp_id})
                  </span>
                </li>
                <li>
                  มือถือของพนักงานแสดงรหัสคำขอ{" "}
                  <span className="font-mono text-base font-bold tracking-widest">{approving.ref_code}</span>
                </li>
                <li>
                  ชื่อ LINE บนมือถือคือ <span className="font-semibold">{approving.line_name || "(ไม่มีชื่อ)"}</span>
                </li>
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" disabled={busy} onClick={() => setApproving(null)} className="text-zinc-600 dark:text-zinc-400">
              ยกเลิก
            </Button>
            <Button
              disabled={busy}
              onClick={() => approving && decide(approving, "approve")}
              className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              ตรวจแล้ว อนุมัติ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject */}
      <Dialog open={!!rejecting} onOpenChange={(o) => !o && !busy && setRejecting(null)}>
        <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ปฏิเสธคำขอ {rejecting?.ref_code}?</DialogTitle>
            <DialogDescription className="text-zinc-600 dark:text-zinc-400">
              พนักงานจะเห็นว่าคำขอถูกปฏิเสธพร้อมเหตุผลด้านล่าง (ถ้ากรอก) และส่งคำขอใหม่ได้
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reject-note">เหตุผล (ไม่บังคับ)</Label>
            <Textarea
              id="reject-note"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value.slice(0, 300))}
              placeholder="เช่น รหัสพนักงานไม่ตรงกับบัตร กรุณาส่งคำขอใหม่"
              className="bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/50"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" disabled={busy} onClick={() => setRejecting(null)} className="text-zinc-600 dark:text-zinc-400">
              ยกเลิก
            </Button>
            <Button
              disabled={busy}
              onClick={() => rejecting && decide(rejecting, "reject", rejectNote)}
              className="gap-1.5 bg-rose-600 text-white hover:bg-rose-700"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              ปฏิเสธคำขอ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
