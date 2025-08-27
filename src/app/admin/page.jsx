"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthen } from "@/utils/useAuthen";



const initialChoices = [
  { label: "ไม่เลย", value: 0 },
  { label: "หลายวัน", value: 1 },
  { label: "มากกว่าครึ่งหนึ่งของวัน", value: 2 },
  { label: "แทบทุกวัน", value: 3 },
];

const initialQuestions = [
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

export default function AdminPage() {
  const router = useRouter();
  const { isLoading, authenticated } = useAuthen();

  const [questions, setQuestions] = useState(initialQuestions);
  const [choices, setChoices] = useState(initialChoices);
  const [activeTab, setActiveTab] = useState("questions"); // questions | choices
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [editingValue, setEditingValue] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemText, setNewItemText] = useState("");
  const [newItemValue, setNewItemValue] = useState(0);

  useEffect(() => {
    if (!isLoading && !authenticated) {
      router.replace("/login");
      return;
    }
    
    // Admin ถ้าไม่ใช่ก็กลับหน้า homeเลย
    if (authenticated && authenticated.email !== "admin@test.com") {
      router.replace("/home");
      return;
    }
  }, [isLoading, authenticated, router]);

  // โหลดข้อมูลจาก localStorage
  useEffect(() => {
    try {
      const savedQuestions = localStorage.getItem("admin_questions");
      const savedChoices = localStorage.getItem("admin_choices");
      
      if (savedQuestions) {
        setQuestions(JSON.parse(savedQuestions));
      }
      if (savedChoices) {
        setChoices(JSON.parse(savedChoices));
      }
    } catch (error) {
      console.error("Error loading saved data:", error);
    }
  }, []);

  // บันทึกข้อมูลลง localStorage
  const saveToStorage = (newQuestions, newChoices) => {
    try {
      localStorage.setItem("admin_questions", JSON.stringify(newQuestions || questions));
      localStorage.setItem("admin_choices", JSON.stringify(newChoices || choices));
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  const handleEditQuestion = (index) => { 
    setEditingIndex(index);
    setEditingText(questions[index]);
  };

  const handleSaveQuestion = (index) => {
    const newQuestions = [...questions];
    newQuestions[index] = editingText;
    setQuestions(newQuestions);
    saveToStorage(newQuestions, null);
    setEditingIndex(null);
    setEditingText("");
  };

  const handleDeleteQuestion = (index) => {
    if (confirm("คุณแน่ใจหรือไม่ที่จะลบคำถามนี้?")) {
      const newQuestions = questions.filter((_, i) => i !== index);
      setQuestions(newQuestions);
      saveToStorage(newQuestions, null);
    }
  };

  const handleAddQuestion = () => {
    if (newItemText.trim()) {
      const newQuestions = [...questions, newItemText.trim()];
      setQuestions(newQuestions);
      saveToStorage(newQuestions, null);
      setNewItemText("");
      setShowAddForm(false);
    }
  };

  const handleEditChoice = (index) => {
    setEditingIndex(index);
    setEditingText(choices[index].label);
    setEditingValue(choices[index].value);
  };

  const handleSaveChoice = (index) => {
    const newChoices = [...choices];
    newChoices[index] = { label: editingText, value: editingValue };
    setChoices(newChoices);
    saveToStorage(null, newChoices);
    setEditingIndex(null);
    setEditingText("");
    setEditingValue(0);
  };

  const handleDeleteChoice = (index) => {
    if (confirm("คุณแน่ใจหรือไม่ที่จะลบตัวเลือกนี้?")) {
      const newChoices = choices.filter((_, i) => i !== index);
      setChoices(newChoices);
      saveToStorage(null, newChoices);
    }
  };

  const handleAddChoice = () => {
    if (newItemText.trim()) {
      const newChoices = [...choices, { label: newItemText.trim(), value: newItemValue }];
      setChoices(newChoices);
      saveToStorage(null, newChoices);
      setNewItemText("");
      setNewItemValue(0);
      setShowAddForm(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.replace("/login");
  };

  const resetToDefault = () => {
    if (confirm("คุณแน่ใจหรือไม่ที่จะรีเซ็ตข้อมูลกลับเป็นค่าเริ่มต้น?")) {
      setQuestions(initialQuestions);
      setChoices(initialChoices);
      localStorage.removeItem("admin_questions");
      localStorage.removeItem("admin_choices");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#D0F8FF]">
        <div className="text-[#432C81] text-xl">Loading...</div>
      </div>
    );
  }

  if (!authenticated || authenticated.email !== "admin@test.com") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#D0F8FF]">
        <div className="text-[#432C81] text-xl">Access Denied</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#D0F8FF] p-4">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#432C81]">Admin Panel</h1>
            <p className="text-[#432C81] opacity-70">จัดการคำถามและตัวเลือกการประเมิน PHQ-9</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={resetToDefault}
              className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600"
            >
              รีเซ็ต
            </button>
            <button
              onClick={() => router.push("/history")}
              className="rounded-lg bg-green-500 px-4 py-2 font-semibold text-white hover:bg-green-600"
            >
              ดู History
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-600"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setActiveTab("questions")}
            className={`rounded-lg px-6 py-3 font-semibold transition-colors ${
              activeTab === "questions"
                ? "bg-[#432C81] text-white"
                : "bg-white text-[#432C81] hover:bg-[#EFEAFE]"
            }`}
          >
            คำถาม ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab("choices")}
            className={`rounded-lg px-6 py-3 font-semibold transition-colors ${
              activeTab === "choices"
                ? "bg-[#432C81] text-white"
                : "bg-white text-[#432C81] hover:bg-[#EFEAFE]"
            }`}
          >
            ตัวเลือก ({choices.length})
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          {/* Questions Tab */}
          {activeTab === "questions" && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#432C81]">จัดการคำถาม</h2>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="rounded-lg bg-[#432C81] px-4 py-2 font-semibold text-white hover:opacity-90"
                >
                  {showAddForm ? "ยกเลิก" : "เพิ่มคำถาม"}
                </button>
              </div>

              {/* Add Form */}
              {showAddForm && (
                <div className="mb-6 rounded-lg bg-[#F6F7FB] p-4">
                  <h3 className="mb-3 font-semibold text-[#432C81]">เพิ่มคำถามใหม่</h3>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      placeholder="กรอกคำถามใหม่..."
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-[#432C81] focus:outline-none"
                    />
                    <button
                      onClick={handleAddQuestion}
                      className="rounded-lg bg-green-500 px-4 py-2 font-semibold text-white hover:bg-green-600"
                    >
                      เพิ่ม
                    </button>
                  </div>
                </div>
              )}

              {/* Questions List */}
              <div className="space-y-3">
                {questions.map((question, index) => (
                  <div key={index} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="mb-2 text-sm font-medium text-[#432C81]">
                          คำถามที่ {index + 1}
                        </div>
                        {editingIndex === index ? (
                          <div className="flex gap-2">
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-[#432C81] focus:outline-none"
                              rows="2"
                            />
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => handleSaveQuestion(index)}
                                className="rounded bg-green-500 px-3 py-1 text-sm font-semibold text-white hover:bg-green-600"
                              >
                                บันทึก
                              </button>
                              <button
                                onClick={() => setEditingIndex(null)}
                                className="rounded bg-gray-500 px-3 py-1 text-sm font-semibold text-white hover:bg-gray-600"
                              >
                                ยกเลิก
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-700">{question}</p>
                        )}
                      </div>
                      {editingIndex !== index && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditQuestion(index)}
                            className="rounded bg-blue-500 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-600"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(index)}
                            className="rounded bg-red-500 px-3 py-1 text-sm font-semibold text-white hover:bg-red-600"
                          >
                            ลบ
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Choices Tab */}
          {activeTab === "choices" && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#432C81]">จัดการตัวเลือก</h2>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="rounded-lg bg-[#432C81] px-4 py-2 font-semibold text-white hover:opacity-90"
                >
                  {showAddForm ? "ยกเลิก" : "เพิ่มตัวเลือก"}
                </button>
              </div>

              {/* Add Form */}
              {showAddForm && (
                <div className="mb-6 rounded-lg bg-[#F6F7FB] p-4">
                  <h3 className="mb-3 font-semibold text-[#432C81]">เพิ่มตัวเลือกใหม่</h3>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      placeholder="กรอกข้อความตัวเลือก..."
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-[#432C81] focus:outline-none"
                    />
                    <input
                      type="number"
                      value={newItemValue}
                      onChange={(e) => setNewItemValue(parseInt(e.target.value) || 0)}
                      placeholder="คะแนน"
                      className="w-24 rounded-lg border border-gray-300 px-3 py-2 focus:border-[#432C81] focus:outline-none"
                    />
                    <button
                      onClick={handleAddChoice}
                      className="rounded-lg bg-green-500 px-4 py-2 font-semibold text-white hover:bg-green-600"
                    >
                      เพิ่ม
                    </button>
                  </div>
                </div>
              )}

              {/* Choices List */}
              <div className="space-y-3">
                {choices.map((choice, index) => (
                  <div key={index} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        {editingIndex === index ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-[#432C81] focus:outline-none"
                            />
                            <input
                              type="number"
                              value={editingValue}
                              onChange={(e) => setEditingValue(parseInt(e.target.value) || 0)}
                              className="w-24 rounded-lg border border-gray-300 px-3 py-2 focus:border-[#432C81] focus:outline-none"
                            />
                            <button
                              onClick={() => handleSaveChoice(index)}
                              className="rounded bg-green-500 px-3 py-2 text-sm font-semibold text-white hover:bg-green-600"
                            >
                              บันทึก
                            </button>
                            <button
                              onClick={() => setEditingIndex(null)}
                              className="rounded bg-gray-500 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-600"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <span className="text-gray-700">{choice.label}</span>
                            <span className="rounded-full bg-[#432C81] px-3 py-1 text-sm font-semibold text-white">
                              {choice.value} คะแนน
                            </span>
                          </div>
                        )}
                      </div>
                      {editingIndex !== index && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditChoice(index)}
                            className="rounded bg-blue-500 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-600"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => handleDeleteChoice(index)}
                            className="rounded bg-red-500 px-3 py-1 text-sm font-semibold text-white hover:bg-red-600"
                          >
                            ลบ
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preview Section */}
        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h3 className="mb-4 text-xl font-bold text-[#432C81]">ตัวอย่างการแสดงผล</h3>
          <div className="rounded-lg bg-[#F6F7FB] p-4">
            <p className="mb-3 font-semibold text-[#432C81]">
              {questions[0] || "ยังไม่มีคำถาม"}
            </p>
            <div className="space-y-2">
              {choices.map((choice, index) => (
                <div
                  key={index}
                  className="rounded-lg bg-white px-4 py-2 text-[#432C81] shadow-sm"
                >
                  {choice.label} ({choice.value})
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}