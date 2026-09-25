"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Inbox, CheckCircle2, Search, SendHorizontal, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  adminDisplayName,
  buildAdminReplyText,
  MAX_ADMIN_REPLY_LENGTH,
  type AdminProfile,
} from "@/lib/admin-reply";

export interface PendingQuestion {
  id: string;
  question: string;
  botAnswer: string;
  createdAt: string;
  askerName: string;
  askerDept: string;
  askerPosition: string | null;
  adminReply: string | null;
  adminRepliedAt: string | null;
  adminRepliedBy: string | null;
  /** A LINE quoteToken was logged: the reply will appear as a quote of the question. */
  canQuote: boolean;
}

type View = "pending" | "replied";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RepliesClient({
  questions: initial,
  admin,
}: {
  questions: PendingQuestion[];
  admin: AdminProfile | null;
}) {
  const adminName = adminDisplayName(admin);
  const [questions, setQuestions] = useState(initial);
  const [view, setView] = useState<View>("pending");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);

  const pendingCount = questions.filter((q) => !q.adminRepliedAt).length;
  const repliedCount = questions.length - pendingCount;

  const visible = useMemo(() => {
    const s = search.trim().toLowerCase();
    return questions
      .filter((q) => (view === "pending" ? !q.adminRepliedAt : !!q.adminRepliedAt))
      .filter(
        (q) =>
          !s ||
          q.question.toLowerCase().includes(s) ||
          q.askerName.toLowerCase().includes(s) ||
          q.askerDept.toLowerCase().includes(s)
      );
  }, [questions, view, search]);

  async function send(q: PendingQuestion) {
    const reply = (drafts[q.id] || "").trim();
    if (!reply) {
      toast.error("กรุณาพิมพ์ข้อความตอบกลับ");
      return;
    }
    if (!confirm(`ส่งข้อความนี้ไปหา ${q.askerName} ทาง LINE ใช่หรือไม่?`)) return;

    setSendingId(q.id);
    try {
      const res = await fetch("/api/admin-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_log_id: q.id, reply }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || "ส่งไม่สำเร็จ");

      setQuestions((prev) =>
        prev.map((item) =>
          item.id === q.id
            ? {
                ...item,
                adminReply: reply,
                adminRepliedAt: data.admin_replied_at,
                adminRepliedBy: data.admin_replied_by,
              }
            : item
        )
      );
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[q.id];
        return next;
      });
      setOpenId(null);
      if (data.warning) toast.warning(data.warning);
      else toast.success(`ส่งถึง ${q.askerName} แล้ว`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ส่งไม่สำเร็จ");
    } finally {
      setSendingId(null);
    }
  }

  const tabs: { value: View; label: string; count: number }[] = [
    { value: "pending", label: "รอตอบ", count: pendingCount },
    { value: "replied", label: "ตอบแล้ว", count: repliedCount },
  ];

  return (
    <div className="space-y-6">
      {admin && adminName ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          ตอบในนาม <span className="font-semibold">{adminName}</span>
          {admin.position ? ` · ${admin.position}` : ""}
          {admin.department ? ` · ${admin.department}` : ""}
        </p>
      ) : (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          บัญชีที่ล็อกอินอยู่ยังไม่มีชื่อ จึงยังส่งข้อความไม่ได้ ใส่ชื่อ รหัสพนักงาน ตำแหน่ง และแผนกได้ที่หน้า Admin Accounts
        </div>
      )}

      <Card className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-sm rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-zinc-800">
          <Metric
            icon={<Inbox className="w-5 h-5 text-amber-700 dark:text-amber-400" />}
            label="รอตอบ"
            value={pendingCount}
            subtext="คำถามสถานะ Not Found ที่ยังไม่มีแอดมินตอบกลับ"
          />
          <Metric
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />}
            label="ตอบแล้ว"
            value={repliedCount}
            subtext="ส่งคำตอบถึงพนักงานทาง LINE แล้ว"
          />
        </div>
      </Card>

      <Card className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-sm rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex gap-2">
            {tabs.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setView(t.value);
                  setOpenId(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  view === t.value
                    ? "bg-[#0C645B] text-white border-[#0C645B] dark:bg-emerald-600 dark:border-emerald-600"
                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาคำถาม ชื่อผู้ถาม หรือแผนก"
              className="pl-9"
            />
          </div>
        </div>
      </Card>

      <Card className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-sm rounded-2xl overflow-hidden">
        {visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {view === "pending" ? "ไม่มีคำถามที่รอตอบ" : "ยังไม่มีคำถามที่ตอบแล้ว"}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {visible.map((q) => {
              const isOpen = openId === q.id;
              const draft = drafts[q.id] || "";
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : q.id)}
                    className="w-full text-left flex gap-3 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 break-words">
                        {q.question}
                      </span>
                      <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                        {q.askerName} · {q.askerDept}
                        {q.askerPosition ? ` · ${q.askerPosition}` : ""} · {formatDate(q.createdAt)}
                      </span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 mt-1 shrink-0 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 space-y-3">
                      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3">
                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">บอทตอบไปว่า</p>
                        <p className="text-sm whitespace-pre-line text-zinc-700 dark:text-zinc-300">
                          {q.botAnswer || "-"}
                        </p>
                      </div>

                      {q.adminRepliedAt ? (
                        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 p-3">
                          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                            แอดมินตอบแล้ว · {formatDate(q.adminRepliedAt)}
                            {q.adminRepliedBy ? ` · ${q.adminRepliedBy}` : ""}
                          </p>
                          <p className="text-sm whitespace-pre-line text-zinc-800 dark:text-zinc-200">
                            {q.adminReply}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Textarea
                            value={draft}
                            onChange={(e) => setDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                            placeholder="พิมพ์คำตอบที่จะส่งให้พนักงาน"
                            maxLength={MAX_ADMIN_REPLY_LENGTH}
                            className="min-h-24"
                            disabled={sendingId === q.id}
                          />
                          {draft.trim() && admin && adminName && (
                            <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-3">
                              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                                ข้อความที่พนักงานจะได้รับใน LINE
                                {q.canQuote
                                  ? " · ขึ้นเป็นการตอบกลับข้อความที่พนักงานถาม"
                                  : " · คำถามนี้เข้ามาก่อนเปิดระบบอ้างอิงข้อความ จึงพิมพ์คำถามไว้ในข้อความแทน"}
                              </p>
                              <p className="text-sm whitespace-pre-line text-zinc-700 dark:text-zinc-300">
                                {buildAdminReplyText(q.question, draft, admin, q.canQuote)}
                              </p>
                            </div>
                          )}
                          <div className="flex justify-end">
                            <Button
                              onClick={() => send(q)}
                              disabled={sendingId === q.id || !draft.trim() || !adminName}
                              className="gap-2 bg-[#0C645B] hover:bg-[#0a5750] text-white"
                            >
                              <SendHorizontal className="w-4 h-4" />
                              {sendingId === q.id ? "กำลังส่ง..." : "ส่งทาง LINE"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtext: string;
}) {
  return (
    <div className="flex items-start gap-3 p-5">
      <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label}</p>
        <p className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 leading-tight">
          {value.toLocaleString()}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{subtext}</p>
      </div>
    </div>
  );
}
