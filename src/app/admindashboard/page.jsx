"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthen } from '@/utils/useAuthen';

export default function AdminDashboard() {
  const router = useRouter();
  const { isLoading, authenticated } = useAuthen();
  
  const [users, setUsers] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ตรวจสอบสิทธิ์ Admin
  useEffect(() => {
    if (!isLoading) {
      if (!authenticated) {
        router.replace('/login');
        return;
      }
      
      // ตรวจสอบว่าเป็น Admin หรือไม่
      if (authenticated.role !== 'admin' && authenticated.user_type !== 'admin') {
        router.replace('/home'); // ถ้าไม่ใช่ admin ให้กลับไปหน้า home
        return;
      }
      
      loadAdminData();
    }
  }, [isLoading, authenticated, router]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // โหลดข้อมูลผู้ใช้ทั้งหมด
      const usersResponse = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const usersData = await usersResponse.json();
      
      // โหลดข้อมูลการประเมินทั้งหมด
      const assessmentsResponse = await fetch('/api/admin/assessments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const assessmentsData = await assessmentsResponse.json();
      
      if (usersData.result) setUsers(usersData.data || []);
      if (assessmentsData.result) setAssessments(assessmentsData.data || []);
      
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  // คำนวณสถิติรวม
  const stats = {
    totalUsers: users.length,
    totalAssessments: assessments.length,
    highRiskUsers: assessments.filter(a => a.total_score >= 20).length,
    averageScore: assessments.length > 0 
      ? (assessments.reduce((sum, a) => sum + a.total_score, 0) / assessments.length).toFixed(1)
      : 0
  };

  // กรองผู้ใช้ตามคำค้นหา
  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // หาการประเมินของผู้ใช้
  const getUserAssessments = (userId) => {
    return assessments.filter(a => a.user_id === userId);
  };

  const getScoreColor = (score) => {
    if (score <= 4) return 'text-green-600';
    if (score <= 9) return 'text-lime-600';
    if (score <= 14) return 'text-yellow-600';
    if (score <= 19) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRiskLevel = (score) => {
    if (score <= 4) return 'ปกติ';
    if (score <= 9) return 'เล็กน้อย';
    if (score <= 14) return 'ปานกลาง';
    if (score <= 19) return 'ค่อนข้างรุนแรง';
    return 'รุนแรง';
  };

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#D0F8FF]">
        <div className="text-[#432C81] text-xl">Loading Admin Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#D0F8FF]">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-[#432C81]">🛡️ Admin Dashboard</h1>
              <span className="text-sm text-gray-600">
                Welcome, {authenticated?.username}
              </span>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                router.push('/login');
              }}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-3xl font-bold text-[#432C81]">{stats.totalUsers}</div>
            <div className="text-gray-600">ผู้ใช้ทั้งหมด</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-3xl font-bold text-blue-600">{stats.totalAssessments}</div>
            <div className="text-gray-600">การประเมินทั้งหมด</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-3xl font-bold text-red-600">{stats.highRiskUsers}</div>
            <div className="text-gray-600">ผู้ใช้กลุ่มเสี่ยงสูง</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-3xl font-bold text-purple-600">{stats.averageScore}</div>
            <div className="text-gray-600">คะแนนเฉลี่ย</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b">
            <div className="flex gap-0">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 font-semibold border-b-2 ${
                  activeTab === 'overview'
                    ? 'border-[#432C81] text-[#432C81]'
                    : 'border-transparent text-gray-600 hover:text-[#432C81]'
                }`}
              >
                ภาพรวม
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-4 font-semibold border-b-2 ${
                  activeTab === 'users'
                    ? 'border-[#432C81] text-[#432C81]'
                    : 'border-transparent text-gray-600 hover:text-[#432C81]'
                }`}
              >
                จัดการผู้ใช้
              </button>
              <button
                onClick={() => setActiveTab('assessments')}
                className={`px-6 py-4 font-semibold border-b-2 ${
                  activeTab === 'assessments'
                    ? 'border-[#432C81] text-[#432C81]'
                    : 'border-transparent text-gray-600 hover:text-[#432C81]'
                }`}
              >
                ข้อมูลการประเมิน
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-[#432C81]">ภาพรวมระบบ</h3>
                
                {/* Recent High Risk Users */}
                <div className="bg-red-50 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-3">🚨 ผู้ใช้กลุ่มเสี่ยงสูง (คะแนน ≥ 20)</h4>
                  {assessments
                    .filter(a => a.total_score >= 20)
                    .slice(0, 5)
                    .map((assessment, idx) => {
                      const user = users.find(u => u.user_id === assessment.user_id);
                      return (
                        <div key={idx} className="flex justify-between items-center py-2 border-b border-red-200 last:border-b-0">
                          <div>
                            <span className="font-semibold">{user?.username || 'Unknown'}</span>
                            <span className="text-sm text-gray-600 ml-2">({user?.email})</span>
                          </div>
                          <div className="text-right">
                            <span className="text-red-600 font-bold">{assessment.total_score}/27</span>
                            <div className="text-xs text-gray-500">
                              {new Date(assessment.created_at).toLocaleDateString('th-TH')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Recent Assessments */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-3">📊 การประเมินล่าสุด</h4>
                  {assessments
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 10)
                    .map((assessment, idx) => {
                      const user = users.find(u => u.user_id === assessment.user_id);
                      return (
                        <div key={idx} className="flex justify-between items-center py-2 border-b border-blue-200 last:border-b-0">
                          <div>
                            <span className="font-semibold">{user?.username || 'Unknown'}</span>
                            <span className="text-sm text-gray-600 ml-2">
                              {getRiskLevel(assessment.total_score)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className={`font-bold ${getScoreColor(assessment.total_score)}`}>
                              {assessment.total_score}/27
                            </span>
                            <div className="text-xs text-gray-500">
                              {new Date(assessment.created_at).toLocaleDateString('th-TH')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-[#432C81]">จัดการผู้ใช้</h3>
                  <input
                    type="text"
                    placeholder="ค้นหาผู้ใช้..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border border-gray-300 rounded-lg px-4 py-2 w-64"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-3 text-left">ผู้ใช้</th>
                        <th className="border border-gray-200 px-4 py-3 text-left">Email</th>
                        <th className="border border-gray-200 px-4 py-3 text-center">จำนวนครั้ง</th>
                        <th className="border border-gray-200 px-4 py-3 text-center">คะแนนล่าสุด</th>
                        <th className="border border-gray-200 px-4 py-3 text-center">วันที่สมัคร</th>
                        <th className="border border-gray-200 px-4 py-3 text-center">การดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user, idx) => {
                        const userAssessments = getUserAssessments(user.user_id);
                        const latestAssessment = userAssessments.sort((a, b) => 
                          new Date(b.created_at) - new Date(a.created_at)
                        )[0];
                        
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="border border-gray-200 px-4 py-3 font-semibold">
                              {user.username}
                            </td>
                            <td className="border border-gray-200 px-4 py-3">
                              {user.email}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center">
                              {userAssessments.length}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center">
                              {latestAssessment ? (
                                <span className={`font-bold ${getScoreColor(latestAssessment.total_score)}`}>
                                  {latestAssessment.total_score}/27
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center text-sm">
                              {user.created_at ? new Date(user.created_at).toLocaleDateString('th-TH') : '-'}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-center">
                              <button
                                onClick={() => setSelectedUser(user)}
                                className="bg-[#432C81] text-white px-3 py-1 rounded text-sm hover:opacity-90"
                              >
                                ดูรายละเอียด
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Assessments Tab */}
            {activeTab === 'assessments' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-[#432C81]">ข้อมูลการประเมินทั้งหมด</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-3 text-left">ผู้ใช้</th>
                        <th className="border border-gray-200 px-4 py-3 text-center">คะแนน</th>
                        <th className="border border-gray-200 px-4 py-3 text-center">ระดับ</th>
                        <th className="border border-gray-200 px-4 py-3 text-center">วันที่ประเมิน</th>
                        <th className="border border-gray-200 px-4 py-3 text-left">คำแนะนำ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assessments
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                        .map((assessment, idx) => {
                          const user = users.find(u => u.user_id === assessment.user_id);
                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="border border-gray-200 px-4 py-3">
                                <div className="font-semibold">{user?.username || 'Unknown'}</div>
                                <div className="text-sm text-gray-600">{user?.email}</div>
                              </td>
                              <td className="border border-gray-200 px-4 py-3 text-center">
                                <span className={`font-bold text-lg ${getScoreColor(assessment.total_score)}`}>
                                  {assessment.total_score}/27
                                </span>
                              </td>
                              <td className="border border-gray-200 px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  assessment.total_score <= 4 ? 'bg-green-100 text-green-700' :
                                  assessment.total_score <= 9 ? 'bg-lime-100 text-lime-700' :
                                  assessment.total_score <= 14 ? 'bg-yellow-100 text-yellow-700' :
                                  assessment.total_score <= 19 ? 'bg-orange-100 text-orange-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {getRiskLevel(assessment.total_score)}
                                </span>
                              </td>
                              <td className="border border-gray-200 px-4 py-3 text-center text-sm">
                                {new Date(assessment.created_at).toLocaleString('th-TH')}
                              </td>
                              <td className="border border-gray-200 px-4 py-3 text-sm">
                                {assessment.recommended_action || '-'}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-[#432C81]">
                  รายละเอียดผู้ใช้: {selectedUser.username}
                </h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <strong>Email:</strong> {selectedUser.email}
                </div>
                <div>
                  <strong>วันที่สมัคร:</strong> {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('th-TH') : '-'}
                </div>
              </div>

              <h4 className="font-bold text-[#432C81] mb-4">ประวัติการประเมิน</h4>
              <div className="space-y-3">
                {getUserAssessments(selectedUser.user_id)
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                  .map((assessment, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className={`text-2xl font-bold ${getScoreColor(assessment.total_score)}`}>
                            {assessment.total_score}/27
                          </div>
                          <div className="text-sm text-gray-600">
                            {getRiskLevel(assessment.total_score)}
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          {new Date(assessment.created_at).toLocaleString('th-TH')}
                        </div>
                      </div>
                      {assessment.recommended_action && (
                        <div className="mt-2 text-sm">
                          <strong>คำแนะนำ:</strong> {assessment.recommended_action}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}