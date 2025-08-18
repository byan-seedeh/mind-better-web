"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthen } from "@/utils/useAuthen";
import { savePhq9 } from "@/services/assessmentService"



const choices = [
  { label: "ไม่เลย", value: 0 },
  { label: "หลายวัน", value: 1 },
  { label: "มากกว่าครึ่งหนึ่งของวัน", value: 2 },
  { label: "แทบทุกวัน", value: 3 },
];

const questions = [
  "รู้สึกไม่สนใจหรือไม่เพลิดเพลินกับการทำสิ่งต่าง ๆ",
  "รู้สึกเศร้า ท้อแท้ หรือหมดหวัง",
  "มีปัญหาเรื่องการนอน (นอนไม่หลับ/หลับยาก/หลับมากไป)",
  "รู้สึกเหนื่อยง่าย หรือไม่มีพลัง",
  "เบื่ออาหาร หรือกินมากเกินไป",
  "รู้สึกไม่ชอบตัวเอง คิดว่าตนล้มเหลว หรือทำให้ตัวเอง/ครอบครัวผิดหวัง",
  "มีปัญหาเรื่องสมาธิ เช่น อ่านหนังสือ/ดูทีวีแล้วไม่ค่อยเข้าใจ",
  "พูดหรือเคลื่อนไหวช้าลงจนคนอื่นสังเกตได้ หรือกระสับกระส่ายอยู่ไม่นิ่ง",
  "คิดทำร้ายตนเอง หรือคิดว่าถ้าตายไปคงจะดีกว่า",
];

// แปลงคะแนนรวม → ระดับภาวะซึมเศร้า (เกณฑ์มาตรฐาน PHQ-9)
function severity(total) {
  if (total <= 4) return "ไม่มีหรือเล็กน้อย (0–4)";
  if (total <= 9) return "เล็กน้อย (5–9)";
  if (total <= 14) return "ปานกลาง (10–14)";
  if (total <= 19) return "ค่อนข้างรุนแรง (15–19)";
  return "รุนแรง (20–27)";
}

function recommendation(total) {
  if (total <= 4)
    return "ดูแลสุขภาพกายใจต่อเนื่อง นอนให้พอ ออกกำลังกาย และประเมินซ้ำเมื่อจำเป็น";
  if (total <= 9)
    return "ปรับพฤติกรรมการนอน-กิน-ออกกำลังกาย พูดคุยกับคนใกล้ชิด/ที่ปรึกษา และประเมินซ้ำใน 2–4 สัปดาห์";
  if (total <= 14)
    return "ควรปรึกษาแพทย์/นักจิตวิทยา อาจพิจารณาจิตบำบัด และติดตามอาการ";
  if (total <= 19)
    return "ควรพบแพทย์โดยเร็วเพื่อประเมินและวางแผนการรักษา พร้อมติดตามใกล้ชิด";
  return "ควรพบแพทย์ทันที หากมีความคิดทำร้ายตนเอง โทร 1323 หรือ 1669/โรงพยาบาลใกล้บ้าน และอยู่กับคนที่ไว้ใจได้";
}

const LS_KEY = "phq9_answers_single";

export default function AssessmentPage() {
  const router = useRouter();
  const { isLoading, authenticated } = useAuthen();

  useEffect(() => {
    if (!isLoading && !authenticated) router.replace("/login");
  }, [isLoading, authenticated, router]);

  const [step, setStep] = useState(0);                 // 0..8
  const [answers, setAnswers] = useState(Array(9).fill(null));
  const [showResult, setShowResult] = useState(false); // ✅ โหมดสรุปผล
  const [saving, setSaving] = useState(false);

  // โหลดคำตอบเดิมกันรีเฟรชแล้วหาย
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === 9) setAnswers(parsed);
      }
    } catch {}
  }, []);

  const choose = (v) => {
    const cp = [...answers];
    cp[step] = v;
    setAnswers(cp);
    try { localStorage.setItem(LS_KEY, JSON.stringify(cp)); } catch {}
  };

  const isLast   = step === questions.length - 1;
  const canNext  = typeof answers[step] === "number";
  const progress = Math.round(((step + 1) / questions.length) * 100);

  const total = useMemo(
    () => answers.reduce((sum, v) => sum + (typeof v === "number" ? v : 0), 0),
    [answers]
  );

  const next = () => {
    if (!canNext) return;
    if (isLast) {
      setShowResult(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setStep((s) => s + 1);
    }
  };

  const prev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const saveAndGoHistory = async () => {
    setSaving(true);
    try {
      const payload = {
        user_id: authenticated?.user_id ?? null,
        total_score: total,
        result_text: severity(total),
        recommended_action: recommendation(total),
        answers,
      };
      await savePhq9(payload)
    } finally {
      setSaving(false);
      try { localStorage.removeItem(LS_KEY); } catch {}
      router.replace("/history");
    }
  };

  if (isLoading || (!authenticated && !isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#D0F8FF]">
        Loading...
      </div>
    );
  }

  // ====== โหมดสรุปผลหลังทำครบ 9 ข้อ ======
  if (showResult) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#D0F8FF] px-4">
        <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow">
          <h2 className="text-center text-2xl font-extrabold text-[#432C81]">
            ผลการประเมิน PHQ-9
          </h2>

          <div className="mt-6 grid gap-4 text-[#432C81]">
            <div className="rounded-xl bg-[#E6F7FF] p-4">
              <div className="text-sm opacity-70">คะแนนรวม</div>
              <div className="text-4xl font-extrabold">{total} / 27</div>
            </div>

            <div className="rounded-xl bg-[#F5F0FF] p-4">
              <div className="text-sm opacity-70">ระดับภาวะซึมเศร้า</div>
              <div className="text-xl font-bold">{severity(total)}</div>
            </div>

            <div className="rounded-xl bg-[#FFF0F0] p-4">
              <div className="text-sm opacity-70">คำแนะนำ</div>
              <p className="leading-relaxed">{recommendation(total)}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => setShowResult(false)}
              className="rounded-lg bg-white px-5 py-2 font-semibold text-[#432C81] ring-1 ring-[#432C81] hover:bg-[#EFEAFE]"
            >
              แก้ไขคำตอบ
            </button>
            <button
              onClick={saveAndGoHistory}
              className="rounded-lg bg-[#432C81] px-5 py-2 font-semibold text-white hover:opacity-90"
              disabled={saving}
            >
              {saving ? "กำลังบันทึก..." : "บันทึกผลและไปหน้า History"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#D0F8FF] px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow">
        {/* Progress */}
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-sm text-[#432C81]">
            <span>ข้อ {step + 1} / {questions.length}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-[#E6F7FF]">
            <div className="h-2 rounded-full bg-[#432C81]" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <h1 className="text-xl font-bold text-[#432C81]">
          ช่วง 2 สัปดาห์ที่ผ่านมา คุณมีอาการดังต่อไปนี้บ่อยแค่ไหน?
        </h1>
        <p className="mt-3 text-lg font-semibold text-[#432C81]">
          {questions[step]}
        </p>

        <div className="mt-6 grid gap-3">
          {choices.map((c) => {
            const selected = answers[step] === c.value;
            return (
              <button
                key={c.value}
                onClick={() => choose(c.value)}
                className={[
                  "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                  selected
                    ? "border-[#432C81] bg-[#EFEAFE] text-[#432C81] font-semibold"
                    : "border-transparent bg-[#F6F7FB] hover:bg-[#EEF4FF] text-[#432C81]",
                ].join(" ")}
              >
                {c.label} ({c.value})
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              if (step > 0) setStep((s) => s - 1);
            }}
            disabled={step === 0}
            className="rounded-lg bg-white px-5 py-2 font-semibold text-[#432C81] ring-1 ring-[#432C81] disabled:opacity-40"
          >
            ย้อนกลับ
          </button>

          <button
            onClick={next}
            disabled={!canNext}
            className="rounded-lg bg-[#432C81] px-6 py-2 font-bold text-white disabled:opacity-40"
          >
            {isLast ? "ดูผลลัพธ์" : "ถัดไป"}
          </button>
        </div>
      </div>
    </div>
  );
}
