"use client";

import { useState } from "react";
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
} from "lucide-react";

interface SettingsClientProps {
  initialSettings: {
    ai_enabled: boolean;
    system_prompt: string;
    selected_model: string;
    retrieval_model: string;
  };
}

// Curated from the live ListModels result for this project's API key —
// deliberately narrowed to the Gemini 2.5 generation only. Newer 3.x releases
// and the "-latest" aliases (which can silently point at a 3.x model) were
// excluded because they've repeatedly hit Google 503 "high demand" errors in
// this workflow; 2.5 is established and is the same generation already used
// successfully by the audio/image/video analysis nodes in this n8n instance.
const AI_MODELS = [
  { value: "models/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite" },
  { value: "models/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "models/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
];

export function SettingsClient({ initialSettings }: SettingsClientProps) {
  const [aiEnabled, setAiEnabled] = useState(initialSettings.ai_enabled);
  const [savedPrompt, setSavedPrompt] = useState(initialSettings.system_prompt);
  const [systemPrompt, setSystemPrompt] = useState(initialSettings.system_prompt);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(initialSettings.selected_model);
  const [retrievalModel, setRetrievalModel] = useState(initialSettings.retrieval_model);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  async function saveSetting(key: string, value: unknown) {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("system_settings")
        // `value` is a jsonb column — pass the raw value directly so it's stored
        // as its real JSON type (boolean/string), not a JSON-encoded string of itself.
        .update({
          value,
          updated_at: new Date().toISOString(),
        })
        .eq("key", key);

      if (error) throw error;
      setLastSaved(new Date());
      toast.success("บันทึกสำเร็จ");
      return true;
    } catch {
      toast.error("บันทึกไม่สำเร็จ กรุณาลองใหม่");
      return false;
    }
  }

  async function handleToggleAI(checked: boolean) {
    setAiEnabled(checked);
    await saveSetting("ai_enabled", checked);
  }

  async function handleModelChange(model: string | null) {
    if (!model) return;
    setSelectedModel(model);
    await saveSetting("selected_model", model);
  }

  async function handleRetrievalModelChange(model: string | null) {
    if (!model) return;
    setRetrievalModel(model);
    await saveSetting("retrieval_model", model);
  }

  function handleStartEditPrompt() {
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
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          ควบคุมระบบ AI และการตั้งค่าต่างๆ
        </p>
      </div>

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
          <CardTitle className="text-lg text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-violet-400" />
            AI Model
          </CardTitle>
          <CardDescription className="text-zinc-500 dark:text-zinc-400">
            เลือกโมเดล AI ที่ต้องการใช้งาน
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Label className="text-zinc-700 dark:text-zinc-300">โมเดลหลัก (RAG AI Agent)</Label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                ใช้คิดและตอบคำถามผู้ใช้ — โหนด &quot;Google Gemini Chat Model3&quot; ใน n8n
              </p>
            </div>
            <Select value={selectedModel} onValueChange={handleModelChange}>
              <SelectTrigger className="bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100 h-11">
                <SelectValue placeholder="เลือกโมเดล">
                  {(value: string) => AI_MODELS.find((m) => m.value === value)?.label || value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700">
                {AI_MODELS.map((model) => (
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

          <div className="space-y-3">
            <div>
              <Label className="text-zinc-700 dark:text-zinc-300">โมเดลค้นหาเอกสาร (Retrieve Documents)</Label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                ใช้ค้นข้อมูลจากฐานเอกสารก่อนตอบ — โหนด &quot;Google Gemini Chat Model2&quot; ใน n8n
              </p>
            </div>
            <Select value={retrievalModel} onValueChange={handleRetrievalModelChange}>
              <SelectTrigger className="bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100 h-11">
                <SelectValue placeholder="เลือกโมเดล">
                  {(value: string) => AI_MODELS.find((m) => m.value === value)?.label || value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700">
                {AI_MODELS.map((model) => (
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
        </CardContent>
      </Card>

      <Separator className="bg-zinc-100 dark:bg-zinc-800/50" />

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
                className="border-zinc-300 dark:border-zinc-700/50 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 shrink-0 items-center gap-1.5"
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
            rows={14}
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
                  className="text-zinc-500 dark:text-zinc-400 items-center gap-1.5"
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
              className="text-zinc-500 dark:text-zinc-400"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleConfirmSavePrompt}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {saving ? "กำลังบันทึก..." : "ยืนยัน บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
