"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Suspense } from "react";
import { AlertTriangle, AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { markTabLoggedIn } from "@/components/tab-session-guard";

// Supabase answers in English and the browser's own form checks follow the
// browser language; everything the user reads here is Thai.
function loginErrorText(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  if (m.includes("email not confirmed")) return "บัญชีนี้ยังไม่ได้ยืนยันอีเมล กรุณาติดต่อผู้ดูแลระบบ";
  if (m.includes("rate") || m.includes("too many")) return "พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่";
  if (m.includes("fetch") || m.includes("network")) return "เชื่อมต่อระบบไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";
  return "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่";
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const unauthorized = searchParams.get("error") === "unauthorized";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    const nextEmailError = !cleanEmail
      ? "กรุณากรอกอีเมล"
      : EMAIL_PATTERN.test(cleanEmail)
        ? null
        : "รูปแบบอีเมลไม่ถูกต้อง เช่น admin@hotel.com";
    const nextPasswordError = password ? null : "กรุณากรอกรหัสผ่าน";
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) {
      document.getElementById(nextEmailError ? "email" : "password")?.focus();
      return;
    }
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (authError) {
        // Record failed login attempt
        await fetch("/api/auth/login-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            admin_name: cleanEmail.split("@")[0],
            status: "failed",
            notes: authError.message.toLowerCase().includes("invalid login credentials")
              ? "รหัสผ่านไม่ถูกต้อง (Invalid credentials)"
              : authError.message,
          }),
        }).catch(() => {});

        setError(loginErrorText(authError.message));
        setLoading(false);
        return;
      }

      // Check admin status
      if (data?.user) {
        const { data: adminUser, error: adminErr } = await supabase
          .from("admin_users")
          .select("id, name, name_th, is_active")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (adminErr) {
          console.error("Admin check error:", adminErr);
        }

        // Admin accounts are created by other admins (Admin Accounts page);
        // any other login is refused here rather than bounced by the middleware.
        if (!adminUser) {
          await supabase.auth.signOut();
          await fetch("/api/auth/login-log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: cleanEmail,
              admin_name: cleanEmail.split("@")[0],
              status: "failed",
              notes: "ไม่มีสิทธิ์เข้าถึง Dashboard (Not an admin)",
            }),
          }).catch(() => {});
          setError("คุณไม่มีสิทธิ์เข้าถึง Dashboard");
          setLoading(false);
          return;
        }

        // Check if account is suspended
        if (
          adminUser.is_active === false ||
          data.user.app_metadata?.status === "suspended" ||
          data.user.app_metadata?.is_active === false
        ) {
          await supabase.auth.signOut();
          await fetch("/api/auth/login-log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: cleanEmail,
              admin_name: adminUser.name_th || adminUser.name || cleanEmail.split("@")[0],
              status: "failed",
              notes: "บัญชีถูกปิดการใช้งาน (Account suspended)",
            }),
          }).catch(() => {});
          setError("บัญชีนี้ถูกปิดการใช้งาน (Suspended) กรุณาติดต่อผู้ดูแลระบบ");
          setLoading(false);
          return;
        }

        // Record successful initial authentication
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const hasVerifiedFactor = (factors?.totp || []).length > 0;

        await fetch("/api/auth/login-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            admin_name: adminUser.name_th || adminUser.name || cleanEmail.split("@")[0],
            status: "success",
            notes: hasVerifiedFactor ? "เข้าสู่ระบบสำเร็จ (รอรหัส 2FA)" : "เข้าสู่ระบบสำเร็จ (รอตั้งค่า 2FA)",
          }),
        }).catch(() => {});
      }

      // This tab has now logged in itself; pages behind login check for it.
      markTabLoggedIn();

      // ทุกบัญชีต้องผ่าน 2FA (TOTP) — เช็คว่าเคยตั้งค่าไว้หรือยัง
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const hasVerifiedFactor = (factors?.totp || []).length > 0;

      if (hasVerifiedFactor) {
        router.push("/mfa/verify");
      } else {
        router.push("/mfa/enroll");
      }
      router.refresh();
    } catch (err) {
      console.error("Login failed:", err);
      setError(loginErrorText(err instanceof Error ? err.message : ""));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <Card className="w-full max-w-md mx-4 border-zinc-800/50 bg-zinc-900/80 backdrop-blur-xl shadow-2xl shadow-black/50 relative z-10">
        <CardHeader className="text-center space-y-3 pb-2">
          {/* Logo */}
          <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-2 overflow-hidden shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bayview-mark.png" alt="The Bayview Pattaya" className="w-full h-full object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold text-zinc-100">
            Admin Dashboard
          </CardTitle>
          <CardDescription className="text-zinc-400">
            ระบบจัดการบอท LINE สำหรับพนักงาน The Bayview Pattaya
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          {unauthorized && (
            <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>คุณไม่มีสิทธิ์เข้าถึง Dashboard</span>
            </div>
          )}

          {error && (
            <div role="alert" className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300 text-sm">
                อีเมล
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                placeholder="เช่น admin@hotel.com"
                required
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "email-error" : undefined}
                disabled={loading}
                className="bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-400 focus:border-blue-500/50 focus:ring-blue-500/20 h-11"
              />
              {emailError && (
                <p id="email-error" className="text-sm text-red-400">
                  {emailError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300 text-sm">
                รหัสผ่าน
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                placeholder="••••••••"
                required
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? "password-error" : undefined}
                disabled={loading}
                className="bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-400 focus:border-blue-500/50 focus:ring-blue-500/20 h-11"
              />
              {passwordError && (
                <p id="password-error" className="text-sm text-red-400">
                  {passwordError}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-500/20 transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </span>
              ) : (
                "เข้าสู่ระบบ"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-400">
            สำหรับผู้ดูแลระบบเท่านั้น ขอบัญชีได้จากแอดมินที่มีอยู่
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-950">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
