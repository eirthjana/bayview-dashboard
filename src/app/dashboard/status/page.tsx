"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Activity,
  Database,
  Globe,
  Layers,
  Bot,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface HealthData {
  success: boolean;
  overall: "up" | "degraded" | "down";
  database: "up" | "down" | "unknown";
  ngrok: "up" | "down" | "unknown";
  n8n: "up" | "down" | "unknown";
  probeReason: string;
  aiEnabled: boolean | null;
  checkedAt: string;
}

interface PingHistoryItem {
  timestamp: Date;
  overall: "up" | "degraded" | "down";
  latency: number;
  message: string;
}

export default function SystemStatusPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [history, setHistory] = useState<PingHistoryItem[]>([]);
  const isMounted = useRef(true);

  const probeStatus = useCallback(async (manual = false) => {
    setIsProbing(true);
    const start = performance.now();
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const duration = Math.round(performance.now() - start);
      const data: HealthData = await res.json();

      if (!isMounted.current) return;

      if (data && data.success) {
        setHealth(data);
        setLatency(duration);
        const now = new Date();
        setLastChecked(now);

        setHistory((prev) => [
          {
            timestamp: now,
            overall: data.overall,
            latency: duration,
            message: data.probeReason || "All probes completed",
          },
          ...prev.slice(0, 7),
        ]);

        if (manual) {
          if (data.overall === "up") {
            toast.success("ตรวจสอบสถานะเรียบร้อย: ทุกระบบทำงานปกติ");
          } else if (data.overall === "degraded") {
            toast.warning("ตรวจสอบสถานะเรียบร้อย: มีบางระบบทำงานได้ไม่เต็มประสิทธิภาพ");
          } else {
            toast.error("ตรวจพบระบบขัดข้อง กรุณาตรวจสอบบริการที่ขึ้นสถานะสีแดง");
          }
        }
      } else {
        throw new Error("Failed health check");
      }
    } catch {
      if (!isMounted.current) return;
      const duration = Math.round(performance.now() - start);
      const now = new Date();
      setLatency(duration);
      setLastChecked(now);
      setHealth(() => ({
        success: false,
        overall: "down",
        database: "down",
        ngrok: "down",
        n8n: "down",
        probeReason: "ไม่สามารถเชื่อมต่อ API Health Check ได้",
        aiEnabled: null,
        checkedAt: now.toISOString(),
      }));
      if (manual) {
        toast.error("ไม่สามารถเชื่อมต่อเพื่อทดสอบสถานะระบบได้");
      }
    } finally {
      if (isMounted.current) {
        setIsProbing(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the first health check has to run on page load
    probeStatus();

    return () => {
      isMounted.current = false;
    };
  }, [probeStatus]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        probeStatus();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, probeStatus]);

  const overallStatus = health?.overall || "up";
  const isAllUp = overallStatus === "up";
  const isDegraded = overallStatus === "degraded";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0C645B]/20 to-[#0C645B]/5 dark:from-emerald-500/20 dark:to-emerald-500/5 border border-[#0C645B]/20 dark:border-emerald-500/30 flex items-center justify-center text-[#0C645B] dark:text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                System Status
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                มอนิเตอร์ความพร้อมและการเชื่อมต่อของบริการหลักในระบบแบบเรียลไทม์
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`text-xs h-9 gap-1.5 rounded-xl border-zinc-200 dark:border-zinc-800 ${
              autoRefresh
                ? "bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40"
                : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
              }`}
            />
            {autoRefresh ? "Auto-Refresh: เปิด" : "Auto-Refresh: ปิด"}
          </Button>

          <Button
            onClick={() => probeStatus(true)}
            disabled={isProbing}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 gap-2 rounded-xl shadow-sm px-4"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? "animate-spin" : ""}`} />
            {isProbing ? "กำลังทดสอบ..." : "ทดสอบ Ping & Refresh"}
          </Button>
        </div>
      </div>

      {/* ── Overall System Banner ── */}
      <Card
        className={`border overflow-hidden rounded-2xl shadow-sm transition-all duration-300 ${
          isAllUp
            ? "border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/40 dark:via-emerald-950/20 dark:to-zinc-900/30"
            : isDegraded
            ? "border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/40 dark:via-amber-950/20 dark:to-zinc-900/30"
            : "border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent dark:from-rose-950/40 dark:via-rose-950/20 dark:to-zinc-900/30"
        }`}
      >
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  isAllUp
                    ? "bg-emerald-500 text-white shadow-emerald-500/20"
                    : isDegraded
                    ? "bg-amber-500 text-white shadow-amber-500/20"
                    : "bg-rose-500 text-white shadow-rose-500/20"
                }`}
              >
                {isAllUp ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : isDegraded ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {isAllUp
                      ? "ทุกระบบทำงานปกติ (All Systems Operational)"
                      : isDegraded
                      ? "ระบบทำงานได้บางส่วน (Degraded Performance)"
                      : "ตรวจพบระบบขัดข้อง (System Outage Detected)"}
                  </h2>
                  <Badge
                    variant="outline"
                    className={`font-mono text-[0.6875rem] font-bold uppercase tracking-wider ${
                      isAllUp
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : isDegraded
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    {isAllUp ? "ONLINE" : isDegraded ? "DEGRADED" : "OFFLINE"}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {isAllUp
                    ? "ทุกส่วนของระบบทำงานปกติ: ฐานข้อมูล การเชื่อมต่อกับ LINE ระบบประมวลผลแชท และ AI ตอบกลับ"
                    : isDegraded
                    ? "ระบบยังใช้งานได้ แต่มีบางส่วนที่ไม่ปกติ เช่น ปิด AI ไว้ หรือตอบช้ากว่าปกติ"
                    : health?.probeReason || "บอทอาจตอบข้อความไม่ได้ในตอนนี้ เพราะมีบางส่วนของระบบเชื่อมต่อไม่ได้ กรุณาแจ้งผู้ดูแลระบบ IT"}
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-4 sm:gap-6 border-t lg:border-t-0 lg:border-l border-zinc-200/80 dark:border-zinc-800/80 pt-4 lg:pt-0 lg:pl-6 shrink-0">
              <div>
                <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Latency
                </p>
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                  {latency !== null ? `${latency} ms` : "-"}
                </p>
              </div>

              <div>
                <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  บริการที่พร้อมใช้
                </p>
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                  {health
                    ? `${
                        [
                          health.database === "up",
                          health.ngrok === "up",
                          health.n8n === "up",
                          health.aiEnabled !== false,
                        ].filter(Boolean).length
                      } / 4`
                    : "4 / 4"}
                </p>
              </div>

              <div>
                <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  อัปเดตล่าสุด
                </p>
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 font-mono">
                  {lastChecked ? lastChecked.toLocaleTimeString("th-TH") : "กำลังโหลด..."}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 4 Core Service Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Database */}
        <Card className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 rounded-2xl shadow-sm hover:border-[#0C645B]/30 transition-all">
          <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Database
                </CardTitle>
                <p className="text-[0.6875rem] text-zinc-500 dark:text-zinc-400">
                  Supabase PostgreSQL
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-[0.625rem] font-bold px-2 py-0.5 ${
                health?.database === "up"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
              }`}
            >
              {health?.database === "up" ? "ONLINE" : "OFFLINE"}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2 text-xs">
            <p className="text-zinc-600 dark:text-zinc-400">
              จัดเก็บข้อมูลผู้ใช้, สิทธิ์พนักงาน, ประวัติการสนทนา และการตั้งค่าระบบ
            </p>
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[0.6875rem] text-zinc-500">
              <span>สถานะการเชื่อมต่อ:</span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                {health?.database === "up" ? "เชื่อมต่อปกติ" : "ไม่สามารถเข้าถึงได้"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 2. Ngrok Tunnel */}
        <Card className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 rounded-2xl shadow-sm hover:border-[#0C645B]/30 transition-all">
          <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Ngrok Tunnel
                </CardTitle>
                <p className="text-[0.6875rem] text-zinc-500 dark:text-zinc-400">
                  Webhook Ingress
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-[0.625rem] font-bold px-2 py-0.5 ${
                health?.ngrok === "up"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
              }`}
            >
              {health?.ngrok === "up" ? "ONLINE" : "OFFLINE"}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2 text-xs">
            <p className="text-zinc-600 dark:text-zinc-400">
              ช่องทางรับ Webhook สาธารณะจาก LINE Official Account ส่งเข้า Server
            </p>
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[0.6875rem] text-zinc-500">
              <span>สถานะ Tunnel:</span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">
                {health?.ngrok === "up" ? "พร้อมรับ Request" : "Tunnel ปิดอยู่"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 3. n8n Engine */}
        <Card className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 rounded-2xl shadow-sm hover:border-[#0C645B]/30 transition-all">
          <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  n8n Engine
                </CardTitle>
                <p className="text-[0.6875rem] text-zinc-500 dark:text-zinc-400">
                  Workflow Automation
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-[0.625rem] font-bold px-2 py-0.5 ${
                health?.n8n === "up"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
              }`}
            >
              {health?.n8n === "up" ? "ONLINE" : "OFFLINE"}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2 text-xs">
            <p className="text-zinc-600 dark:text-zinc-400">
              ประมวลผลข้อความ, ค้นหา SOP และตัดสินใจในการตอบกลับผู้ใช้
            </p>
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[0.6875rem] text-zinc-500">
              <span>Webhook Probe:</span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                {health?.n8n === "up" ? "ตอบสนองปกติ" : "ไม่ตอบสนอง"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 4. AI Engine */}
        <Card className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 rounded-2xl shadow-sm hover:border-[#0C645B]/30 transition-all">
          <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-[#0C645B] dark:text-emerald-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  AI Assistant
                </CardTitle>
                <p className="text-[0.6875rem] text-zinc-500 dark:text-zinc-400">
                  Google Gemini & RAG
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-[0.625rem] font-bold px-2 py-0.5 ${
                health?.aiEnabled === true
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : health?.aiEnabled === false
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {health?.aiEnabled === true
                ? "ACTIVE"
                : health?.aiEnabled === false
                ? "DISABLED"
                : "UNKNOWN"}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2 text-xs">
            <p className="text-zinc-600 dark:text-zinc-400">
              ระบบวิเคราะห์คำถามและสร้างคำตอบจากเอกสารความรู้โรงแรม
            </p>
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[0.6875rem]">
              <span className="text-zinc-500">ตอบอัตโนมัติ:</span>
              <Link
                href="/dashboard/settings"
                className="font-semibold text-[#0C645B] dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                {health?.aiEnabled === true ? "เปิดใช้งาน" : "ปิดชั่วคราว"}
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Diagnostic Breakdown & History ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Details Table */}
        <Card className="lg:col-span-2 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="p-5 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Service Diagnostics
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                  รายละเอียดการตรวจสอบความพร้อมและข้อความตอบกลับล่าสุดของแต่ละบริการ
                </CardDescription>
              </div>
              <ShieldCheck className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 font-bold">
                    <th className="px-4 py-3 text-left">บริการ</th>
                    <th className="px-4 py-3 text-left">โปรโตคอล</th>
                    <th className="px-4 py-3 text-center">สถานะ</th>
                    <th className="px-4 py-3 text-left">ผลการตรวจสอบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {/* Supabase */}
                  <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-blue-500" />
                      Supabase Cloud DB
                    </td>
                    <td className="px-4 py-3 text-zinc-500 font-mono text-[0.6875rem]">
                      HTTPS / REST
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 font-bold text-[0.625rem] px-2 py-0.5 rounded-full ${
                          health?.database === "up"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            health?.database === "up" ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        {health?.database === "up" ? "Normal" : "Error"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {health?.database === "up"
                        ? "ยืนยันการเชื่อมต่อตารางและการยืนยันตัวตนสำเร็จ"
                        : "ไม่สามารถเข้าถึงฐานข้อมูล Supabase ได้"}
                    </td>
                  </tr>

                  {/* Ngrok */}
                  <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-purple-500" />
                      Ngrok Ingress Tunnel
                    </td>
                    <td className="px-4 py-3 text-zinc-500 font-mono text-[0.6875rem]">
                      HTTPS / TLS
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 font-bold text-[0.625rem] px-2 py-0.5 rounded-full ${
                          health?.ngrok === "up"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            health?.ngrok === "up" ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        {health?.ngrok === "up" ? "Normal" : "Closed"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {health?.probeReason || (health?.ngrok === "up" ? "Tunnel พร้อมรับสายส่งต่อ" : "Tunnel ออฟไลน์")}
                    </td>
                  </tr>

                  {/* n8n */}
                  <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-amber-500" />
                      n8n Webhook Endpoint
                    </td>
                    <td className="px-4 py-3 text-zinc-500 font-mono text-[0.6875rem]">
                      HTTP Webhook
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 font-bold text-[0.625rem] px-2 py-0.5 rounded-full ${
                          health?.n8n === "up"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            health?.n8n === "up" ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        {health?.n8n === "up" ? "Active" : "No Reply"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {health?.n8n === "up"
                        ? "Workflow ตอบกลับ JSON สำหรับข้อความเข้าอย่างถูกต้อง"
                        : "ไม่มีการตอบกลับจาก webhook หรือ workflow ไม่ได้ activate"}
                    </td>
                  </tr>

                  {/* AI Toggle */}
                  <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Bot className="w-3.5 h-3.5 text-emerald-600" />
                      AI Auto-Reply Service
                    </td>
                    <td className="px-4 py-3 text-zinc-500 font-mono text-[0.6875rem]">
                      Google Gemini
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 font-bold text-[0.625rem] px-2 py-0.5 rounded-full ${
                          health?.aiEnabled === true
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            health?.aiEnabled === true ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                        {health?.aiEnabled === true ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {health?.aiEnabled === true
                        ? "บอทเปิดตอบคำถามอัตโนมัติ 24 ชม."
                        : "บอทถูกปิดการตอบชั่วคราวผ่านหน้าการตั้งค่าระบบ"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Ping Activity */}
        <Card className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 rounded-2xl shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                ประวัติการทดสอบล่าสุด
              </h3>
              <span className="text-[0.6875rem] text-zinc-500 dark:text-zinc-400 font-mono">
                {history.length} รายการ
              </span>
            </div>

            <div className="space-y-3 mt-4">
              {history.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-6">
                  กำลังรอผลการทดสอบการเชื่อมต่อ...
                </p>
              ) : (
                history.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          item.overall === "up"
                            ? "bg-emerald-500"
                            : item.overall === "degraded"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                      />
                      <span className="font-mono text-zinc-700 dark:text-zinc-300 font-medium">
                        {item.timestamp.toLocaleTimeString("th-TH")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[0.6875rem]">
                      <span className="text-zinc-500 dark:text-zinc-400">{item.latency} ms</span>
                      <Badge
                        variant="outline"
                        className={`text-[0.5625rem] px-1.5 py-0 ${
                          item.overall === "up"
                            ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                            : item.overall === "degraded"
                            ? "border-amber-500/30 text-amber-700 dark:text-amber-400"
                            : "border-rose-500/30 text-rose-700 dark:text-rose-400"
                        }`}
                      >
                        {item.overall.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Link href="/dashboard/settings">
              <Button
                variant="outline"
                className="w-full text-xs h-9 justify-center gap-2 rounded-xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                ไปที่หน้าตั้งค่าระบบ (Settings)
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* ── Troubleshooting & Tips ── */}
      <Card className="border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-[#0C645B] dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              คำแนะนำเมื่อพบปัญหาระบบขัดข้อง (Troubleshooting Guide)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-600 dark:text-zinc-400 pt-1">
              <div className="p-3 bg-white dark:bg-zinc-900/80 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 space-y-1">
                <p className="font-bold text-zinc-800 dark:text-zinc-200">
                  1. การเชื่อมต่อกับ LINE หลุด (Ngrok Tunnel)
                </p>
                <p>
                  บอทจะไม่ได้รับข้อความจาก LINE แจ้งผู้ดูแลระบบ IT สำหรับผู้ดูแล: ตรวจสอบการรันคำสั่ง <code className="text-[0.6875rem] bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">ngrok http 5678</code> บนเครื่องแม่ข่าย และอัปเดต Webhook URL ใน LINE Developer Console
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-900/80 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 space-y-1">
                <p className="font-bold text-zinc-800 dark:text-zinc-200">
                  2. ระบบประมวลผลแชทไม่ตอบสนอง (n8n)
                </p>
                <p>
                  บอทจะไม่ตอบข้อความ แจ้งผู้ดูแลระบบ IT สำหรับผู้ดูแล: ตรวจดูว่า n8n Container หรือ Service กำลังทำงานอยู่ และเปิดสวิตช์ <b>Active</b> ใน Workflow ตอบแชตเรียบร้อยแล้ว
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-900/80 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80 space-y-1">
                <p className="font-bold text-zinc-800 dark:text-zinc-200">
                  3. บอท AI ปิดการทำงาน
                </p>
                <p>
                  ไปที่หน้า <b>ตั้งค่า AI</b> แล้วเปิดสวิตช์ <b>AI System</b> เพื่อให้บอทกลับมาตอบข้อความตามปกติ
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
