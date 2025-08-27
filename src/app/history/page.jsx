"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthen } from "@/utils/useAuthen";
import { getPhq9History } from "@/services/historyService";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

export default function HistoryPage() {
  const router = useRouter();
  const { isLoading, authenticated } = useAuthen();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showChart, setShowChart] = useState(false);

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
        const res = await getPhq9History(authenticated.user_id);
        if (!res.result) throw new Error(`HTTP ${res.status}`);
        const data = Array.isArray(res?.data) ? res.data : [];
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

  // ข้อมูลสำหรับกราฟ (เรียงเวลาจากเก่าไปใหม่)
  const chartData = useMemo(() => {
    if (!items.length) return [];
    
    const sortedItems = [...items].reverse(); // เรียงจากเก่าไปใหม่
    return sortedItems.map((item, index) => ({
      index: index + 1,
      score: Number(item.total_score) || 0,
      date: new Date(item.created_at || item.createdAt || item.date || Date.now()).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: '2-digit'
      }),
      fullDate: item.created_at || item.createdAt || item.date
    }));
  }, [items]);

  // สรุปสถิติ
  const summary = useMemo(() => {
    if (!items.length) return { count: 0, avg: 0, last: null, trend: null };
    const count = items.length;
    const sum = items.reduce((s, it) => s + (Number(it.total_score) || 0), 0);
    const avg = +(sum / count).toFixed(1);
    const last = items[0] || null;
    
    let trend = null;
    if (count >= 2) {
      const lastScore = Number(items[0].total_score) || 0;
      const prevScore = Number(items[1].total_score) || 0;
      if (lastScore > prevScore) trend = "up";
      else if (lastScore < prevScore) trend = "down";
      else trend = "same";
    }
    
    return { count, avg, last, trend };
  }, [items]);

  const badgeColor = (score) => {
    if (score <= 4) return "bg-green-100 text-green-700";
    if (score <= 9) return "bg-lime-100 text-lime-700";
    if (score <= 14) return "bg-yellow-100 text-yellow-800";
    if (score <= 19) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-700";
  };

  const getScoreColor = (score) => {
    if (score <= 4) return "#22c55e"; // green
    if (score <= 9) return "#84cc16"; // lime
    if (score <= 14) return "#eab308"; // yellow
    if (score <= 19) return "#f97316"; // orange
    return "#ef4444"; // red
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold text-[#432C81]">{`ครั้งที่: ${label}`}</p>
          <p className="text-sm text-gray-600">{`วันที่: ${data.date}`}</p>
          <p className={`font-bold ${payload[0].value <= 4 ? 'text-green-600' : 
                      payload[0].value <= 9 ? 'text-lime-600' : 
                      payload[0].value <= 14 ? 'text-yellow-600' : 
                      payload[0].value <= 19 ? 'text-orange-600' : 'text-red-600'}`}>
            {`คะแนน: ${payload[0].value}/27`}
          </p>
        </div>
      );
    }
    return null;
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
      <div className="mx-auto w-full max-w-5xl rounded-2xl bg-white p-6 shadow">
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

        {/* Summary แต่ละ card */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
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
          <div className="rounded-xl bg-[#F0FFF4] p-4">
            <div className="text-sm text-[#432C81]/70">แนวโน้ม</div>
            <div className="text-2xl font-extrabold flex items-center gap-2">
              {summary.trend === "up" && <span className="text-red-500">↗️ เพิ่มขึ้น</span>}
              {summary.trend === "down" && <span className="text-green-500">↘️ ลดลง</span>}
              {summary.trend === "same" && <span className="text-blue-500">➡️ เท่าเดิม</span>}
              {!summary.trend && <span className="text-gray-400">-</span>}
            </div>
          </div>
        </div>

        {/* Chart Toggle */}
        {chartData.length >= 2 && (
          <div className="mt-6">
            <button
              onClick={() => setShowChart(!showChart)}
              className="flex items-center gap-2 rounded-lg bg-[#432C81] px-4 py-2 text-white hover:opacity-90"
            >
              📊 {showChart ? 'ซ่อนกราฟ' : 'แสดงกราฟแนวโน้ม'}
            </button>
          </div>
        )}

        {/* Chart */}
        {showChart && chartData.length >= 2 && (
          <div className="mt-6 rounded-xl bg-gradient-to-br from-[#F8FAFF] to-[#EFEAFE] p-6">
            <h3 className="mb-4 text-lg font-bold text-[#432C81]">กราฟแนวโน้มคะแนน PHQ-9</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#432C81" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#432C81" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="index" 
                    stroke="#6B7280"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'ครั้งที่', position: 'insideBottom', offset: -10 }}
                  />
                  <YAxis 
                    stroke="#6B7280"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'คะแนน', angle: -90, position: 'insideLeft' }}
                    domain={[0, 27]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#432C81"
                    strokeWidth={3}
                    fill="url(#scoreGradient)"
                    dot={{ fill: '#432C81', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7, stroke: '#432C81', strokeWidth: 2 }}
                  />
                  {/* เส้นแบ่งระดับความรุนแรง */}
                  <Line y={4} stroke="#22c55e" strokeDasharray="5 5" opacity={0.5} />
                  <Line y={9} stroke="#84cc16" strokeDasharray="5 5" opacity={0.5} />
                  <Line y={14} stroke="#eab308" strokeDasharray="5 5" opacity={0.5} />
                  <Line y={19} stroke="#f97316" strokeDasharray="5 5" opacity={0.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-1 bg-green-500"></div>
                <span>ปกติ (0-4)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-1 bg-lime-500"></div>
                <span>เล็กน้อย (5-9)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-1 bg-yellow-500"></div>
                <span>ปานกลาง (10-14)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-1 bg-orange-500"></div>
                <span>ค่อนข้างรุนแรง (15-19)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-1 bg-red-500"></div>
                <span>รุนแรง (20-27)</span>
              </div>
            </div>
          </div>
        )}

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

                    {/* คำตอบทั้ง 9 ข้อ */}
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

        {/* หมายเหตุความปลอดภัย */}
        {summary.last && Number(summary.last.total_score) >= 20 && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-800">
            หากกำลังมีความคิดทำร้ายตนเอง โปรดติดต่อสายด่วนสุขภาพจิต 1323 หรือ 1669 / โรงพยาบาลใกล้บ้านทันที
          </div>
        )}
      </div>
    </div>
  );
}