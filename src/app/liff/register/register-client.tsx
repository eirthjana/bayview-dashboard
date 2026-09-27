"use client";

import { useEffect, useState } from "react";
import type { Liff } from "@line/liff";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { callLiffApi, closeLiff, errorText, GENERIC_ERROR, useLiff } from "../liff-client";
import {
  Card,
  ErrorCard,
  InfoRow,
  inputClass,
  LiffShell,
  LoadingCard,
  Notice,
  PrimaryButton,
  StepLabel,
  TextButton,
} from "../ui";

const TITLE = "ยืนยันตัวตนพนักงาน";
const RESEND_SECONDS = 60;

type Employee = {
  name: string;
  name_th: string | null;
  department: string | null;
  position: string | null;
};

type View =
  | { step: "checking" }
  | { step: "linked"; employee: Employee | null }
  | { step: "empId" }
  | { step: "otp" }
  | { step: "done"; employee: Employee };

type ApiResult = Partial<Employee> & {
  status?: string;
  message?: string;
  error?: string;
  retryAfter?: number;
  attemptsLeft?: number;
  profile?: Employee;
};

export function RegisterClient({ liffId }: { liffId: string | undefined }) {
  const liffState = useLiff(liffId);
  if (liffState.status === "ready") return <RegisterFlow liff={liffState.liff} />;
  return (
    <LiffShell title={TITLE}>
      {liffState.status === "loading" ? (
        <LoadingCard text="กำลังเชื่อมต่อ LINE…" />
      ) : (
        <ErrorCard message={liffState.message} />
      )}
    </LiffShell>
  );
}

function RegisterFlow({ liff }: { liff: Liff }) {
  const [view, setView] = useState<View>({ step: "checking" });
  const [fatal, setFatal] = useState<string | null>(null);
  const [empId, setEmpId] = useState("");
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Already verified? Then there is nothing to fill in.
  useEffect(() => {
    let cancelled = false;
    callLiffApi<ApiResult>(liff, "/api/liff/me")
      .then(({ status, data }) => {
        if (cancelled) return;
        if (status === 200 && data.profile) setView({ step: "linked", employee: data.profile });
        else if (status === 404) setView({ step: "empId" });
        else setFatal(data.error || GENERIC_ERROR);
      })
      .catch((e) => {
        const message = errorText(e);
        if (!cancelled && message) setFatal(message);
      });
    return () => {
      cancelled = true;
    };
  }, [liff]);

  // "Request a new code" stays disabled for a minute, matching the server's limit.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function requestCode() {
    setBusy(true);
    setError(null);
    try {
      const { status, data } = await callLiffApi<ApiResult>(liff, "/api/liff/otp/request", { empId });
      if (status === 200 && data.status === "already_linked") {
        setView({ step: "linked", employee: null });
      } else if (status === 200) {
        setNotice(data.message || null);
        setCode("");
        setCooldown(RESEND_SECONDS);
        setView({ step: "otp" });
      } else if (status === 429) {
        setCooldown(data.retryAfter ?? RESEND_SECONDS);
        setError(data.error || "ขอรหัสบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่");
      } else {
        setError(data.error || GENERIC_ERROR);
      }
    } catch (e) {
      const message = errorText(e);
      if (message) setError(message);
    } finally {
      setBusy(false);
    }
  }

  function backToStart(message: string) {
    setCode("");
    setNotice(null);
    setError(message);
    setView({ step: "empId" });
  }

  async function verifyCode() {
    setBusy(true);
    setError(null);
    try {
      const { data } = await callLiffApi<ApiResult>(liff, "/api/liff/otp/verify", { code });
      switch (data.status) {
        case "linked":
          setView({
            step: "done",
            employee: {
              name: data.name ?? "",
              name_th: data.name_th ?? null,
              department: data.department ?? null,
              position: data.position ?? null,
            },
          });
          break;
        case "already_linked":
          setView({ step: "linked", employee: null });
          break;
        case "invalid":
          setCode("");
          setError(`รหัสไม่ถูกต้อง ลองได้อีก ${data.attemptsLeft ?? 0} ครั้ง`);
          break;
        case "expired":
          backToStart("รหัสหมดอายุแล้ว กรุณาขอรหัสใหม่");
          break;
        case "locked":
          backToStart("ใส่รหัสผิดครบ 5 ครั้งแล้ว รหัสนี้ใช้ไม่ได้อีก กรุณาขอรหัสใหม่");
          break;
        case "no_pending":
          backToStart("ไม่พบรหัสที่รอยืนยันของบัญชีนี้ กรุณาขอรหัสใหม่");
          break;
        default:
          setError(data.error || GENERIC_ERROR);
      }
    } catch (e) {
      const message = errorText(e);
      if (message) setError(message);
    } finally {
      setBusy(false);
    }
  }

  if (fatal) {
    return (
      <LiffShell title={TITLE}>
        <ErrorCard message={fatal} />
      </LiffShell>
    );
  }

  return (
    <LiffShell title={TITLE}>
      {view.step === "checking" && <LoadingCard text="กำลังตรวจสอบบัญชี…" />}

      {view.step === "empId" && (
        <Card>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (empId && cooldown <= 0 && !busy) requestCode();
            }}
          >
            <div>
              <StepLabel>ขั้นที่ 1 จาก 2</StepLabel>
              <h2 className="text-lg font-semibold">กรอกรหัสพนักงาน</h2>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                ระบบจะส่งรหัสยืนยัน 6 หลักไปที่อีเมลบริษัทของคุณที่บันทึกไว้ในระบบ
              </p>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">รหัสพนักงาน</span>
              <input
                value={empId}
                onChange={(e) => setEmpId(e.target.value.replace(/\D/g, "").slice(0, 9))}
                inputMode="numeric"
                autoComplete="off"
                placeholder="เช่น 1001"
                className={inputClass}
              />
            </label>
            {error && <Notice tone="error">{error}</Notice>}
            <PrimaryButton type="submit" busy={busy} disabled={!empId || cooldown > 0}>
              {cooldown > 0 ? `ขอรหัสได้อีกครั้งใน ${cooldown} วินาที` : "ส่งรหัสทางอีเมล"}
            </PrimaryButton>
            <TextButton
              className="self-center"
              onClick={() => {
                setError(null);
                setView({ step: "otp" });
              }}
            >
              มีรหัส 6 หลักจากอีเมลแล้ว
            </TextButton>
          </form>
        </Card>
      )}

      {view.step === "otp" && (
        <Card>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length === 6 && !busy) verifyCode();
            }}
          >
            <div>
              <StepLabel>ขั้นที่ 2 จาก 2</StepLabel>
              <h2 className="text-lg font-semibold">กรอกรหัสยืนยัน</h2>
            </div>
            {notice && <Notice tone="info">{notice}</Notice>}
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">รหัส 6 หลักจากอีเมล</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                className={`${inputClass} text-center text-2xl font-semibold tracking-[0.4em] placeholder:tracking-[0.4em]`}
              />
            </label>
            {error && <Notice tone="error">{error}</Notice>}
            <PrimaryButton type="submit" busy={busy} disabled={code.length !== 6}>
              ยืนยัน
            </PrimaryButton>
            <div className="flex flex-col items-center">
              {empId && (
                <TextButton disabled={cooldown > 0 || busy} onClick={requestCode}>
                  {cooldown > 0 ? `ขอรหัสใหม่ได้ใน ${cooldown} วินาที` : "ขอรหัสใหม่"}
                </TextButton>
              )}
              <TextButton
                onClick={() => {
                  setError(null);
                  setNotice(null);
                  setView({ step: "empId" });
                }}
              >
                เปลี่ยนรหัสพนักงาน
              </TextButton>
            </div>
          </form>
        </Card>
      )}

      {view.step === "done" && (
        <ResultCard
          liff={liff}
          icon={<CheckCircle2 className="h-12 w-12 text-blue-600" aria-hidden />}
          title="ยืนยันตัวตนสำเร็จ"
          subtitle="บัญชี LINE นี้ผูกกับข้อมูลพนักงานของคุณแล้ว"
          employee={view.employee}
          footnote="เมนูด้านล่างห้องแชทจะเปลี่ยนเป็นเมนูสำหรับพนักงาน ถ้ายังไม่เปลี่ยน ลองออกจากห้องแชทแล้วเข้าใหม่"
        />
      )}

      {view.step === "linked" && (
        <ResultCard
          liff={liff}
          icon={<ShieldCheck className="h-12 w-12 text-blue-600" aria-hidden />}
          title="บัญชีนี้ยืนยันตัวตนแล้ว"
          subtitle="ไม่ต้องทำอะไรเพิ่ม ใช้งานบอทในห้องแชทได้เลย"
          employee={view.employee}
        />
      )}
    </LiffShell>
  );
}

function ResultCard({
  liff,
  icon,
  title,
  subtitle,
  employee,
  footnote,
}: {
  liff: Liff;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  employee: Employee | null;
  footnote?: string;
}) {
  const [closeHint, setCloseHint] = useState(false);
  return (
    <Card>
      <div className="flex flex-col items-center gap-2 pb-2 text-center">
        {icon}
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-zinc-500">{subtitle}</p>
      </div>
      {employee && (
        <dl className="mt-2">
          <InfoRow label="ชื่อ">
            {employee.name_th || employee.name}
            {employee.name_th && employee.name && (
              <span className="block text-xs font-normal text-zinc-500">{employee.name}</span>
            )}
          </InfoRow>
          <InfoRow label="แผนก">{employee.department || "-"}</InfoRow>
          <InfoRow label="ตำแหน่ง">{employee.position || "-"}</InfoRow>
        </dl>
      )}
      {footnote && <p className="mt-4 text-sm leading-relaxed text-zinc-500">{footnote}</p>}
      <div className="mt-5 flex flex-col gap-2">
        <PrimaryButton type="button" onClick={() => setCloseHint(!closeLiff(liff))}>
          ปิดหน้านี้
        </PrimaryButton>
        {closeHint && <p className="text-center text-sm text-zinc-500">ปิดแท็บนี้แล้วกลับไปที่ LINE ได้เลย</p>}
      </div>
    </Card>
  );
}
