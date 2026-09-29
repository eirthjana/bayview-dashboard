import type { Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";

// Employee-facing pages opened inside LINE. Unlike the admin dashboard they are
// light (cream + lagoon teal) and phone-first. The root layout puts the whole
// app in dark mode, so this wrapper paints its own background, sets text colour
// and switches native form controls back to light.
const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#FBF7F0",
};

export default function LiffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${plexThai.className} flex-1 min-h-dvh w-full bg-[#FBF7F0] text-zinc-900`}
      style={{ colorScheme: "light" }}
    >
      {children}
    </div>
  );
}
