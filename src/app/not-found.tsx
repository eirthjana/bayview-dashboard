import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";

export const metadata: Metadata = {
  title: "ไม่พบหน้านี้",
};

// Root 404: the default Next.js page was white, English and had no way back.
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-zinc-950 px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
          <SearchX className="h-7 w-7" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-400">404</p>
          <h1 className="mt-1 text-2xl font-bold text-zinc-100">ไม่พบหน้าที่ต้องการ</h1>
          <p className="mt-2 text-sm text-zinc-400">
            ลิงก์อาจพิมพ์ผิด หรือหน้านี้ถูกย้ายหรือลบไปแล้ว
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center rounded-lg bg-blue-600 px-5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          กลับหน้าหลัก
        </Link>
      </div>
    </main>
  );
}
