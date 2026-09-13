"use client";

import { StatCard } from "@/components/dashboard/stat-card";
import { UsageChart } from "@/components/dashboard/usage-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { DailyTokenChart, DeptTokenChart } from "@/components/dashboard/token-charts";
import type { DashboardStats, DailyUsage, ChatLog, DailyTokenUsage, DeptTokenUsage } from "@/lib/types";
import { Users, Activity, MessageSquare, Zap, Target } from "lucide-react";

interface DashboardClientProps {
  data: {
    stats: DashboardStats;
    dailyUsage: DailyUsage[];
    recentLogs: ChatLog[];
    dailyTokenUsage: DailyTokenUsage[];
    deptTokenUsage: DeptTokenUsage[];
  };
}

export function DashboardClient({ data }: DashboardClientProps) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Overview Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
            ภาพรวมการทำงานของระบบ AI Automation และการสื่อสารผ่าน LINE OA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#0C645B]/10 dark:bg-[#17A594]/20 text-[#0C645B] dark:text-emerald-400 border border-[#0C645B]/20 dark:border-emerald-500/30">
            Bayview Hotel Enterprise
          </span>
        </div>
      </div>

      {/* 5 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Users"
          value={data.stats.totalUsers}
          description="ผู้ใช้งาน LINE OA ทั้งหมด"
          href="/dashboard/employees"
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Active Today"
          value={data.stats.activeUsersToday}
          description="ผู้ใช้งานในวันนี้"
          href="/dashboard/users?range=today"
          icon={<Activity className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Total Messages"
          value={data.stats.totalMessages}
          description="ข้อความ & AI Requests"
          icon={<MessageSquare className="w-5 h-5" />}
          color="wood"
          href="/dashboard/analytics#dept-activity"
        />
        <StatCard
          title="Total Tokens Used"
          value={data.stats.totalTokensUsed}
          description="ปริมาณ Tokens ที่ใช้งาน"
          href="/dashboard#token-usage"
          icon={<Zap className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title="Answer Accuracy"
          value={`${data.stats.answerAccuracy.toFixed(1)}%`}
          description="คำถามที่ตอบได้ เทียบกับที่ไม่พบข้อมูล"
          // Deep-links to the questions the bot could not answer — the half of
          // this ratio worth acting on, since each one is a gap in the SOPs.
          href="/dashboard/users?status=not_found"
          icon={<Target className="w-5 h-5" />}
          color="health"
        />
      </div>

      {/* Message Usage Chart + Recent Activity (Locked Heights h-[23.75rem] perfectly aligned) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <UsageChart data={data.dailyUsage} />
        </div>
        <div className="lg:col-span-1">
          <RecentActivity logs={data.recentLogs} />
        </div>
      </div>

      {/* Token Analytics Charts — scroll target for the token stat cards */}
      <div id="token-usage" className="grid grid-cols-1 lg:grid-cols-2 gap-6 scroll-mt-24">
        <DailyTokenChart data={data.dailyTokenUsage} />
        <DeptTokenChart data={data.deptTokenUsage} />
      </div>
    </div>
  );
}
