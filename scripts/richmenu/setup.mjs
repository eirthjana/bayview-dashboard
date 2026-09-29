// Creates the full rich menu for verified staff through the Messaging API.
//
// The small "not verified" menu is the default menu set in LINE Official
// Account Manager. This script never creates that menu and never sets a
// default menu through the API — an API default would cover the OA Manager one.
// Verified employees get the full menu by a per-user link, which LINE shows
// instead of the default; unlinking drops them back to it.
//
// Run from the dashboard folder:
//   node --env-file=.env.local scripts/richmenu/setup.mjs --dry-run
//       print the menu definition and check the image; calls nothing
//   node --env-file=.env.local scripts/richmenu/setup.mjs
//       validate with LINE, create the menu, upload the image,
//       print the id for RICHMENU_ID_LINKED
//   node --env-file=.env.local scripts/richmenu/setup.mjs --link-existing <richMenuId>
//       give that menu to everyone already linked in EMPLOYEE_TABLE.
//       Run this only once n8n answers the button texts below; otherwise
//       their buttons would do nothing.
//
// Needs LINE_CHANNEL_ACCESS_TOKEN; --link-existing also needs
// NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and EMPLOYEE_TABLE.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IMAGE = path.join(HERE, "bayview_richmenu_full_2500x1686.png");
const WIDTH = 2500;
const HEIGHT = 1686;

// Every button sends a plain text message. n8n's Menu Keyword Router matches
// these texts exactly, so a change here must be made there too.
// Laid out as in the design: 3 columns (833 / 834 / 833) × 2 rows (843).
const COLUMNS = [
  [0, 833],
  [833, 834],
  [1667, 833],
];
const ROW_HEIGHT = 843;
const BUTTONS = [
  // top row
  { label: "เปิด SOP", text: "เปิด SOP" },
  { label: "แจ้งซ่อม", text: "แจ้งซ่อม" },
  { label: "เหตุฉุกเฉิน", text: "เหตุฉุกเฉิน" },
  // bottom row
  { label: "ติดต่อแผนก", text: "ติดต่อแผนก" },
  { label: "โปรไฟล์ของฉัน", text: "โปรไฟล์ของฉัน" },
  { label: "วิธีใช้งาน", text: "วิธีใช้งาน" },
];

const menu = {
  size: { width: WIDTH, height: HEIGHT },
  selected: true,
  name: "Bayview staff menu (verified)",
  chatBarText: "เมนู",
  areas: BUTTONS.map((button, i) => {
    const [x, width] = COLUMNS[i % 3];
    return {
      bounds: { x, y: Math.floor(i / 3) * ROW_HEIGHT, width, height: ROW_HEIGHT },
      action: { type: "message", label: button.label, text: button.text },
    };
  }),
};

function checkImage() {
  if (!fs.existsSync(IMAGE)) throw new Error(`image not found: ${IMAGE}`);
  const png = fs.readFileSync(IMAGE);
  if (png.readUInt32BE(0) !== 0x89504e47) throw new Error("image must be a PNG");
  const [w, h] = [png.readUInt32BE(16), png.readUInt32BE(20)];
  if (w !== WIDTH || h !== HEIGHT) throw new Error(`image is ${w}×${h}, must be ${WIDTH}×${HEIGHT}`);
  if (png.length > 1024 * 1024) throw new Error(`image is ${Math.round(png.length / 1024)} KB, LINE allows 1 MB`);
  return png;
}

function token() {
  const value = (process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();
  if (!value) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
  return value;
}

async function line(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token()}`, ...(init.headers || {}) },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${init.method || "GET"} ${url} → ${res.status} ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : {};
}

async function create() {
  const png = checkImage();
  const json = { "Content-Type": "application/json" };
  await line("https://api.line.me/v2/bot/richmenu/validate", { method: "POST", headers: json, body: JSON.stringify(menu) });
  const { richMenuId } = await line("https://api.line.me/v2/bot/richmenu", {
    method: "POST",
    headers: json,
    body: JSON.stringify(menu),
  });
  await line(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: png,
  });
  console.log("Created the full menu and uploaded its image.");
  console.log("No default menu was set; the OA Manager menu stays the default.");
  console.log(`\nPut this in Vercel env, then redeploy:\nRICHMENU_ID_LINKED=${richMenuId}`);
}

async function linkExisting(richMenuId) {
  if (!/^richmenu-[0-9a-f]{32}$/.test(richMenuId || "")) throw new Error("usage: --link-existing <richMenuId>");
  const table = (process.env.EMPLOYEE_TABLE || "employee_test").trim();
  if (!["employee_test", "employee_registry"].includes(table)) throw new Error(`unexpected EMPLOYEE_TABLE ${table}`);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

  const res = await fetch(
    `${url}/rest/v1/${table}?select=emp_id,line_user_id&status=eq.linked&line_user_id=not.is.null&order=emp_id`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  if (!res.ok) throw new Error(`reading ${table} failed (${res.status})`);
  const rows = await res.json();
  console.log(`${rows.length} linked employee(s) in ${table}`);

  let failed = 0;
  for (const { emp_id, line_user_id } of rows) {
    try {
      await line(`https://api.line.me/v2/bot/user/${encodeURIComponent(line_user_id)}/richmenu/${richMenuId}`, {
        method: "POST",
      });
      console.log(`  ✓ ${emp_id}`);
    } catch (error) {
      failed++;
      console.log(`  ✗ ${emp_id}: ${error.message}`);
    }
  }
  if (failed) process.exitCode = 1;
}

const args = process.argv.slice(2);
if (args[0] === "--dry-run") {
  console.log(JSON.stringify(menu, null, 2));
  try {
    const png = checkImage();
    console.log(`\nimage OK: ${WIDTH}×${HEIGHT}, ${Math.round(png.length / 1024)} KB`);
  } catch (error) {
    console.log(`\nimage: ${error.message}`);
  }
} else if (args[0] === "--link-existing") {
  await linkExisting(args[1]);
} else if (args.length === 0) {
  await create();
} else {
  console.error("usage: setup.mjs [--dry-run | --link-existing <richMenuId>]");
  process.exitCode = 1;
}
