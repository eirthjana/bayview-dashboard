import fs from "node:fs";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";

GlobalFonts.registerFromPath("C:/Windows/Fonts/leelawad.ttf", "Leelawadee");
GlobalFonts.registerFromPath("C:/Windows/Fonts/tahomabd.ttf", "TahomaBold");

const SRC = "C:/Users/User/N8N_Dashboard/SOP/diagram/p1_img_p0_1.png";
const OUT = "C:/Users/User/N8N_Dashboard/SOP/diagram/frog_folding_TH.png";

// erase: the rectangle covering one English caption, measured off the 2x band
// crops. Everything outside these rectangles — bullets, fold lines, arrows, the
// green artwork and the Fumiaki Shingu credit — is left exactly as it was.
const LABELS = [
  { erase: [38, 154, 104, 40],   size: 13, lines: ["พับครึ่งตามแนวตั้ง", "เพื่อทำรอย แล้วคลี่"] },
  { erase: [204, 154, 80, 30],  size: 13, lines: ["พับครึ่งตามแนวนอน"] },
  { erase: [363, 154, 88, 56],  size: 12, lines: ["พับลงมาทำรอย", "แล้วพับกลับ"] },
  { erase: [472, 156, 84, 52],  size: 12, lines: ["พับลงมาทำรอย", "แล้วพับกลับ"] },
  { erase: [138, 318, 84, 38],  size: 12, lines: ["ยุบกระดาษเข้า", "ตามรอยที่ทำไว้"] },
  { erase: [249, 332, 83, 38],  size: 12, lines: ["พับส่วนล่างขึ้น", "ตามเส้นประ"] },
  { erase: [371, 292, 188, 46], size: 13, lines: ["พับด้านข้างทั้งสองข้าง", "เข้าหาแนวกลาง"] },
  { erase: [21, 514, 176, 28],  size: 13, lines: ["พับตามเส้นประ"] },
  { erase: [178, 476, 160, 38], size: 13, lines: ["พับตามเส้นประ", "แล้วพับกลับ"] },
  { erase: [363, 482, 85, 38],  size: 12, lines: ["ดึงมุมด้านใน", "ออกทั้งสองข้าง"] },
  { erase: [27, 666, 170, 38],  size: 13, lines: ["พับตามเส้นประ"] },
  { erase: [178, 626, 86, 38],  size: 12, lines: ["พับตามเส้นประ"] },
  { erase: [308, 626, 82, 38],  size: 12, lines: ["พับตามเส้นประ"] },
  { erase: [230, 734, 66, 24],  size: 13, lines: ["พลิกกลับด้าน"] },
  { erase: [348, 700, 98, 38],  size: 12, lines: ["วาดตา", "แล้วเสร็จสมบูรณ์"] },
  { erase: [96, 696, 90, 70],   size: 12, lines: ["* กดที่ก้นกบ", "แล้วปล่อย", "ให้กระโดด"] },
];

const img = await loadImage(SRC);
const c = createCanvas(img.width, img.height);
const x = c.getContext("2d");
x.drawImage(img, 0, 0);
x.textBaseline = "alphabetic";

// The title box reaches slightly into caption 14, so it goes down first and the
// captions are drawn over it.
x.fillStyle = "#ffffff";
x.fillRect(278, 744, 281, 48);
x.fillStyle = "#000000";
x.font = "30px TahomaBold";
x.fillText("กบกระดาษกระโดด", 288, 784);

for (const l of LABELS) {
  const [ex, ey, ew, eh] = l.erase;
  x.fillStyle = "#ffffff";
  x.fillRect(ex, ey, ew, eh);
  x.fillStyle = "#000000";
  x.font = `${l.size}px Leelawadee`;
  l.lines.forEach((t, i) => x.fillText(t, ex + 1, ey + l.size + 1 + i * (l.size + 4)));
}

fs.writeFileSync(OUT, c.toBuffer("image/png"));
console.log("เขียนแล้ว:", OUT, `${img.width}x${img.height}`);
