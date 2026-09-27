import type { Metadata } from "next";
import { ProfileClient } from "./profile-client";

export const metadata: Metadata = {
  title: "โปรไฟล์ของฉัน",
  robots: { index: false, follow: false },
};

export default function LiffProfilePage() {
  const registerLiffId = process.env.NEXT_PUBLIC_LIFF_ID_REGISTER;
  return (
    <ProfileClient
      liffId={process.env.NEXT_PUBLIC_LIFF_ID_PROFILE}
      registerUrl={registerLiffId ? `https://liff.line.me/${registerLiffId}` : "/liff/register"}
    />
  );
}
