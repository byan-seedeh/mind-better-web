// "use client";
// import React, { useEffect, useMemo, useState } from "react";
// import { useRouter } from "next/navigation";
// import { useAuthen } from "@/utils/useAuthen";
// import { getAssessmentHistory } from "@/services/historyService";
// import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

// /* ================================
//  * 1) CONFIG แบบประเมิน
//  * ================================ */
// const CONFIG = {
//   "2Q": {
//     title: "แบบคัดกรองโรคซึมเศร้า 2 คำถาม",
//     max: 6,
//     badge: "bg-green-100 text-green-700",
//     thresholds: [
//       { min: 0, max: 2, level: "ปกติ", tag: "bg-green-100 text-green-700" },
//       { min: 3, max: 6, level: "ควรประเมินเพิ่มเติม", tag: "bg-yellow-100 text-yellow-800" },
//     ],
//   },
//   "9Q": {
//     title: "แบบประเมินโรคซึมเศร้า PHQ-9",
//     max: 27,
//     badge: "bg-blue-100 text-blue-700",
//     thresholds: [
//       { min: 0, max: 4, level: "ปกติ", tag: "bg-green-100 text-green-700" },
//       { min: 5, max: 9, level: "ซึมเศร้าเล็กน้อย", tag: "bg-lime-100 text-lime-700" },
//       { min: 10, max: 14, level: "ซึมเศร้าปานกลาง", tag: "bg-yellow-100 text-yellow-800" },
//       { min: 15, max: 19, level: "ซึมเศร้าค่อนข้างรุนแรง", tag: "bg-orange-100 text-orange-800" },
//       { min: 20, max: 27, level: "ซึมเศร้ารุนแรง", tag: "bg-red-100 text-red-700" },
//     ],
//   },
//   "8Q": {
//     title: "แบบประเมินการฆ่าตัวตาย 8 คำถาม",
//     max: 24,
//     badge: "bg-red-100 text-red-700",
//     thresholds: [
//       { min: 0, max: 0, level: "ไม่มีความเสี่ยง", tag: "bg-green-100 text-green-700" },
//       { min: 1, max: 8, level: "ความเสี่ยงต่ำ", tag: "bg-yellow-100 text-yellow-800" },
//       { min: 9, max: 16, level: "ความเสี่ยงปานกลาง", tag: "bg-orange-100 text-orange-800" },
//       { min: 17, max: 24, level: "ความเสี่ยงสูง", tag: "bg-red-100 text-red-700" },
//     ],
//   },
// };

// /* ================================
//  * 2) Helpers
//  * ================================ */
// // รองรับรูปแบบทุกแนว: "phq2", "PHQ-8", "8Q", "phq_9", "q2", "2" ฯลฯ
// const normalizeType = (raw) => {
//   const s = String(raw || "").toLowerCase().replace(/[^a-z0-9]/g, ""); // keep a-z0-9 only

//   // รองรับทั้งมี/ไม่มี 'q' และ 'phq'
//   if (s === "q2" || /^(phq)?2q?$/.test(s)) return "2Q";
//   if (s === "q9" || /^(phq)?9q?$/.test(s)) return "9Q";
//   if (s === "q8" || /^(phq)?8q?$/.test(s)) return "8Q";
//   return null;
// };

// const severityOf = (type, score) => {
//   const hit = CONFIG[type].thresholds.find((t) => score >= t.min && score <= t.max);
//   return hit ?? { level: "ไม่ทราบ", tag: "bg-gray-100 text-gray-700" };
// };

// // แปลง record → โครงเดียวกัน + เดา type เมื่อไม่มี
// const toItem = (x) => {
//   const rawType = x.assessment_type ?? x.type ?? x.kind ?? x.category;
//   let type = normalizeType(rawType);

//   const answers = Array.isArray(x.answers)
//     ? x.answers.map((v) => Number(v)).filter((v) => Number.isFinite(v))
//     : [];

//   // เดาชนิดจากจำนวนข้อ/คะแนนเต็ม/ตัวเลขใน rawType หากยังไม่รู้
//   if (!type) {
//     const maxFromApi = Number(x.max_score);
//     const byLen = answers.length;

//     if (byLen === 2 || maxFromApi === 6) type = "2Q";
//     else if (byLen === 8 || maxFromApi === 24) type = "8Q";
//     else if (byLen === 9 || maxFromApi === 27) type = "9Q";
//     else if (/2/.test(String(rawType))) type = "2Q";
//     else if (/8/.test(String(rawType))) type = "8Q";
//     else if (/9/.test(String(rawType))) type = "9Q";
//     else type = "9Q"; // fallback สุดท้าย
//   }

//   const max = CONFIG[type].max;

//   let score = Number(x.total_score);
//   if (!Number.isFinite(score)) score = answers.reduce((s, v) => s + v, 0);
//   score = Math.min(Math.max(score, 0), max);

//   const created = new Date(x.created_at || x.createdAt || x.date || x.created || 0);

//   return {
//     id: x.id ?? `${type}-${created.getTime()}`,
//     type,                    // '2Q' | '9Q' | '8Q'
//     score,                   // 0..max
//     max,                     // 6/27/24
//     created,                 // Date
//     answers,                 // number[]
//     recommended: x.recommended_action || "",
//   };
// };

// /* ================================
//  * 3) Main Component
//  * ================================ */
// export default function HistoryPage() {
//   const router = useRouter();
//   const { isLoading, authenticated } = useAuthen();

//   const [items, setItems] = useState([]);     // normalized list
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState("");
//   const [filter, setFilter] = useState("ALL"); // ALL | 2Q | 9Q | 8Q
//   const [showChart, setShowChart] = useState(false);

//   // โหลดข้อมูล → normalize → sort (ใหม่→เก่า)
//   useEffect(() => {
//     if (isLoading) return;
//     if (!authenticated) {
//       router.replace("/login");
//       return;
//     }

//     (async () => {
//       setLoading(true);
//       setErr("");
//       try {
//         const res = await getAssessmentHistory(authenticated.user_id);
//         if (!res?.result) throw new Error(res?.message || `HTTP ${res?.status}`);
//         const list = (Array.isArray(res.data) ? res.data : []).map(toItem);
//         list.sort((a, b) => b.created - a.created);
//         setItems(list);
//       } catch (e) {
//         setErr("ไม่สามารถดึงประวัติการทำแบบประเมินได้");
//         setItems([]);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [isLoading, authenticated, router]);

//   // นับจำนวนต่อชนิด
//   const counts = useMemo(() => {
//     return items.reduce(
//       (acc, it) => {
//         acc[it.type] = (acc[it.type] || 0) + 1;
//         return acc;
//       },
//       { "2Q": 0, "9Q": 0, "8Q": 0 }
//     );
//   }, [items]);

//   // รายการที่กรอง
//   const list = useMemo(() => (filter === "ALL" ? items : items.filter((it) => it.type === filter)), [items, filter]);

//   // สรุป (เฉพาะกรณีเลือกชนิดเดียว)
//   const summary = useMemo(() => {
//     if (filter === "ALL" || list.length === 0) return null;

//     const count = list.length;
//     const avg = +(list.reduce((s, it) => s + it.score, 0) / count).toFixed(1);
//     const last = list[0]; // ล่าสุด (เพราะ sort ใหม่→เก่า)

//     let trend = null;
//     if (count >= 2) {
//       const a = list[0].score, b = list[1].score;
//       trend = a > b ? "up" : a < b ? "down" : "same";
//     }

//     return { count, avg, last, trend };
//   }, [filter, list]);

//   // ข้อมูลกราฟ (เฉพาะชนิดเดียว และมี ≥ 2 รายการ)
//   const chartData = useMemo(() => {
//     if (filter === "ALL") return [];
//     const data = list.slice().reverse(); // เก่า→ใหม่
//     return data.map((it, i) => ({
//       idx: i + 1,
//       score: it.score,
//       max: it.max,
//       date: it.created.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }),
//     }));
//   }, [filter, list]);

//   // ระหว่าง auth ยังไม่สรุป
//   if (isLoading || (!authenticated && !isLoading)) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-[#D0F8FF]">
//         <div className="text-xl text-[#432C81]">กำลังโหลด...</div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-[#D0F8FF] px-4 py-8">
//       <div className="mx-auto w-full max-w-6xl rounded-2xl bg-white p-6 shadow-lg">
//         {/* Header + ปุ่มลัด */}
//         <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
//           <h1 className="text-3xl font-extrabold text-[#432C81]">ประวัติการทำแบบประเมิน</h1>
//           <div className="flex gap-2">
//             <button
//               onClick={() => router.push("/assessment?type=2Q")}
//               className="rounded-lg bg-green-500 px-3 py-2 text-white text-sm hover:opacity-90 transition-opacity flex flex-col items-center"
//               title="เริ่มทำ 2Q"
//             >
//               <span>2Q คัดกรอง</span>
//               <span className="text-xs font-medium">{counts["2Q"]} ครั้ง</span>
//             </button>
//             <button
//               onClick={() => router.push("/assessment?type=9Q")}
//               className="rounded-lg bg-blue-500 px-3 py-2 text-white text-sm hover:opacity-90 transition-opacity flex flex-col items-center"
//               title="เริ่มทำ 9Q"
//             >
//               <span>9Q PHQ-9</span>
//               <span className="text-xs font-medium">{counts["9Q"]} ครั้ง</span>
//             </button>
//             <button
//               onClick={() => router.push("/assessment?type=8Q")}
//               className="rounded-lg bg-red-500 px-3 py-2 text-white text-sm hover:opacity-90 transition-opacity flex flex-col items-center"
//               title="เริ่มทำ 8Q"
//             >
//               <span>8Q การฆ่าตัวตาย</span>
//               <span className="text-xs font-medium">{counts["8Q"]} ครั้ง</span>
//             </button>
//             <button
//               onClick={() => router.push("/home")}
//               className="rounded-lg bg-white px-4 py-2 text-[#432C81] ring-1 ring-[#432C81] hover:bg-[#EFEAFE] transition-colors"
//             >
//               กลับหน้าหลัก
//             </button>
//           </div>
//         </div>

//         {/* การ์ดสรุปตัวนับ */}
//         <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
//           <div className="rounded-xl bg-green-50 p-4 border border-green-200">
//             <div className="text-sm text-green-700 font-medium">แบบประเมิน 2Q</div>
//             <div className="text-2xl font-extrabold text-green-700">{counts["2Q"]} ครั้ง</div>
//           </div>
//           <div className="rounded-xl bg-blue-50 p-4 border border-blue-200">
//             <div className="text-sm text-blue-700 font-medium">แบบประเมิน 9Q</div>
//             <div className="text-2xl font-extrabold text-blue-700">{counts["9Q"]} ครั้ง</div>
//           </div>
//           <div className="rounded-xl bg-red-50 p-4 border border-red-200">
//             <div className="text-sm text-red-700 font-medium">แบบประเมิน 8Q</div>
//             <div className="text-2xl font-extrabold text-red-700">{counts["8Q"]} ครั้ง</div>
//           </div>
//           <div className="rounded-xl bg-[#E6F7FF] p-4 border border-blue-200">
//             <div className="text-sm text-[#432C81]/70 font-medium">รวมทั้งหมด</div>
//             <div className="text-2xl font-extrabold text-[#432C81]">{items.length} ครั้ง</div>
//           </div>
//         </div>

//         {/* ตัวกรอง */}
//         <div className="mb-6 p-4 bg-gray-50 rounded-xl">
//           <div className="flex flex-wrap items-center gap-2">
//             <span className="text-sm text-[#432C81] font-semibold">กรองตามประเภท:</span>
//             {["ALL", "2Q", "9Q", "8Q"].map((k) => (
//               <button
//                 key={k}
//                 onClick={() => setFilter(k)}
//                 className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
//                   filter === k ? "bg-[#432C81] text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-100 border"
//                 }`}
//               >
//                 {k === "ALL" ? "ทั้งหมด" : k}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* สรุป (เฉพาะชนิดเดียว) */}
//         {summary && (
//           <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
//             <div className="rounded-xl bg-[#F5F0FF] p-4 border">
//               <div className="text-sm text-[#432C81]/70 font-medium">จำนวนครั้ง</div>
//               <div className="text-3xl font-extrabold text-[#432C81]">{summary.count}</div>
//               <div className="text-xs text-[#432C81]/60 mt-1">{CONFIG[filter]?.title}</div>
//             </div>
//             <div className="rounded-xl bg-[#FFF0F0] p-4 border">
//               <div className="text-sm text-[#432C81]/70 font-medium">ค่าเฉลี่ยคะแนน</div>
//               <div className="text-3xl font-extrabold text-[#432C81]">{summary.avg}</div>
//               <div className="text-xs text-[#432C81]/60 mt-1">เฉลี่ยคะแนนของ {filter}</div>
//             </div>
//             <div className="rounded-xl bg-[#F0FFF4] p-4 border">
//               <div className="text-sm text-[#432C81]/70 font-medium">คะแนนครั้งล่าสุด</div>
//               <div className="text-3xl font-extrabold text-[#432C81]">
//                 {summary.last ? `${summary.last.score}/${summary.last.max}` : "-"}
//               </div>
//               <div className="text-xs text-[#432C81]/60 mt-1">ประเมินล่าสุด</div>
//             </div>
//             <div className="rounded-xl bg-[#FFFBF0] p-4 border">
//               <div className="text-sm text-[#432C81]/70 font-medium">แนวโน้ม</div>
//               <div className="text-xl font-extrabold flex items-center gap-2">
//                 {!summary.trend && <span className="text-gray-400">-</span>}
//                 {summary.trend === "up" && <span className="text-red-500">↗️ เพิ่มขึ้น</span>}
//                 {summary.trend === "down" && <span className="text-green-500">↘️ ลดลง</span>}
//                 {summary.trend === "same" && <span className="text-blue-500">➡️ เท่าเดิม</span>}
//               </div>
//               <div className="text-xs text-[#432C81]/60 mt-1">เปรียบเทียบ 2 ครั้งล่าสุดของ {filter}</div>
//             </div>
//           </div>
//         )}

//         {/* ปุ่ม/กราฟ (เฉพาะชนิดเดียว + ≥2) */}
//         {filter !== "ALL" && chartData.length >= 2 && (
//           <div className="mb-6">
//             <button
//               onClick={() => setShowChart((s) => !s)}
//               className="flex items-center gap-2 rounded-lg bg-[#432C81] px-6 py-3 text-white hover:opacity-90 transition-opacity shadow-md"
//             >
//               📊 {showChart ? "ซ่อนกราฟแนวโน้ม" : "แสดงกราฟแนวโน้ม"}
//             </button>
//           </div>
//         )}

//         {showChart && filter !== "ALL" && chartData.length >= 2 && (
//           <div className="mb-6 rounded-xl bg-gradient-to-br from-[#F8FAFF] to-[#EFEAFE] p-6 border">
//             <h3 className="mb-4 text-xl font-bold text-[#432C81]">กราฟแนวโน้มคะแนน {CONFIG[filter]?.title}</h3>
//             <div className="h-80 mb-4">
//               <ResponsiveContainer width="100%" height="100%">
//                 <AreaChart data={chartData}>
//                   <defs>
//                     <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
//                       <stop offset="5%" stopColor="#432C81" stopOpacity={0.8} />
//                       <stop offset="95%" stopColor="#432C81" stopOpacity={0.1} />
//                     </linearGradient>
//                   </defs>
//                   <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
//                   <XAxis dataKey="idx" stroke="#6B7280" tick={{ fontSize: 12 }} label={{ value: "ครั้งที่", position: "insideBottom", offset: -10 }} />
//                   <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} label={{ value: "คะแนน", angle: -90, position: "insideLeft" }} />
//                   <Tooltip
//                     content={({ active, payload, label }) => {
//                       if (!active || !payload?.length) return null;
//                       const d = payload[0].payload;
//                       const sev = severityOf(filter, d.score);
//                       return (
//                         <div className="bg-white p-3 border rounded-lg shadow-lg">
//                           <p className="font-semibold text-[#432C81]">{`ครั้งที่: ${label}`}</p>
//                           <p className="text-sm text-gray-600">{`วันที่: ${d.date}`}</p>
//                           <p className="font-bold text-[#432C81]">{`คะแนน: ${d.score}/${d.max}`}</p>
//                           <p className="text-xs text-gray-500">{sev.level}</p>
//                         </div>
//                       );
//                     }}
//                   />
//                   <Area type="monotone" dataKey="score" stroke="#432C81" strokeWidth={3} fill="url(#scoreGradient)" dot={{ r: 5 }} />
//                 </AreaChart>
//               </ResponsiveContainer>
//             </div>
//           </div>
//         )}

//         {/* Error */}
//         {err && (
//           <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
//             {err}
//           </div>
//         )}

//         {/* รายการประเมิน */}
//         <div className="mb-6">
//           <h2 className="text-lg font-bold text-[#432C81] mb-4">รายการการประเมิน</h2>

//           {loading ? (
//             <div className="text-center text-[#432C81] py-8">
//               <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#432C81]"></div>
//               <p className="mt-2">กำลังโหลด...</p>
//             </div>
//           ) : list.length === 0 ? (
//             <div className="text-center text-[#432C81] py-8 bg-gray-50 rounded-xl">
//               <p className="text-lg">ยังไม่มีประวัติการทำแบบประเมิน{filter !== "ALL" ? ` ${filter}` : ""}</p>
//               <p className="text-sm text-gray-600 mt-2">เริ่มทำการประเมินเพื่อติดตามสุขภาพจิตของคุณ</p>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               {list.map((it, idx) => {
//                 const cfg = CONFIG[it.type];
//                 const sev = severityOf(it.type, it.score);

//                 return (
//                   <div key={`${it.id}-${idx}`} className="rounded-xl border bg-[#F9FAFE] p-6 hover:shadow-md transition-shadow">
//                     <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
//                       <div className="flex-1">
//                         <div className="flex items-center gap-3 mb-3">
//                           <span className={`px-3 py-1 rounded-full text-sm font-bold ${cfg.badge}`}>{cfg.title}</span>
//                           <div className="text-xl font-bold text-[#432C81]">
//                             {it.score} / {it.max} คะแนน
//                           </div>
//                         </div>
//                         <div className={`inline-block rounded-full px-4 py-2 text-sm font-semibold ${sev.tag} mb-3`}>{sev.level}</div>

//                         {it.recommended && (
//                           <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
//                             <p className="text-sm text-blue-800">
//                               <span className="font-semibold">💡 คำแนะนำ: </span>
//                               {it.recommended}
//                             </p>
//                           </div>
//                         )}
//                       </div>

//                       <div className="text-right">
//                         <div className="text-sm text-[#432C81] font-medium">
//                           {it.created.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
//                         </div>
//                         <div className="text-xs text-[#432C81]/60">
//                           {it.created.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
//                         </div>
//                       </div>
//                     </div>

//                     {Array.isArray(it.answers) && it.answers.length > 0 && (
//                       <details className="mt-4">
//                         <summary className="cursor-pointer text-sm text-[#432C81] underline hover:text-[#5a4192] font-medium">
//                           ดูคำตอบรายข้อทั้ง {it.answers.length} ข้อ
//                         </summary>
//                         <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
//                           {it.answers.map((ans, i2) => (
//                             <div key={i2} className="rounded-lg bg-white px-3 py-2 text-sm border">
//                               <span className="font-medium text-[#432C81]">ข้อ {i2 + 1}:</span>
//                               <span className="ml-2 text-gray-700">คะแนน {ans}</span>
//                             </div>
//                           ))}
//                         </div>
//                       </details>
//                     )}
//                   </div>
//                 );
//               })}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }



"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthen } from "@/utils/useAuthen";
import { getAssessmentHistory } from "@/services/historyService";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

/* ================================
 * 1) CONFIG แบบประเมิน
 * ================================ */
const CONFIG = {
  "2Q": {
    title: "แบบคัดกรองโรคซึมเศร้า 2 คำถาม",
    max: 2,
    badge: "bg-green-100 text-green-700",
    thresholds: [
      { min: 0, max: 2, level: "ปกติ", tag: "bg-green-100 text-green-700" },
      { min: 3, max: 6, level: "ควรประเมินเพิ่มเติม", tag: "bg-yellow-100 text-yellow-800" },
    ],
  },
  "9Q": {
    title: "แบบประเมินโรคซึมเศร้า PHQ-9",
    max: 27,
    badge: "bg-blue-100 text-blue-700",
    thresholds: [
      { min: 0, max: 4, level: "ปกติ", tag: "bg-green-100 text-green-700" },
      { min: 5, max: 9, level: "ซึมเศร้าเล็กน้อย", tag: "bg-lime-100 text-lime-700" },
      { min: 10, max: 14, level: "ซึมเศร้าปานกลาง", tag: "bg-yellow-100 text-yellow-800" },
      { min: 15, max: 19, level: "ซึมเศร้าค่อนข้างรุนแรง", tag: "bg-orange-100 text-orange-800" },
      { min: 20, max: 27, level: "ซึมเศร้ารุนแรง", tag: "bg-red-100 text-red-700" },
    ],
  },
  "8Q": {
    title: "แบบประเมินการฆ่าตัวตาย 8 คำถาม",
    max: 24,
    badge: "bg-red-100 text-red-700",
    thresholds: [
      { min: 0, max: 0, level: "ไม่มีความเสี่ยง", tag: "bg-green-100 text-green-700" },
      { min: 1, max: 8, level: "ความเสี่ยงต่ำ", tag: "bg-yellow-100 text-yellow-800" },
      { min: 9, max: 16, level: "ความเสี่ยงปานกลาง", tag: "bg-orange-100 text-orange-800" },
      { min: 17, max: 24, level: "ความเสี่ยงสูง", tag: "bg-red-100 text-red-700" },
    ],
  },
};

/* ================================
 * 2) Helpers
 * ================================ */
const normalizeType = (raw) => {
  const s = String(raw || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (s === "q2" || /^(phq)?2q?$/.test(s)) return "2Q";
  if (s === "q9" || /^(phq)?9q?$/.test(s)) return "9Q";
  if (s === "q8" || /^(phq)?8q?$/.test(s)) return "8Q";
  return null;
};

const severityOf = (type, score) => {
  const set = CONFIG[type]?.thresholds || [];
  const hit = set.find((t) => score >= t.min && score <= t.max);
  return hit ?? { level: "ไม่ทราบ", tag: "bg-gray-100 text-gray-700" };
};

const toItem = (x) => {
  const rawType = x.assessment_type ?? x.type ?? x.kind ?? x.category ?? x.form_type ?? x.form;
  let type = normalizeType(rawType);

  const answers = Array.isArray(x.answers)
    ? x.answers.map((v) => Number(v)).filter((v) => Number.isFinite(v))
    : [];

  if (!type) {
    const maxFromApi = Number(x.max_score);
    if (answers.length === 2 || maxFromApi === 6) type = "2Q";
    else if (answers.length === 8 || maxFromApi === 24) type = "8Q";
    else if (answers.length === 9 || maxFromApi === 27) type = "9Q";
    else if (/2/.test(String(rawType))) type = "2Q";
    else if (/8/.test(String(rawType))) type = "8Q";
    else if (/9/.test(String(rawType))) type = "9Q";
    else type = "9Q";
  }

  const max = CONFIG[type].max;
  let score = Number(x.total_score);
  if (!Number.isFinite(score)) score = answers.reduce((s, v) => s + v, 0);
  score = Math.min(Math.max(score, 0), max);

  const created = new Date(x.created_at || x.createdAt || x.date || x.created || 0);

  return {
    id: x.id ?? `${type}-${created.getTime()}`,
    type,
    score,
    max,
    created,
    answers,
    recommended: x.recommended_action || "",
  };
};

/* ================================
 * 3) Component
 * ================================ */
export default function HistoryPage() {
  const router = useRouter();
  const { isLoading, authenticated } = useAuthen();

  const [items, setItems] = useState([]);  // ใหม่ → เก่า
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL | 2Q | 9Q | 8Q
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!authenticated) {
      router.replace("/login");
      return;
    }

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await getAssessmentHistory(authenticated.user_id);
        if (!res?.result) throw new Error(res?.message || `HTTP ${res?.status}`);
        const list = (Array.isArray(res.data) ? res.data : []).map(toItem);
        list.sort((a, b) => b.created - a.created); // ใหม่ → เก่า
        setItems(list);
      } catch (e) {
        setErr("ไม่สามารถดึงประวัติการทำแบบประเมินได้");
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoading, authenticated, router]);

  const counts = useMemo(() => {
    return items.reduce(
      (acc, it) => {
        acc[it.type] = (acc[it.type] || 0) + 1;
        return acc;
      },
      { "2Q": 0, "9Q": 0, "8Q": 0 }
    );
  }, [items]);

  const list = useMemo(() => (filter === "ALL" ? items : items.filter((it) => it.type === filter)), [items, filter]);

  const summary = useMemo(() => {
    if (filter === "ALL" || list.length === 0) return null;
    const count = list.length;
    const avg = +(list.reduce((s, it) => s + it.score, 0) / count).toFixed(1);
    const last = list[0];
    let trend = null;
    if (count >= 2) {
      const a = list[0].score;
      const b = list[1].score;
      trend = a > b ? "up" : a < b ? "down" : "same";
    }
    return { count, avg, last, trend };
  }, [filter, list]);

  /* ================================
   * กราฟ:
   * - ALL: ค่าเฉลี่ยรวม (%) แบบเฉลี่ยสะสมจากประวัติทั้งหมด (Area โค้ง)
   * - 2Q/9Q/8Q: แนวโน้มทั้งหมดของชนิดนั้น (Area โค้ง) + ไฮไลต์ 2 ครั้งล่าสุด
   * ================================ */
  const chartData = useMemo(() => {
    if (filter === "ALL") {
      if (items.length < 2) return [];
      const sorted = items.slice().reverse(); // เก่า → ใหม่
      let sumPct = 0;
      return sorted.map((it, i) => {
        const pct = (it.score / it.max) * 100;
        sumPct += pct;
        const avgPct = +(sumPct / (i + 1)).toFixed(1);
        return {
          idx: i + 1,
          date: it.created.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }),
          avgPct,
        };
      });
    } else {
      if (list.length < 2) return [];
      const sorted = list.slice().reverse(); // เก่า → ใหม่ (หลายจุด = เส้นโค้ง)
      const len = sorted.length;
      return sorted.map((it, i) => ({
        idx: i + 1,
        date: it.created.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }),
        type: it.type,
        score: it.score,
        max: it.max,
        isPrev: i === len - 2,
        isLatest: i === len - 1,
      }));
    }
  }, [filter, items, list]);

  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    const isHL = payload?.isLatest || payload?.isPrev;
    // จุดใหญ่/มีขอบสำหรับ 2 ครั้งล่าสุด
    return (
      <circle
        cx={cx}
        cy={cy}
        r={isHL ? 6 : 3}
        fill={isHL ? "#432C81" : "#C7BDF0"}
        stroke={isHL ? "#432C81" : "none"}
        strokeWidth={isHL ? 2 : 0}
      />
    );
  };

  if (isLoading || (!authenticated && !isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#D0F8FF]">
        <div className="text-xl text-[#432C81]">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#D0F8FF] px-4 py-8">
      <div className="mx-auto w-full max-w-6xl rounded-2xl bg-white p-6 shadow-lg">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-3xl font-extrabold text-[#432C81]">ประวัติการทำแบบประเมิน</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/assessment?type=2Q")}
              className="rounded-lg bg-green-500 px-3 py-2 text-white text-sm hover:opacity-90 transition-opacity flex flex-col items-center"
              title="เริ่มทำ 2Q"
            >
              <span>2Q คัดกรอง</span>
              <span className="text-xs font-medium">{counts["2Q"]} ครั้ง</span>
            </button>
            <button
              onClick={() => router.push("/assessment?type=9Q")}
              className="rounded-lg bg-blue-500 px-3 py-2 text-white text-sm hover:opacity-90 transition-opacity flex flex-col items-center"
              title="เริ่มทำ 9Q"
            >
              <span>9Q PHQ-9</span>
              <span className="text-xs font-medium">{counts["9Q"]} ครั้ง</span>
            </button>
            <button
              onClick={() => router.push("/assessment?type=8Q")}
              className="rounded-lg bg-red-500 px-3 py-2 text-white text-sm hover:opacity-90 transition-opacity flex flex-col items-center"
              title="เริ่มทำ 8Q"
            >
              <span>8Q การฆ่าตัวตาย</span>
              <span className="text-xs font-medium">{counts["8Q"]} ครั้ง</span>
            </button>
            <button
              onClick={() => router.push("/home")}
              className="rounded-lg bg-white px-4 py-2 text-[#432C81] ring-1 ring-[#432C81] hover:bg-[#EFEAFE] transition-colors"
            >
              กลับหน้าหลัก
            </button>
          </div>
        </div>

        {/* การ์ดสรุปตัวนับ */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-green-50 p-4 border border-green-200">
            <div className="text-sm text-green-700 font-medium">แบบประเมิน 2Q</div>
            <div className="text-2xl font-extrabold text-green-700">{counts["2Q"]} ครั้ง</div>
          </div>
          <div className="rounded-xl bg-blue-50 p-4 border border-blue-200">
            <div className="text-sm text-blue-700 font-medium">แบบประเมิน 9Q</div>
            <div className="text-2xl font-extrabold text-blue-700">{counts["9Q"]} ครั้ง</div>
          </div>
          <div className="rounded-xl bg-red-50 p-4 border border-red-200">
            <div className="text-sm text-red-700 font-medium">แบบประเมิน 8Q</div>
            <div className="text-2xl font-extrabold text-red-700">{counts["8Q"]} ครั้ง</div>
          </div>
          <div className="rounded-xl bg-[#E6F7FF] p-4 border border-blue-200">
            <div className="text-sm text-[#432C81]/70 font-medium">รวมทั้งหมด</div>
            <div className="text-2xl font-extrabold text-[#432C81]">{items.length} ครั้ง</div>
          </div>
        </div>

        {/* ตัวกรอง */}
        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-[#432C81] font-semibold">กรองตามประเภท:</span>
            {["ALL", "2Q", "9Q", "8Q"].map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  filter === k ? "bg-[#432C81] text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-100 border"
                }`}
              >
                {k === "ALL" ? "ทั้งหมด" : k}
              </button>
            ))}
          </div>
        </div>

        {/* สรุปสำหรับชนิดเดียว */}
        {summary && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-[#F5F0FF] p-4 border">
              <div className="text-sm text-[#432C81]/70 font-medium">จำนวนครั้ง</div>
              <div className="text-3xl font-extrabold text-[#432C81]">{summary.count}</div>
              <div className="text-xs text-[#432C81]/60 mt-1">{CONFIG[filter]?.title}</div>
            </div>
            <div className="rounded-xl bg-[#FFF0F0] p-4 border">
              <div className="text-sm text-[#432C81]/70 font-medium">ค่าเฉลี่ยคะแนน</div>
              <div className="text-3xl font-extrabold text-[#432C81]">{summary.avg}</div>
              <div className="text-xs text-[#432C81]/60 mt-1">เฉลี่ยคะแนนของ {filter}</div>
            </div>
            <div className="rounded-xl bg-[#F0FFF4] p-4 border">
              <div className="text-sm text-[#432C81]/70 font-medium">คะแนนครั้งล่าสุด</div>
              <div className="text-3xl font-extrabold text-[#432C81]">
                {summary.last ? `${summary.last.score}/${summary.last.max}` : "-"}
              </div>
              <div className="text-xs text-[#432C81]/60 mt-1">ประเมินล่าสุด</div>
            </div>
            <div className="rounded-xl bg-[#FFFBF0] p-4 border">
              <div className="text-sm text-[#432C81]/70 font-medium">แนวโน้ม</div>
              <div className="text-xl font-extrabold flex items-center gap-2">
                {!summary.trend && <span className="text-gray-400">-</span>}
                {summary.trend === "up" && <span className="text-red-500">↗️ เพิ่มขึ้น</span>}
                {summary.trend === "down" && <span className="text-green-500">↘️ ลดลง</span>}
                {summary.trend === "same" && <span className="text-blue-500">➡️ เท่าเดิม</span>}
              </div>
              <div className="text-xs text-[#432C81]/60 mt-1">เปรียบเทียบ 2 ครั้งล่าสุดของ {filter}</div>
            </div>
          </div>
        )}

        {/* ปุ่มแสดง/ซ่อนกราฟ */}
        {chartData.length >= 2 && (
          <div className="mb-6">
            <button
              onClick={() => setShowChart((s) => !s)}
              className="flex items-center gap-2 rounded-lg bg-[#432C81] px-6 py-3 text-white hover:opacity-90 transition-opacity shadow-md"
            >
              📊 {showChart ? "ซ่อนกราฟแนวโน้ม" : "แสดงกราฟแนวโน้ม"}
            </button>
          </div>
        )}

        {/* กราฟ (Area โค้ง) */}
        {showChart && chartData.length >= 2 && (
          <div className="mb-6 rounded-xl bg-gradient-to-br from-[#F8FAFF] to-[#EFEAFE] p-6 border">
            <h3 className="mb-4 text-xl font-bold text-[#432C81]">
              {filter === "ALL"
                ? "กราฟแนวโน้มค่าเฉลี่ยรวม (%) — คิดจากประวัติทั้งหมด"
                : `กราฟแนวโน้มทั้งหมด (ไฮไลต์ 2 ครั้งล่าสุด) — ${CONFIG[filter]?.title}`}
            </h3>
            <div className="h-80 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#432C81" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#432C81" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="idx"
                    stroke="#6B7280"
                    tick={{ fontSize: 12 }}
                    label={{ value: "ครั้งที่", position: "insideBottom", offset: -10 }}
                  />
                  <YAxis
                    domain={filter === "ALL" ? [0, 100] : [0, CONFIG[filter]?.max || "auto"]}
                    stroke="#6B7280"
                    tick={{ fontSize: 12 }}
                    label={{
                      value: filter === "ALL" ? "ค่าเฉลี่ยสะสม (%)" : "คะแนน",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />

                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;

                      if (filter === "ALL") {
                        return (
                          <div className="bg-white p-3 border rounded-lg shadow-lg">
                            <p className="font-semibold text-[#432C81]">{`ครั้งที่: ${label}`}</p>
                            <p className="text-sm text-gray-600">{`วันที่: ${d.date}`}</p>
                            <p className="font-bold text-[#432C81]">{`ค่าเฉลี่ยสะสม: ${d.avgPct}%`}</p>
                          </div>
                        );
                      } else {
                        const pct = +((d.score / d.max) * 100).toFixed(1);
                        const sev = severityOf(d.type, d.score);
                        const tag = d.isLatest ? " (ล่าสุด)" : d.isPrev ? " (ก่อนหน้า)" : "";
                        return (
                          <div className="bg-white p-3 border rounded-lg shadow-lg">
                            <p className="font-semibold text-[#432C81]">{`ครั้งที่: ${label}${tag}`}</p>
                            <p className="text-sm text-gray-600">{`วันที่: ${d.date}`}</p>
                            <p className="font-bold text-[#432C81]">{`คะแนน: ${d.score}/${d.max}`}</p>
                            <p className="text-xs text-gray-500">{`≈ ${pct}% ของสเกล`}</p>
                            <p className="text-xs text-gray-500">{sev.level}</p>
                          </div>
                        );
                      }
                    }}
                  />

                  {/* เส้นโค้ง + เฉดพื้น */}
                  <Area
                    type="monotone"
                    dataKey={filter === "ALL" ? "avgPct" : "score"}
                    stroke="#432C81"
                    strokeWidth={3}
                    fill="url(#scoreGradient)"
                    dot={filter === "ALL" ? { r: 4 } : <CustomDot />}
                    activeDot={{ r: 7 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Error */}
        {err && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
            {err}
          </div>
        )}

        {/* รายการประเมิน */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#432C81] mb-4">รายการการประเมิน</h2>

          {loading ? (
            <div className="text-center text-[#432C81] py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#432C81]"></div>
              <p className="mt-2">กำลังโหลด...</p>
            </div>
          ) : list.length === 0 ? (
            <div className="text-center text-[#432C81] py-8 bg-gray-50 rounded-xl">
              <p className="text-lg">ยังไม่มีประวัติการทำแบบประเมิน{filter !== "ALL" ? ` ${filter}` : ""}</p>
              <p className="text-sm text-gray-600 mt-2">เริ่มทำการประเมินเพื่อติดตามสุขภาพจิตของคุณ</p>
            </div>
          ) : (
            <div className="space-y-4">
              {list.map((it, idx) => {
                const cfg = CONFIG[it.type];
                const sev = severityOf(it.type, it.score);
                return (
                  <div
                    key={`${it.id}-${idx}`}
                    className="rounded-xl border bg-[#F9FAFE] p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${cfg.badge}`}>
                            {cfg.title}
                          </span>
                          <div className="text-xl font-bold text-[#432C81]">
                            {it.score} / {it.max} คะแนน
                          </div>
                        </div>
                        <div className={`inline-block rounded-full px-4 py-2 text-sm font-semibold ${sev.tag} mb-3`}>
                          {sev.level}
                        </div>

                        {it.recommended && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                            <p className="text-sm text-blue-800">
                              <span className="font-semibold">💡 คำแนะนำ: </span>
                              {it.recommended}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-[#432C81] font-medium">
                          {it.created.toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-[#432C81]/60">
                          {it.created.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>

                    {Array.isArray(it.answers) && it.answers.length > 0 && (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm text-[#432C81] underline hover:text-[#5a4192] font-medium">
                          ดูคำตอบรายข้อทั้ง {it.answers.length} ข้อ
                        </summary>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {it.answers.map((ans, i2) => (
                            <div key={i2} className="rounded-lg bg-white px-3 py-2 text-sm border">
                              <span className="font-medium text-[#432C81]">ข้อ {i2 + 1}:</span>
                              <span className="ml-2 text-gray-700">คะแนน {ans}</span>
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
      </div>
    </div>
  );
}
