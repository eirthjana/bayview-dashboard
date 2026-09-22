"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyMessageUsage, DeptMessageUsage, DailyTokenUsage, DeptTokenUsage } from "@/lib/types";
import { Send, Building2 } from "lucide-react";

// ─── Shared Formatter ─────────────────────────────────────────────────────────

function fmtK(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return String(v);
}

// ─── Daily Messages Chart ───────────────────────────────────────────────────────

type DateFilterKey = "today" | "7d" | "30d" | "year" | "all";

interface FilterOption {
  value: DateFilterKey;
  label: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { value: "today", label: "วันนี้" },
  { value: "7d", label: "7 วัน" },
  { value: "30d", label: "30 วัน" },
  { value: "year", label: "ปีนี้" },
  { value: "all", label: "ทั้งหมด" },
];

function computeFilteredChartData(
  filter: DateFilterKey,
  rawLogs?: Array<{ created_at: string }>,
  fallbackData?: (DailyMessageUsage | DailyTokenUsage)[]
): { date: string; messages: number }[] {
  const now = new Date();

  if (!rawLogs || rawLogs.length === 0) {
    const defaultData = (fallbackData || []).map((d) => ({
      date: d.date,
      messages: "messages" in d ? d.messages : ("tokens" in d ? d.tokens : 0),
    }));
    if (filter === "7d") return defaultData.slice(-7);
    return defaultData;
  }

  if (filter === "today") {
    const todayStr = now.toISOString().split("T")[0];
    const hourMap = new Map<number, number>();
    for (let h = 0; h < 24; h++) hourMap.set(h, 0);

    rawLogs.forEach((log) => {
      const d = new Date(log.created_at);
      if (d.toISOString().split("T")[0] === todayStr) {
        const hour = d.getHours();
        hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
      }
    });

    return Array.from({ length: 24 }, (_, h) => ({
      date: `${String(h).padStart(2, "0")}:00`,
      messages: hourMap.get(h) || 0,
    }));
  }

  if (filter === "7d") {
    const countMap = new Map<string, number>();
    rawLogs.forEach((log) => {
      const date = new Date(log.created_at).toISOString().split("T")[0];
      countMap.set(date, (countMap.get(date) || 0) + 1);
    });

    const result: { date: string; messages: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      result.push({
        date: d.toLocaleDateString("th-TH", { day: "2-digit", month: "short" }),
        messages: countMap.get(key) || 0,
      });
    }
    return result;
  }

  if (filter === "30d") {
    const countMap = new Map<string, number>();
    rawLogs.forEach((log) => {
      const date = new Date(log.created_at).toISOString().split("T")[0];
      countMap.set(date, (countMap.get(date) || 0) + 1);
    });

    const result: { date: string; messages: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      result.push({
        date: d.toLocaleDateString("th-TH", { day: "2-digit", month: "short" }),
        messages: countMap.get(key) || 0,
      });
    }
    return result;
  }

  if (filter === "year") {
    const currentYear = now.getFullYear();
    const monthMap = new Map<number, number>();
    for (let m = 0; m < 12; m++) monthMap.set(m, 0);

    rawLogs.forEach((log) => {
      const d = new Date(log.created_at);
      if (d.getFullYear() === currentYear) {
        const m = d.getMonth();
        monthMap.set(m, (monthMap.get(m) || 0) + 1);
      }
    });

    return Array.from({ length: 12 }, (_, m) => {
      const tempDate = new Date(currentYear, m, 1);
      return {
        date: tempDate.toLocaleDateString("th-TH", { month: "short" }),
        messages: monthMap.get(m) || 0,
      };
    });
  }

  if (filter === "all") {
    const monthCountMap = new Map<string, number>();
    let minTime = now.getTime();

    rawLogs.forEach((log) => {
      const d = new Date(log.created_at);
      const t = d.getTime();
      if (t < minTime) minTime = t;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthCountMap.set(key, (monthCountMap.get(key) || 0) + 1);
    });

    const startDate = new Date(minTime);
    startDate.setDate(1);
    const result: { date: string; messages: number }[] = [];

    const cursor = new Date(startDate);
    while (cursor <= now || result.length < 6) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      result.push({
        date: cursor.toLocaleDateString("th-TH", { month: "short", year: "2-digit" }),
        messages: monthCountMap.get(key) || 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
      if (result.length > 60) break;
    }

    return result;
  }

  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DailyMessageTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 rounded-xl p-3.5 shadow-xl min-w-[8.75rem]">
      <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#8B5E3C] dark:bg-[#D4A373]" />
        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          {payload[0].value.toLocaleString()}
          <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 ml-1">ข้อความ</span>
        </p>
      </div>
    </div>
  );
}

export function DailyMessageChart({
  data,
  rawLogs,
}: {
  data?: (DailyMessageUsage | DailyTokenUsage)[];
  rawLogs?: Array<{ created_at: string }>;
}) {
  const [filter, setFilter] = useState<DateFilterKey>("30d");

  const chartData = useMemo(() => {
    return computeFilteredChartData(filter, rawLogs, data);
  }, [filter, rawLogs, data]);

  const xAxisInterval = useMemo(() => {
    if (filter === "today") return 3;
    if (filter === "7d") return 0;
    if (filter === "30d") return 4;
    if (filter === "year") return 0;
    return chartData.length > 12 ? Math.ceil(chartData.length / 8) : 0;
  }, [filter, chartData.length]);

  return (
    <Card className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-sm rounded-2xl overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
      <CardHeader className="py-3 px-5 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-800/30 shrink-0 flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 whitespace-nowrap shrink-0">
          <span className="p-1.5 rounded-lg bg-[#8B5E3C]/10 dark:bg-[#8B5E3C]/20 text-[#8B5E3C] dark:text-[#D4A373]">
            <Send className="w-4 h-4" />
          </span>
          ปริมาณการแชท (Messages)
        </CardTitle>

        {/* Segmented Pills Filter */}
        <div className="ml-auto flex items-center gap-1 p-1 bg-[#DEEFEC]/70 dark:bg-zinc-800/80 rounded-xl border border-[#0C645B]/15 dark:border-zinc-700/60 shadow-inner shrink-0">
          {FILTER_OPTIONS.map((opt) => {
            const isActive = filter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter(opt.value)}
                className={`whitespace-nowrap text-xs md:text-sm px-2.5 py-1 font-semibold rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-[#8B5E3C] text-white shadow-sm font-bold scale-[1.02]"
                    : "text-[#0C645B] dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/60 dark:hover:bg-zinc-700/50"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="h-[16.25rem] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradMessages" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5E3C" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8B5E3C" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(147, 173, 168, 0.15)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#93ADA8" }}
                axisLine={{ stroke: "rgba(147, 173, 168, 0.2)" }}
                tickLine={false}
                interval={xAxisInterval}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#93ADA8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtK}
              />
              <Tooltip content={<DailyMessageTooltip />} />
              <Area
                type="monotone"
                dataKey="messages"
                stroke="#8B5E3C"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: "#8B5E3C", stroke: "#FFFFFF", strokeWidth: 2 }}
                fillOpacity={1}
                fill="url(#gradMessages)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Department Message Chart ───────────────────────────────────────────────────

const DEPT_PALETTE = [
  { fill: "#0C645B", bg: "#DEEFEC" },
  { fill: "#8B5E3C", bg: "#EFE8DF" },
  { fill: "#2563EB", bg: "#EFF6FF" },
  { fill: "#0F7D72", bg: "#F0FDFA" },
  { fill: "#7C3AED", bg: "#F5F3FF" },
  { fill: "#D97706", bg: "#FFFBEB" },
  { fill: "#DB2777", bg: "#FDF2F8" },
  { fill: "#4F46E5", bg: "#EEF2FF" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DeptMessageTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const dept = payload[0].payload.department as string;
  const messages = payload[0].value as number;
  const colorIdx = (payload[0].payload._colorIdx as number) ?? 0;
  const color = DEPT_PALETTE[colorIdx % DEPT_PALETTE.length].fill;

  return (
    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 rounded-xl p-3.5 shadow-xl min-w-[10rem]">
      <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">{dept}</p>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          {messages.toLocaleString()}
          <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 ml-1">ข้อความ</span>
        </p>
      </div>
    </div>
  );
}

export function DeptMessageChart({ data }: { data: (DeptMessageUsage | DeptTokenUsage)[] }) {
  const normalizedData = data.map((d) => ({
    department: d.department,
    messages: "messages" in d ? d.messages : ("tokens" in d ? d.tokens : 0),
  }));

  const sorted = [...normalizedData]
    .sort((a, b) => b.messages - a.messages)
    .slice(0, 8)
    .map((d, i) => ({ ...d, _colorIdx: i }));

  const chartHeight = Math.max(220, sorted.length * 36);

  return (
    <Card className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-sm rounded-2xl overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
      <CardHeader className="py-3.5 px-5 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-800/30 shrink-0">
        <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-[#0C645B]/10 dark:bg-[#17A594]/20 text-[#0C645B] dark:text-emerald-400">
            <Building2 className="w-4 h-4" />
          </span>
          ปริมาณการแชทแยกตามแผนก
          {sorted.length > 0 && (
            <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 ml-1">
              ({sorted.length} แผนก)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {sorted.length === 0 ? (
          <div className="h-[16.25rem] flex flex-col items-center justify-center gap-2 text-center">
            <Building2 className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">ยังไม่มีข้อมูลข้อความแยกตามแผนก</p>
          </div>
        ) : (
          <div style={{ height: `${chartHeight + 20}px`, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sorted}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                barCategoryGap="25%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(147, 173, 168, 0.15)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#93ADA8" }}
                  axisLine={{ stroke: "rgba(147, 173, 168, 0.2)" }}
                  tickLine={false}
                  tickFormatter={fmtK}
                />
                <YAxis
                  type="category"
                  dataKey="department"
                  tick={{ fontSize: 11, fill: "#6E6157", fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <Tooltip content={<DeptMessageTooltip />} />
                <Bar dataKey="messages" maxBarSize={28} radius={[0, 6, 6, 0]}>
                  {sorted.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={DEPT_PALETTE[index % DEPT_PALETTE.length].fill}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Aliases for backwards compatibility
export const DailyTokenChart = DailyMessageChart;
export const DeptTokenChart = DeptMessageChart;

