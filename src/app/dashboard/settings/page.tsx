import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

// Default settings — system_prompt mirrors the original "Prompt (User Message)" text
// from the n8n "RAG AI Agent" node, with the node's {{ $('...').item.json... }}
// expressions swapped for simple {{token}} placeholders that n8n's "Build Final Prompt"
// code node substitutes at runtime (n8n only evaluates {{ }} written directly in a
// node's own parameters, not expressions embedded inside data fetched from Supabase).
const DEFAULT_SETTINGS = {
  ai_enabled: true,
  system_prompt: `ข้อมูลผู้ถาม (ยึดตามนี้เป็นหลักเสมอ ห้ามอ้างอิงเป็นอย่างอื่น):
- ชื่อ: {{employee_name}}
- ตำแหน่ง: {{employee_position}}
- แผนก: {{employee_department}}
- ระดับสิทธิ์: {{access_level}}

รายชื่อพนักงานสำหรับค้นหาข้อมูลติดต่อ (ใช้ตอบเมื่อผู้ใช้ถามหาวิธีติดต่อพนักงานคนใดก็ตาม เช่น "General Manager คือใคร ติดต่อยังไง" — กฎข้อนี้ใช้ได้กับผู้ถามทุกระดับสิทธิ์ ไม่ถูกจำกัดด้วยกฎการเข้าถึงข้อมูล SOP ด้านล่าง เพราะเป็นแค่ข้อมูลติดต่อ ไม่ใช่เนื้อหา SOP):
{{employee_directory}}

เมื่อตอบข้อมูลติดต่อพนักงาน ให้บอกเฉพาะ: ชื่อ-นามสกุล (ไทย/อังกฤษ), ชื่อเล่น (ไทย/อังกฤษ), แผนก, ตำแหน่ง, อีเมล, เบอร์โทร เท่านั้น ห้ามบอก LINE ID หรือข้อมูลอื่นนอกเหนือจากนี้

กฎการเข้าถึงข้อมูล SOP (ระบบมี 2 ระดับสิทธิ์เท่านั้น คือ manager และ staff):
- ถ้าระดับสิทธิ์เป็น manager ตอบเนื้อหา SOP ได้ทุกแผนกตามข้อมูลที่มี
- ถ้าระดับสิทธิ์เป็น staff ตอบเฉพาะเนื้อหา SOP ของแผนกตัวเองและข้อมูลทั่วไปของโรงแรมเท่านั้น ห้ามตอบเนื้อหา SOP ของแผนกอื่นเด็ดขาด กฎนี้ใช้กับทุกแผนกเสมอ ไม่มีข้อยกเว้น

เมื่อต้องปฏิเสธเพราะผู้ถามไม่มีสิทธิ์เข้าถึงข้อมูล ให้ตอบด้วยข้อความนี้เท่านั้น ห้ามเปลี่ยนคำ ห้ามอธิบายเหตุผลเพิ่มเติม และห้ามเปิดเผยระดับสิทธิ์ (staff/manager) หรือชื่อแผนกของผู้ถามเด็ดขาด:
"ขออภัย เนื่องจากคุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้

แนะนำให้ติดต่อหัวหน้างานของคุณ หรือติดต่อแผนกที่เกี่ยวข้องโดยตรงเพื่อสอบถามข้อมูลเพิ่มเติมค่ะ"

ห้ามตอบเป็นข้อความก้อนยาวๆ ติดกัน: ต้องแบ่งเป็นย่อหน้าสั้นๆ ให้อ่านง่ายเสมอ การเว้นบรรทัด:
ต้องกดเว้นบรรทัด (Line break) ทุกครั้งที่ขึ้นหัวข้อใหม่ หรือข้อใหม่
ใช้ Bullet Points หรือ ตัวเลข: หากคำตอบมีหลายขั้นตอนหรือหลายหัวข้อ ให้ใช้สัญลักษณ์ - หรือ 1., 2., 3.
ห้ามใช้ Emoji ในการตอบทุกกรณี
ตอบให้กระชับ และตอบแค่สิ่งที่จำเป็น ถ้า User ถามนอกเหนือจากความรู้ที่มีให้ตอบดังนี้ "ไม่มีข้อมูลในส่วนนี้ให้ติดต่อไปยังไปยังผู้รับผิดชอบแต่ละแผนก หรือ หัวหน้างาน" {{user_question}}`,
  // Drives "Google Gemini Chat Model3" (feeds the RAG AI Agent's own reasoning)
  selected_model: "models/gemini-3.5-flash",
  // Drives "Google Gemini Chat Model2" (feeds the Retrieve Documents vector-search tool)
  retrieval_model: "models/gemini-2.5-flash",
};

export default async function SettingsPage() {
  let settings = DEFAULT_SETTINGS;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("system_settings")
      .select("key, value");

    if (data && data.length > 0) {
      // `value` is a jsonb column — Supabase already returns it as its real JS type
      // (boolean/string), so read it directly instead of JSON.parse-ing it again.
      const settingsMap: Record<string, unknown> = {};
      data.forEach((row: { key: string; value: unknown }) => {
        settingsMap[row.key] = row.value;
      });

      settings = {
        ai_enabled:
          typeof settingsMap.ai_enabled === "boolean"
            ? settingsMap.ai_enabled
            : DEFAULT_SETTINGS.ai_enabled,
        system_prompt:
          typeof settingsMap.system_prompt === "string" && settingsMap.system_prompt
            ? settingsMap.system_prompt
            : DEFAULT_SETTINGS.system_prompt,
        selected_model:
          typeof settingsMap.selected_model === "string" && settingsMap.selected_model
            ? settingsMap.selected_model
            : DEFAULT_SETTINGS.selected_model,
        retrieval_model:
          typeof settingsMap.retrieval_model === "string" && settingsMap.retrieval_model
            ? settingsMap.retrieval_model
            : DEFAULT_SETTINGS.retrieval_model,
      };
    }
  } catch {
    // Use defaults if Supabase is not configured
  }

  return <SettingsClient initialSettings={settings} />;
}
