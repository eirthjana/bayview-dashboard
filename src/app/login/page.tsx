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

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const unauthorized = searchParams.get("error") === "unauthorized";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError("กรุณากรอก Email และ Password");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (authError) {
        if (authError.message.toLowerCase().includes("email not confirmed")) {
          setError("Email นี้ยังไม่ได้รับการยืนยัน (ไปที่ Supabase -> Authentication -> Users แล้วกด Confirm Email)");
        } else if (authError.message.toLowerCase().includes("invalid login credentials")) {
          setError("Email หรือ Password ไม่ถูกต้อง");
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      // Check admin status
      if (data?.user) {
        const { data: adminUser, error: adminErr } = await supabase
          .from("admin_users")
          .select("id")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (adminErr) {
          console.error("Admin check error:", adminErr);
        }

        // If not admin, warn user
        if (!adminUser) {
          // Check if admin_users is empty, if so allow auto-insert
          const { count } = await supabase
            .from("admin_users")
            .select("*", { count: "exact", head: true });

          if (count === 0) {
            await supabase.from("admin_users").insert({
              user_id: data.user.id,
              email: data.user.email || cleanEmail,
            });
          }
        }
      }

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
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
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
            เข้าสู่ระบบเพื่อจัดการระบบ
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
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300 text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                disabled={loading}
                className="bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500/50 focus:ring-blue-500/20 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300 text-sm">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                className="bg-zinc-800/50 border-zinc-700/50 text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500/50 focus:ring-blue-500/20 h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-medium shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-blue-500/30 hover:scale-[1.01]"
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

          <p className="mt-6 text-center text-xs text-zinc-500">
            สำหรับผู้ดูแลระบบเท่านั้น
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
