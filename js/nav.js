// ==========================================================
// สลับหน้า (tab) และเรียกฟังก์ชันโหลดข้อมูลของแต่ละหน้าเมื่อถูกเปิด
// ==========================================================

// หน้าที่ต้องล็อกอินก่อนถึงจะเข้าได้
const AUTH_REQUIRED_TABS = ['profile', 'chat', 'noti', 'post'];

function switchTab(tabId) {

  if (
    tabId !== "faceid" &&
    typeof stopFaceCamera === "function"
  ) {
    stopFaceCamera();
  }
  
  if (AUTH_REQUIRED_TABS.includes(tabId) && !isLoggedIn()) {
    alert('กรุณาเข้าสู่ระบบ หรือสมัครสมาชิกก่อนใช้งานส่วนนี้');
    tabId = 'auth';
  }

  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

  document.getElementById('view-' + tabId).classList.add('active');
  const activeNav = document.getElementById('nav-' + tabId);
  if (activeNav) activeNav.classList.add('active');

  // โหลด/รีเฟรชข้อมูลของหน้านั้นๆ ทุกครั้งที่เปิด
  switch (tabId) {
    case 'home':
      setTimeout(() => window.mainMap && window.mainMap.invalidateSize(), 200);
      loadMapMarkers();
      break;
    case 'postlist':
      loadPostList();
      break;
    case 'post':
      initPostMap();
      break;
    case 'profile':
      loadProfile();
      break;
    case 'noti':
      loadNotifications();
      break;
    case 'chat':
      loadChatContacts();
      break;
  }
}

// ---------- Floating Action Button (แทนแถบสีส้มด้านข้างที่บดบังจอเดิม) ----------
function toggleFabMenu() {
  document.getElementById('fabMenu').classList.toggle('open');
  document.getElementById('fabButton').classList.toggle('open');
}

function closeFabMenu() {
  document.getElementById('fabMenu').classList.remove('open');
  document.getElementById('fabButton').classList.remove('open');
}

document.addEventListener('click', (e) => {
  const menu = document.getElementById('fabMenu');
  const btn = document.getElementById('fabButton');
  if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
    closeFabMenu();
  }
});
