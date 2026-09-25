"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, AlertCircle, Loader2 } from "lucide-react";

const inputClass =
  "bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500/50 focus:ring-blue-500/20 h-11";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (password !== confirm) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
      // The middleware takes it from here: 2FA setup or verification next.
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เปลี่ยนรหัสผ่านไม่สำเร็จ");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md mx-4 border-zinc-800/50 bg-zinc-900/80 backdrop-blur-xl shadow-2xl shadow-black/50 relative z-10">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto w-14 h-14 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-2">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-zinc-100">ตั้งรหัสผ่านใหม่</CardTitle>
          <CardDescription className="text-zinc-400">
            บัญชีนี้ใช้รหัสผ่านชั่วคราวอยู่ ตั้งรหัสผ่านของคุณเองก่อนเข้าใช้งาน
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300 text-sm">รหัสผ่านใหม่</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={8} placeholder="อย่างน้อย 8 ตัวอักษร" disabled={saving} className={inputClass} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-zinc-300 text-sm">ยืนยันรหัสผ่านใหม่</Label>
              <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                required minLength={8} placeholder="••••••••" disabled={saving} className={inputClass} />
            </div>
            <Button type="submit" disabled={saving}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-medium">
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </span>
              ) : (
                "บันทึกรหัสผ่าน"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
