"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SYSTEM_HEALTH_REFRESH, DASHBOARD_DATA_REFRESH } from "@/lib/system-health-events";

export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSpinning, setIsSpinning] = useState(false);

  const handleRefresh = () => {
    if (isPending || isSpinning) return;

    setIsSpinning(true);

    startTransition(() => {
      // Trigger Next.js Server Components / Server Actions revalidation
      router.refresh();

      // Trigger health probe and data revalidation
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(SYSTEM_HEALTH_REFRESH));
        window.dispatchEvent(new Event(DASHBOARD_DATA_REFRESH));
      }
    });

    toast.success("อัปเดตข้อมูลล่าสุดเรียบร้อย", {
      description: "ดึงข้อมูล Supabase และสถานะระบบใหม่สำเร็จ",
      duration: 2000,
    });

    // Keep spin animation smooth for at least 700ms
    setTimeout(() => {
      setIsSpinning(false);
    }, 700);
  };

  const isBusy = isPending || isSpinning;

  const buttonElement = (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isBusy}
      className="group relative flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold bg-[#DEEFEC]/70 hover:bg-[#DEEFEC] text-[#0C645B] border border-[#0C645B]/20 dark:bg-[#0C645B]/20 dark:hover:bg-[#0C645B]/30 dark:text-emerald-300 dark:border-emerald-500/30 transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:pointer-events-none shadow-xs"
      aria-label="รีเฟรชข้อมูลหน้าปัจจุบัน"
    >
      <RotateCcw
        className={`w-3.5 h-3.5 transition-transform duration-500 ${
          isBusy
            ? "animate-spin text-[#0C645B] dark:text-emerald-300"
            : "group-hover:-rotate-90"
        }`}
      />
      <span className="hidden md:inline font-medium">รีเฟรช</span>
    </button>
  );

  return (
    <Tooltip>
      <TooltipTrigger render={buttonElement} />
      <TooltipContent
        side="bottom"
        className="bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700 text-xs"
      >
        รีเฟรชข้อมูลหน้าปัจจุบัน (Refresh Data)
      </TooltipContent>
    </Tooltip>
  );
}
