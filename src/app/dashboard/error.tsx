"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

// Any dashboard page that throws while rendering lands here, inside the
// sidebar layout, instead of a blank screen.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard page error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </div>
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">หน้านี้แสดงผลไม่สำเร็จ</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          เกิดข้อผิดพลาดระหว่างโหลดข้อมูล ลองใหม่อีกครั้ง ถ้ายังไม่ได้ ให้แจ้งผู้ดูแลระบบ
          {error.digest ? ` (รหัสอ้างอิง ${error.digest})` : ""}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={reset} className="h-10 gap-1.5 bg-blue-600 px-4 text-white hover:bg-blue-700">
          <RotateCcw className="h-4 w-4" aria-hidden />
          ลองใหม่
        </Button>
        <Link href="/dashboard" className={`${buttonVariants({ variant: "outline" })} h-10 px-4`}>
          กลับหน้าภาพรวม
        </Link>
      </div>
    </div>
  );
}
