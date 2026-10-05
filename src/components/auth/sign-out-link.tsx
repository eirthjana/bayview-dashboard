"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/login/actions";

/**
 * The way out of the screens between login and the dashboard (2FA setup and
 * check, first password change). The middleware sends a signed-in admin back
 * to these screens from /login, so without this the only escape is closing
 * the tab.
 */
export function SignOutLink() {
  return (
    <form action={logoutAction} className="flex justify-center">
      <button
        type="submit"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm text-zinc-300 underline-offset-4 transition-colors hover:text-zinc-100 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        ออกจากระบบ / ใช้บัญชีอื่น
      </button>
    </form>
  );
}
