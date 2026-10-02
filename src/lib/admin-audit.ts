import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import type { AdminAuditLog, LogAdminActivityParams } from "./admin-audit-types";

export * from "./admin-audit-types";

async function extractClientIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return h.get("x-real-ip") || "127.0.0.1";
  } catch {
    return "127.0.0.1";
  }
}

/**
 * Log an administrative activity into `admin_log`.
 * Automatically retrieves the current logged-in admin user and client IP if omitted.
 */
export async function logAdminActivity(params: LogAdminActivityParams): Promise<void> {
  try {
    const supabaseAdmin = createAdminClient();

    let email = params.email?.trim().toLowerCase() || "";
    let adminName = params.admin_name?.trim() || "";
    let ip = params.ip_address?.trim() || "";

    // 1. If IP is missing, try to resolve from Next.js request headers
    if (!ip) {
      ip = await extractClientIp();
    }

    // 2. If email / user_id missing, attempt to get from server session
    if (!email || !adminName) {
      try {
        const serverClient = await createClient();
        const {
          data: { user },
        } = await serverClient.auth.getUser();

        if (user) {
          if (!email) email = user.email?.trim().toLowerCase() || "";

          const { data: adminRecord } = await supabaseAdmin
            .from("admin_users")
            .select("name, name_th, email")
            .eq("user_id", user.id)
            .maybeSingle();

          if (adminRecord) {
            if (!adminName) {
              adminName = adminRecord.name_th || adminRecord.name || "";
            }
            if (!email && adminRecord.email) {
              email = adminRecord.email.trim().toLowerCase();
            }
          }
        }
      } catch {
        // May fail if called outside server request context
      }
    }

    // 3. Fallback: If still no name, lookup admin_users by email
    if (email && !adminName) {
      try {
        const { data: adminRecord } = await supabaseAdmin
          .from("admin_users")
          .select("name, name_th")
          .ilike("email", email)
          .maybeSingle();

        if (adminRecord) {
          adminName = adminRecord.name_th || adminRecord.name || "";
        }
      } catch {
        // ignore
      }
    }

    if (!adminName) {
      adminName = email ? email.split("@")[0] : "System / Unknown";
    }
    if (!email) {
      email = "-";
    }

    const { error } = await supabaseAdmin.from("admin_log").insert({
      admin_name: adminName,
      email,
      action_type: params.action_type,
      target: params.target || null,
      details: params.details || null,
      ip_address: ip || "-",
      status: params.status || "success",
    });

    if (error) {
      console.warn("Could not insert into admin_log:", error.message);
    }
  } catch (err) {
    console.error("Error logging admin activity:", err);
  }
}

/**
 * Fetch audit logs from `admin_log` ordered by created_at DESC.
 */
export async function getAdminAuditLogs(limit = 1000): Promise<AdminAuditLog[]> {
  try {
    const supabase = createAdminClient();

    // Fetch admin names map
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

    const { data, error } = await supabase
      .from("admin_log")
      .select("id, created_at, admin_name, email, action_type, target, details, ip_address, status")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && Array.isArray(data)) {
      return data.map((d) => {
        const cleanEmail = (d.email || "").toLowerCase().trim();
        const matchedName = adminNameMap.get(cleanEmail);
        const displayName =
          matchedName ||
          (d.admin_name && !d.admin_name.includes("@") ? d.admin_name : null) ||
          (cleanEmail ? cleanEmail.split("@")[0] : "-");

        return {
          id: String(d.id),
          created_at: d.created_at || new Date().toISOString(),
          admin_name: displayName,
          email: d.email || "-",
          action_type: d.action_type || "activity",
          target: d.target ?? null,
          details: d.details ?? null,
          ip_address: d.ip_address || "-",
          status: d.status || "success",
        };
      });
    }
  } catch (err) {
    console.error("Error fetching admin_log:", err);
  }

  return [];
}
