import "server-only";
import { OTP_TTL_MINUTES } from "@/lib/otp";
import type { MailMessage } from "@/lib/mailer";
import type { OtpEmail } from "@/lib/liff/registration";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** The code stays out of the subject so it doesn't show on a locked phone's notification. */
export function otpEmailMessage({ to, name, code }: OtpEmail): MailMessage {
  const subject = "รหัสยืนยันตัวตนพนักงาน The Bayview Pattaya";
  const text = [
    `เรียน คุณ${name}`,
    "",
    "รหัสยืนยันตัวตนสำหรับผูกบัญชี LINE กับระบบพนักงานของคุณคือ",
    "",
    `    ${code}`,
    "",
    `รหัสนี้ใช้ได้ภายใน ${OTP_TTL_MINUTES} นาที`,
    "ถ้าไม่ได้ทำรายการนี้ กรุณาเพิกเฉยและแจ้งแอดมิน",
    "",
    "The Bayview Pattaya",
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1f2937;line-height:1.6">
<p>เรียน คุณ${escapeHtml(name)}</p>
<p>รหัสยืนยันตัวตนสำหรับผูกบัญชี LINE กับระบบพนักงานของคุณคือ</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0f766e;margin:16px 0">${code}</p>
<p>รหัสนี้ใช้ได้ภายใน ${OTP_TTL_MINUTES} นาที</p>
<p>ถ้าไม่ได้ทำรายการนี้ กรุณาเพิกเฉยและแจ้งแอดมิน</p>
<p style="color:#6b7280">The Bayview Pattaya</p>
</div>`;
  return { to, subject, text, html };
}
