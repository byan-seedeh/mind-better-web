"use client";
import React, { useEffect } from "react";
import { useAuthen } from "@/utils/useAuthen";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function HomePage() {
  const router = useRouter();
  const { isLoading, authenticated } = useAuthen();

  // ถ้าไม่ได้ล็อกอิน ให้เด้งไปหน้า login
  useEffect(() => {
    if (!isLoading && !authenticated) router.replace("/login");
  }, [isLoading, authenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#D0F8FF]">
        Loading...
      </div>
    );
  }

  const userLabel = authenticated?.email || "Bae";

  return (
    <div className="min-h-screen w-full bg-[#F9F9F9]">
      {/* Top Bar + Nav */}
      <header className="sticky top-0 z-10 w-full bg-white/90 backdrop-blur border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="text-xl md:text-2xl font-bold text-[#432C81]">
            👋 Hi {userLabel}!
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[#432C81] font-semibold">
            <button onClick={() => router.push("/home")} className="opacity-100">
              Home
            </button>
            <button
              onClick={() => router.push("/assessment")}
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              Assessment
            </button>
            <button
              onClick={() => router.push("/history")}
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              History
            </button>
          </nav>

          <button
            onClick={() => {
              localStorage.removeItem("user");
              router.push("/login");
            }}
            className="rounded-lg bg-[#432C81] px-4 py-2 text-white hover:opacity-90"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-[#D0F8FF]">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
          <div className="rounded-2xl bg-white/60 p-6 sm:p-10 text-center shadow-sm">
            {/* แทนข้อความด้วยรูปภาพ */}
            <div className="flex justify-center">
              <Image
                src="/assets/banner.png"
                alt="ตรวจสุขภาพใจคุณวันนี้ ฟรี ไม่มีค่าใช้จ่าย"
                width={500}
                height={200}
                priority
              />
            </div>

            <button
              onClick={() => router.push("/assessment")}
              className="mt-6 rounded-full bg-pink-400 px-8 py-3 text-white text-lg font-bold hover:bg-pink-500 transition-colors"
            >
              เริ่มประเมินเลย
            </button>
          </div>
        </div>
      </section>

      {/* 3 Benefit Cars */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 py-8 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#E6F7FF] p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 h-16 w-16">
            <img src="/assets/1.png" alt="เข้าใจสุขภาพจิต" className="h-full w-full object-contain" />
          </div>
          <p className="font-bold text-pink-500">เข้าใจสุขภาพจิตตัวเอง</p>
        </div>

        <div className="rounded-2xl bg-[#FFF0F0] p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 h-16 w-16">
            <img src="/assets/2.png" alt="ลดความเสี่ยง" className="h-full w-full object-contain" />
          </div>
          <p className="font-bold text-blue-500">ลดความเสี่ยงภาวะเรื้อรัง</p>
        </div>

        <div className="rounded-2xl bg-[#F5F0FF] p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 h-16 w-16">
            <img src="/assets/3.png" alt="ส่งเสริมความเข้าใจ" className="h-full w-full object-contain" />
          </div>
          <p className="font-bold text-purple-500">ส่งเสริมความเข้าใจ</p>
        </div>
      </section>
    </div>
  );
}
