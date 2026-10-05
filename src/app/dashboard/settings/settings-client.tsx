"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { requestSystemHealthRefresh } from "@/lib/system-health-events";
import { toast } from "sonner";
import {
  Bot,
  Cpu,
  FileText,
  Save,
  Pencil,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RotateCcw,
} from "lucide-react";

interface AiModelOption {
  value: string;
  label: string;
}

// The models an admin picks on this page. n8n's "Parse System Settings" reads
// each key from system_settings on every message and hands it to these nodes.
const MODEL_SETTINGS = [
  {
    key: "selected_model",
    title: "โมเดลหลัก (RAG AI Agent)",
    detail:
      'ใช้ตอบคำถามผู้ใช้ และเขียนประโยคปิดท้ายชวนคุยต่อ — โหนด "Google Gemini Chat Model3" และ "Gemini (Follow-up)" ใน n8n',
  },
  {
    key: "media_analysis_model",
    title: "โมเดลวิเคราะห์รูป เสียง และวิดีโอ",
    detail: 'อ่านรูป ถอดเสียง และสรุปวิดีโอที่ผู้ใช้ส่งมา — โหนด "Analyze image", "Analyze audio", "Analyze video" ใน n8n',
  },
  {
    key: "media_reply_model",
    title: "โมเดลตอบหลังวิเคราะห์รูป เสียง และวิดีโอ",
    detail: 'เรียบเรียงคำตอบจากผลวิเคราะห์ — โหนด "Google Gemini Chat Model" (AI Agent1-3) ใน n8n',
  },
] as const;
type ModelKey = (typeof MODEL_SETTINGS)[number]["key"];

// Context Window Length of "Simple Memory1": how many past question/answer
// pairs the RAG AI Agent sees. n8n keeps it to the same 1-10.
const MEMORY_WINDOW_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

interface SettingsClientProps {
  initialSettings: {
    ai_enabled: boolean;
    system_prompt: string;
    selected_model: string;
    media_analysis_model: string;
    media_reply_model: string;
    memory_window: number;
    system_message: string;
  };
  /** Live from Google's ListModels — see src/lib/gemini-models.ts */
  models: AiModelOption[];
  /** The real settings could not be loaded; initialSettings are defaults. */
  loadError?: boolean;
}

export function SettingsClient({ initialSettings, models, loadError = false }: SettingsClientProps) {
  const router = useRouter();
  const [aiEnabled, setAiEnabled] = useState(initialSettings.ai_enabled);
  const [savedPrompt, setSavedPrompt] = useState(initialSettings.system_prompt);
  const [systemPrompt, setSystemPrompt] = useState(initialSettings.system_prompt);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const initialModels = {
    selected_model: initialSettings.selected_model,
    media_analysis_model: initialSettings.media_analysis_model,
    media_reply_model: initialSettings.media_reply_model,
  } satisfies Record<ModelKey, string>;
  const [savedModels, setSavedModels] = useState<Record<ModelKey, string>>(initialModels);
  const [modelValues, setModelValues] = useState<Record<ModelKey, string>>(initialModels);
  const [savedMemoryWindow, setSavedMemoryWindow] = useState(initialSettings.memory_window);
  const [memoryWindow, setMemoryWindow] = useState(initialSettings.memory_window);
  const [editingModel, setEditingModel] = useState(false);
  const [confirmModelSaveOpen, setConfirmModelSaveOpen] = useState(false);
  const [savingModel, setSavingModel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [savedSystemMessage, setSavedSystemMessage] = useState(initialSettings.system_message);
  const [systemMessage, setSystemMessage] = useState(initialSettings.system_message);
  const [editingSystemMessage, setEditingSystemMessage] = useState(false);
  const [confirmSystemMessageSaveOpen, setConfirmSystemMessageSaveOpen] = useState(false);
  const [savingSystemMessage, setSavingSystemMessage] = useState(false);

  // A model saved earlier may no longer be listed — Google retires models, and
  // one can also be excluded on our side. Keep it as an option anyway, so the
  // dropdown shows what the bot is actually running on instead of a blank box.
  const modelOptions = useMemo(() => {
    const list = [...models];
    for (const saved of Object.values(savedModels)) {
      if (saved && !list.some((m) => m.value === saved)) {
        list.push({
          value: saved,
          label: `${saved.replace("models/", "")} (ไม่อยู่ในรายการแล้ว)`,
        });
      }
    }
    return list;
  }, [models, savedModels]);

  async function saveSetting(key: string, value: unknown, silent = false) {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("system_settings")
        // Upsert, so a setting added later (the media models) is created on its
        // first save. `value` is a jsonb column — pass the raw value directly so
        // it's stored as its real JSON type (boolean/string), not a JSON-encoded
        // string of itself.
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

      if (error) throw error;
      setLastSaved(new Date());
      if (!silent) toast.success("บันทึกสำเร็จ");
      return true;
    } catch {
      toast.error("บันทึกไม่สำเร็จ กรุณาลองใหม่");
      return false;
    }
  }

  async function logAudit(target: string, details: string) {
    try {
      await fetch("/api/audit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: "update_settings",
          target,
          details,
          status: "success",
        }),
      });
    } catch {
      // best-effort
    }
  }

  async function handleToggleAI(checked: boolean) {
    if (loadError) return;
    setAiEnabled(checked);
    const saved = await saveSetting("ai_enabled", checked);
    // Not saved: the bot is still in the old state, so the switch goes back.
    if (!saved) setAiEnabled(!checked);
    // the header badge reports this same flag — refresh it now instead of
    // leaving it stale until its next poll
    if (saved) {
      requestSystemHealthRefresh();
      void logAudit(
        "AI System (เปิด/ปิดระบบ)",
        `เปลี่ยนสถานะระบบ AI เป็น ${checked ? "ONLINE (เปิดใช้งาน)" : "OFFLINE (ปิดชั่วคราว)"}`
      );
    }
  }

  // AI Model, System Prompt and System Message are read live by n8n on every
  // message, but they can be edited while the AI is on: edits stay on this page
  // until saved, and each save is a single write, so the bot only ever reads
  // the old value or the new one.

  function handleModelChange(key: ModelKey, model: string | null) {
    if (!model) return;
    setModelValues((prev) => ({ ...prev, [key]: model }));
  }

  function handleStartEditModel() {
    if (loadError) return;
    setEditingModel(true);
  }

  function handleCancelEditModel() {
    setModelValues(savedModels);
    setMemoryWindow(savedMemoryWindow);
    setEditingModel(false);
  }

  function handleRequestSaveModel() {
    setConfirmModelSaveOpen(true);
  }

  async function handleConfirmSaveModel() {
    setSavingModel(true);
    // Only the ones that changed; each is its own row in system_settings.
    let ok = true;
    for (const { key } of MODEL_SETTINGS) {
      if (modelValues[key] !== savedModels[key]) ok = (await saveSetting(key, modelValues[key], true)) && ok;
    }
    if (memoryWindow !== savedMemoryWindow) ok = (await saveSetting("memory_window", memoryWindow, true)) && ok;
    setSavingModel(false);
    setConfirmModelSaveOpen(false);
    if (ok) {
      setSavedModels(modelValues);
      setSavedMemoryWindow(memoryWindow);
      setEditingModel(false);
      toast.success("บันทึกการตั้งค่า AI สำเร็จ");
      const modelSummary = MODEL_SETTINGS.map(({ key, title }) => `${title}: ${modelValues[key]?.replace("models/", "") || ""}`).join(", ");
      void logAudit(
        "AI Models & Memory (การตั้งค่า AI)",
        `${modelSummary}, memory_window: ${memoryWindow}`
      );
    }
  }

  function handleStartEditPrompt() {
    if (loadError) return;
    setEditingPrompt(true);
  }

  function handleCancelEditPrompt() {
    setSystemPrompt(savedPrompt);
    setEditingPrompt(false);
  }

  function handleRequestSavePrompt() {
    setConfirmSaveOpen(true);
  }

  async function handleConfirmSavePrompt() {
    setSaving(true);
    const ok = await saveSetting("system_prompt", systemPrompt);
    setSaving(false);
    setConfirmSaveOpen(false);
    if (ok) {
      setSavedPrompt(systemPrompt);
      setEditingPrompt(false);
      void logAudit(
        "System Prompt (Prompt ผู้ใช้)",
        `อัปเดต System Prompt (ความยาว ${systemPrompt.length} ตัวอักษร)`
      );
    }
  }

  function handleStartEditSystemMessage() {
    if (loadError) return;
    setEditingSystemMessage(true);
  }

  function handleCancelEditSystemMessage() {
    setSystemMessage(savedSystemMessage);
    setEditingSystemMessage(false);
  }

  function handleRequestSaveSystemMessage() {
    setConfirmSystemMessageSaveOpen(true);
  }

  async function handleConfirmSaveSystemMessage() {
    setSavingSystemMessage(true);
    const ok = await saveSetting("system_message", systemMessage);
    setSavingSystemMessage(false);
    setConfirmSystemMessageSaveOpen(false);
    if (ok) {
      setSavedSystemMessage(systemMessage);
      setEditingSystemMessage(false);
      void logAudit(
        "System Message (กฎพฤติกรรม AI)",
        `อัปเดต System Message (ความยาว ${systemMessage.length} ตัวอักษร)`
      );
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          ควบคุมระบบ AI และการตั้งค่าต่างๆ
        </p>
      </div>

      {loadError && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              โหลดการตั้งค่าจากฐานข้อมูลไม่สำเร็จ ค่าที่เห็นด้านล่างเป็นค่าเริ่มต้น ไม่ใช่ค่าที่บอทใช้อยู่
              จึงปิดการแก้ไขไว้ก่อนเพื่อไม่ให้บันทึกทับค่าจริง กรุณาโหลดใหม่
            </span>
          </div>
          <Button type="button" onClick={() => router.refresh()} className="shrink-0 gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
            <RotateCcw className="h-4 w-4" />
            โหลดใหม่
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Left column */}
      <div className="space-y-6">
      {/* AI Toggle */}
      <Card className="border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-400" />
                AI System
                <Badge
                  variant="outline"
                  className={
                    aiEnabled
                      ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                      : "border-rose-500/30 text-rose-400 bg-rose-500/10"
                  }
                >
                  {aiEnabled ? "ONLINE" : "OFFLINE"}
                </Badge>
              </CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400 mt-1">
                เปิด-ปิดระบบ AI ตอบกลับอัตโนมัติ
              </CardDescription>
            </div>
            <Switch
              checked={aiEnabled}
              onCheckedChange={handleToggleAI}
              disabled={loadError}
              aria-label="เปิด-ปิดระบบ AI"
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className={`p-3 rounded-lg text-sm flex items-center gap-2.5 ${
            aiEnabled
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
              : "bg-amber-500/10 border border-amber-500/20 text-amber-300"
          }`}>
            {aiEnabled ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>AI กำลังทำงานปกติ — ระบบจะตอบกลับข้อความอัตโนมัติ</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>AI ถูกปิดชั่วคราว — ระบบจะไม่ตอบกลับอัตโนมัติ (ใช้ตอบมือแทน)</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Model Selection */}
      <Card className="border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-violet-400" />
                AI Model
              </CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400 mt-1">
                เลือกโมเดล AI และจำนวนบทสนทนาที่ AI จำได้
              </CardDescription>
            </div>
            {!editingModel && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartEditModel}
                disabled={loadError}
                className="border-zinc-300 dark:border-zinc-700/50 shrink-0 items-center gap-1.5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <Pencil className="w-3.5 h-3.5" />
                แก้ไข
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {MODEL_SETTINGS.map((setting) => (
            <div key={setting.key} className="space-y-3">
              <div className="space-y-3">
                <div>
                  <Label className="text-zinc-700 dark:text-zinc-300">{setting.title}</Label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{setting.detail}</p>
                </div>
                <Select
                  value={modelValues[setting.key]}
                  onValueChange={(model) => handleModelChange(setting.key, model)}
                  disabled={!editingModel}
                >
                  <SelectTrigger className="bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100 h-11">
                    <SelectValue placeholder="เลือกโมเดล">
                      {(value: string) => modelOptions.find((m) => m.value === value)?.label || value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700">
                    {modelOptions.map((model) => (
                      <SelectItem
                        key={model.value}
                        value={model.value}
                        className="text-zinc-800 dark:text-zinc-200 focus:bg-zinc-200 dark:focus:bg-zinc-700 focus:text-zinc-900 dark:focus:text-zinc-100"
                      >
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator className="bg-zinc-100 dark:bg-zinc-800/50" />
            </div>
          ))}

          <div className="space-y-3">
            <div>
              <Label className="text-zinc-700 dark:text-zinc-300">ความจำบทสนทนา (Context Window Length)</Label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                จำนวนคำถาม-คำตอบก่อนหน้าที่ AI เห็นตอนตอบ — โหนด &quot;Simple Memory1&quot; ใน n8n · ยิ่งมาก
                ยิ่งตอบต่อเนื่องจากที่คุยไว้ได้ดี แต่ตอบช้าลงและอาจหยิบเรื่องเก่ามาปน
              </p>
            </div>
            <Select
              value={String(memoryWindow)}
              onValueChange={(value) => value && setMemoryWindow(Number(value))}
              disabled={!editingModel}
            >
              <SelectTrigger className="bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100 h-11">
                <SelectValue placeholder="เลือกจำนวน">
                  {(value: string) => `${value} รอบสนทนา`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700">
                {MEMORY_WINDOW_OPTIONS.map((n) => (
                  <SelectItem
                    key={n}
                    value={String(n)}
                    className="text-zinc-800 dark:text-zinc-200 focus:bg-zinc-200 dark:focus:bg-zinc-700 focus:text-zinc-900 dark:focus:text-zinc-100"
                  >
                    {n} รอบสนทนา{n === 1 ? " (ค่าเดิม)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {editingModel && (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={handleCancelEditModel}
                disabled={savingModel}
                className="text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-500 items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                ยกเลิก
              </Button>
              <Button
                onClick={handleRequestSaveModel}
                disabled={savingModel}
                className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-lg shadow-blue-500/20 items-center gap-2"
              >
                {savingModel ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    บันทึกการตั้งค่า AI
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Prompt Editor */}
      <Card className="border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                System Prompt
              </CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400 mt-1">
                Prompt (User Message) ที่ AI ใช้ในการตอบกลับ — n8n จะดึงค่านี้ไปใช้อัตโนมัติ
              </CardDescription>
            </div>
            {!editingPrompt && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartEditPrompt}
                disabled={loadError}
                className="border-zinc-300 dark:border-zinc-700/50 shrink-0 items-center gap-1.5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <Pencil className="w-3.5 h-3.5" />
                แก้ไข
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            readOnly={!editingPrompt}
            rows={8}
            placeholder="กรอก System Prompt สำหรับ AI..."
            className={`bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 font-mono text-sm resize-y ${
              !editingPrompt ? "opacity-70 cursor-not-allowed" : ""
            }`}
          />

          <div className="flex items-center justify-between">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {systemPrompt.length} ตัวอักษร
              {lastSaved && (
                <span className="ml-3">
                  บันทึกล่าสุด: {lastSaved.toLocaleString("th-TH")}
                </span>
              )}
            </div>

            {editingPrompt && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={handleCancelEditPrompt}
                  disabled={saving}
                  className="text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-500 items-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleRequestSavePrompt}
                  disabled={saving || !systemPrompt.trim()}
                  className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-lg shadow-blue-500/20 items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      บันทึก System Prompt
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Right column */}
      <div className="space-y-6">
      {/* System Message Editor */}
      <Card className="border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-400" />
                System Message
              </CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400 mt-1">
                กฎพฤติกรรมมาตรฐานของ AI (เช่น เมื่อไหร่ต้องใช้เครื่องมือค้นหา, ห้ามเดาคำตอบ) — แยกจาก System Prompt ด้านซ้าย ตรงกับช่อง &quot;System Message&quot; ในโหนด &quot;RAG AI Agent&quot; ของ n8n
              </CardDescription>
            </div>
            {!editingSystemMessage && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartEditSystemMessage}
                disabled={loadError}
                className="border-zinc-300 dark:border-zinc-700/50 shrink-0 items-center gap-1.5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <Pencil className="w-3.5 h-3.5" />
                แก้ไข
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={systemMessage}
            onChange={(e) => setSystemMessage(e.target.value)}
            readOnly={!editingSystemMessage}
            rows={14}
            placeholder="กรอก System Message สำหรับ AI..."
            className={`bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 font-mono text-sm resize-y ${
              !editingSystemMessage ? "opacity-70 cursor-not-allowed" : ""
            }`}
          />

          <div className="flex items-center justify-between">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {systemMessage.length} ตัวอักษร
            </div>

            {editingSystemMessage && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={handleCancelEditSystemMessage}
                  disabled={savingSystemMessage}
                  className="text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-500 items-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleRequestSaveSystemMessage}
                  disabled={savingSystemMessage || !systemMessage.trim()}
                  className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-lg shadow-blue-500/20 items-center gap-2"
                >
                  {savingSystemMessage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      บันทึก System Message
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      </div>
      </div>

      {/* Confirm Save Dialog */}
      <Dialog open={confirmSaveOpen} onOpenChange={(o) => !saving && setConfirmSaveOpen(o)}>
        <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
          <DialogHeader>
            <DialogTitle>ยืนยันการเปลี่ยน System Prompt</DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400">
              แน่ใจนะว่าจะเปลี่ยน System Prompt — บอทจะเริ่มใช้ข้อความนี้ในการตอบกลับทันทีหลังบันทึก
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmSaveOpen(false)}
              disabled={saving}
              className="text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-500"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleConfirmSavePrompt}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {saving ? "กำลังบันทึก..." : "ยืนยัน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Save Model Dialog */}
      <Dialog open={confirmModelSaveOpen} onOpenChange={(o) => !savingModel && setConfirmModelSaveOpen(o)}>
        <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
          <DialogHeader>
            <DialogTitle>ยืนยันการเปลี่ยนการตั้งค่า AI</DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400">
              แน่ใจนะว่าจะเปลี่ยนโมเดลหรือความจำบทสนทนา — บอทจะเริ่มใช้ค่าใหม่ทันทีหลังบันทึก
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmModelSaveOpen(false)}
              disabled={savingModel}
              className="text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-500"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleConfirmSaveModel}
              disabled={savingModel}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {savingModel ? "กำลังบันทึก..." : "ยืนยัน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Save System Message Dialog */}
      <Dialog
        open={confirmSystemMessageSaveOpen}
        onOpenChange={(o) => !savingSystemMessage && setConfirmSystemMessageSaveOpen(o)}
      >
        <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
          <DialogHeader>
            <DialogTitle>ยืนยันการเปลี่ยน System Message</DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400">
              แน่ใจนะว่าจะเปลี่ยน System Message — บอทจะเริ่มใช้กฎนี้ในการตอบกลับทันทีหลังบันทึก
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmSystemMessageSaveOpen(false)}
              disabled={savingSystemMessage}
              className="text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-500"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleConfirmSaveSystemMessage}
              disabled={savingSystemMessage}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {savingSystemMessage ? "กำลังบันทึก..." : "ยืนยัน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
