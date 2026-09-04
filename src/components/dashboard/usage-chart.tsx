"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_META, STATUS_ORDER, type StatusKey } from "@/components/dashboard/status-badge";
import type { DailyUsage } from "@/lib/types";
import { BarChart3 } from "lucide-react";

interface UsageChartProps {
  data: DailyUsage[];
  title?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  // payload only contains the currently-visible (non-hidden) series, in
  // whatever order recharts stacked them — re-sort to the app-wide status
  // order and sum them for a total line at the bottom.
  const byKey = new Map<string, number>(payload.map((p: { dataKey: string; value: number }) => [p.dataKey, p.value]));
  const total = payload.reduce((sum: number, p: { value: number }) => sum + p.value, 0);

  return (
    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 rounded-xl p-3.5 shadow-xl min-w-[160px]">
      <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2">{label}</p>
      <div className="space-y-1">
        {STATUS_ORDER.filter((key) => byKey.has(key)).map((key) => (
          <div key={key} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 font-medium">
              <span className="w-2 h-2 rounded-full" style={{ background: STATUS_META[key].hex }} />
              {STATUS_META[key].label}
            </span>
            <span className="font-bold" style={{ color: STATUS_META[key].hex }}>
              {byKey.get(key)?.toLocaleString()}
            </span>
          </div>
        ))}
        {payload.length > 1 && (
          <div className="flex items-center justify-between gap-3 text-xs pt-1 mt-1 border-t border-zinc-200 dark:border-zinc-700">
            <span className="text-zinc-500 dark:text-zinc-400 font-semibold">รวม</span>
            <span className="font-bold text-zinc-800 dark:text-zinc-200">{total.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function UsageChart({ data, title = "การใช้งานย้อนหลัง 30 วัน (Daily Usage Trend)" }: UsageChartProps) {
  // Which statuses are hidden from the chart — click a legend chip to
  // toggle. Empty set = show all 4.
  const [hidden, setHidden] = useState<Set<StatusKey>>(new Set());

  function toggleStatus(key: StatusKey) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        // Never let every series disappear — always leave at least one visible.
        if (next.size < STATUS_ORDER.length - 1) next.add(key);
      }
      return next;
    });
  }

  const visibleKeys = STATUS_ORDER.filter((key) => !hidden.has(key));

  return (
    <Card className="h-[380px] flex flex-col bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-sm rounded-2xl overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
      <CardHeader className="py-3.5 px-5 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-800/30 shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#1B4D3E]/10 dark:bg-[#2D6A4F]/20 text-[#1B4D3E] dark:text-emerald-400">
              <BarChart3 className="w-4 h-4" />
            </span>
            {title}
          </CardTitle>
          {/* Clickable legend — toggles a status series on/off */}
          <div className="flex items-center gap-3 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
            {STATUS_ORDER.map((key) => {
              const isHidden = hidden.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleStatus(key)}
                  className={`flex items-center gap-1.5 rounded-full px-2 py-1 cursor-pointer transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                    isHidden ? "opacity-40" : "opacity-100"
                  }`}
                  aria-pressed={!isHidden}
                  title={isHidden ? `แสดง ${STATUS_META[key].label}` : `ซ่อน ${STATUS_META[key].label}`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: isHidden ? "#a1a1aa" : STATUS_META[key].hex }}
                  />
                  {STATUS_META[key].label}
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 pt-2">
        <div className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {STATUS_ORDER.map((key) => (
                  <linearGradient key={key} id={`gradStatus-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={STATUS_META[key].hex} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={STATUS_META[key].hex} stopOpacity={0.01} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(143, 174, 169, 0.15)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#8FAEA9" }}
                axisLine={{ stroke: "rgba(143, 174, 169, 0.2)" }}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#8FAEA9" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              {visibleKeys.map((key) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stackId="1"
                  stroke={STATUS_META[key].hex}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#gradStatus-${key})`}
                  activeDot={{ r: 4, fill: STATUS_META[key].hex, stroke: "#FFFFFF", strokeWidth: 2 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
