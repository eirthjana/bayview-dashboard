import type { ButtonHTMLAttributes, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";

// Small building blocks shared by the LIFF pages. In this app's theme "blue" is
// the Bayview lagoon teal and "zinc" the driftwood browns (see globals.css).

export function LiffShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pb-10 pt-6">
      <header className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/bayview-mark.png"
          alt="The Bayview Pattaya"
          className="h-12 w-12 shrink-0 rounded-xl shadow-sm"
        />
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700">The Bayview Pattaya</p>
          <h1 className="text-xl font-semibold leading-tight text-zinc-900">{title}</h1>
        </div>
      </header>
      {children}
    </main>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#EAE3D6] bg-white p-5 shadow-[0_1px_2px_rgba(39,33,28,0.06)]">
      {children}
    </section>
  );
}

export function StepLabel({ children }: { children: ReactNode }) {
  return <p className="mb-1 text-xs font-semibold text-blue-700">{children}</p>;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean };

/** Also used on links that should look like the main button. */
export const primaryButtonClass =
  "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-base font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:bg-[#D6CEC0] disabled:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FBF7F0]";

export function PrimaryButton({ busy, disabled, children, className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || busy}
      className={`${primaryButtonClass} ${className}`}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function TextButton({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`min-h-11 rounded-md px-2 py-2 text-sm font-medium text-blue-700 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-zinc-500 disabled:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FBF7F0] ${className}`}
    >
      {children}
    </button>
  );
}

const NOTICE_STYLE = {
  info: { box: "border-blue-200 bg-blue-50 text-blue-900", Icon: Info },
  error: { box: "border-red-200 bg-red-50 text-red-800", Icon: AlertCircle },
  success: { box: "border-blue-200 bg-blue-50 text-blue-900", Icon: CheckCircle2 },
} as const;

export function Notice({ tone, children }: { tone: keyof typeof NOTICE_STYLE; children: ReactNode }) {
  const { box, Icon } = NOTICE_STYLE[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-2 rounded-xl border px-3 py-2.5 text-sm leading-relaxed ${box}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function LoadingCard({ text = "กำลังโหลด…" }: { text?: string }) {
  return (
    <Card>
      <div className="flex items-center justify-center gap-3 py-6 text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" aria-hidden />
        <span>{text}</span>
      </div>
    </Card>
  );
}

/** retry: false for errors a reload cannot fix (e.g. the page is not set up). */
export function ErrorCard({ message, retry = true }: { message: string; retry?: boolean }) {
  return (
    <Card>
      <div className="flex flex-col gap-4">
        <Notice tone="error">{message}</Notice>
        {retry && (
          <PrimaryButton type="button" onClick={() => window.location.reload()}>
            ลองใหม่
          </PrimaryButton>
        )}
      </div>
    </Card>
  );
}

export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#F1ECE2] py-3 last:border-b-0">
      <dt className="shrink-0 text-sm text-zinc-500">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium text-zinc-900 break-words">{children}</dd>
    </div>
  );
}

export const inputClass =
  "h-12 w-full rounded-xl border border-[#DDD4C4] bg-white px-4 text-base text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200";
