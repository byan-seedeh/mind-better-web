"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthen } from "@/utils/useAuthen";
import { getPhq9History } from "@/services/historyService"

export default function HistoryPage() {
  const router = useRouter();
  const { isLoading, authenticated } = useAuthen();

  const [items, setItems] = useState([]);   // [{ total_score, result_text, recommended_action, created_at, answers }, ...]
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // โหลดประวัติหลังล็อกอินแล้ว
  useEffect(() => {
    if (isLoading) return;
    if (!authenticated) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      setLoading(true);
      setErr("");
      try {
        // ✳️ ปรับ endpoint ให้ตรงกับ backend ของคุณ ถ้าต้องการส่ง token ให้ใส่ใน header
        // const res = await fetch(`/api/phq9/history?user_id=${encodeURIComponent(authenticated.user_id)}`);
        const res = await getPhq9History(authenticated.user_id);
        if (!res.result) throw new Error(`HTTP ${res.status}`);
        const data = Array.isArray(res?.data) ? res.data : [];
        // เรียงใหม่: ล่าสุดอยู่บนสุด
        data.sort((a, b) => new Date(b.created_at || b.createdAt || b.date || 0) - new Date(a.created_at || a.createdAt || a.date || 0));
        setItems(data);
      } catch (e) {
        setErr("ไม่สามารถดึงประวัติการทำแบบประเมินได้");
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isLoading, authenticated, router]);

  // สรุปสถิติเล็กๆ
  const summary = useMemo(() => {
    if (!items.length) return { count: 0, avg: 0, last: null };
    const count = items.length;
    const sum = items.reduce((s, it) => s + (Number(it.total_score) || 0), 0);
    const avg = +(sum / count).toFixed(1);
    const last = items[0] || null;
    return { count, avg, last };
  }, [items]);

  const badgeColor = (score) => {
    if (score <= 4) return "bg-green-100 text-green-700";
    if (score <= 9) return "bg-lime-100 text-lime-700";
    if (score <= 14) return "bg-yellow-100 text-yellow-800";
    if (score <= 19) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-700";
  };

  if (isLoading || (!authenticated && !isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#D0F8FF]">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#D0F8FF] px-4 py-8">
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-[#432C81]">ประวัติการทำแบบประเมิน PHQ‑9</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/assessment")}
              className="rounded-lg bg-[#432C81] px-4 py-2 text-white hover:opacity-90"
            >
              เริ่มประเมินอีกครั้ง
            </button>
            <button
              onClick={() => router.push("/home")}
              className="rounded-lg bg-white px-4 py-2 text-[#432C81] ring-1 ring-[#432C81] hover:bg-[#EFEAFE]"
            >
              กลับหน้า Home
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-[#E6F7FF] p-4">
            <div className="text-sm text-[#432C81]/70">จำนวนครั้งทั้งหมด</div>
            <div className="text-3xl font-extrabold text-[#432C81]">{summary.count}</div>
          </div>
          <div className="rounded-xl bg-[#F5F0FF] p-4">
            <div className="text-sm text-[#432C81]/70">ค่าเฉลี่ยคะแนน</div>
            <div className="text-3xl font-extrabold text-[#432C81]">{summary.avg}</div>
          </div>
          <div className="rounded-xl bg-[#FFF0F0] p-4">
            <div className="text-sm text-[#432C81]/70">คะแนนครั้งล่าสุด</div>
            <div className="text-3xl font-extrabold text-[#432C81]">
              {summary.last ? summary.last.total_score : "-"}
            </div>
          </div>
        </div>

        {/* Error */}
        {err && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        {/* List */}
        <div className="mt-6">
          {loading ? (
            <div className="text-center text-[#432C81]">กำลังโหลด...</div>
          ) : items.length === 0 ? (
            <div className="text-center text-[#432C81]">ยังไม่มีประวัติการทำแบบประเมิน</div>
          ) : (
            <div className="grid gap-3">
              {items.map((it, idx) => {
                const created = new Date(it.created_at || it.createdAt || it.date || Date.now());
                const score = Number(it.total_score) || 0;
                const sevText = it.result_text || "";
                const recText = it.recommended_action || "";
                return (
                  <div key={idx} className="rounded-xl border bg-[#F9FAFE] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="text-[#432C81]">
                        <div className="text-lg font-bold">คะแนนรวม: {score} / 27</div>
                        <div className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${badgeColor(score)}`}>
                          {sevText || "—"}
                        </div>
                        {recText && (
                          <p className="mt-2 max-w-prose text-sm opacity-90">
                            <span className="font-semibold">คำแนะนำ: </span>
                            {recText}
                          </p>
                        )}
                      </div>
                      <div className="text-sm text-[#432C81] opacity-80">
                        {created.toLocaleString()}
                      </div>
                    </div>

                    {/* (ทางเลือก) ปุ่มดูรายละเอียดคำตอบ 9 ข้อ */}
                    {Array.isArray(it.answers) && it.answers.length === 9 && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm text-[#432C81] underline">
                          ดูคำตอบทั้ง 9 ข้อ
                        </summary>
                        <div className="mt-2 grid grid-cols-1 gap-1 text-sm text-[#432C81]">
                          {it.answers.map((a, i) => (
                            <div key={i} className="rounded-lg bg-white px-3 py-2">
                              ข้อ {i + 1}: คะแนน {a}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* หมายเหตุความปลอดภัย เมื่อคะแนนสูง */}
        {summary.last && Number(summary.last.total_score) >= 20 && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-800">
            หากกำลังมีความคิดทำร้ายตนเอง โปรดติดต่อสายด่วนสุขภาพจิต 1323 หรือ 1669 / โรงพยาบาลใกล้บ้านทันที
          </div>
        )}
      </div>
    </div>
  );
}
