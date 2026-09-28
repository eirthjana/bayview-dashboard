import { createAdminClient } from "@/lib/supabase/admin";

export interface AdminLoginLog {
  id: string;
  created_at: string;
  admin_name: string;
  email: string;
  ip_address: string;
  status: "success" | "failed";
  notes?: string | null;
}

const SETTING_KEY_STATUS_MAP = "admin_status_map";

/**
 * Fetch status map for admin accounts (active | suspended).
 * Defaults to "active" for any admin not listed.
 */
export async function getAdminStatusMap(): Promise<Record<string, "active" | "suspended">> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", SETTING_KEY_STATUS_MAP)
      .maybeSingle();

    if (data?.value && typeof data.value === "object") {
      return data.value as Record<string, "active" | "suspended">;
    }
  } catch (err) {
    console.error("Error reading admin_status_map:", err);
  }
  return {};
}

/**
 * Update an admin's active/suspended status in admin_users, system_settings, and Supabase Auth.
 */
export async function setAdminStatus(
  adminId: string,
  userId: string,
  status: "active" | "suspended"
): Promise<void> {
  const supabase = createAdminClient();
  const isActiveBool = status === "active";

  // 1. Update admin_users table is_active column
  try {
    await supabase
      .from("admin_users")
      .update({ is_active: isActiveBool })
      .eq("id", adminId);
  } catch (err) {
    console.error("Error updating is_active in admin_users:", err);
  }

  // 2. Update in system_settings
  const currentMap = await getAdminStatusMap();
  currentMap[adminId] = status;

  const { data: existing } = await supabase
    .from("system_settings")
    .select("id")
    .eq("key", SETTING_KEY_STATUS_MAP)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("system_settings")
      .update({
        value: currentMap,
        updated_at: new Date().toISOString(),
      })
      .eq("key", SETTING_KEY_STATUS_MAP);
  } else {
    await supabase.from("system_settings").insert({
      key: SETTING_KEY_STATUS_MAP,
      value: currentMap,
      updated_at: new Date().toISOString(),
    });
  }

  // 3. Sync with Supabase Auth user metadata & ban status
  if (userId) {
    try {
      if (status === "suspended") {
        await supabase.auth.admin.updateUserById(userId, {
          ban_duration: "876000h", // 100 years ban until restored
          app_metadata: { status: "suspended", is_active: false },
        });
      } else {
        await supabase.auth.admin.updateUserById(userId, {
          ban_duration: "none",
          app_metadata: { status: "active", is_active: true },
        });
      }
    } catch (authErr) {
      console.warn("Could not update auth ban status for user:", userId, authErr);
    }
  }
}

/**
 * Fetch all login logs from admin_login_logs table ordered by created_at DESC.
 * Resolves admin_name to name_th or name if matching admin_users exists.
 */
export async function getAdminLoginLogs(): Promise<AdminLoginLog[]> {
  try {
    const supabase = createAdminClient();

    // 1. Fetch admin users to build email -> display name map
    const adminNameMap = new Map<string, string>();
    try {
      const { data: admins } = await supabase
        .from("admin_users")
        .select("email, name, name_th");
      if (admins) {
        for (const a of admins) {
          if (a.email) {
            const displayName = a.name_th || a.name;
            if (displayName) {
              adminNameMap.set(a.email.toLowerCase().trim(), displayName);
            }
          }
        }
      }
    } catch {
      // ignore
    }

    // 2. Fetch logs
    const { data, error } = await supabase
      .from("admin_login_logs")
      .select("id, created_at, admin_name, email, ip_address, status, notes")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (!error && Array.isArray(data)) {
      return data.map((d) => {
        const cleanEmail = (d.email || "").toLowerCase().trim();
        const matchedName = adminNameMap.get(cleanEmail);
        const displayName = matchedName || (d.admin_name && !d.admin_name.includes("@") ? d.admin_name : null) || (cleanEmail ? cleanEmail.split("@")[0] : "-");

        return {
          id: String(d.id),
          created_at: d.created_at || new Date().toISOString(),
          admin_name: displayName,
          email: d.email || "-",
          ip_address: d.ip_address || "-",
          status: (d.status === "failed" ? "failed" : "success") as "success" | "failed",
          notes: d.notes ?? null,
        };
      });
    }
  } catch (err) {
    console.error("Error fetching from admin_login_logs table:", err);
  }

  return [];
}

/**
 * Append a new login attempt directly into admin_login_logs table.
 * If admin_name is missing or is just username, automatically resolves from admin_users.
 */
export async function recordAdminLoginLog(entry: {
  admin_name?: string | null;
  email: string;
  ip_address: string;
  status: "success" | "failed";
  notes?: string | null;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    const cleanEmail = entry.email.trim().toLowerCase();

    let resolvedName = entry.admin_name?.trim() || "";
    if (!resolvedName || resolvedName === cleanEmail.split("@")[0]) {
      try {
        const { data: adminUser } = await supabase
          .from("admin_users")
          .select("name, name_th")
          .ilike("email", cleanEmail)
          .maybeSingle();

        if (adminUser) {
          resolvedName = adminUser.name_th || adminUser.name || resolvedName;
        }
      } catch {
        // ignore lookup error
      }
    }

    if (!resolvedName) {
      resolvedName = cleanEmail ? cleanEmail.split("@")[0] : "-";
    }

    const { error } = await supabase.from("admin_login_logs").insert({
      admin_name: resolvedName,
      email: entry.email,
      ip_address: entry.ip_address,
      status: entry.status,
      notes: entry.notes || null,
    });

    if (error) {
      console.warn("Could not insert into admin_login_logs table:", error.message);
    }
  } catch (err) {
    console.error("Error recording admin login log:", err);
  }
}
