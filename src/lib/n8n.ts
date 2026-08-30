import type { N8nWebhookResponse } from "./types";

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "";

/**
 * Send a request to n8n webhook
 */
async function callN8nWebhook(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<N8nWebhookResponse> {
  if (!N8N_WEBHOOK_URL) {
    console.warn("N8N_WEBHOOK_URL is not configured");
    return {
      success: false,
      error: "n8n webhook URL is not configured",
    };
  }

  try {
    const response = await fetch(`${N8N_WEBHOOK_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`n8n responded with status ${response.status}`);
    }

    const data = await response.json();
    return { success: true, message: data.message || "Success" };
  } catch (error) {
    console.error("n8n webhook error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send a broadcast message via n8n → LINE
 */
export async function sendBroadcast(
  message: string,
  target: "all" | "active" = "all"
): Promise<N8nWebhookResponse> {
  return callN8nWebhook("broadcast", { message, target });
}

/**
 * Send a direct message to a specific LINE user via n8n
 */
export async function sendDirectMessage(
  lineUserId: string,
  message: string
): Promise<N8nWebhookResponse> {
  return callN8nWebhook("send-message", { lineUserId, message });
}

/**
 * Notify n8n about a system setting change
 */
export async function notifySettingChange(
  key: string,
  value: unknown
): Promise<N8nWebhookResponse> {
  return callN8nWebhook("setting-changed", { key, value });
}

/**
 * Fetch a LINE user's profile (display name, picture) via n8n → LINE Get Profile API.
 * Used by the admin dashboard to confirm identity before linking a LINE ID.
 */
export async function getLineProfile(
  lineUserId: string
): Promise<{ success: boolean; displayName?: string; pictureUrl?: string; error?: string }> {
  if (!N8N_WEBHOOK_URL) {
    return { success: false, error: "n8n webhook URL is not configured" };
  }

  try {
    const response = await fetch(`${N8N_WEBHOOK_URL}/admin-get-line-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineUserId }),
    });

    if (!response.ok) {
      return { success: false, error: `ไม่พบโปรไฟล์ LINE นี้ (status ${response.status})` };
    }

    const data = await response.json();
    if (!data || !data.displayName) {
      return { success: false, error: "ไม่พบโปรไฟล์ LINE ID นี้" };
    }

    return { success: true, displayName: data.displayName, pictureUrl: data.pictureUrl };
  } catch (error) {
    console.error("LINE profile fetch error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "เชื่อมต่อ n8n ไม่สำเร็จ",
    };
  }
}
