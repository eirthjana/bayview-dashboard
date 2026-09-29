import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

function pepper(): string {
  const value = process.env.OTP_PEPPER || "";
  if (value.length < 32) throw new Error("OTP_PEPPER must be a random string of at least 32 characters");
  return value;
}

/** Six digits from the OS CSPRNG, zero-padded (000123 is a valid code). */
export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * HMAC-SHA256 keyed with OTP_PEPPER over "empId:code". Only this hash is
 * stored, so a database leak alone can't be turned into working codes, and the
 * emp_id binding stops a code for one employee from matching another's row.
 */
export function hashOtp(empId: number, code: string): string {
  return createHmac("sha256", pepper()).update(`${empId}:${code}`).digest("hex");
}

export function verifyOtp(empId: number, code: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !/^\d{6}$/.test(code)) return false;
  const expected = Buffer.from(storedHash, "hex");
  const actual = Buffer.from(hashOtp(empId, code), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
