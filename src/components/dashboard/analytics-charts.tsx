"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import type { HourlyUsage, DeptActivity } from "@/lib/types";
import { Clock, Building2, Users } from "lucide-react";

// ─── Peak Usage Hours Chart ─────────────────────────────────────────────────

const TIER_COLOR: Record<HourlyUsage["tier"], string> = {
  peak: "#0C645B",
  high: "#14998A",
  regular: "#A6CAC5",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HourlyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const count = payload[0].value as number;
  return (
    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 rounded-xl p-3.5 shadow-xl min-w-[8.125rem]">
      <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">{label} น.</p>
      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
        {count.toLocaleString()}
        <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 ml-1">ข้อความ</span>
      </p>
    </div>
  );
}

export function PeakHoursChart({ data, peakLabel }: { data: HourlyUsage[]; peakLabel: string }) {
  return (
    <Card className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-sm rounded-2xl overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
      <CardHeader className="py-3.5 px-5 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-800/30 shrink-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              <Clock className="w-4 h-4" />
            </span>
            ปริมาณการใช้งานแยกตามช่วงเวลา 24 ชั่วโมง (Peak Usage Hours)
          </CardTitle>
          <Badge variant="secondary" className="text-[0.6875rem] font-semibold shrink-0">
            ช่วงที่คนทักมากที่สุด: {peakLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="h-[17.5rem] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(147, 173, 168, 0.15)" vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: "#93ADA8" }}
                axisLine={{ stroke: "rgba(147, 173, 168, 0.2)" }}
                tickLine={false}
                interval={2}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#93ADA8" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<HourlyTooltip />} cursor={{ fill: "rgba(147, 173, 168, 0.08)" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={22}>
                {data.map((d, i) => (
                  <Cell key={`cell-${i}`} fill={TIER_COLOR[d.tier]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-3 px-1">
          <span className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-zinc-600 dark:text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: TIER_COLOR.peak }} />
            Peak Time (ช่วงใช้งานสูงสุด)
          </span>
          <span className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-zinc-600 dark:text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: TIER_COLOR.high }} />
            High Activity (ใช้งานหนาแน่น)
          </span>
          <span className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-zinc-600 dark:text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: TIER_COLOR.regular }} />
            Regular Traffic (ปกติ)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Department Activity Breakdown ──────────────────────────────────────────

const DEPT_PALETTE = [
  "#0C645B",
  "#8B5E3C",
  "#2563EB",
  "#0F7D72",
  "#7C3AED",
  "#D97706",
  "#DB2777",
  "#4F46E5",
  "#6E6157",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DeptActivityTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const dept = payload[0].payload.department as string;
  const count = payload[0].value as number;
  const colorIdx = (payload[0].payload._colorIdx as number) ?? 0;
  return (
    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 rounded-xl p-3.5 shadow-xl min-w-[10rem]">
      <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">{dept}</p>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: DEPT_PALETTE[colorIdx % DEPT_PALETTE.length] }} />
        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          {count.toLocaleString()}
          <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 ml-1">ข้อความ</span>
        </p>
      </div>
    </div>
  );
}

export function DeptActivityChart({ data }: { data: DeptActivity[] }) {
  const [openDept, setOpenDept] = useState<DeptActivity | null>(null);

  const sorted = [...data]
    .sort((a, b) => b.count - a.count)
    .map((d, i) => ({ ...d, _colorIdx: i }));

  const chartHeight = Math.max(220, sorted.length * 36);

  return (
    <Card className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-sm rounded-2xl overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
      <CardHeader className="py-3.5 px-5 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-800/30 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              <Building2 className="w-4 h-4" />
            </span>
            สถิติการใช้งานแยกตามแผนกจริง (Department Activity Breakdown)
          </CardTitle>
          <Badge variant="secondary" className="text-[0.6875rem] font-semibold shrink-0">
            {sorted.length} แผนก / กลุ่มผู้ใช้
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {sorted.length === 0 ? (
          <div className="h-[13.75rem] flex flex-col items-center justify-center gap-2 text-center">
            <Building2 className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">ยังไม่มีข้อมูลการใช้งานแยกตามแผนก</p>
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
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="department"
                  tick={{ fontSize: 11, fill: "#6E6157", fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  width={160}
                />
                <Tooltip content={<DeptActivityTooltip />} cursor={{ fill: "rgba(147, 173, 168, 0.08)" }} />
                <Bar
                  dataKey="count"
                  maxBarSize={22}
                  radius={[0, 6, 6, 0]}
                  cursor="pointer"
                  onClick={(entry: unknown) => {
                    const dept = (entry as { payload?: DeptActivity })?.payload;
                    if (dept?.users?.length) setOpenDept(dept);
                  }}
                >
                  {sorted.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={DEPT_PALETTE[index % DEPT_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {sorted.length > 0 && (
          <p className="text-[0.6875rem] text-zinc-500 dark:text-zinc-400 text-center mt-1">
            คลิกที่แท่งกราฟเพื่อดูว่าใครในแผนกนั้นใช้งานไปกี่ครั้ง
          </p>
        )}
      </CardContent>

      <Dialog open={!!openDept} onOpenChange={(o) => !o && setOpenDept(null)}>
        <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-h-[85vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {openDept?.department}
            </DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400">
              {openDept?.users.length} คน · {openDept?.count.toLocaleString()} ข้อความรวม
            </DialogDescription>
          </DialogHeader>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {openDept?.users.map((u, i) => {
              const share = openDept.count > 0 ? (u.count / openDept.count) * 100 : 0;
              return (
                <div key={u.lineUserId || i} className="flex items-center gap-3 py-2.5">
                  <span className="w-6 text-xs font-bold text-zinc-400 dark:text-zinc-500 tabular-nums shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{u.name}</p>
                    <div className="h-1.5 mt-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#0C645B] dark:bg-emerald-500"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {u.count.toLocaleString()}
                    </p>
                    <p className="text-[0.6875rem] text-zinc-500 dark:text-zinc-400 tabular-nums">
                      {share.toFixed(1)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
