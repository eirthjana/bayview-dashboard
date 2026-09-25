"use client";

import { useEffect, useState } from "react";
import { UserCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { adminDisplayName, type AdminProfile } from "@/lib/admin-reply";

/** Header chip naming the admin who is logged in (from admin_users). */
export function CurrentAdmin() {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("admin_users")
        .select("email, emp_id, name, name_th, position, department")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled && data) setAdmin(data as AdminProfile);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!admin) return null;
  // Profiles without a name yet fall back to the login email.
  const name = admin.name_th?.trim() || admin.name?.trim() || admin.email;
  const role = [admin.position, admin.department].filter(Boolean).join(" · ");
  // The chip shows the name only; the rest is in the hover tooltip.

  return (
    <div
      className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs text-zinc-600 dark:text-zinc-300"
      title={[adminDisplayName(admin), admin.emp_id && `รหัสพนักงาน ${admin.emp_id}`, role, admin.email]
        .filter(Boolean)
        .join("\n")}
    >
      <UserCircle className="w-4 h-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
      <span className="max-w-[16rem] truncate font-semibold text-zinc-800 dark:text-zinc-100">{name}</span>
    </div>
  );
}
