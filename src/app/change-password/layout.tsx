import type { Metadata } from "next";
import { TabSessionGuard } from "@/components/tab-session-guard";

export const metadata: Metadata = { title: "ตั้งรหัสผ่านใหม่" };

// A login stopped at the first-login password change does not survive closing the tab.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <TabSessionGuard>{children}</TabSessionGuard>;
}
