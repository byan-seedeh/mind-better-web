// src/app/assessment/page.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthen } from "@/utils/useAuthen";
import { postAssessment } from "@/services/assessmentService";

/* ---------- Question Banks ---------- */
const questions2Q = [
  "รู้สึกเศร้า ท้อแท้ หดหู่ หรือรู้สึกไม่มีความหวัง",
  "รู้สึกเบื่อหน่าย ไม่สนใจ หรือไม่มีความสุขกับการทำสิ่งต่าง ๆ",
];
const choices2Q = [
  { label: "ไม่มี", value: 0 },
  { label: "มี", value: 1 },
];

const questions9Q = [
  "เบื่อ ไม่สนใจที่จะทำสิ่งต่างๆ",
  "รู้สึกเศร้า ท้อแท้ หดหู่ หรือรู้สึกไม่มีความหวัง",
  "หลับยาก หลับๆ ตื่นๆ หรือหลับมากไป",
  "รู้สึกเหนื่อยหน่าย หรือไม่มีแรง",
  "เบื่ออาหาร หรือกินมากเกินไป",
  "รู้สึกไม่ดีกับตัวเอง คิดว่าตัวเองล้มเหลว หรือ ครอบครัวผิดหวัง",
  "สมาธิไม่ดีในการทำสิ่งต่างๆ เช่น อ่านหนังสือ หรือดูโทรทัศน์",
  "พูดหรือเคลื่อนไหวช้าจนคนอื่นสังเกตเห็น หรือกระสับกระส่าย กิ่งก้าน จนอยู่ไม่นิ่ง",
  "คิดอยากตาย หรือคิดว่าถ้าตายไปจะดีกว่า หรือ คิดจะทำร้ายตัวเอง",
];
const choices9Q = [
  { label: "ไม่มีเลย", value: 0 },
  { label: "เป็นบางวัน", value: 1 },
  { label: "เป็นบ่อย", value: 2 },
  { label: "เป็นทุกวัน", value: 3 },
];

const questions8Q = [
  "รู้สึกว่าตัวเองเป็นภาระของคนอื่น",
  "รู้สึกว่าชีวิตนี้ไร้ความหมาย",
  "มีความคิดอยากฆ่าตัวตาย",
  "มีความคิดเกี่ยวกับการตายอยู่เสมอ",
  "หากมีโอกาส คิดว่าจะทำร้ายตัวเอง",
  "คิดวิธีการฆ่าตัวตาย",
  "เขียนจดหมายลา หรือจดหมายฆ่าตัวตาย",
  "มีการเตรียมการเพื่อฆ่าตัวตาย",
];
const choices8Q = [
  { label: "ไม่เป็นเลย", value: 0 },
  { label: "เป็นบ้าง", value: 1 },
  { label: "เป็นมาก", value: 2 },
];

/* ---------- Scoring / Recommendation ---------- แก้เป็น  ทำหน้า config มาฃถ้ามมากว่า ก็ไปดึง category สร้างอีกlogic if-else  */
const severity2Q = (t) => (t === 0 ? "ไม่มีภาวะซึมเศร้า" : "มีแนวโน้มเป็นโรคซึมเศร้า");
const recommendation2Q = (t) =>
  t === 0
    ? "คุณไม่มีอาการของภาวะซึมเศร้า ให้คงสภาพสุขภาพจิตที่ดีไว้"
    : "ควรทำแบบประเมิน 9Q เพิ่มเติมเพื่อความละเอียดมากขึ้น";

function severity9Q(t) {
  if (t <= 6) return "ไม่มีภาวะซึมเศร้า (0-6)";
  if (t <= 12) return "มีภาวะซึมเศร้าระดับน้อย (7-12)";
  if (t <= 18) return "มีภาวะซึมเศร้าระดับปานกลาง (13-18)";
  return "มีภาวะซึมเศร้าระดับรุนแรง (19+)";
}
function recommendation9Q(t) {
  if (t <= 6) return "คุณไม่มีอาการของภาวะซึมเศร้า ให้คงสภาพสุขภาพจิตที่ดีไว้";
  if (t <= 12)
    return "ควรปรับเปลี่ยนพฤติกรรม พักผ่อนให้เพียงพอ ออกกำลังกาย และทำกิจกรรมที่สร้างความสุข";
  if (t <= 18) return "ควรพบแพทย์เพื่อรับการประเมินและดูแลรักษา และควรทำแบบประเมิน 8Q";
  return "ควรพบแพทย์โดยด่วนเพื่อรับการประเมินและดูแลรักษา และควรทำแบบประเมิน 8Q";
}

const severity8Q = (t) => (t === 0 ? "ไม่มีความเสี่ยง" : t <= 8 ? "มีความเสี่ยงต่ำ" : "มีความเสี่ยงสูง");
const recommendation8Q = (t) =>
  t === 0
    ? "คุณไม่มีความเสี่ยงในการฆ่าตัวตาย"
    : t <= 8
    ? "ควรติดตามอาการและปรึกษาผู้เชี่ยวชาญ"
    : "ควรพบแพทย์โดยด่วนเพื่อรับการประเมินและดูแลรักษา โทร 1323 สายด่วนสุขภาพจิต";

/* ---------- Config ---------- */
const assessmentConfigs = {
  "2Q": {
    apiType: "phq2",
    title: "แบบคัดกรองโรคซึมเศร้า 2 คำถาม (2Q)",
    description: "ในช่วง 2 สัปดาห์ที่ผ่านมารวมทั้งวันนี้ คุณมีปัญหาเหล่านี้หรือไม่",
    questions: questions2Q,
    choices: choices2Q,
    severity: severity2Q,
    recommendation: recommendation2Q,
    localStorageKey: "2q_answers",
  },
  "9Q": {
    apiType: "phq9",
    title: "แบบประเมินโรคซึมเศร้า 9 คำถาม (9Q)",
    description: "ในช่วง 2 สัปดาห์ที่ผ่านมารวมทั้งวันนี้ คุณมีอาการเหล่านี้บ่อยแค่ไหน",
    questions: questions9Q,
    choices: choices9Q,
    severity: severity9Q,
    recommendation: recommendation9Q,
    localStorageKey: "9q_answers",
  },
  "8Q": {
    apiType: "phq8",
    title: "แบบประเมินการฆ่าตัวตาย 8 คำถาม (8Q)",
    description: "ในช่วง 1 สัปดาห์ที่ผ่านมารวมทั้งวันนี้ คุณเป็นอย่างไร",
    questions: questions8Q,
    choices: choices8Q,
    severity: severity8Q,
    recommendation: recommendation8Q,
    localStorageKey: "8q_answers",
  },
};

export default function AssessmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading, authenticated } = useAuthen();

  const [assessmentType, setAssessmentType] = useState("2Q");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);

  useEffect(() => {
    if (!isLoading && !authenticated) router.replace("/login");
  }, [isLoading, authenticated, router]);

  // init type + answers
  useEffect(() => {
    const type = searchParams.get("type") || "2Q";
    if (!assessmentConfigs[type]) return;

    setAssessmentType(type);
    const cfg = assessmentConfigs[type];
    setAnswers(Array(cfg.questions.length).fill(null));
    setStep(0);
    setShowResult(false);
    setSavedId(null);

    try {
      const saved = localStorage.getItem(cfg.localStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === cfg.questions.length) {
          setAnswers(parsed);
        }
      }
    } catch { /* ignore */ }
  }, [searchParams]);

  const cfg = assessmentConfigs[assessmentType];

  const choose = (value) => {
    const next = [...answers];
    next[step] = value;
    setAnswers(next);
    try {
      localStorage.setItem(cfg.localStorageKey, JSON.stringify(next));
    } catch { /* ignore */ }
  };

  const isLast = step === cfg.questions.length - 1;
  const canNext = typeof answers[step] === "number";
  const progress = Math.round(((step + 1) / cfg.questions.length) * 100);

  const total = useMemo(
    () => answers.reduce((sum, v) => sum + (typeof v === "number" ? v : 0), 0),
    [answers]
  );

  const saveCurrentIfNeeded = async () => {
    if (savedId || saving) return savedId; // ป้องกันกดซ้ำ/ยิงซ้ำ
    if (!authenticated?.user_id) {
      alert("กรุณาเข้าสู่ระบบก่อนบันทึกผล");
      router.replace("/login");
      return null;
    }
    try {
      setSaving(true);
      const payload = {
        user_id: Number(authenticated.user_id),
        total_score: Number(total),
        result_text: cfg.severity(total),
        recommended_action: cfg.recommendation(total),
        answers: answers.map((v) => Number(v)),
      };
      const res = await postAssessment(cfg.apiType, payload);
      if (!res?.result) throw new Error(res?.message || "บันทึกไม่สำเร็จ");
      setSavedId(res.id);
      try { localStorage.removeItem(cfg.localStorageKey); } catch { /* ignore */ }
      return res.id;
    } catch (err) {
      console.error("Save failed:", err);
      alert(`บันทึกไม่สำเร็จ: ${err.message || err}`);
      return null;
    } finally {
      setSaving(false);
    }
  };

  // เมื่อกด "ถัดไป" ถ้าเป็นข้อสุดท้าย → บันทึกก่อน แล้วค่อยโชว์ผล
  const handleNext = async () => {
    if (!canNext) return;
    if (isLast) {
      const id = await saveCurrentIfNeeded();
      if (!id) return; // save ไม่ผ่าน ไม่โชว์ผล
      setShowResult(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setStep((s) => s + 1);
    }
  };

  const prev = () => step > 0 && setStep((s) => s - 1);

  const saveAndGoHistory = async () => {
    const id = savedId || (await saveCurrentIfNeeded());
    if (!id) return;
    router.replace("/history");
  };

  if (isLoading || (!authenticated && !isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#D0F8FF]">
        <div className="text-xl text-[#432C81]">Loading...</div>
      </div>
    );
  }

  if (!cfg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#D0F8FF]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#432C81] mb-4">ไม่พบแบบประเมินที่ระบุ</h1>
          <button
            onClick={() => router.push("/")}
            className="bg-[#432C81] text-white px-6 py-2 rounded-lg hover:opacity-90"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  const maxChoice = Math.max(...cfg.choices.map((c) => c.value));
  const maxScore = cfg.questions.length * maxChoice;

  // Result view
  if (showResult) {
    const resultLevel = cfg.severity(total);
    const resultRecommendation = cfg.recommendation(total);

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#D0F8FF] px-4">
        <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow">
          <h2 className="text-center text-2xl font-extrabold text-[#432C81]">
            ผลการประเมิน {assessmentType}
          </h2>
          <p className="text-center text-[#432C81] mt-2 opacity-70">{cfg.title}</p>

          <div className="mt-6 grid gap-4 text-[#432C81]">
            <div className="rounded-xl bg-[#E6F7FF] p-4">
              <div className="text-sm opacity-70">คะแนนรวม</div>
              <div className="text-4xl font-extrabold">
                {total} / {maxScore}
              </div>
            </div>

            <div className="rounded-xl bg-[#F5F0FF] p-4">
              <div className="text-sm opacity-70">ผลการประเมิน</div>
              <div className="text-xl font-bold">{resultLevel}</div>
            </div>

            <div className="rounded-xl bg-[#FFF0F0] p-4">
              <div className="text-sm opacity-70">คำแนะนำ</div>
              <p className="leading-relaxed">{resultRecommendation}</p>
            </div>
          </div>

          {/* Suggest next assessment */}
          {assessmentType === "2Q" && total > 0 && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
              <p className="text-yellow-800 text-center mb-3 font-semibold">
                แนะนำให้ทำแบบประเมิน 9Q เพิ่มเติม
              </p>
              <div className="text-center">
                <button
                  onClick={() => router.push("/assessment?type=9Q")}
                  className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 font-semibold"
                >
                  ทำแบบประเมิน 9Q
                </button>
              </div>
            </div>
          )}

          {assessmentType === "9Q" && total >= 13 && (
            <div className="mt-6 bg-orange-50 border border-orange-200 p-4 rounded-xl">
              <p className="text-orange-800 text-center mb-3 font-semibold">
                แนะนำให้ทำแบบประเมิน 8Q เพิ่มเติม
              </p>
              <div className="text-center">
                <button
                  onClick={() => router.push("/assessment?type=8Q")}
                  className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 font-semibold"
                >
                  ทำแบบประเมิน 8Q
                </button>
              </div>
            </div>
          )}

          {/* Emergency */}
          {((assessmentType === "8Q" && total >= 9) ||
            (assessmentType === "9Q" && total >= 19)) && (
            <div className="mt-6 bg-red-50 border border-red-200 p-4 rounded-xl">
              <h3 className="font-bold text-red-800 mb-2">หมายเลขติดต่อฉุกเฉิน</h3>
              <div className="text-red-700 space-y-1">
                <p>📞 สายด่วนสุขภาพจิต: <strong>1323</strong></p>
                <p>📞 สายด่วนป้องกันการฆ่าตัวตาย: <strong>1389</strong></p>
                <p>📞 แพทย์ฉุกเฉิน: <strong>1669</strong></p>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => { setShowResult(false); setSavedId(null); }}
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

  // Do assessment view
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#D0F8FF] px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow">
        {/* Header */}
        <div className="mb-4 flex justify-between items-center">
          <button onClick={() => router.push("/")} className="text-[#432C81] hover:opacity-70">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-[#432C81]">{assessmentType}</h2>
          <div className="w-6" />
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="mb-1 flex items-center justify-between text-sm text-[#432C81]">
            <span>ข้อ {step + 1} / {cfg.questions.length}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-[#E6F7FF]">
            <div className="h-2 rounded-full bg-[#432C81] transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <h1 className="text-lg font-bold text-[#432C81] mb-2">{cfg.title}</h1>
        <p className="text-sm text-[#432C81] opacity-70 mb-6">{cfg.description}</p>

        <p className="text-lg font-semibold text-[#432C81] mb-6">{cfg.questions[step]}</p>

        <div className="grid gap-3 mb-8">
          {cfg.choices.map((choice) => {
            const selected = answers[step] === choice.value;
            return (
              <button
                key={choice.value}
                onClick={() => choose(choice.value)}
                className={[
                  "w-full rounded-xl border px-4 py-3 text-left transition-all duration-200",
                  selected
                    ? "border-[#432C81] bg-[#EFEAFE] text-[#432C81] font-semibold"
                    : "border-transparent bg-[#F6F7FB] hover:bg-[#EEF4FF] text-[#432C81]",
                ].join(" ")}
              >
                <div className="flex items-center">
                  <div className={`w-4 h-4 border-2 rounded-full mr-3 ${selected ? "border-[#432C81] bg-[#432C81]" : "border-gray-300"}`}>
                    {selected && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />}
                  </div>
                  <span>{choice.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={prev}
            disabled={step === 0}
            className="rounded-lg bg-white px-5 py-2 font-semibold text-[#432C81] ring-1 ring-[#432C81] disabled:opacity-40 hover:bg-[#EFEAFE]"
          >
            ย้อนกลับ
          </button>

          <button
            onClick={handleNext}
            disabled={!canNext || (isLast && saving)}
            className="rounded-lg bg-[#432C81] px-6 py-2 font-bold text-white disabled:opacity-40 hover:opacity-90"
          >
            {isLast ? (saving ? "กำลังบันทึก..." : "ดูผลลัพธ์") : "ถัดไป"}
          </button>
        </div>
      </div>
    </div>
  );
}
