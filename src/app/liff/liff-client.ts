"use client";

import { useEffect, useState } from "react";
import type { Liff } from "@line/liff";

export type LiffState =
  | { status: "loading" }
  | { status: "ready"; liff: Liff }
  | { status: "error"; message: string };

// liff.init must run once per page load; React may run effects twice in dev.
let initOnce: { liffId: string; promise: Promise<Liff> } | null = null;

function initLiff(liffId: string): Promise<Liff> {
  if (initOnce?.liffId !== liffId) {
    const promise = import("@line/liff").then(async ({ default: liff }) => {
      await liff.init({ liffId });
      return liff;
    });
    initOnce = { liffId, promise };
  }
  return initOnce.promise;
}

/**
 * Starts LIFF for this page. Inside the LINE app the user is already signed in;
 * in an outside browser (e.g. LINE on PC) this sends them through LINE Login
 * and back, so "ready" always means an ID token is available.
 */
export function useLiff(liffId: string | undefined): LiffState {
  const [state, setState] = useState<LiffState>(() =>
    liffId
      ? { status: "loading" }
      : { status: "error", message: "หน้านี้ยังไม่ได้ตั้งค่า LIFF ID กรุณาแจ้งผู้ดูแลระบบ" }
  );

  useEffect(() => {
    if (!liffId) return;
    let cancelled = false;
    initLiff(liffId)
      .then((liff) => {
        if (cancelled) return;
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }
        setState({ status: "ready", liff });
      })
      .catch((error) => {
        console.error("LIFF init failed:", error);
        if (!cancelled) {
          setState({
            status: "error",
            message: "เปิดหน้านี้ผ่าน LINE ไม่สำเร็จ กรุณาปิดแล้วเปิดใหม่จากเมนูในห้องแชท",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [liffId]);

  return state;
}

/** Thrown when the page is reloading to sign in to LINE again; callers just wait. */
export class SigningInAgain extends Error {}

const REAUTH_KEY = "bayview-liff-reauth-at";

// An ID token expires if the page sits open for a long time. Signing out and
// reloading makes LIFF fetch a fresh one. If the server still refuses a token
// right after that, it is a setup problem rather than an expiry, so stop
// instead of reloading forever.
function signInAgain(liff: Liff): never {
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(REAUTH_KEY) || 0);
    sessionStorage.setItem(REAUTH_KEY, String(Date.now()));
  } catch {
    // Storage blocked: still try once.
  }
  if (Date.now() - last < 60_000) {
    throw new Error("ยืนยันบัญชี LINE ไม่สำเร็จ กรุณาปิดหน้านี้แล้วเปิดใหม่จากเมนูในห้องแชท");
  }
  liff.logout();
  window.location.reload();
  throw new SigningInAgain();
}

/**
 * Calls one of our /api/liff routes with the current ID token. The token is
 * read fresh for every call; the server only trusts the LINE account inside it.
 */
export async function callLiffApi<T>(
  liff: Liff,
  path: string,
  body: Record<string, unknown> = {},
  method: "POST" | "PATCH" = "POST"
): Promise<{ status: number; data: T }> {
  const idToken = liff.getIDToken();
  if (!idToken) signInAgain(liff);

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, idToken }),
      cache: "no-store",
    });
  } catch {
    throw new Error("เชื่อมต่อระบบไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่");
  }
  if (res.status === 401) signInAgain(liff);

  const data = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, data };
}

/** Closes the LIFF window. Outside the LINE app there is nothing to close, so it returns false. */
export function closeLiff(liff: Liff): boolean {
  if (!liff.isInClient()) return false;
  liff.closeWindow();
  return true;
}

export const GENERIC_ERROR = "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง";

export function errorText(error: unknown): string | null {
  if (error instanceof SigningInAgain) return null;
  return error instanceof Error && error.message ? error.message : GENERIC_ERROR;
}
