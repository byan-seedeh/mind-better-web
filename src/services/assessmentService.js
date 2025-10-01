// src/services/assessmentService.js
import httpClient from "./httpClient";

//  generic poster (ใช้ร่วมกัน) — export แบบ named
export async function postAssessment(type, data) {
  const payload = {
    type, // 'phq2' | 'phq9' | 'phq8'
    user_id: Number(data.user_id),
    total_score: Number(data.total_score),
    result_text: data.result_text || '',
    recommended_action: data.recommended_action || '',
    answers: Array.isArray(data.answers) ? data.answers.map(v => Number(v)) : undefined,
  };

  console.log("check payload: " , payload)
  const res = await httpClient.post("/api/assessments", payload);
  if (!res.data?.result) {
    throw new Error(res.data?.message || "บันทึกไม่สำเร็จ");
  }
  return res.data; // { result:true, id, message }
}

// ฟังก์ชันส่งแบบประเมินแต่ละชนิด (ยังใช้ postAssessment ข้างบน)
export const save2Q = (data) => postAssessment("phq2", data);
export const save9Q = (data) => postAssessment("phq9", data);
export const save8Q = (data) => postAssessment("phq8", data);

// (ตัวเลือก) ฟังก์ชันเดิมสำหรับ PHQ-9 ที่ยิง endpoint เดิม
export const savePhq9 = async (data) => {
  const payload = {
    user_id: Number(data.user_id),
    total_score: Number(data.total_score),
    result_text: data.result_text || '',
    recommended_action: data.recommended_action || '',
    answers: Array.isArray(data.answers) ? data.answers.map(v => Number(v)) : undefined,
  };
  const res = await httpClient.post("/api/phq9/save", payload);
  if (!res.data?.result) {
    throw new Error(res.data?.message || "บันทึกไม่สำเร็จ");
  }
  return res.data;
};
