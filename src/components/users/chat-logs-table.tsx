"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ChatLog, Employee } from "@/lib/types";
import {
  Search,
  Eye,
  User,
  Bot,
  Briefcase,
  UserCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldAlert,
  Zap,
  Calendar,
  MessageSquare,
  Database,
  Users,
  ShieldCheck,
  Crown,
  RotateCcw,
  Filter,
} from "lucide-react";

// Real Hotel Departments List
const DEPARTMENTS = [
  "All Departments",
  "Executive Office",
  "Accounting",
  "Front Office",
  "Front Office (Reservation)",
  "Housekeeping (Service)",
  "Housekeeping (Regular)",
  "Food & Beverage",
  "Main Kitchen",
  "Guest / Unregistered",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanText(str: string | null | undefined): string {
  if (!str) return "";
  return String(str).replace(/^=+/, "").trim();
}

function normalizeLineId(id: string | null | undefined): string {
  if (!id) return "";
  return String(id)
    .replace(/^["'=]+/, "")
    .replace(/["'=]+$/, "")
    .replace(/=/g, "")
    .trim()
    .toLowerCase();
}

function cleanDisplayId(id: string | null | undefined): string {
  if (!id) return "";
  return String(id)
    .replace(/^["'=]+/, "")
    .replace(/["'=]+$/, "")
    .replace(/=/g, "")
    .trim();
}

function shortId(id: string): string {
  const clean = cleanDisplayId(id);
  if (!clean) return "-";
  if (clean.length <= 12) return clean;
  return `${clean.slice(0, 6)}…${clean.slice(-4)}`;
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" }),
    time: d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilterType = "all" | "success" | "not_found" | "unauthorized" | "error";

interface EnrichedLog extends ChatLog {
  isStaff: boolean;
  resolvedName: string;
  resolvedDept: string;
  roleLabel: string;
  roleType: "admin" | "manager" | "staff" | "guest";
  cleanLineUserId: string;
  cleanMessage: string;
  cleanResponse: string;
}

interface ChatLogsTableProps {
  chatLogs: ChatLog[];
  employees: Employee[];
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function SummaryMetricCard({
  icon,
  label,
  value,
  subtext,
  colorClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  colorClass: string;
}) {
  return (
    <Card className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-sm rounded-2xl p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl border ${colorClass} shrink-0`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight tabular-nums mt-0.5">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtext && <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">{subtext}</p>}
        </div>
      </div>
    </Card>
  );
}

// ─── Status Badge Component ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();

  if (s === "success") {
    return (
      <span className="inline-flex items-center justify-center gap-1 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full whitespace-nowrap">
        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
        Success
      </span>
    );
  }

  if (s === "not_found") {
    return (
      <span className="inline-flex items-center justify-center gap-1 text-amber-800 dark:text-amber-300 text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-full whitespace-nowrap">
        <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
        Not Found
      </span>
    );
  }

  if (s === "unauthorized") {
    return (
      <span className="inline-flex items-center justify-center gap-1 text-purple-800 dark:text-purple-300 text-[11px] font-bold bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/60 px-2 py-0.5 rounded-full whitespace-nowrap">
        <ShieldAlert className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
        Unauthorized
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center gap-1 text-rose-800 dark:text-rose-300 text-[11px] font-bold bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 px-2 py-0.5 rounded-full whitespace-nowrap">
      <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
      Error
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ChatLogsTable({ chatLogs, employees }: ChatLogsTableProps) {
  // Filter States
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("all");

  const [selectedLog, setSelectedLog] = useState<EnrichedLog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Build employee lookup maps for multi-strategy matching
  const { empLineIdMap, empLineNameMap } = useMemo(() => {
    const idMap = new Map<string, Employee>();
    const nameMap = new Map<string, Employee>();

    employees.forEach((emp) => {
      if (emp.line_user_id) {
        const key = normalizeLineId(emp.line_user_id);
        if (key) idMap.set(key, emp);
      }
      if (emp.line_name) {
        const key = normalizeLineId(emp.line_name);
        if (key) nameMap.set(key, emp);
      }
      if (emp.name) {
        const key = normalizeLineId(emp.name);
        if (key) nameMap.set(key, emp);
      }
    });

    return { empLineIdMap: idMap, empLineNameMap: nameMap };
  }, [employees]);

  // Enrich each log
  const enrichedLogs = useMemo<EnrichedLog[]>(() => {
    return chatLogs.map((log) => {
      const normId = normalizeLineId(log.line_user_id);
      const displayId = cleanDisplayId(log.line_user_id);

      // Multi-strategy lookup
      let emp = normId ? empLineIdMap.get(normId) : undefined;
      if (!emp && log.display_name) {
        emp = empLineNameMap.get(normalizeLineId(log.display_name));
      }

      let resolvedName = "";
      let roleLabel = "Guest";
      let roleType: "admin" | "manager" | "staff" | "guest" = "guest";
      let resolvedDept = "Guest / Unregistered";
      const isStaff = Boolean(emp);

      if (emp) {
        resolvedName = emp.name || "Employee";
        resolvedDept = emp.department || "General Staff";
        const level = String(emp.access_level || "").toLowerCase();
        const pos = String(emp.position || "").toLowerCase();

        if (emp.position) {
          roleLabel = emp.position;
        } else if (level === "admin") {
          roleLabel = "Admin";
        } else if (level === "manager") {
          roleLabel = "Manager";
        } else {
          roleLabel = "Staff";
        }

        if (level === "admin" || pos.includes("admin")) {
          roleType = "admin";
        } else if (
          level === "manager" ||
          pos.includes("manager") ||
          pos.includes("director") ||
          pos.includes("head")
        ) {
          roleType = "manager";
        } else {
          roleType = "staff";
        }
      } else if (log.display_name) {
        resolvedName = log.display_name;
        roleLabel = "Guest";
        roleType = "guest";
      } else {
        resolvedName = shortId(displayId) || "Guest User";
        roleLabel = "Guest";
        roleType = "guest";
      }

      return {
        ...log,
        employee: emp || log.employee || null,
        isStaff,
        resolvedName,
        resolvedDept,
        roleLabel,
        roleType,
        cleanLineUserId: displayId,
        cleanMessage: cleanText(log.user_message),
        cleanResponse: cleanText(log.ai_response),
      };
    });
  }, [chatLogs, empLineIdMap, empLineNameMap]);

  // Apply all 4 filters simultaneously
  const filteredLogs = useMemo(() => {
    const q = search.toLowerCase().trim();

    return enrichedLogs.filter((log) => {
      // 1. Status Filter
      if (statusFilter !== "all" && log.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // 2. Department Filter
      if (deptFilter !== "All Departments") {
        if (deptFilter === "Guest / Unregistered") {
          if (log.isStaff) return false;
        } else {
          if (!log.isStaff || log.resolvedDept.toLowerCase() !== deptFilter.toLowerCase()) {
            return false;
          }
        }
      }

      // 3. Date Range Filter
      if (startDate) {
        const logDateStr = new Date(log.created_at).toISOString().split("T")[0];
        if (logDateStr < startDate) return false;
      }
      if (endDate) {
        const logDateStr = new Date(log.created_at).toISOString().split("T")[0];
        if (logDateStr > endDate) return false;
      }

      // 4. Search Bar Filter (Message, AI Response, Name, ID, EmpID, Dept)
      if (q) {
        const nameMatch = String(log.resolvedName || "").toLowerCase().includes(q);
        const lineIdMatch = String(log.cleanLineUserId || "").toLowerCase().includes(q);
        const msgMatch = String(log.cleanMessage || "").toLowerCase().includes(q);
        const respMatch = String(log.cleanResponse || "").toLowerCase().includes(q);
        const deptMatch = String(log.resolvedDept || "").toLowerCase().includes(q);
        const posMatch = String(log.employee?.position || "").toLowerCase().includes(q);
        const empIdMatch = String(log.employee?.emp_id || "").toLowerCase().includes(q);

        if (!nameMatch && !lineIdMatch && !msgMatch && !respMatch && !deptMatch && !posMatch && !empIdMatch) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedLogs, search, deptFilter, startDate, endDate, statusFilter]);

  // Dynamic Summary Metrics based on filtered results
  const dynamicMetrics = useMemo(() => {
    const total = filteredLogs.length;
    const uniqueUsers = new Set(filteredLogs.map((l) => l.cleanLineUserId).filter(Boolean)).size;
    const successCount = filteredLogs.filter((l) => l.status === "success").length;
    const resolvedRate = total > 0 ? (successCount / total) * 100 : 100;

    return {
      total,
      uniqueUsers,
      resolvedRate,
    };
  }, [filteredLogs]);

  // Reset all filters
  function handleResetFilters() {
    setSearch("");
    setDeptFilter("All Departments");
    setStartDate("");
    setEndDate("");
    setStatusFilter("all");
  }

  const isFiltered =
    Boolean(search) ||
    deptFilter !== "All Departments" ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    statusFilter !== "all";

  function openDetail(log: EnrichedLog) {
    setSelectedLog(log);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* ── Dynamic Summary Metric Cards (Recalculates based on Filter) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryMetricCard
          icon={<Database className="w-5 h-5 text-[#1B4D3E] dark:text-emerald-400" />}
          label="Total Logs (ผลลัพธ์)"
          value={dynamicMetrics.total}
          subtext={`จากทั้งหมด ${chatLogs.length.toLocaleString()} รายการ`}
          colorClass="bg-[#1B4D3E]/10 dark:bg-[#2D6A4F]/20 border-[#1B4D3E]/20 dark:border-emerald-500/30"
        />
        <SummaryMetricCard
          icon={<Users className="w-5 h-5 text-[#8B5E3C] dark:text-[#D4A373]" />}
          label="Unique Users (ผู้ใช้)"
          value={dynamicMetrics.uniqueUsers}
          subtext="จำนวนผู้ใช้ที่ไม่ซ้ำในผลลัพธ์"
          colorClass="bg-[#8B5E3C]/10 dark:bg-[#8B5E3C]/20 border-[#8B5E3C]/20 dark:border-[#8B5E3C]/40"
        />
        <SummaryMetricCard
          icon={<ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />}
          label="Resolved Rate"
          value={`${dynamicMetrics.resolvedRate.toFixed(1)}%`}
          subtext="อัตราการตอบสำเร็จในชุดข้อมูลนี้"
          colorClass="bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50"
        />
      </div>

      {/* ── Toolbar Filter Bar ── */}
      <Card className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-sm rounded-2xl p-4">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-200">
              <Filter className="w-3.5 h-3.5 text-[#1B4D3E] dark:text-emerald-400" />
              <span>ตัวกรองข้อมูลขั้นสูง (Advanced Filters)</span>
            </div>
            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2 flex items-center gap-1 rounded-lg"
              >
                <RotateCcw className="w-3 h-3" />
                ล้างตัวกรอง (Reset)
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
            {/* 1. Real-time Search */}
            <div className="lg:col-span-4 relative">
              <Search className="absolute left-3 top-1/2 -tranzinc-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
              <Input
                placeholder="ค้นหาข้อความ, คำตอบ, ชื่อผู้ใช้, หรือ ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-zinc-50/70 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 h-9 rounded-xl text-xs font-medium focus:bg-white dark:focus:bg-zinc-800 transition-colors"
              />
            </div>

            {/* 2. Department Dropdown */}
            <div className="lg:col-span-3">
              <Select value={deptFilter} onValueChange={(v) => setDeptFilter(v || "All Departments")}>
                <SelectTrigger className="w-full bg-zinc-50/70 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 h-9 rounded-xl text-xs font-medium focus:bg-white dark:focus:bg-zinc-800">
                  <SelectValue placeholder="เลือกแผนก" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#18181B] border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs">
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Date Range Picker (Start & End) */}
            <div className="lg:col-span-3 flex items-center gap-1.5">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-zinc-50/70 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 h-9 rounded-xl text-[11px] font-medium px-2"
                title="Start Date"
              />
              <span className="text-zinc-400 text-xs">-</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-zinc-50/70 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 h-9 rounded-xl text-[11px] font-medium px-2"
                title="End Date"
              />
            </div>

            {/* 4. Status Dropdown */}
            <div className="lg:col-span-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v || "all") as StatusFilterType)}>
                <SelectTrigger className="w-full bg-zinc-50/70 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 h-9 rounded-xl text-xs font-medium focus:bg-white dark:focus:bg-zinc-800">
                  <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#18181B] border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs">
                  <SelectItem value="all">ทุกสถานะ (All)</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="not_found">Not Found</SelectItem>
                  <SelectItem value="unauthorized">Unauthorized</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Table ── */}
      <Card className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-xs">
            <colgroup>
              <col style={{ width: "110px" }} />
              <col style={{ width: "200px" }} />
              <col />
              <col />
              <col style={{ width: "115px" }} />
              <col style={{ width: "48px" }} />
            </colgroup>

            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-bold uppercase tracking-wider">
                <th className="px-3.5 py-3 text-left whitespace-nowrap">วันที่ / เวลา</th>
                <th className="px-3.5 py-3 text-left whitespace-nowrap">ผู้ส่ง / บทบาท (แผนก)</th>
                <th className="px-3.5 py-3 text-left">คำถาม (User Message)</th>
                <th className="px-3.5 py-3 text-left">คำตอบ AI (Response)</th>
                <th className="px-3.5 py-3 text-center whitespace-nowrap">สถานะ (Status)</th>
                <th className="px-2 py-3 text-center"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-zinc-500 dark:text-zinc-400 py-16">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">ไม่พบข้อมูลที่ตรงกับเงื่อนไข</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">ลองปรับตัวกรองค้นหา หรือกด Reset ตัวกรอง</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const { date, time } = formatDateTime(log.created_at);

                  let badgeClass = "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800";
                  if (log.roleType === "admin") {
                    badgeClass = "border-purple-200 dark:border-purple-800/60 text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40";
                  } else if (log.roleType === "manager") {
                    badgeClass = "border-[#1B4D3E]/20 dark:border-emerald-500/40 text-[#1B4D3E] dark:text-emerald-300 bg-[#1B4D3E]/10 dark:bg-emerald-950/40";
                  } else if (log.roleType === "staff") {
                    badgeClass = "border-[#8B5E3C]/20 dark:border-[#8B5E3C]/40 text-[#8B5E3C] dark:text-[#D4A373] bg-[#8B5E3C]/10 dark:bg-[#8B5E3C]/20";
                  }

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                      onClick={() => openDetail(log)}
                    >
                      {/* Date / Time */}
                      <td className="px-3.5 py-3 align-middle">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{date}</span>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{time}</span>
                        </div>
                      </td>

                      {/* Sender + Role + Department */}
                      <td className="px-3.5 py-3 align-middle">
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0 gap-1 w-fit font-bold ${badgeClass}`}
                            >
                              {log.roleType === "admin" ? (
                                <Crown className="w-2.5 h-2.5" />
                              ) : log.isStaff ? (
                                <Briefcase className="w-2.5 h-2.5" />
                              ) : (
                                <UserCircle className="w-2.5 h-2.5" />
                              )}
                              {log.roleLabel}
                            </Badge>
                          </div>

                          <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {log.resolvedName}
                          </span>

                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate">
                            {log.isStaff ? log.resolvedDept : shortId(log.cleanLineUserId)}
                          </span>
                        </div>
                      </td>

                      {/* User message — truncated */}
                      <td className="px-3.5 py-3 align-middle">
                        <p className="text-zinc-800 dark:text-zinc-200 truncate max-w-full font-normal" title={log.cleanMessage}>
                          {log.cleanMessage || <span className="text-zinc-400 dark:text-zinc-500 italic">— ไม่มีข้อความ —</span>}
                        </p>
                      </td>

                      {/* AI response — truncated */}
                      <td className="px-3.5 py-3 align-middle">
                        <p className="text-zinc-600 dark:text-zinc-300 truncate max-w-full font-normal" title={log.cleanResponse}>
                          {log.cleanResponse || <span className="text-zinc-400 dark:text-zinc-500 italic">— ไม่มีการตอบ —</span>}
                        </p>
                      </td>

                      {/* Status Badge */}
                      <td className="px-3.5 py-3 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                        <StatusBadge status={log.status} />
                      </td>

                      {/* Eye button */}
                      <td className="px-2 py-3 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetail(log)}
                          className="h-7 w-7 p-0 text-zinc-400 dark:text-zinc-400 hover:text-[#1B4D3E] dark:hover:text-emerald-400 hover:bg-[#1B4D3E]/10 dark:hover:bg-zinc-800 rounded-lg"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Detail Dialog ── */}
      <ChatLogDetailDialog
        log={selectedLog}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}

// ─── Detail Dialog ────────────────────────────────────────────────────────────

interface ChatLogDetailDialogProps {
  log: EnrichedLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ChatLogDetailDialog({ log, open, onOpenChange }: ChatLogDetailDialogProps) {
  if (!log) return null;
  const { date, time } = formatDateTime(log.created_at);

  let badgeClass = "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800";
  if (log.roleType === "admin") {
    badgeClass = "border-purple-200 dark:border-purple-800/60 text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40";
  } else if (log.roleType === "manager") {
    badgeClass = "border-[#1B4D3E]/20 dark:border-emerald-500/40 text-[#1B4D3E] dark:text-emerald-300 bg-[#1B4D3E]/10 dark:bg-emerald-950/40";
  } else if (log.roleType === "staff") {
    badgeClass = "border-[#8B5E3C]/20 dark:border-[#8B5E3C]/40 text-[#8B5E3C] dark:text-[#D4A373] bg-[#8B5E3C]/10 dark:bg-[#8B5E3C]/20";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-[#18181B] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-2xl max-h-[85vh] overflow-hidden flex flex-col gap-4 shadow-2xl rounded-2xl">
        <DialogHeader className="shrink-0 pb-0">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-white">
            <span className="p-1.5 rounded-lg bg-[#1B4D3E]/10 dark:bg-[#2D6A4F]/20 text-[#1B4D3E] dark:text-emerald-400">
              <MessageSquare className="w-4 h-4" />
            </span>
            รายละเอียดการสนทนา (Conversation Log)
          </DialogTitle>
        </DialogHeader>

        {/* Meta Bar */}
        <div className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-2 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] gap-1 font-bold ${badgeClass}`}>
              {log.roleType === "admin" ? (
                <Crown className="w-2.5 h-2.5" />
              ) : log.isStaff ? (
                <Briefcase className="w-2.5 h-2.5" />
              ) : (
                <UserCircle className="w-2.5 h-2.5" />
              )}
              {log.roleLabel}
            </Badge>
            <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{log.resolvedName}</span>
            {log.isStaff && (
              <span className="text-[#1B4D3E] dark:text-emerald-400 font-semibold">({log.resolvedDept})</span>
            )}
            <span className="font-mono text-zinc-400 dark:text-zinc-500 text-[11px]">{log.cleanLineUserId}</span>
          </div>

          <span className="text-zinc-300 dark:text-zinc-600 hidden sm:inline">|</span>

          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 font-medium">
            <Calendar className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            <span>
              {date} {time}
            </span>
          </div>

          {log.tokens_used > 0 && (
            <>
              <span className="text-zinc-300 dark:text-zinc-600 hidden sm:inline">|</span>
              <div className="flex items-center gap-1 font-mono text-[#8B5E3C] dark:text-[#D4A373] font-bold">
                <Zap className="w-3.5 h-3.5" />
                <span>{log.tokens_used.toLocaleString()} tokens</span>
              </div>
            </>
          )}

          <span className="text-zinc-300 dark:text-zinc-600 hidden sm:inline">|</span>
          <StatusBadge status={log.status} />
        </div>

        {/* Conversation Stream */}
        <div className="flex-1 overflow-y-auto space-y-4 min-h-0 custom-scrollbar pr-1">
          {/* User Message */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1B4D3E] dark:text-emerald-400">
              <User className="w-3.5 h-3.5" />
              <span>{log.resolvedName}</span>
              <span className="font-normal text-zinc-400 dark:text-zinc-500 font-mono">({shortId(log.cleanLineUserId)})</span>
            </div>
            <div className="rounded-xl border border-[#1B4D3E]/20 dark:border-emerald-500/30 bg-[#1B4D3E]/5 dark:bg-emerald-950/20 px-4 py-3">
              {log.cleanMessage ? (
                <p className="text-sm text-zinc-900 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap break-words">
                  {log.cleanMessage}
                </p>
              ) : (
                <p className="text-sm text-zinc-400 dark:text-zinc-500 italic">— ไม่มีข้อความ —</p>
              )}
            </div>
          </div>

          {/* AI Response */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#8B5E3C] dark:text-[#D4A373]">
              <Bot className="w-3.5 h-3.5" />
              AI Assistant
            </div>
            <div className="rounded-xl border border-[#8B5E3C]/20 dark:border-[#8B5E3C]/40 bg-[#8B5E3C]/5 dark:bg-[#8B5E3C]/10 px-4 py-3">
              {log.cleanResponse ? (
                <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
                  {log.cleanResponse}
                </p>
              ) : (
                <p className="text-sm text-zinc-400 dark:text-zinc-500 italic">— ไม่มีการตอบสนอง —</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
