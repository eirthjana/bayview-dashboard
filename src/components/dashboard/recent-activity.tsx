"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ChatLog } from "@/lib/types";
import {
  Clock,
  Briefcase,
  UserCircle,
  Zap,
  Calendar,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Bot,
  User,
  Crown,
} from "lucide-react";

interface RecentActivityProps {
  logs: ChatLog[];
}

/** Clean leading = signs and whitespace */
function cleanText(text: string | null | undefined): string {
  if (!text) return "";
  return String(text).replace(/^=+/, "").trim();
}

/** Clean line_user_id by stripping = signs and quotes */
function cleanLineId(id: string | null | undefined): string {
  if (!id) return "";
  return String(id).replace(/^["'=]+/, "").replace(/["'=]+$/, "").replace(/=/g, "").trim();
}

/** Generate 1-2 initials for avatar */
function getInitials(name: string): string {
  if (!name) return "U";
  const clean = name.replace(/^K\./i, "").trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export function RecentActivity({ logs }: RecentActivityProps) {
  const [selectedLog, setSelectedLog] = useState<ChatLog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleOpenDetail(log: ChatLog) {
    setSelectedLog(log);
    setDialogOpen(true);
  }

  return (
    <>
      <Card className="h-[380px] flex flex-col bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-sm rounded-2xl overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
        <CardHeader className="py-3.5 px-5 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-800/30 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#1B4D3E]/10 dark:bg-[#2D6A4F]/20 text-[#1B4D3E] dark:text-emerald-400">
                <Clock className="w-4 h-4" />
              </span>
              กิจกรรมล่าสุด (Recent Activity)
            </CardTitle>
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700">
              {logs.length} รายการ
            </span>
          </div>
        </CardHeader>

        {/* Scrollable List locked to fixed height with custom scrollbar */}
        <CardContent className="flex-1 p-3 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-center">
                <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-2">
                  <Clock className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">ยังไม่มีกิจกรรมการใช้งาน</p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">ข้อความล่าสุดจะปรากฏที่นี่</p>
              </div>
            ) : (
              logs.map((log) => {
                const rawLineId = cleanLineId(log.line_user_id);
                const isEmployee = Boolean(log.employee);
                const employee = log.employee;

                // 1. User Name resolution
                let displayName = "";
                if (isEmployee && employee?.name) {
                  displayName = employee.name;
                } else if (log.display_name) {
                  displayName = log.display_name;
                } else if (rawLineId) {
                  displayName = `${rawLineId.slice(0, 8)}...`;
                } else {
                  displayName = "Guest User";
                }

                // 2. Role / Position badge text
                let roleBadgeText = "Guest";
                let badgeClass = "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800";

                if (isEmployee && employee) {
                  roleBadgeText = employee.position || employee.access_level || "Staff";
                  const level = String(employee.access_level || "").toLowerCase();
                  if (level === "admin") {
                    badgeClass = "border-purple-200 dark:border-purple-800/60 text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40";
                  } else if (
                    level === "manager" ||
                    String(employee.position || "").toLowerCase().includes("manager")
                  ) {
                    badgeClass = "border-[#1B4D3E]/20 dark:border-emerald-500/40 text-[#1B4D3E] dark:text-emerald-300 bg-[#1B4D3E]/10 dark:bg-emerald-950/40";
                  } else {
                    badgeClass = "border-[#8B5E3C]/20 dark:border-[#8B5E3C]/40 text-[#8B5E3C] dark:text-[#D4A373] bg-[#8B5E3C]/10 dark:bg-[#8B5E3C]/20";
                  }
                }

                // 3. Clean Message
                const userMsg = cleanText(log.user_message);
                const aiResp = cleanText(log.ai_response);

                // Date formatting
                const logDate = new Date(log.created_at);
                const timeStr = logDate.toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const dateStr = logDate.toLocaleDateString("th-TH", {
                  day: "2-digit",
                  month: "short",
                });

                return (
                  <div
                    key={log.id}
                    onClick={() => handleOpenDetail(log)}
                    className="group relative flex items-start gap-3 p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 hover:bg-[#1B4D3E]/5 dark:hover:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-800 hover:border-[#1B4D3E]/30 dark:hover:border-zinc-700 transition-all duration-200 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                  >
                    {/* Avatar Initials with Luxury Gradient */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105 ${
                        isEmployee
                          ? "bg-gradient-to-br from-[#1B4D3E] to-[#2D6A4F] text-white border border-[#1B4D3E]/40"
                          : "bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700"
                      }`}
                    >
                      {isEmployee ? (
                        getInitials(displayName)
                      ) : (
                        <UserCircle className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
                      )}
                    </div>

                    {/* Main Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Name + Badge + Status */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-[#1B4D3E] dark:group-hover:text-emerald-400 transition-colors">
                            {displayName}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 h-4 border leading-none font-semibold shrink-0 ${badgeClass}`}
                          >
                            {isEmployee ? (
                              String(employee?.access_level || "").toLowerCase() === "admin" ? (
                                <Crown className="w-2.5 h-2.5 mr-0.5 inline" />
                              ) : (
                                <Briefcase className="w-2.5 h-2.5 mr-0.5 inline" />
                              )
                            ) : (
                              <UserCircle className="w-2.5 h-2.5 mr-0.5 inline" />
                            )}
                            {roleBadgeText}
                          </Badge>
                          {isEmployee && employee?.department ? (
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium truncate">
                              ({employee.department})
                            </span>
                          ) : null}
                        </div>

                        {/* Status Icon */}
                        <div className="shrink-0 flex items-center">
                          {log.status === "success" ? (
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                          ) : (
                            <span className="inline-block w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                          )}
                        </div>
                      </div>

                      {/* Message Preview (Cleaned) */}
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 truncate leading-tight font-normal">
                        {userMsg || aiResp || (
                          <span className="text-zinc-400 dark:text-zinc-500 italic">— ไม่มีข้อความ —</span>
                        )}
                      </p>

                      {/* Meta: Time & Tokens */}
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 pt-0.5">
                        <span className="font-medium">
                          {dateStr} {timeStr}
                        </span>
                        {log.tokens_used > 0 && (
                          <span className="flex items-center gap-0.5 font-mono text-[#8B5E3C] dark:text-[#D4A373] font-semibold">
                            <Zap className="w-2.5 h-2.5" />
                            {log.tokens_used.toLocaleString()} tokens
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Luxury Detail Modal */}
      {selectedLog && (
        <RecentActivityDetailModal
          log={selectedLog}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </>
  );
}

// ─── Luxury Detail Modal ──────────────────────────────────────────────────────

interface RecentActivityDetailModalProps {
  log: ChatLog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function RecentActivityDetailModal({
  log,
  open,
  onOpenChange,
}: RecentActivityDetailModalProps) {
  const isEmployee = Boolean(log.employee);
  const employee = log.employee;
  const rawLineId = cleanLineId(log.line_user_id);

  let displayName = "";
  if (isEmployee && employee?.name) {
    displayName = employee.name;
  } else if (log.display_name) {
    displayName = log.display_name;
  } else if (rawLineId) {
    displayName = rawLineId;
  } else {
    displayName = "Guest User";
  }

  let badgeClass = "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800";
  if (isEmployee && employee) {
    const level = String(employee.access_level || "").toLowerCase();
    if (level === "admin") {
      badgeClass = "border-purple-200 dark:border-purple-800/60 text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40";
    } else if (
      level === "manager" ||
      String(employee.position || "").toLowerCase().includes("manager")
    ) {
      badgeClass = "border-[#1B4D3E]/20 dark:border-emerald-500/40 text-[#1B4D3E] dark:text-emerald-300 bg-[#1B4D3E]/10 dark:bg-emerald-950/40";
    } else {
      badgeClass = "border-[#8B5E3C]/20 dark:border-[#8B5E3C]/40 text-[#8B5E3C] dark:text-[#D4A373] bg-[#8B5E3C]/10 dark:bg-[#8B5E3C]/20";
    }
  }

  const userMsg = cleanText(log.user_message);
  const aiResp = cleanText(log.ai_response);
  const logDate = new Date(log.created_at);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-[#18181B] border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-xl max-h-[85vh] overflow-hidden flex flex-col p-6 shadow-2xl rounded-2xl">
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-zinc-100">
            <span className="p-1.5 rounded-lg bg-[#1B4D3E]/10 dark:bg-[#2D6A4F]/20 text-[#1B4D3E] dark:text-emerald-400">
              <MessageSquare className="w-4 h-4" />
            </span>
            รายละเอียดกิจกรรม (Activity Detail)
          </DialogTitle>
        </DialogHeader>

        {/* User Card */}
        <div className="shrink-0 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 shadow-sm ${
                isEmployee
                  ? "bg-gradient-to-br from-[#1B4D3E] to-[#2D6A4F] text-white"
                  : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-600"
              }`}
            >
              {isEmployee ? getInitials(displayName) : <UserCircle className="w-6 h-6" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{displayName}</p>
                <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-semibold ${badgeClass}`}>
                  {isEmployee
                    ? employee?.position || employee?.department || employee?.access_level || "Staff"
                    : "Guest"}
                </Badge>
              </div>
              {isEmployee && employee?.department ? (
                <p className="text-xs text-[#1B4D3E] dark:text-emerald-400 font-medium truncate mt-0.5">
                  แผนก: {employee.department} {employee?.emp_id ? `(ID: ${employee.emp_id})` : ""}
                </p>
              ) : null}
              <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono truncate mt-0.5">
                LINE ID: {rawLineId || "-"}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            {log.status === "success" ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2.5 py-1 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Success
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 px-2.5 py-1 rounded-lg">
                <XCircle className="w-3.5 h-3.5" />
                Error
              </span>
            )}
          </div>
        </div>

        {/* Metadata Bar */}
        <div className="shrink-0 flex items-center justify-between px-3.5 py-2 rounded-lg bg-zinc-100/70 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300">
          <div className="flex items-center gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>
              {logDate.toLocaleDateString("th-TH", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}{" "}
              {logDate.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          {log.tokens_used > 0 && (
            <div className="flex items-center gap-1 font-mono text-[#8B5E3C] dark:text-[#D4A373] font-semibold">
              <Zap className="w-3.5 h-3.5" />
              <span>{log.tokens_used.toLocaleString()} tokens</span>
            </div>
          )}
        </div>

        {/* Conversation Stream */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 mt-1 custom-scrollbar">
          {/* User Message */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1B4D3E] dark:text-emerald-400">
              <User className="w-3.5 h-3.5" />
              <span>{displayName}</span>
            </div>
            <div className="rounded-xl border border-[#1B4D3E]/20 dark:border-emerald-500/30 bg-[#1B4D3E]/5 dark:bg-emerald-950/20 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap break-words leading-relaxed">
              {userMsg || <span className="text-zinc-400 dark:text-zinc-500 italic">— ไม่มีข้อความ —</span>}
            </div>
          </div>

          {/* AI Response */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#8B5E3C] dark:text-[#D4A373]">
              <Bot className="w-3.5 h-3.5" />
              <span>AI Assistant</span>
            </div>
            <div className="rounded-xl border border-[#8B5E3C]/20 dark:border-[#8B5E3C]/40 bg-[#8B5E3C]/5 dark:bg-[#8B5E3C]/10 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap break-words leading-relaxed">
              {aiResp || <span className="text-zinc-400 dark:text-zinc-500 italic">— ไม่มีการตอบสนอง —</span>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
