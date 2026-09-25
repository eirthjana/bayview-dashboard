import { TabSessionGuard } from "@/components/tab-session-guard";

// A login stopped at 2FA does not survive closing the tab: start again from /login.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <TabSessionGuard>{children}</TabSessionGuard>;
}
