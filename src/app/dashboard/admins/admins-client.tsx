"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, UserPlus, KeyRound, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface AdminRow {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  name_th: string | null;
  created_at: string;
}

export interface EmployeeOption {
  emp_id: number;
  name: string;
  name_th: string | null;
  email: string | null;
}

interface ProfileForm {
  email: string;
  name: string;
  name_th: string;
  password: string;
}

const MIN_PASSWORD = 8;
const selectClass =
  "w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-zinc-800 dark:text-zinc-200";
const blankForm = (): ProfileForm => ({ email: "", name: "", name_th: "", password: "" });

async function callApi(payload: Record<string, unknown>) {
  const res = await fetch("/api/admin-accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || "ทำรายการไม่สำเร็จ");
  return data;
}

/** Password input with a show/hide toggle. Visible only while being typed. */
function PasswordField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`อย่างน้อย ${MIN_PASSWORD} ตัวอักษร`}
        autoComplete="new-password"
        disabled={disabled}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function AdminsClient({
  admins: initialAdmins,
  employees,
  currentUserId,
}: {
  admins: AdminRow[];
  employees: EmployeeOption[];
  currentUserId: string | null;
}) {
  const [admins, setAdmins] = useState(initialAdmins);

  // Add or edit share one dialog: `editing` null means "add".
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [form, setForm] = useState<ProfileForm>(blankForm());
  const [pickedEmp, setPickedEmp] = useState("");
  const [saving, setSaving] = useState(false);

  const [resetting, setResetting] = useState<AdminRow | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const adminEmails = new Set(admins.map((a) => a.email.toLowerCase()));

  function openAdd() {
    setEditing(null);
    setForm(blankForm());
    setPickedEmp("");
    setDialogOpen(true);
  }

  function openEdit(a: AdminRow) {
    setEditing(a);
    setForm({ email: a.email, name: a.name || "", name_th: a.name_th || "", password: "" });
    setDialogOpen(true);
  }

  function pickEmployee(empId: string) {
    setPickedEmp(empId);
    const emp = employees.find((e) => String(e.emp_id) === empId);
    if (!emp) return;
    setForm((f) => ({ ...f, email: emp.email || "", name: emp.name || "", name_th: emp.name_th || "" }));
  }

  async function save() {
    setSaving(true);
    try {
      if (editing) {
        await callApi({ action: "update", admin_id: editing.id, name: form.name, name_th: form.name_th });
        setAdmins((prev) =>
          prev.map((a) => (a.id === editing.id ? { ...a, name: form.name.trim(), name_th: form.name_th.trim() || null } : a))
        );
        toast.success("บันทึกแล้ว");
      } else {
        const data = await callApi({ action: "create", ...form });
        setAdmins((prev) => [...prev, data.admin as AdminRow]);
        toast.success(`เพิ่ม ${form.email.trim()} แล้ว`);
      }
      setForm(blankForm());
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function saveReset() {
    if (!resetting) return;
    setSaving(true);
    try {
      await callApi({ action: "reset_password", admin_id: resetting.id, password: resetPassword });
      toast.success(`ตั้งรหัสผ่านใหม่ให้ ${resetting.email} แล้ว`);
      setResetting(null);
      setResetPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  const canSave = !!form.name.trim() && (editing ? true : !!form.email.trim() && form.password.length >= MIN_PASSWORD);

  return (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-sm rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">แอดมินทั้งหมด ({admins.length})</h2>
          <Button size="sm" onClick={openAdd} className="gap-1.5 bg-[#0C645B] hover:bg-[#0a5750] text-white">
            <UserPlus className="w-4 h-4" />
            เพิ่มแอดมิน
          </Button>
        </div>
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {admins.map((a) => {
            const missingName = !a.name && !a.name_th;
            const isMe = a.user_id === currentUserId;
            return (
              <li key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                <div className="flex-1 min-w-0 text-sm">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 flex flex-wrap items-center gap-2">
                    {missingName ? (
                      <span className="italic text-zinc-500">ยังไม่มีชื่อ</span>
                    ) : a.name_th && a.name ? (
                      `${a.name_th} (${a.name})`
                    ) : (
                      a.name_th || a.name
                    )}
                    {isMe && <Badge variant="outline" className="text-[0.6875rem]">คุณ</Badge>}
                    {missingName && (
                      <Badge variant="outline" className="text-[0.6875rem] border-amber-500/40 text-amber-600 dark:text-amber-400">
                        ตอบข้อความพนักงานไม่ได้จนกว่าจะใส่ชื่อ
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{a.email}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(a)} className="gap-1.5 text-zinc-500 hover:text-blue-500">
                    <Pencil className="w-3.5 h-3.5" />
                    แก้ไข
                  </Button>
                  {!isMe && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setResetPassword("");
                        setResetting(a);
                      }}
                      className="gap-1.5 text-zinc-500 hover:text-amber-600"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      รีเซ็ตรหัสผ่าน
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Add / edit */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setDialogOpen(false);
            setForm(blankForm());
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "แก้ไขข้อมูลแอดมิน" : "เพิ่มแอดมิน"}</DialogTitle>
            <DialogDescription>
              {editing ? editing.email : "คนใหม่ต้องตั้งรหัสผ่านของตัวเองและตั้ง 2FA ตอนล็อกอินครั้งแรก"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {!editing && (
              <div className="space-y-1.5">
                <Label>เลือกจากรายชื่อพนักงาน</Label>
                <select className={selectClass} value={pickedEmp} onChange={(e) => pickEmployee(e.target.value)}>
                  <option value="">— กรอกเอง —</option>
                  {employees.map((e) => {
                    const already = !!e.email && adminEmails.has(e.email.toLowerCase());
                    return (
                      <option key={e.emp_id} value={String(e.emp_id)} disabled={already}>
                        {e.name_th || e.name}
                        {already ? " (เป็นแอดมินแล้ว)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
            {!editing && (
              <div className="space-y-1.5">
                <Label>Email (ใช้ล็อกอิน)</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>ชื่อ-นามสกุล (อังกฤษ)</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>ชื่อ-นามสกุล (ไทย)</Label>
              <Input value={form.name_th} onChange={(e) => setForm({ ...form, name_th: e.target.value })} />
            </div>
            {!editing && (
              <div className="space-y-1.5">
                <Label>รหัสผ่าน</Label>
                <PasswordField value={form.password} onChange={(v) => setForm({ ...form, password: v })} disabled={saving} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>ยกเลิก</Button>
            <Button onClick={save} disabled={saving || !canSave}>
              {saving ? "กำลังบันทึก..." : editing ? "บันทึก" : "เพิ่มแอดมิน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset another admin's password */}
      <Dialog
        open={!!resetting}
        onOpenChange={(o) => {
          if (!o) {
            setResetting(null);
            setResetPassword("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>รีเซ็ตรหัสผ่าน</DialogTitle>
            <DialogDescription>
              {resetting?.email} · รหัสเดิมจะใช้ไม่ได้ทันที และเจ้าของบัญชีต้องตั้งรหัสผ่านใหม่ตอนล็อกอินครั้งถัดไป
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>รหัสผ่านใหม่</Label>
            <PasswordField value={resetPassword} onChange={setResetPassword} disabled={saving} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetting(null)} disabled={saving}>ยกเลิก</Button>
            <Button onClick={saveReset} disabled={saving || resetPassword.length < MIN_PASSWORD}>
              {saving ? "กำลังบันทึก..." : "ตั้งรหัสผ่าน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
