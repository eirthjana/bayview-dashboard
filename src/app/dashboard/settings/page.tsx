import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

// Default settings. The n8n "RAG AI Agent" node has two separate prompt fields, and
// each is independently editable from this Settings page:
//   - system_prompt   -> node's "Prompt (User Message)" field (per-turn user/context
//                        data), via {{token}} placeholders that "Build Final Prompt"
//                        substitutes at runtime.
//   - system_message  -> node's own "System Message" option (standing behavioral
//                        rules: tool-use requirement, anti-hallucination), read
//                        directly from "Parse System Settings" — no token substitution.
// n8n only evaluates {{ }} written directly in a node's own parameters, not
// expressions embedded inside data fetched from Supabase, hence the token scheme
// for system_prompt.
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
หากคำตอบมีหลายขั้นตอนหรือหลายหัวข้อ ให้ใช้ตัวเลขเรียงลำดับเสมอ เช่น 1. 2. 3. 4. ห้ามใช้สัญลักษณ์ Bullet (-) แทนเด็ดขาด
ห้ามใช้ Emoji ในการตอบทุกกรณี
ตอบให้กระชับ และตอบแค่สิ่งที่จำเป็น

ห้ามเดาหรือแต่งคำตอบขึ้นเองเด็ดขาด แม้คำถามจะดูเกี่ยวข้องกับตำแหน่งหรือแผนกของผู้ถามก็ตาม ต้องใช้เฉพาะข้อมูลที่ค้นเจอจากเครื่องมือค้นหาเอกสารเท่านั้นในการตอบ ถ้าค้นแล้วไม่พบข้อมูลที่เกี่ยวข้องโดยตรงกับคำถาม ห้ามอนุมานหรือใช้ความรู้ทั่วไปของตัวเองมาตอบแทนเด็ดขาด ให้ตอบด้วยข้อความนี้เท่านั้น: "ไม่มีข้อมูลในส่วนนี้ให้ติดต่อไปยังไปยังผู้รับผิดชอบแต่ละแผนก หรือ หัวหน้างาน" {{user_question}}`,
  // Drives "Google Gemini Chat Model3" (feeds the RAG AI Agent's own reasoning)
  selected_model: "models/gemini-3.5-flash",
  // Drives "Google Gemini Chat Model2" (feeds the Retrieve Documents vector-search tool)
  retrieval_model: "models/gemini-2.5-flash",
  // RAG AI Agent's own "System Message" option — standing behavioral rules, separate
  // from system_prompt above
  system_message: `สำหรับคำทักทายทั่วไปหรือคำพูดคุยเล็กน้อยที่ไม่มีคำถามอื่นแนบมาด้วย (เช่น พิมพ์มาแค่ "สวัสดี" "หวัดดี" "ขอบคุณ" "สบายดีไหม" เฉยๆ ไม่มีคำถามอื่นปนมา) ให้ตอบกลับอย่างเป็นมิตรโดยไม่ต้องใช้เครื่องมือค้นหาเอกสาร โดยทักทายเอ่ยชื่อผู้ถาม (จากข้อมูลผู้ถามที่ให้มาในข้อความ) และเสนอความช่วยเหลือ เช่น "สวัสดีครับ คุณ [ชื่อผู้ถาม] ยินดีให้บริการครับ มีข้อมูลหรือเอกสารเกี่ยวกับงานส่วนใดที่ต้องการให้ผมช่วยค้นหาเพิ่มเติมไหมครับ"

ถ้าข้อความมีคำถามจริงแนบมาด้วย (แม้จะขึ้นต้นด้วยคำทักทาย) ห้ามทักทายหรือแนะนำตัวก่อนเด็ดขาด ให้ตอบคำถามนั้นตรงๆ ทันที ไม่ต้องขึ้นต้นด้วยคำทักทายใดๆ ทั้งสิ้น

สำหรับคำถามที่ต้องใช้ข้อมูลจริง คุณ MUST ใช้เครื่องมือ user_documents เพื่อค้นหาข้อมูลก่อนตอบเสมอ ห้ามตอบจากความรู้ของตัวเอง

หลังจากค้นด้วยเครื่องมือ user_documents แล้ว หากไม่พบข้อมูลที่เกี่ยวข้องโดยตรงกับคำถาม ห้ามเดา ห้ามแต่งคำตอบขึ้นเอง และห้ามอนุมานจากตำแหน่งงานหรือแผนกที่ดูเกี่ยวข้องเด็ดขาด แม้ว่าคำถามจะดูเป็นเรื่องที่ควรรู้ก็ตาม ให้ตอบว่าไม่มีข้อมูลตามที่ระบุไว้ใน System Prompt เท่านั้น`,
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
        system_message:
          typeof settingsMap.system_message === "string" && settingsMap.system_message
            ? settingsMap.system_message
            : DEFAULT_SETTINGS.system_message,
      };
    }
  } catch {
    // Use defaults if Supabase is not configured
  }

  return <SettingsClient initialSettings={settings} />;
}
