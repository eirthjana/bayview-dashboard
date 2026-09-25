import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const text = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function passwordError(password: string): string | null {
  return password.length < MIN_PASSWORD ? `รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD} ตัวอักษร` : null;
}

/**
 * Admin Accounts page actions. Only an admin (past 2FA) can call these; there
 * is no self-registration.
 *   create          — new login + admin_users row with the password the admin
 *                     typed. The new admin replaces it at first login
 *                     (app_metadata.must_change_password), then sets up 2FA.
 *   reset_password  — typed password for another admin, same first-login rule.
 *   update          — edit the name replies from Pending Replies are signed with.
 */
export async function POST(request: NextRequest) {
  try {
    const check = await requireAdminApi();
    if (!check.ok) return check.response;

    const body = await request.json();
    const db = createAdminClient();
    const password = typeof body.password === "string" ? body.password : "";

    if (body.action === "create") {
      const email = text(body.email).toLowerCase();
      const name = text(body.name);
      if (!EMAIL.test(email)) {
        return NextResponse.json({ success: false, error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 });
      }
      if (!name) {
        return NextResponse.json({ success: false, error: "กรุณากรอกชื่อ-นามสกุล (อังกฤษ)" }, { status: 400 });
      }
      const badPassword = passwordError(password);
      if (badPassword) {
        return NextResponse.json({ success: false, error: badPassword }, { status: 400 });
      }

      const { data: created, error: createError } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { must_change_password: true },
      });
      if (createError || !created.user) {
        const msg = createError?.message?.toLowerCase() || "";
        const taken = msg.includes("already") || msg.includes("registered") || msg.includes("exists");
        return NextResponse.json(
          { success: false, error: taken ? "อีเมลนี้มีบัญชีอยู่แล้ว" : "สร้างบัญชีไม่สำเร็จ" },
          { status: taken ? 409 : 500 }
        );
      }

      const { data: added, error: insertError } = await db
        .from("admin_users")
        .insert({ user_id: created.user.id, email, name, name_th: text(body.name_th) || null })
        .select("id, user_id, email, name, name_th, created_at")
        .single();
      if (insertError) {
        // Never leave a login behind that is not an admin.
        await db.auth.admin.deleteUser(created.user.id);
        throw insertError;
      }

      return NextResponse.json({ success: true, admin: added });
    }

    if (body.action === "reset_password") {
      const badPassword = passwordError(password);
      if (badPassword) {
        return NextResponse.json({ success: false, error: badPassword }, { status: 400 });
      }
      const { data: target } = await db
        .from("admin_users")
        .select("user_id")
        .eq("id", text(body.admin_id, 64))
        .maybeSingle();
      if (!target) {
        return NextResponse.json({ success: false, error: "ไม่พบแอดมินคนนี้" }, { status: 404 });
      }
      if (target.user_id === check.user.id) {
        return NextResponse.json(
          { success: false, error: "รีเซ็ตรหัสผ่านของตัวเองจากหน้านี้ไม่ได้" },
          { status: 400 }
        );
      }
      const { error } = await db.auth.admin.updateUserById(target.user_id, {
        password,
        app_metadata: { must_change_password: true },
      });
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (body.action === "update") {
      const name = text(body.name);
      if (!name) {
        return NextResponse.json({ success: false, error: "กรุณากรอกชื่อ-นามสกุล (อังกฤษ)" }, { status: 400 });
      }
      const { error } = await db
        .from("admin_users")
        .update({ name, name_th: text(body.name_th) || null })
        .eq("id", text(body.admin_id, 64));
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Admin accounts API error:", error);
    return NextResponse.json({ success: false, error: "ทำรายการไม่สำเร็จ" }, { status: 500 });
  }
}
