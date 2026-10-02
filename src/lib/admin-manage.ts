import { createAdminClient } from "@/lib/supabase/admin";

export { logAdminActivity, getAdminAuditLogs, getActionMeta, type AdminAuditLog, type LogAdminActivityParams } from "./admin-audit";

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
