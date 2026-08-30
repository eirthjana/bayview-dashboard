// Text extraction, chunking, and embedding helpers for the SOP document
// uploader. Mirrors the shape of the existing n8n "Add file to Vector DB"
// pipeline (same embedding model + dimension) so new uploads stay searchable
// alongside documents ingested via the Google Drive flow.

const EMBEDDING_MODEL = "gemini-embedding-001";
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;

// Private Storage bucket holding the original uploaded files, so admins can
// open/preview a SOP doc straight from the browser instead of only having
// the chunked text used for RAG search.
export const SOP_STORAGE_BUCKET = "sop-documents";

export function sopStoragePath(fileId: string, fileName: string): string {
  return `${fileId}/${fileName}`;
}

export type SupportedFileType = "pdf" | "docx" | "text";

export function detectFileType(fileName: string, mimeType: string): SupportedFileType | null {
  const ext = fileName.toLowerCase().split(".").pop() || "";
  if (mimeType === "application/pdf" || ext === "pdf") return "pdf";
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    return "docx";
  }
  if (mimeType.startsWith("text/") || ext === "txt" || ext === "md") return "text";
  return null;
}

// pdfjs-dist (used internally by pdf-parse) constructs a `DOMMatrix` at module
// load time for its canvas-rendering code paths. That's a browser-only Canvas
// API with no equivalent in Node, so importing pdf-parse server-side throws
// "DOMMatrix is not defined" unless something provides the global first. We
// only ever call getText() (never render a page to canvas), so a no-op stub
// that just avoids crashing on construction is enough — the real matrix math
// in these methods is never exercised by plain text extraction.
function ensureDOMMatrixPolyfill() {
  if (typeof (globalThis as { DOMMatrix?: unknown }).DOMMatrix !== "undefined") return;

  class DOMMatrixPolyfill {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    constructor(init?: number[]) {
      if (Array.isArray(init) && init.length === 6) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init;
      }
    }
    multiplySelf() {
      return this;
    }
    preMultiplySelf() {
      return this;
    }
    translate() {
      return this;
    }
    scale() {
      return this;
    }
    invertSelf() {
      return this;
    }
  }

  (globalThis as { DOMMatrix?: unknown }).DOMMatrix = DOMMatrixPolyfill;
}

export async function extractText(buffer: Buffer, fileType: SupportedFileType): Promise<string> {
  if (fileType === "pdf") {
    ensureDOMMatrixPolyfill();
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return result.text;
  }
  if (fileType === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  return buffer.toString("utf-8");
}

/** Simple recursive-ish splitter: pack paragraphs into ~CHUNK_SIZE chunks with overlap. */
export function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (current && (current.length + para.length + 2) > CHUNK_SIZE) {
      chunks.push(current);
      // carry the tail of the previous chunk forward as overlap context
      current = current.slice(Math.max(0, current.length - CHUNK_OVERLAP));
    }
    current = current ? `${current}\n\n${para}` : para;

    // A single paragraph longer than CHUNK_SIZE: hard-split it.
    while (current.length > CHUNK_SIZE) {
      chunks.push(current.slice(0, CHUNK_SIZE));
      current = current.slice(CHUNK_SIZE - CHUNK_OVERLAP);
    }
  }
  if (current.trim()) chunks.push(current);

  return chunks;
}

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not configured — required to generate embeddings.");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_DOCUMENT",
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini embedding request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const values: number[] | undefined = data?.embedding?.values;
  if (!values || !Array.isArray(values)) {
    throw new Error("Gemini embedding response missing embedding.values");
  }
  return values;
}

/** Deterministic id from the filename so re-uploading the same file replaces its old chunks. */
export function fileIdFromName(fileName: string): string {
  const normalized = fileName.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  return `sop-${hash.toString(16)}`;
}
