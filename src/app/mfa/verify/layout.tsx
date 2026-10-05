import type { Metadata } from "next";

// The page itself is a client component, which cannot export metadata.
export const metadata: Metadata = { title: "ยืนยันตัวตน 2 ขั้นตอน" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
