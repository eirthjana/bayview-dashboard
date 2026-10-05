"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shown when a page's data could not be loaded, so an empty table or a zero
 * reads as "loading failed" rather than "there is nothing".
 */
export function LoadErrorBanner({ what }: { what: string }) {
  const router = useRouter();
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          โหลด{what}ไม่สำเร็จ ข้อมูลที่เห็นอาจไม่ครบหรือว่างเปล่าเพราะเหตุนี้ ไม่ได้แปลว่าไม่มีข้อมูล
          กรุณากดโหลดใหม่ ถ้ายังไม่ได้ ให้แจ้งผู้ดูแลระบบ
        </span>
      </div>
      <Button
        type="button"
        onClick={() => router.refresh()}
        className="h-10 shrink-0 gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
        โหลดใหม่
      </Button>
    </div>
  );
}

/** Wording for an empty list whose data failed to load. */
export const LOAD_FAILED_EMPTY_TEXT = "โหลดข้อมูลไม่สำเร็จ ดูแถบแจ้งเตือนด้านบน";
