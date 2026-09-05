"use client";

import { StatCard } from "@/components/dashboard/stat-card";
import { TopFaqsCard, PeakHoursChart, DeptActivityChart } from "@/components/dashboard/analytics-charts";
import type { AnalyticsSummary, FaqItem, HourlyUsage, DeptActivity } from "@/lib/types";
import { MessageSquare, Zap, Clock, Building2 } from "lucide-react";

interface AnalyticsClientProps {
  summary: AnalyticsSummary;
  faqs: FaqItem[];
  hourly: HourlyUsage[];
  deptActivity: DeptActivity[];
}

export function AnalyticsClient({ summary, faqs, hourly, deptActivity }: AnalyticsClientProps) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Analytics & Insights
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
            วิเคราะห์เชิงลึก: คำถามยอดนิยม (Top FAQs), ช่วงเวลาใช้งานสูงสุด (Peak Hours), และสถิติแยกตามแผนกจริง
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#0C645B]/10 dark:bg-[#17A594]/20 text-[#0C645B] dark:text-emerald-400 border border-[#0C645B]/20 dark:border-emerald-500/30 shrink-0">
          Bayview Intelligence
        </span>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total AI Inquiries"
          value={summary.totalInquiries}
          description="คำถามทั้งหมดที่ระบบประมวลผล"
          icon={<MessageSquare className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Avg Tokens / Query"
          value={summary.avgTokensPerQuery}
          description="ความคุ้มค่าและความยาวคำตอบ"
          icon={<Zap className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title="Peak Traffic Time"
          value={summary.peakTrafficTime}
          description="ช่วงเวลาที่มีผู้ทักแชทหนาแน่นที่สุด"
          icon={<Clock className="w-5 h-5" />}
          color="wood"
        />
        <StatCard
          title="Most Active Dept"
          value={summary.mostActiveDept}
          description="แผนกที่มีอัตราการใช้งานสูงสุด"
          icon={<Building2 className="w-5 h-5" />}
          color="emerald"
        />
      </div>

      {/* Top FAQs + Peak Usage Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <TopFaqsCard items={faqs} />
        <PeakHoursChart data={hourly} peakLabel={summary.peakTrafficTime} />
      </div>

      {/* Department Activity Breakdown */}
      <DeptActivityChart data={deptActivity} />
    </div>
  );
}
