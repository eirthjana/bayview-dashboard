"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { recordAdminLoginLog, getAdminStatusMap } from "@/lib/admin-manage";

async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return h.get("x-real-ip") || "127.0.0.1";
  } catch {
    return "127.0.0.1";
  }
}

export async function loginAction(formData: FormData) {
  const supabase = await createClient();
  const ip = await getClientIp();

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "กรุณากรอก Email และ Password" };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Record failed login log
    await recordAdminLoginLog({
      admin_name: email.split("@")[0],
      email,
      ip_address: ip,
      status: "failed",
      notes: error.message.toLowerCase().includes("invalid login credentials")
        ? "รหัสผ่านไม่ถูกต้อง (Invalid credentials)"
        : error.message,
    });

    const { logAdminActivity } = await import("@/lib/admin-audit");
    await logAdminActivity({
      action_type: "login",
      target: "ระบบแดชบอร์ด (Dashboard)",
      details: error.message.toLowerCase().includes("invalid login credentials")
        ? "เข้าสู่ระบบไม่สำเร็จ (รหัสผ่านไม่ถูกต้อง)"
        : `เข้าสู่ระบบไม่สำเร็จ: ${error.message}`,
      status: "failed",
      email,
      ip_address: ip,
    });

    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        error:
          "Email นี้ยังไม่ได้รับการยืนยัน (ไปที่ Supabase -> Authentication -> Users แล้วกด Confirm Email)",
      };
    }
    if (error.message.toLowerCase().includes("invalid login credentials")) {
      return { error: "Email หรือ Password ไม่ถูกต้อง" };
    }
    return { error: error.message };
  }

  // Check if admin_users is empty - if so, auto-register this first user as admin!
  if (data?.user) {
    const { data: adminRecord } = await supabase
      .from("admin_users")
      .select("id, name, name_th, is_active")
      .eq("user_id", data.user.id)
      .maybeSingle();

    // Check suspended status
    if (adminRecord) {
      const statusMap = await getAdminStatusMap();
      if (adminRecord.is_active === false || statusMap[adminRecord.id] === "suspended") {
        await supabase.auth.signOut();
        await recordAdminLoginLog({
          admin_name: adminRecord.name_th || adminRecord.name || email,
          email,
          ip_address: ip,
          status: "failed",
          notes: "บัญชีถูกปิดการใช้งาน (Account suspended)",
        });
        const { logAdminActivity } = await import("@/lib/admin-audit");
        await logAdminActivity({
          action_type: "login",
          target: "ระบบแดชบอร์ด (Dashboard)",
          details: "เข้าสู่ระบบไม่สำเร็จ (บัญชีถูกปิดการใช้งาน / Suspended)",
          status: "failed",
          email,
          admin_name: adminRecord.name_th || adminRecord.name || email,
          ip_address: ip,
        });
        return { error: "บัญชีนี้ถูกปิดการใช้งาน (Suspended) กรุณาติดต่อผู้ดูแลระบบ" };
      }
    }

    const { count } = await supabase
      .from("admin_users")
      .select("*", { count: "exact", head: true });

    if (count === 0) {
      await supabase.from("admin_users").insert({
        user_id: data.user.id,
        email: data.user.email || email,
      });
    }

    // Record successful login log
    await recordAdminLoginLog({
      admin_name: adminRecord?.name_th || adminRecord?.name || email,
      email,
      ip_address: ip,
      status: "success",
      notes: "เข้าสู่ระบบสำเร็จ",
    });

    const { logAdminActivity } = await import("@/lib/admin-audit");
    await logAdminActivity({
      action_type: "login",
      target: "ระบบแดชบอร์ด (Dashboard)",
      details: "เข้าสู่ระบบสำเร็จ",
      status: "success",
      email,
      admin_name: adminRecord?.name_th || adminRecord?.name || email,
      ip_address: ip,
    });
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
