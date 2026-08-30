"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

export type StatColor = "emerald" | "wood" | "blue" | "amber" | "health";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: StatColor;
  badge?: string;
}

const colorMap: Record<
  StatColor,
  {
    bg: string;
    border: string;
    hoverBorder: string;
    iconColor: string;
    accentLine: string;
  }
> = {
  emerald: {
    bg: "bg-[#1B4D3E]/10 dark:bg-[#2D6A4F]/20",
    border: "border-[#1B4D3E]/20 dark:border-emerald-500/30",
    hoverBorder: "hover:border-[#1B4D3E]/40 dark:hover:border-emerald-500/50",
    iconColor: "text-[#1B4D3E] dark:text-emerald-400",
    accentLine: "bg-[#1B4D3E] dark:bg-emerald-500",
  },
  wood: {
    bg: "bg-[#8B5E3C]/10 dark:bg-[#8B5E3C]/20",
    border: "border-[#8B5E3C]/20 dark:border-[#8B5E3C]/40",
    hoverBorder: "hover:border-[#8B5E3C]/40 dark:hover:border-[#8B5E3C]/60",
    iconColor: "text-[#8B5E3C] dark:text-[#D4A373]",
    accentLine: "bg-[#8B5E3C] dark:bg-[#D4A373]",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800/50",
    hoverBorder: "hover:border-blue-400 dark:hover:border-blue-600",
    iconColor: "text-blue-700 dark:text-blue-400",
    accentLine: "bg-blue-600 dark:bg-blue-500",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800/50",
    hoverBorder: "hover:border-amber-400 dark:hover:border-amber-600",
    iconColor: "text-amber-700 dark:text-amber-400",
    accentLine: "bg-amber-600 dark:bg-amber-500",
  },
  health: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800/50",
    hoverBorder: "hover:border-emerald-500 dark:hover:border-emerald-600",
    iconColor: "text-emerald-700 dark:text-emerald-400",
    accentLine: "bg-emerald-600 dark:bg-emerald-500",
  },
};

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  color,
  badge,
}: StatCardProps) {
  const colors = colorMap[color] || colorMap.emerald;

  return (
    <Card
      className={`
        group relative overflow-hidden bg-white dark:bg-zinc-900/50
        border border-zinc-200/90 dark:border-zinc-800/80
        ${colors.hoverBorder}
        hover:shadow-md dark:hover:shadow-black/40 transition-all duration-300 ease-out
        hover:-tranzinc-y-0.5 rounded-2xl
      `}
    >
      {/* Top subtle accent highlight on hover */}
      <div
        className={`absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${colors.accentLine}`}
      />

      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {title}
              </p>
              {badge && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {badge}
                </span>
              )}
            </div>

            <p className="text-2xl lg:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight tabular-nums">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>

            {description && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate font-medium">{description}</p>
            )}

            {trend && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <span
                  className={`text-xs font-semibold flex items-center gap-0.5 ${
                    trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {trend.isPositive ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {Math.abs(trend.value)}%
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">vs yesterday</span>
              </div>
            )}
          </div>

          {/* Icon Box */}
          <div
            className={`
              p-3 rounded-xl shrink-0 ml-3
              ${colors.bg} ${colors.border} border
              transition-all duration-300
              group-hover:scale-105
            `}
          >
            <span className={`${colors.iconColor} block`}>{icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
