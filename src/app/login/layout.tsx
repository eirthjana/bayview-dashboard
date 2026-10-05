import type { Metadata } from "next";

// The page itself is a client component, which cannot export metadata.
export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
