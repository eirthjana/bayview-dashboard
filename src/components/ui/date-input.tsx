"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Native <input type="date"> renders its segment order (mm/dd/yyyy vs
// dd/mm/yyyy) from the browser/OS locale — the `lang` attribute on the
// element is not reliably honored across engines, so it can't be forced to
// dd/mm/yyyy from the page alone. This component owns its own rendering
// instead, so the displayed format is exactly dd/mm/yyyy everywhere.

const WEEKDAYS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** yyyy-mm-dd (the value shape this component reads/writes) -> dd/mm/yyyy for display. */
function formatDisplay(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

interface DateInputProps {
  value: string; // "" or yyyy-mm-dd
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DateInput({ value, onChange, placeholder = "dd/mm/yyyy", className }: DateInputProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });

  const selected = value ? new Date(`${value}T00:00:00`) : null;
  const [viewYear, setViewYear] = useState(() => (selected ?? new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (selected ?? new Date()).getMonth());

  function openPicker() {
    // Jump the visible month to match the current value (or today) each
    // time the popover opens, rather than leaving it wherever it was left.
    const base = selected ?? new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    // Position via a portal to document.body instead of a plain absolute
    // child: the toolbar's <Card> (like every Card in this app) sets
    // overflow-hidden to keep its own rounded corners, which was clipping
    // the dropdown right where it would open. Rendering into body sidesteps
    // any ancestor's overflow/stacking context entirely.
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setPanelPos({ top: rect.bottom + 6, left: rect.left });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideButton = buttonRef.current?.contains(target);
      const insidePanel = panelRef.current?.contains(target);
      if (!insideButton && !insidePanel) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Scrolling/resizing while open would leave the portal panel visually
    // detached from its button — simplest correct behavior is to close it.
    function handleClose() {
      setOpen(false);
    }
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    return () => {
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
    };
  }, [open]);

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function pickDay(day: number) {
    onChange(toIso(viewYear, viewMonth, day));
    setOpen(false);
  }

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });

  const todayIso = toIso(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const panel = (
    <div
      ref={panelRef}
      style={{ position: "fixed", top: panelPos.top, left: panelPos.left }}
      className="z-50 w-64 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#27211C] shadow-xl p-3"
    >
      {/* Month header */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={goPrevMonth}
          className="p-1 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="เดือนก่อนหน้า"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{monthLabel}</span>
        <button
          type="button"
          onClick={goNextMonth}
          className="p-1 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="เดือนถัดไป"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday row */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS_TH.map((w) => (
          <div key={w} className="text-center text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const iso = toIso(viewYear, viewMonth, day);
          const isSelected = iso === value;
          const isToday = iso === todayIso;
          return (
            <button
              key={day}
              type="button"
              onClick={() => pickDay(day)}
              className={cn(
                "h-7 w-7 mx-auto flex items-center justify-center rounded-lg text-[11px] font-medium transition-colors",
                isSelected
                  ? "bg-[#0C645B] dark:bg-emerald-600 text-white font-bold"
                  : isToday
                    ? "border border-[#0C645B]/40 dark:border-emerald-500/50 text-zinc-800 dark:text-zinc-200"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
          className="mt-2 w-full flex items-center justify-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg py-1.5 transition-colors"
        >
          <X className="w-3 h-3" />
          ล้างวันที่
        </button>
      )}
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={cn(
          "h-9 w-full flex items-center justify-between gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/60 px-2.5 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
          className
        )}
      >
        <span className={value ? "" : "text-zinc-400 dark:text-zinc-500"}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
      </button>

      {open && typeof document !== "undefined" && createPortal(panel, document.body)}
    </>
  );
}
