import httpClient from "./httpClient";

// ฟังก์ชันเดิมสำหรับ PHQ-9 (เก็บไว้เพื่อ backward compatibility)
export const getPhq9History = async (user_id) => {
  const res = await httpClient.get("/api/phq9/history/" + user_id);
  return res.data;
};

// ฟังก์ชันใหม่สำหรับการประเมินทุกประเภท
export const getAssessmentHistory = async (user_id, assessment_type = null) => {
  try {
    let url = "/api/assessments/history/" + user_id;
    if (assessment_type) {
      url += "?type=" + assessment_type;
    }
    
    const res = await httpClient.get(url);
    return res.data;
  } catch (error) {
    console.error('Error fetching assessment history:', error);
    // Return ในรูปแบบที่โค้ดเดิมคาดหวัง
    return {
      result: false,
      status: error.response?.status || 500,
      data: []
    };
  }
};

// บันทึกผลการประเมิน
export const saveAssessmentResult = async (assessmentData) => {
  try {
    const res = await httpClient.post("/api/assessments", assessmentData);
    return res.data;
  } catch (error) {
    console.error('Error saving assessment result:', error);
    return {
      result: false,
      status: error.response?.status || 500,
      message: 'บันทึกผลการประเมินไม่สำเร็จ'
    };
  }
};

// ลบประวัติการประเมิน
export const deleteAssessment = async (assessmentId) => {
  try {
    const res = await httpClient.delete(`/api/assessments/${assessmentId}`);
    return res.data;
  } catch (error) {
    console.error('Error deleting assessment:', error);
    return {
      result: false,
      status: error.response?.status || 500,
      message: 'ลบประวัติไม่สำเร็จ'
    };
  }
};

// ดึงสถิติการประเมิน
export const getAssessmentStats = async (user_id) => {
  try {
    const res = await httpClient.get("/api/assessments/stats/" + user_id);
    return res.data;
  } catch (error) {
    console.error('Error fetching assessment stats:', error);
    return {
      result: false,
      status: error.response?.status || 500,
      data: null
    };
  }
};