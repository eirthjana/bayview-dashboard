"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch: theme/resolvedTheme differ between the server
  // render and the client until next-themes reads localStorage after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const currentTheme = mounted ? (theme === "system" ? resolvedTheme : theme) : "dark";
  const isDark = currentTheme === "dark";

  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-xs font-medium transition-colors ${
          !isDark ? "text-amber-600 dark:text-amber-400" : "text-zinc-400 dark:text-zinc-500"
        }`}
      >
        สว่าง
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="สลับโหมดมืด/สว่าง"
        title={isDark ? "เปลี่ยนเป็นโหมดสว่าง (Light Mode)" : "เปลี่ยนเป็นโหมดมืด (Dark Mode)"}
        disabled={!mounted}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="relative inline-flex h-8 w-[60px] shrink-0 items-center rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-800 transition-colors duration-300 disabled:opacity-50"
      >
        <Sun className="absolute left-[7px] h-4 w-4 text-amber-500" />
        <Moon className="absolute right-[7px] h-4 w-4 text-blue-300" />
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform duration-300 ease-out ${
            isDark ? "translate-x-[33px]" : "translate-x-[3px]"
          }`}
        >
          {isDark ? (
            <Moon className="h-3.5 w-3.5 text-zinc-700" />
          ) : (
            <Sun className="h-3.5 w-3.5 text-amber-500" />
          )}
        </span>
      </button>
      <span
        className={`text-xs font-medium transition-colors ${
          isDark ? "text-blue-400" : "text-zinc-400 dark:text-zinc-500"
        }`}
      >
        มืด
      </span>
    </div>
  );
}
