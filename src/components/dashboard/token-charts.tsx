"use client";

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
import type { DailyTokenUsage, DeptTokenUsage } from "@/lib/types";
import { Zap, Building2 } from "lucide-react";

// ─── Shared Formatter ─────────────────────────────────────────────────────────

function fmtK(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return String(v);
}

// ─── Daily Token Chart ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DailyTokenTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 rounded-xl p-3.5 shadow-xl min-w-[140px]">
      <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#8B5E3C] dark:bg-[#D4A373]" />
        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          {payload[0].value.toLocaleString()}
          <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 ml-1">tokens</span>
        </p>
      </div>
    </div>
  );
}

export function DailyTokenChart({ data }: { data: DailyTokenUsage[] }) {
  return (
    <Card className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-sm rounded-2xl overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
      <CardHeader className="py-3.5 px-5 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-800/30 shrink-0">
        <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-[#8B5E3C]/10 dark:bg-[#8B5E3C]/20 text-[#8B5E3C] dark:text-[#D4A373]">
            <Zap className="w-4 h-4" />
          </span>
          Token Usage รายวัน (Daily Tokens)
          <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 ml-1">(30 วัน)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradTokens" x1="0" y1="0" x2="0" y2="1">
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
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#93ADA8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtK}
              />
              <Tooltip content={<DailyTokenTooltip />} />
              <Area
                type="monotone"
                dataKey="tokens"
                stroke="#8B5E3C"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: "#8B5E3C", stroke: "#FFFFFF", strokeWidth: 2 }}
                fillOpacity={1}
                fill="url(#gradTokens)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Department Token Chart ───────────────────────────────────────────────────

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
function DeptTokenTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const dept = payload[0].payload.department as string;
  const tokens = payload[0].value as number;
  const colorIdx = (payload[0].payload._colorIdx as number) ?? 0;
  const color = DEPT_PALETTE[colorIdx % DEPT_PALETTE.length].fill;

  return (
    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 rounded-xl p-3.5 shadow-xl min-w-[160px]">
      <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">{dept}</p>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          {tokens.toLocaleString()}
          <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 ml-1">tokens</span>
        </p>
      </div>
    </div>
  );
}

export function DeptTokenChart({ data }: { data: DeptTokenUsage[] }) {
  const sorted = [...data]
    .sort((a, b) => b.tokens - a.tokens)
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
          Token Usage แยกตามแผนก (Department Breakdown)
          {sorted.length > 0 && (
            <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 ml-1">
              ({sorted.length} แผนก)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {sorted.length === 0 ? (
          <div className="h-[260px] flex flex-col items-center justify-center gap-2 text-center">
            <Building2 className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">ยังไม่มีข้อมูล Token แยกตามแผนก</p>
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
                <Tooltip content={<DeptTokenTooltip />} />
                <Bar dataKey="tokens" maxBarSize={28} radius={[0, 6, 6, 0]}>
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
