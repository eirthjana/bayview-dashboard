import fs from "node:fs";
import path from "node:path";

// Mirrors src/lib/documents.ts exactly — same chunk sizes, same taskType, same
// metadata shape and the same file_id hash — so these rows are indistinguishable
// from ones the dashboard uploader would have written, and a later re-upload
// through the UI replaces them cleanly.
const EMBEDDING_MODEL = "gemini-embedding-001";
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;

const SRC = "C:/Users/User/N8N_Dashboard/SOP/วิเคราะห์แล้ว/14 กย";

const env = fs.readFileSync(".env.local", "utf8");
const pick = (k) => (env.match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1]?.trim();
const URL = pick("NEXT_PUBLIC_SUPABASE_URL");
const SRK = pick("SUPABASE_SERVICE_ROLE_KEY");
const GK = pick("GOOGLE_API_KEY");
const H = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };

function fileIdFromName(fileName) {
  const normalized = fileName.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  return `sop-${hash.toString(16)}`;
}

function chunkText(text) {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let current = "";
  for (const para of paragraphs) {
    if (current && current.length + para.length + 2 > CHUNK_SIZE) {
      chunks.push(current);
      current = current.slice(Math.max(0, current.length - CHUNK_OVERLAP));
    }
    current = current ? `${current}\n\n${para}` : para;
    while (current.length > CHUNK_SIZE) {
      chunks.push(current.slice(0, CHUNK_SIZE));
      current = current.slice(CHUNK_SIZE - CHUNK_OVERLAP);
    }
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}

async function embed(text) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GK}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: { parts: [{ text }] }, taskType: "RETRIEVAL_DOCUMENT" }),
      }
    );
    if (res.ok) return (await res.json()).embedding.values;
    const transient = res.status === 429 || res.status >= 500;
    if (!transient || attempt === 5) throw new Error(`embed ${res.status}: ${(await res.text()).slice(0, 200)}`);
    await new Promise((r) => setTimeout(r, 2000 * 2 ** (attempt - 1)));
  }
}

const files = fs.readdirSync(SRC).filter((f) => f.endsWith(".md")).sort();
console.log(`พบไฟล์ ${files.length} ไฟล์ใน ${SRC}\n`);

let grandTotal = 0;
for (const name of files) {
  const fileId = fileIdFromName(name);
  const text = fs.readFileSync(path.join(SRC, name), "utf8");
  const chunks = chunkText(text);

  // replace, exactly as the upload route does
  const del = await fetch(`${URL}/rest/v1/documents1?metadata->>file_id=eq.${fileId}`, {
    method: "DELETE",
    headers: { ...H, Prefer: "count=exact" },
  });
  const removed = (del.headers.get("content-range") || "").split("/")[1] ?? "?";

  process.stdout.write(`${name.padEnd(38)} ${fileId}  ลบเดิม ${String(removed).padStart(3)}  ชิ้นใหม่ ${String(chunks.length).padStart(3)}  `);

  const now = new Date().toISOString();
  const rows = [];
  for (let i = 0; i < chunks.length; i++) {
    rows.push({
      title: name,
      content: chunks[i],
      embedding: await embed(chunks[i]),
      metadata: { file_id: fileId, title: name, chunk_index: i },
      created_at: now,
      updated_at: now,
    });
    process.stdout.write(".");
  }

  const ins = await fetch(`${URL}/rest/v1/documents1`, {
    method: "POST",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!ins.ok) {
    console.log(`\n  เขียนไม่สำเร็จ ${ins.status}: ${(await ins.text()).slice(0, 300)}`);
    process.exit(1);
  }
  console.log(" เขียนแล้ว");
  grandTotal += chunks.length;
}

console.log(`\nรวม ${grandTotal} chunk`);
