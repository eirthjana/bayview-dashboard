import "server-only";

export interface AiModelOption {
  value: string;
  label: string;
}

/**
 * Snapshot used when Google's ListModels call cannot be made (no API key, network
 * down, quota). The dropdown must never render empty — an admin opening Settings
 * during an outage would otherwise be unable to see, let alone keep, the model
 * the bot is currently running on.
 */
export const FALLBACK_MODELS: AiModelOption[] = [
  { value: "models/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "models/gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
  { value: "models/gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite" },
  { value: "models/gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash-Lite Preview" },
  { value: "models/gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite" },
  { value: "models/gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { value: "models/gemini-3.6-flash", label: "Gemini 3.6 Flash" },
];

/**
 * Models Google lists as available but that are not usable for this bot.
 * Only put something here after it has actually failed in use — the whole point
 * of reading ListModels is that a newly released model appears on its own, and
 * every entry here is a model that will stay hidden until someone deletes the
 * line. Re-test occasionally; "high demand" errors are usually temporary.
 */
const KNOWN_UNUSABLE = new Set<string>([
  // repeatedly answered 503 "model is overloaded" when it was selected
  "models/gemini-3.7-flash",
]);

// ListModels returns everything the key can reach, including families that
// cannot answer a RAG chat turn at all: speech synthesis, image generation,
// transcription, robotics and computer-use. Matching on the name keeps new
// members of those families out without needing this list updated again.
const NON_CHAT = /(-tts|-image|transcribe|computer-use|robotics|embedding|aqa|customtools)/i;

interface ListedModel {
  name?: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
}

function toOption(m: ListedModel): AiModelOption {
  const value = m.name || "";
  return { value, label: m.displayName?.trim() || value.replace(/^models\//, "") };
}

/** Sort newest-looking first: higher Gemini version number, then name. */
function byVersionDesc(a: AiModelOption, b: AiModelOption): number {
  const ver = (s: string) => Number((s.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] ?? 0);
  const diff = ver(b.value) - ver(a.value);
  return diff !== 0 ? diff : a.value.localeCompare(b.value);
}

/**
 * Live list of Gemini chat models this API key can actually call, so a model
 * released after this code was written shows up in Settings on its own.
 * Cached for an hour — new models do not appear by the minute, and Settings is
 * rendered on every visit.
 */
export async function fetchAvailableModels(): Promise<AiModelOption[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return FALLBACK_MODELS;

  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
      headers: { "x-goog-api-key": apiKey },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return FALLBACK_MODELS;

    const data: { models?: ListedModel[] } = await res.json();
    const models = (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .filter((m) => (m.name || "").startsWith("models/gemini"))
      // "-latest" points at whatever Google has behind it today, so the bot's
      // model could change with no change on this side. Pin real versions only.
      .filter((m) => !(m.name || "").endsWith("-latest"))
      .filter((m) => !NON_CHAT.test(m.name || ""))
      .filter((m) => !KNOWN_UNUSABLE.has(m.name || ""))
      .map(toOption)
      .sort(byVersionDesc);

    return models.length ? models : FALLBACK_MODELS;
  } catch {
    return FALLBACK_MODELS;
  }
}
