import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes - redirect to login if not authenticated
  if (
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/mfa")
  ) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    // Check if current user is in admin_users table
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (!adminUser) {
      // Not an admin - sign out and redirect
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(url);
    }

    // บังคับ 2FA (TOTP) ทุกบัญชี — เช็คระดับการยืนยันตัวตนปัจจุบัน
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      // มี factor ที่ตั้งค่าไว้แล้ว แต่ session นี้ยังไม่ได้ยืนยัน 2FA
      const url = request.nextUrl.clone();
      url.pathname = "/mfa/verify";
      return NextResponse.redirect(url);
    }

    if (aal?.currentLevel === "aal1" && aal.nextLevel === "aal1") {
      // ยังไม่เคยตั้งค่า 2FA เลย — บังคับตั้งค่าก่อนใช้งาน
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const hasVerifiedFactor = (factors?.totp || []).length > 0;
      if (!hasVerifiedFactor) {
        const url = request.nextUrl.clone();
        url.pathname = "/mfa/enroll";
        return NextResponse.redirect(url);
      }
    }
  }

  // If logged in admin visits login page, redirect to dashboard
  if (request.nextUrl.pathname === "/login" && user) {
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminUser) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/mfa/:path*"],
};
