"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const supabase = await createClient();

  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "กรุณากรอก Email และ Password" };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
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
    const { count } = await supabase
      .from("admin_users")
      .select("*", { count: "exact", head: true });

    if (count === 0) {
      await supabase.from("admin_users").insert({
        user_id: data.user.id,
        email: data.user.email || email,
      });
    }
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
