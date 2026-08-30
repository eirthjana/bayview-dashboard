"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { EmployeeRegistry } from "@/lib/types";
import { DEPARTMENTS, ACCESS_LEVELS } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Copy } from "lucide-react";

interface EmployeesTableProps {
  employees: EmployeeRegistry[];
}

const ACCESS_BADGE_CLASS: Record<string, string> = {
  staff: "border-zinc-500/30 text-zinc-500 dark:text-zinc-400 bg-zinc-500/10",
  manager: "border-amber-500/30 text-amber-400 bg-amber-500/10",
};

function deriveAccessLevel(position: string): EmployeeRegistry["access_level"] {
  return (position || "").toLowerCase().includes("manager") ? "manager" : "staff";
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`คัดลอก${label}แล้ว`);
  } catch {
    toast.error("คัดลอกไม่สำเร็จ");
  }
}

function DetailRow({
  label,
  value,
  mono,
  copyable,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  copyable?: boolean;
}) {
  const display = value && value.trim() ? value : null;
  return (
    <div className="space-y-1">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <div className="flex items-center gap-1.5">
        <p className={`text-sm text-zinc-800 dark:text-zinc-200 break-all ${mono ? "font-mono" : ""}`}>
          {display || <span className="text-zinc-500 dark:text-zinc-400 italic">-</span>}
        </p>
        {copyable && display && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => copyText(display, label)}
            className="h-6 w-6 shrink-0 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function EmployeesTable({ employees: initial }: EmployeesTableProps) {
  const [employees, setEmployees] = useState(initial);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("__all__");
  const [linkFilter, setLinkFilter] = useState<string>("__all__");

  const [viewing, setViewing] = useState<EmployeeRegistry | null>(null);

  const [editing, setEditing] = useState<EmployeeRegistry | null>(null);
  const [editDept, setEditDept] = useState("");
  const [editPos, setEditPos] = useState("");
  const [editLineId, setEditLineId] = useState("");
  const [editLineName, setEditLineName] = useState("");
  const [editLinePicture, setEditLinePicture] = useState("");
  const [fetchingEditProfile, setFetchingEditProfile] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const editAccess = deriveAccessLevel(editPos);

  const [addOpen, setAddOpen] = useState(false);
  const [addEmpId, setAddEmpId] = useState("");
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addDept, setAddDept] = useState("Executive Office");
  const [addPos, setAddPos] = useState(DEPARTMENTS["Executive Office"][0]);
  const [adding, setAdding] = useState(false);
  const addAccess = deriveAccessLevel(addPos);

  const departmentOptions = useMemo(() => Object.keys(DEPARTMENTS), []);

  const filtered = employees.filter((e) => {
    const q = search.trim().toLowerCase();
    const matchQ =
      !q ||
      e.name.toLowerCase().includes(q) ||
      (e.name_th || "").toLowerCase().includes(q) ||
      (e.department || "").toLowerCase().includes(q) ||
      (e.position || "").toLowerCase().includes(q) ||
      String(e.emp_id).includes(q) ||
      (e.line_user_id || "").toLowerCase().includes(q) ||
      (e.line_name || "").toLowerCase().includes(q);
    const matchDept = deptFilter === "__all__" || e.department === deptFilter;
    const matchLink =
      linkFilter === "__all__" ||
      (linkFilter === "linked" && !!e.line_user_id) ||
      (linkFilter === "unlinked" && !e.line_user_id);
    return matchQ && matchDept && matchLink;
  });

  function openEdit(emp: EmployeeRegistry) {
    setEditing(emp);
    setEditDept(emp.department || "");
    setEditPos(emp.position || "");
    setEditLineId(emp.line_user_id || "");
    setEditLineName(emp.line_name || "");
    setEditLinePicture("");
    setEditEmail(emp.email || "");
  }

  async function handleFetchProfileEdit() {
    const lineUserId = editLineId.trim();
    if (!lineUserId) {
      toast.error("ใส่ LINE User ID ก่อนกดดึงโปรไฟล์");
      return;
    }
    setFetchingEditProfile(true);
    setEditLinePicture("");
    try {
      const res = await fetch("/api/line/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineUserId }),
      });
      const data = await res.json();
      if (data.success) {
        setEditLineName(data.displayName || "");
        setEditLinePicture(data.pictureUrl || "");
        toast.success("ดึงโปรไฟล์ LINE สำเร็จ");
      } else {
        toast.error(data.error || "ไม่พบโปรไฟล์ LINE ID นี้");
      }
    } catch {
      toast.error("เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setFetchingEditProfile(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      const trimmedLineId = editLineId.trim() || null;
      const trimmedLineName = editLineName.trim() || null;
      const trimmedEmail = editEmail.trim() || null;
      const nextStatus =
        editing.status === "disabled" ? "disabled" : trimmedLineId ? "linked" : "unlinked";

      const supabase = createClient();
      const { error } = await supabase
        .from("employee_test")
        .update({
          department: editDept,
          position: editPos,
          access_level: editAccess,
          line_user_id: trimmedLineId,
          line_name: trimmedLineName,
          email: trimmedEmail,
          status: nextStatus,
        })
        .eq("emp_id", editing.emp_id);

      if (error) throw error;

      setEmployees((prev) =>
        prev.map((e) =>
          e.emp_id === editing.emp_id
            ? {
                ...e,
                department: editDept,
                position: editPos,
                access_level: editAccess,
                line_user_id: trimmedLineId,
                line_name: trimmedLineName,
                email: trimmedEmail,
                status: nextStatus,
              }
            : e
        )
      );
      toast.success(`บันทึกข้อมูลของ ${editing.name} แล้ว`);
      setEditing(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("duplicate") || message.includes("unique")) {
        toast.error("LINE ID นี้ถูกผูกกับพนักงานคนอื่นไปแล้ว");
      } else {
        toast.error("บันทึกไม่สำเร็จ กรุณาลองใหม่");
      }
    } finally {
      setSaving(false);
    }
  }

  function openAdd() {
    const nextId = employees.length
      ? Math.max(...employees.map((e) => e.emp_id)) + 1
      : 1001;
    setAddEmpId(String(nextId));
    setAddName("");
    setAddEmail("");
    setAddDept("Executive Office");
    setAddPos(DEPARTMENTS["Executive Office"][0]);
    setAddOpen(true);
  }

  async function saveAdd() {
    const empId = parseInt(addEmpId, 10);
    if (!empId || !addName.trim()) {
      toast.error("กรุณากรอกรหัสพนักงานและชื่อให้ครบ");
      return;
    }
    setAdding(true);
    try {
      const trimmedEmail = addEmail.trim() || null;

      const supabase = createClient();
      const { error } = await supabase.from("employee_test").insert({
        emp_id: empId,
        name: addName.trim(),
        department: addDept,
        position: addPos,
        line_user_id: null,
        line_name: null,
        email: trimmedEmail,
        status: "unlinked",
      });

      if (error) throw error;

      setEmployees((prev) => [
        ...prev,
        {
          emp_id: empId,
          name: addName.trim(),
          name_th: null,
          nickname: null,
          nickname_th: null,
          department: addDept,
          position: addPos,
          line_user_id: null,
          line_name: null,
          email: trimmedEmail,
          phone_number: null,
          status: "unlinked",
          access_level: addAccess,
        },
      ]);
      toast.success(`เพิ่ม ${addName.trim()} แล้ว`);
      setAddOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("duplicate") || message.includes("emp_id")) {
        toast.error("รหัสพนักงานนี้มีอยู่แล้ว ลองเปลี่ยนรหัส");
      } else {
        toast.error("เพิ่มไม่สำเร็จ กรุณาลองใหม่");
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleUnlink(emp: EmployeeRegistry) {
    if (!confirm(`ยกเลิกการผูก LINE ID ของ "${emp.name}" ใช่หรือไม่?`)) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("employee_test")
        .update({ line_user_id: null, line_name: null, status: "unlinked" })
        .eq("emp_id", emp.emp_id);

      if (error) throw error;

      setEmployees((prev) =>
        prev.map((e) =>
          e.emp_id === emp.emp_id
            ? { ...e, line_user_id: null, line_name: null, status: "unlinked" }
            : e
        )
      );
      toast.success(`ยกเลิกการผูก LINE ของ ${emp.name} แล้ว`);
    } catch {
      toast.error("ทำรายการไม่สำเร็จ");
    }
  }

  async function handleToggleDisable(emp: EmployeeRegistry) {
    const nextStatus = emp.status === "disabled" ? (emp.line_user_id ? "linked" : "unlinked") : "disabled";
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("employee_test")
        .update({ status: nextStatus })
        .eq("emp_id", emp.emp_id);

      if (error) throw error;

      setEmployees((prev) =>
        prev.map((e) => (e.emp_id === emp.emp_id ? { ...e, status: nextStatus } : e))
      );
      toast.success(
        nextStatus === "disabled" ? `ปิดใช้งาน ${emp.name} แล้ว` : `เปิดใช้งาน ${emp.name} แล้ว`
      );
    } catch {
      toast.error("ทำรายการไม่สำเร็จ");
    }
  }

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="ค้นหาชื่อ / ตำแหน่ง / รหัสพนักงาน / LINE ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
        />
        <Select value={deptFilter} onValueChange={(v) => setDeptFilter(v || "__all__")}>
          <SelectTrigger className="w-[220px] bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100">
            <SelectValue placeholder="ทุกแผนก">
              {(value: string) => (!value || value === "__all__" ? "ทุกแผนก" : value)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700">
            <SelectItem value="__all__">ทุกแผนก</SelectItem>
            {departmentOptions.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={linkFilter} onValueChange={(v) => setLinkFilter(v || "__all__")}>
          <SelectTrigger className="w-[180px] bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100">
            <SelectValue placeholder="สถานะการผูก">
              {(value: string) => {
                if (value === "linked") return "ผูก LINE แล้ว";
                if (value === "unlinked") return "ยังไม่ผูก";
                return "ทุกสถานะ";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700">
            <SelectItem value="__all__">ทุกสถานะ</SelectItem>
            <SelectItem value="linked">ผูก LINE แล้ว</SelectItem>
            <SelectItem value="unlinked">ยังไม่ผูก</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-500 text-white sm:ml-auto">
          เพิ่มพนักงาน
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-200 dark:border-zinc-800/50 hover:bg-transparent">
              <TableHead className="text-zinc-500 dark:text-zinc-400">รหัส</TableHead>
              <TableHead className="text-zinc-500 dark:text-zinc-400">ชื่อ-นามสกุล</TableHead>
              <TableHead className="text-zinc-500 dark:text-zinc-400">แผนก / ตำแหน่ง</TableHead>
              <TableHead className="text-zinc-500 dark:text-zinc-400">สิทธิ์</TableHead>
              <TableHead className="text-zinc-500 dark:text-zinc-400">LINE ID</TableHead>
              <TableHead className="text-zinc-500 dark:text-zinc-400">สถานะ</TableHead>
              <TableHead className="text-zinc-500 dark:text-zinc-400 text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-zinc-500 dark:text-zinc-400 py-12">
                  {search ? "ไม่พบพนักงานที่ค้นหา" : "ยังไม่มีข้อมูลพนักงาน"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((emp) => (
                <TableRow
                  key={emp.emp_id}
                  onClick={() => setViewing(emp)}
                  className="border-zinc-200 dark:border-zinc-800/50 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/30 cursor-pointer"
                >
                  <TableCell className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{emp.emp_id}</TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{emp.name}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {emp.name_th || <span className="italic">-</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-zinc-700 dark:text-zinc-300">{emp.department}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{emp.position}</div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={ACCESS_BADGE_CLASS[emp.access_level] || ACCESS_BADGE_CLASS.staff}
                    >
                      {ACCESS_LEVELS.find((a) => a.value === emp.access_level)?.label || emp.access_level}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {emp.line_user_id || <span className="italic">ยังไม่ผูก</span>}
                  </TableCell>
                  <TableCell>
                    {emp.status === "disabled" ? (
                      <Badge variant="outline" className="border-rose-500/30 text-rose-400 bg-rose-500/10">
                        ปิดใช้งาน
                      </Badge>
                    ) : emp.line_user_id ? (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                        ผูกแล้ว
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-zinc-500/30 text-zinc-500 dark:text-zinc-400 bg-zinc-500/10">
                        รอผูก
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(emp)}
                        className="text-zinc-500 dark:text-zinc-400 hover:text-blue-400 h-8 px-2"
                      >
                        แก้ไข
                      </Button>
                      {emp.line_user_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnlink(emp)}
                          className="text-zinc-500 dark:text-zinc-400 hover:text-orange-400 h-8 px-2"
                        >
                          ยกเลิกผูก
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleDisable(emp)}
                        className="text-zinc-500 dark:text-zinc-400 hover:text-rose-400 h-8 px-2"
                      >
                        {emp.status === "disabled" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View details dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
          <DialogHeader>
            <DialogTitle>รายละเอียดพนักงาน</DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400">
              {viewing?.name} · รหัสพนักงาน #{viewing?.emp_id}
            </DialogDescription>
          </DialogHeader>

          {viewing && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={ACCESS_BADGE_CLASS[viewing.access_level] || ACCESS_BADGE_CLASS.staff}
                >
                  {ACCESS_LEVELS.find((a) => a.value === viewing.access_level)?.label ||
                    viewing.access_level}
                </Badge>
                {viewing.status === "disabled" ? (
                  <Badge variant="outline" className="border-rose-500/30 text-rose-400 bg-rose-500/10">
                    ปิดใช้งาน
                  </Badge>
                ) : viewing.line_user_id ? (
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                    ผูก LINE แล้ว
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-zinc-500/30 text-zinc-500 dark:text-zinc-400 bg-zinc-500/10">
                    รอผูก LINE
                  </Badge>
                )}
              </div>

              <DetailRow label="รหัสพนักงาน" value={String(viewing.emp_id)} mono />

              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <DetailRow label="ชื่อ-นามสกุล (English)" value={viewing.name} />
                <DetailRow label="ชื่อ-นามสกุล (ไทย)" value={viewing.name_th} />
                <DetailRow label="ชื่อเล่น (English)" value={viewing.nickname} />
                <DetailRow label="ชื่อเล่น (ไทย)" value={viewing.nickname_th} />
                <DetailRow label="แผนก" value={viewing.department} />
                <DetailRow label="ตำแหน่ง" value={viewing.position} />
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-800/50 pt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                <DetailRow label="อีเมล" value={viewing.email} copyable />
                <DetailRow label="เบอร์โทร" value={viewing.phone_number} copyable />
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-800/50 pt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                <DetailRow label="LINE User ID" value={viewing.line_user_id} mono copyable />
                <DetailRow label="Line Name" value={viewing.line_name} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => setViewing(null)}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูล: {editing?.name}</DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400">
              ผูก/แก้ไข LINE ID และกำหนดแผนก ตำแหน่ง สิทธิ์การเข้าถึงข้อมูลของ AI
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-500 dark:text-zinc-400">อีเมลบริษัท</Label>
              <Input
                type="email"
                placeholder="เช่น somchai@bayviewpattaya.com"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                ต้องกรอกก่อน ถึงจะให้พนักงานผูก LINE ผ่านระบบยืนยัน OTP เองในแชทได้
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-500 dark:text-zinc-400">LINE User ID</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="เช่น U1234567890abcdef1234567890abcdef (เว้นว่างได้ถ้ายังไม่ผูก)"
                  value={editLineId}
                  onChange={(e) => {
                    setEditLineId(e.target.value);
                    setEditLineName("");
                    setEditLinePicture("");
                  }}
                  className="bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100 font-mono text-sm"
                />
                <Button
                  variant="secondary"
                  onClick={handleFetchProfileEdit}
                  disabled={fetchingEditProfile || !editLineId.trim()}
                  className="shrink-0"
                >
                  {fetchingEditProfile ? "กำลังดึง..." : "ดึงโปรไฟล์"}
                </Button>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                กรอกเองได้ถ้าต้องการผูกด้วยมือ หรือปล่อยว่างให้พนักงานผูกเองผ่าน OTP ในแชท
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-500 dark:text-zinc-400">Line Name</Label>
              <Input
                value={editLineName}
                readOnly
                disabled
                placeholder="กดปุ่ม &quot;ดึงโปรไฟล์&quot; เพื่อดึงชื่อจาก LINE"
                className="bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/50 text-zinc-500 dark:text-zinc-400 cursor-not-allowed opacity-70"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                บอทจะบอกชื่อนี้ในข้อความ &quot;ยังไม่พบข้อมูล&quot; ให้พนักงานส่งมาให้แอดมินตอนขอลิงก์
              </p>
            </div>

            {editLinePicture && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700/50">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={editLinePicture} alt={editLineName} />
                  <AvatarFallback className="bg-zinc-300 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs">
                    {editLineName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{editLineName}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">ชื่อโปรไฟล์ LINE ที่ดึงมา</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-zinc-500 dark:text-zinc-400">แผนก</Label>
              <Select
                value={editDept}
                onValueChange={(v) => {
                  const dept = v || "";
                  setEditDept(dept);
                  setEditPos(DEPARTMENTS[dept]?.[0] || "");
                }}
              >
                <SelectTrigger className="bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100 w-full">
                  <SelectValue placeholder="เลือกแผนก" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700">
                  {Object.keys(DEPARTMENTS).map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-500 dark:text-zinc-400">ตำแหน่ง</Label>
              <Select value={editPos} onValueChange={(v) => setEditPos(v || "")}>
                <SelectTrigger className="bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100 w-full">
                  <SelectValue placeholder="เลือกตำแหน่ง" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700">
                  {(DEPARTMENTS[editDept] || []).map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-500 dark:text-zinc-400">ระดับสิทธิ์เข้าถึงข้อมูล</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={ACCESS_BADGE_CLASS[editAccess]}>
                  {ACCESS_LEVELS.find((a) => a.value === editAccess)?.label}
                </Badge>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  คำนวณอัตโนมัติจากตำแหน่ง — ถ้าตำแหน่งมีคำว่า &quot;Manager&quot; จะได้สิทธิ์ระดับ Manager
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)} className="text-zinc-500 dark:text-zinc-400">
              ยกเลิก
            </Button>
            <Button
              onClick={saveEdit}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add employee dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => !o && setAddOpen(false)}>
        <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
          <DialogHeader>
            <DialogTitle>เพิ่มพนักงานใหม่</DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400">
              กรอกข้อมูลพนักงานและอีเมลบริษัท พนักงานจะผูก LINE เองผ่านระบบยืนยัน OTP ในแชท
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-500 dark:text-zinc-400">รหัสพนักงาน</Label>
                <Input
                  type="number"
                  value={addEmpId}
                  readOnly
                  disabled
                  className="bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/50 text-zinc-500 dark:text-zinc-400 font-mono cursor-not-allowed opacity-70"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-500 dark:text-zinc-400">ชื่อพนักงาน</Label>
                <Input
                  placeholder="เช่น K.Somchai Jaidee"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-500 dark:text-zinc-400">อีเมลบริษัท</Label>
              <Input
                type="email"
                placeholder="เช่น somchai@bayviewpattaya.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                className="bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                ต้องกรอกก่อน ถึงจะให้พนักงานผูก LINE ผ่านระบบยืนยัน OTP เองในแชทได้
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-500 dark:text-zinc-400">แผนก</Label>
              <Select
                value={addDept}
                onValueChange={(v) => {
                  const dept = v || "";
                  setAddDept(dept);
                  setAddPos(DEPARTMENTS[dept]?.[0] || "");
                }}
              >
                <SelectTrigger className="bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100 w-full">
                  <SelectValue placeholder="เลือกแผนก" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700">
                  {Object.keys(DEPARTMENTS).map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-500 dark:text-zinc-400">ตำแหน่ง</Label>
              <Select value={addPos} onValueChange={(v) => setAddPos(v || "")}>
                <SelectTrigger className="bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100 w-full">
                  <SelectValue placeholder="เลือกตำแหน่ง" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700">
                  {(DEPARTMENTS[addDept] || []).map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 pt-0.5">
                <Badge variant="outline" className={ACCESS_BADGE_CLASS[addAccess]}>
                  {ACCESS_LEVELS.find((a) => a.value === addAccess)?.label}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)} className="text-zinc-500 dark:text-zinc-400">
              ยกเลิก
            </Button>
            <Button
              onClick={saveAdd}
              disabled={adding}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {adding ? "กำลังเพิ่ม..." : "เพิ่มพนักงาน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
