// ==========================================================
// ตัวช่วยเรียก API ทั้งหมด - ทุกไฟล์ js อื่นเรียกผ่านตัวนี้ที่เดียว
// ==========================================================
const API_BASE = 'http://localhost:3000';

async function apiRequest(path, options = {}) {
  const res = await fetch(API_BASE + path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.message || `เกิดข้อผิดพลาด (HTTP ${res.status})`);
  }
  return data;
}

const api = {
  get: (path) => apiRequest(path),

  post: (path, body) =>
    apiRequest(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }),

  put: (path, body) =>
    apiRequest(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }),

  patch: (path, body) =>
    apiRequest(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    }),

  // สำหรับส่งฟอร์มที่มีไฟล์แนบ (multipart/form-data) เช่น สร้างโพสต์พร้อมรูป
  postForm: (path, formData) =>
    apiRequest(path, {
      method: 'POST',
      body: formData
    })
};

// ผู้ใช้ที่ "ล็อกอิน" อยู่ตอนนี้ (มาจากระบบ login จริงแล้ว - เก็บ id/token ไว้ใน localStorage)
function getCurrentUserId() {
  return localStorage.getItem('current_user_id'); // คืนค่า null ถ้ายังไม่ได้ล็อกอิน
}

function isLoggedIn() {
  return !!localStorage.getItem('auth_token');
}

// เรียกใช้ก่อนฟีเจอร์ที่ต้องล็อกอิน (โพสต์, แชท, โปรไฟล์) ถ้ายังไม่ได้ล็อกอินจะพาไปหน้า login ให้เอง
function requireLogin() {
  if (!isLoggedIn()) {
    alert('กรุณาเข้าสู่ระบบ หรือสมัครสมาชิกก่อนใช้งานส่วนนี้');
    switchTab('auth');
    return false;
  }
  return true;
}
