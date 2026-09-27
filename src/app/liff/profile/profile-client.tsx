"use client";

import { useEffect, useState } from "react";
import type { Liff } from "@line/liff";
import { Pencil, UserRound } from "lucide-react";
import { callLiffApi, errorText, GENERIC_ERROR, useLiff } from "../liff-client";
import {
  Card,
  ErrorCard,
  InfoRow,
  inputClass,
  LiffShell,
  LoadingCard,
  Notice,
  PrimaryButton,
  primaryButtonClass,
  TextButton,
} from "../ui";

const TITLE = "โปรไฟล์ของฉัน";

type Profile = {
  emp_id: number;
  name: string;
  name_th: string | null;
  nickname: string | null;
  nickname_th: string | null;
  department: string | null;
  position: string | null;
  phone_number: string | null;
  line_picture_url: string | null;
};

type MeResult = { status?: string; error?: string; profile?: Profile };

export function ProfileClient({ liffId, registerUrl }: { liffId: string | undefined; registerUrl: string }) {
  const liffState = useLiff(liffId);
  if (liffState.status === "ready") return <ProfileView liff={liffState.liff} registerUrl={registerUrl} />;
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

function ProfileView({ liff, registerUrl }: { liff: Liff; registerUrl: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notLinked, setNotLinked] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    callLiffApi<MeResult>(liff, "/api/liff/me")
      .then(({ status, data }) => {
        if (cancelled) return;
        if (status === 200 && data.profile) setProfile(data.profile);
        else if (status === 404) setNotLinked(true);
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

  return (
    <LiffShell title={TITLE}>
      {fatal ? (
        <ErrorCard message={fatal} />
      ) : notLinked ? (
        <Card>
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold">ยังไม่ได้ยืนยันตัวตนพนักงาน</h2>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                ยืนยันตัวตนด้วยรหัสพนักงานและอีเมลบริษัทก่อน จึงจะดูโปรไฟล์และถามบอทได้
              </p>
            </div>
            <a href={registerUrl} className={primaryButtonClass}>
              ไปยืนยันตัวตนพนักงาน
            </a>
          </div>
        </Card>
      ) : profile ? (
        <ProfileCard liff={liff} profile={profile} onChange={setProfile} onNotLinked={() => setNotLinked(true)} />
      ) : (
        <LoadingCard />
      )}
    </LiffShell>
  );
}

function ProfileCard({
  liff,
  profile,
  onChange,
  onNotLinked,
}: {
  liff: Liff;
  profile: Profile;
  onChange: (profile: Profile) => void;
  onNotLinked: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Rows linked by the old chat flow have no stored picture; the ID token's
  // picture is the same LINE profile image.
  const picture = profile.line_picture_url || liff.getDecodedIDToken()?.picture || null;
  const displayName = profile.name_th || profile.name;
  const nickname = [profile.nickname_th, profile.nickname].filter(Boolean).join(" · ");

  async function savePhone() {
    setSaving(true);
    setError(null);
    try {
      const { status, data } = await callLiffApi<MeResult>(liff, "/api/liff/me", { phone_number: phone }, "PATCH");
      if (status === 200 && data.profile) {
        onChange(data.profile);
        setEditing(false);
        setSaved(true);
      } else if (status === 404) {
        onNotLinked();
      } else {
        setError(data.error || GENERIC_ERROR);
      }
    } catch (e) {
      const message = errorText(e);
      if (message) setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-col items-center gap-3 pb-3 text-center">
        {picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={picture}
            alt=""
            className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md ring-1 ring-[#EAE3D6]"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-100">
            <UserRound className="h-10 w-10" aria-hidden />
          </div>
        )}
        <div>
          <h2 className="text-xl font-semibold leading-snug">{displayName}</h2>
          {profile.name_th && profile.name && <p className="text-sm text-zinc-500">{profile.name}</p>}
          {nickname && (
            <p className="mt-2 inline-block rounded-full bg-[#F4EFE6] px-3 py-0.5 text-sm text-zinc-700">
              ชื่อเล่น {nickname}
            </p>
          )}
        </div>
      </div>

      <dl className="border-t border-[#F1ECE2]">
        <InfoRow label="รหัสพนักงาน">{profile.emp_id}</InfoRow>
        <InfoRow label="แผนก">{profile.department || "-"}</InfoRow>
        <InfoRow label="ตำแหน่ง">{profile.position || "-"}</InfoRow>
        {!editing && (
          <InfoRow label="เบอร์โทร">
            <span className="inline-flex items-center gap-2">
              {profile.phone_number || <span className="font-normal text-zinc-400">ยังไม่ได้ใส่</span>}
              <button
                type="button"
                onClick={() => {
                  setPhone(profile.phone_number || "");
                  setError(null);
                  setSaved(false);
                  setEditing(true);
                }}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                แก้ไข
              </button>
            </span>
          </InfoRow>
        )}
      </dl>

      {editing && (
        <form
          className="mt-3 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!saving) savePhone();
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">เบอร์โทร</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d\s-]/g, "").slice(0, 14))}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="เช่น 0812345678"
              className={inputClass}
            />
          </label>
          {error && <Notice tone="error">{error}</Notice>}
          <PrimaryButton type="submit" busy={saving} disabled={!phone.trim()}>
            บันทึกเบอร์โทร
          </PrimaryButton>
          <TextButton className="self-center" disabled={saving} onClick={() => setEditing(false)}>
            ยกเลิก
          </TextButton>
        </form>
      )}

      {saved && !editing && (
        <div className="mt-3">
          <Notice tone="success">บันทึกเบอร์โทรแล้ว</Notice>
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-zinc-500">
        แผนกและตำแหน่งแก้ไขได้โดยฝ่าย HR เท่านั้น ถ้าข้อมูลไม่ถูกต้อง กรุณาติดต่อ HR
      </p>
    </Card>
  );
}
