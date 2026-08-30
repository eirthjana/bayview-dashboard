"use client";

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
import type { DailyUsage } from "@/lib/types";
import { BarChart3 } from "lucide-react";

interface UsageChartProps {
  data: DailyUsage[];
  title?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 rounded-xl p-3.5 shadow-xl min-w-[150px]">
        <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#1B4D3E] dark:bg-emerald-400" />
              ข้อความ (Messages)
            </span>
            <span className="font-bold text-[#1B4D3E] dark:text-emerald-400">
              {payload[0].value.toLocaleString()}
            </span>
          </div>
          {payload[1] && payload[1].value > 0 && (
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-500 dark:bg-rose-400" />
                ข้อผิดพลาด (Errors)
              </span>
              <span className="font-bold text-rose-600 dark:text-rose-400">
                {payload[1].value.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}

export function UsageChart({ data, title = "การใช้งานย้อนหลัง 30 วัน (Daily Usage Trend)" }: UsageChartProps) {
  return (
    <Card className="h-[380px] flex flex-col bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-sm rounded-2xl overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
      <CardHeader className="py-3.5 px-5 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-800/30 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#1B4D3E]/10 dark:bg-[#2D6A4F]/20 text-[#1B4D3E] dark:text-emerald-400">
              <BarChart3 className="w-4 h-4" />
            </span>
            {title}
          </CardTitle>
          <div className="flex items-center gap-3 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1B4D3E] dark:bg-emerald-400" />
              Messages
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 dark:bg-rose-400" />
              Errors
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 pt-2">
        <div className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="bayviewEmerald" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1B4D3E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1B4D3E" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="bayviewError" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#A1A1AA" }}
                axisLine={{ stroke: "rgba(148, 163, 184, 0.2)" }}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#A1A1AA" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="messages"
                stroke="#1B4D3E"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#bayviewEmerald)"
                activeDot={{ r: 5, fill: "#1B4D3E", stroke: "#FFFFFF", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="errors"
                stroke="#EF4444"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#bayviewError)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
