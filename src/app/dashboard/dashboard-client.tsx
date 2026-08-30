"use client";

import { StatCard } from "@/components/dashboard/stat-card";
import { UsageChart } from "@/components/dashboard/usage-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { DailyTokenChart, DeptTokenChart } from "@/components/dashboard/token-charts";
import type { DashboardStats, DailyUsage, ChatLog, DailyTokenUsage, DeptTokenUsage } from "@/lib/types";
import { Users, Activity, MessageSquare, Zap, ShieldCheck } from "lucide-react";

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
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Overview Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
            ภาพรวมการทำงานของระบบ AI Automation และการสื่อสารผ่าน LINE OA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#1B4D3E]/10 dark:bg-[#2D6A4F]/20 text-[#1B4D3E] dark:text-emerald-400 border border-[#1B4D3E]/20 dark:border-emerald-500/30">
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
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Active Today"
          value={data.stats.activeUsersToday}
          description="ผู้ใช้งานในวันนี้"
          icon={<Activity className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Total Messages"
          value={data.stats.totalMessages}
          description="ข้อความ & AI Requests"
          icon={<MessageSquare className="w-5 h-5" />}
          color="wood"
        />
        <StatCard
          title="Total Tokens Used"
          value={data.stats.totalTokensUsed}
          description="ปริมาณ Tokens ที่ใช้งาน"
          icon={<Zap className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title="System Health"
          value="99.9%"
          description="AI Services & Webhook Online"
          icon={<ShieldCheck className="w-5 h-5" />}
          color="health"
          badge="Live"
        />
      </div>

      {/* Message Usage Chart + Recent Activity (Locked Heights h-[380px] perfectly aligned) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <UsageChart data={data.dailyUsage} />
        </div>
        <div className="lg:col-span-1">
          <RecentActivity logs={data.recentLogs} />
        </div>
      </div>

      {/* Token Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailyTokenChart data={data.dailyTokenUsage} />
        <DeptTokenChart data={data.deptTokenUsage} />
      </div>
    </div>
  );
}
