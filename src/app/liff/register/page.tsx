import type { Metadata } from "next";
import { RegisterClient } from "./register-client";

export const metadata: Metadata = {
  title: { absolute: "ยืนยันตัวตนพนักงาน" },
  robots: { index: false, follow: false },
};

export default function LiffRegisterPage() {
  return <RegisterClient liffId={process.env.NEXT_PUBLIC_LIFF_ID_REGISTER} />;
}
