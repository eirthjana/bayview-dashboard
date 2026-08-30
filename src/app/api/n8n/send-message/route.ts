import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendDirectMessage } from "@/lib/n8n";

export async function POST(request: NextRequest) {
  try {
    // Verify admin session
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { lineUserId, message } = body;

    if (!lineUserId || !message) {
      return NextResponse.json(
        { success: false, error: "lineUserId and message are required" },
        { status: 400 }
      );
    }

    const result = await sendDirectMessage(lineUserId, message);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Send message API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
