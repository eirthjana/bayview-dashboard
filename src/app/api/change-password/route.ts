import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MIN_PASSWORD = 8;

/**
 * First login with a temporary password. Only accepted while the account is
 * flagged must_change_password: this runs before 2FA, so it must not become a
 * way for any password-only session to change its password.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (user.app_metadata?.must_change_password !== true) {
      return NextResponse.json({ success: false, error: "บัญชีนี้ไม่ต้องเปลี่ยนรหัสผ่าน" }, { status: 400 });
    }

    const body = await request.json();
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < MIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: `รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD} ตัวอักษร` },
        { status: 400 }
      );
    }

    const db = createAdminClient();
    const { error } = await db.auth.admin.updateUserById(user.id, {
      password,
      app_metadata: { must_change_password: false },
    });
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Change password API error:", error);
    return NextResponse.json({ success: false, error: "เปลี่ยนรหัสผ่านไม่สำเร็จ" }, { status: 500 });
  }
}
