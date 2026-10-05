import type { Metadata } from "next";
import { Geist_Mono, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

// One typeface for the whole app, the same one the LIFF pages use: it has
// Thai and Latin, so mixed Thai/English labels sit on one baseline.
const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Each page sets its own title, so tabs and history can tell them apart.
  title: { default: "Bayview Admin", template: "%s | Bayview Admin" },
  description: "ระบบจัดการบอท LINE สำหรับพนักงาน The Bayview Pattaya",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="th"
      className={`${plexThai.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 selection:bg-blue-500/30 selection:text-blue-200">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          {children}
          {/* top-center is the one strip of the app that holds nothing worth
              covering: the header keeps its controls at the far left (collapse)
              and far right (System Status, theme), and the page heading under it
              is static text. Both right-hand corners sat on top of real content,
              and bottom-center lands on table rows on the list pages. */}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
