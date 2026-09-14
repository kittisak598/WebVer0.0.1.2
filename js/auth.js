// ==========================================================
// เข้าสู่ระบบ / สมัครสมาชิก
// Email หรือ Username + รหัสผ่าน
// ==========================================================

function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('loginForm').style.display = isLogin ? 'block' : 'none';
  document.getElementById('registerForm').style.display = isLogin ? 'none' : 'block';
  document.getElementById('authTabLogin').classList.toggle('active', isLogin);
  document.getElementById('authTabRegister').classList.toggle('active', !isLogin);
}

function saveSession(user) {
  localStorage.setItem('current_user_id', user.id);

  if (user.token) {
    localStorage.setItem('auth_token', user.token);
  }

  updateAuthNavUI();
}

function logout() {
  localStorage.removeItem('current_user_id');
  localStorage.removeItem('auth_token');

  updateAuthNavUI();
  switchTab('auth');
}

// ปรับปุ่ม "เข้าสู่ระบบ" บนแถบเมนูบน
// ให้เปลี่ยนเป็นชื่อ/โปรไฟล์เมื่อ login แล้ว
function updateAuthNavUI() {
  const nav = document.getElementById('nav-auth');

  if (!nav) return;

  const loggedIn = isLoggedIn();

  nav.innerHTML = loggedIn
    ? '<i class="fa-solid fa-circle-user"></i> โปรไฟล์ของฉัน (ออกจากระบบ)'
    : '<i class="fa-solid fa-user"></i> เข้าสู่ระบบ / สมัครสมาชิก';

  nav.onclick = () => {
    if (loggedIn) {
      if (confirm('ต้องการออกจากระบบหรือไม่?')) {
        logout();
      } else {
        switchTab('profile');
      }
    } else {
      switchTab('auth');
    }
  };
}

async function handleLogin(e) {
  e.preventDefault();

  const errEl = document.getElementById('loginError');
  errEl.textContent = '';

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;

  try {
    const { data } = await api.post('/auth/login', {
      identifier: document.getElementById('loginIdentifier').value.trim(),
      password: document.getElementById('loginPassword').value
    });

    saveSession(data);
    switchTab('profile');

  } catch (err) {
    errEl.textContent = err.message;

  } finally {
    btn.disabled = false;
  }
}

async function handleRegister(e) {
  e.preventDefault();

  console.log("กดปุ่มสมัครสมาชิก");

  const errEl = document.getElementById("registerError");
  errEl.textContent = "";

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;

  const user = {
    first_name: document.getElementById("regFirstName").value.trim(),
    last_name: document.getElementById("regLastName").value.trim(),
    username: document.getElementById("regUsername").value.trim(),
    email: document.getElementById("regEmail").value.trim(),
    password: document.getElementById("regPassword").value
  };

  console.log("ข้อมูลที่จะส่ง =", user);

  try {

    console.log("กำลังเรียก API...");

    const response = await api.post("/auth/register", user);

    console.log("API ตอบกลับ =", response);

    if (response.data) {
      saveSession(response.data);
    }

    alert("สมัครสมาชิกสำเร็จ");

    switchTab("profile");

  } catch (err) {

    console.error("Register Error =", err);

    errEl.textContent = err.message;

  } finally {

    btn.disabled = false;

  }
}