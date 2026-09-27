import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;
  const host = (process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const user = (process.env.SMTP_USER || "").trim();
  const rawPass = (process.env.SMTP_PASS || "").trim();
  // Google shows an App Password in four groups ("abcd efgh ijkl mnop"); the
  // spaces are not part of it, and pasting them in makes Gmail refuse the login.
  const pass = /(^|\.)gmail\.com$/i.test(host) ? rawPass.replace(/\s+/g, "") : rawPass;
  if (!host || !user || !pass) throw new Error("SMTP_HOST / SMTP_USER / SMTP_PASS are not configured");
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

export type MailMessage = { to: string; subject: string; text: string; html?: string };

/** Sends through SMTP. Gmail rejects a From that isn't the signed-in account, so SMTP_FROM must match SMTP_USER. */
export async function sendMail(message: MailMessage): Promise<void> {
  const from = (process.env.SMTP_FROM || process.env.SMTP_USER || "").trim();
  await getTransporter().sendMail({ from, ...message });
}
