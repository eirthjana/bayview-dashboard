"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Only for a login that is still in progress (password accepted, 2FA or the
// first-login password change not done yet). The auth cookie outlives the tab,
// so without this, closing the tab halfway and opening the site again landed
// on the 2FA page instead of the login page. sessionStorage dies with the tab,
// so a tab without this key did not start the login itself and is sent back
// to /login. A finished login (2FA passed) is not affected: the dashboard does
// not use this guard, and new tabs stay logged in until Log out.
const TAB_LOGIN_KEY = "bayview.tabLogin";

/** Called by the login page after a successful password check. */
export function markTabLoggedIn() {
  try {
    sessionStorage.setItem(TAB_LOGIN_KEY, "1");
  } catch {
    // Storage blocked: the guard below lets the tab through rather than
    // trapping the admin in a login loop.
  }
}

type TabState = "checking" | "ok" | "missing";

function readTabState(): TabState {
  try {
    return sessionStorage.getItem(TAB_LOGIN_KEY) ? "ok" : "missing";
  } catch {
    return "ok";
  }
}

const subscribe = () => () => {};

/**
 * Wraps the in-progress login pages (/mfa/*, /change-password). Renders
 * nothing until the tab is known to have started the login itself; otherwise
 * signs the half-finished session out and sends the tab to /login.
 */
export function TabSessionGuard({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore<TabState>(subscribe, readTabState, () => "checking");

  useEffect(() => {
    if (state !== "missing") return;
    const supabase = createClient();
    void supabase.auth.signOut().finally(() => {
      window.location.replace("/login");
    });
  }, [state]);

  if (state !== "ok") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }
  return <>{children}</>;
}
