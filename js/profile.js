// ==========================================================
// หน้าโปรไฟล์ผู้ใช้ - โหลด/บันทึกข้อมูลลง SQL ผ่าน API
// ==========================================================
async function loadProfile() {
  if (!requireLogin()) return;

  const userId = getCurrentUserId();
  document.getElementById('user_id').value = userId;

  try {
    const { data: user } = await api.get(`/users/${userId}`);

    document.getElementById('first_name').value = user.first_name || '';
    document.getElementById('last_name').value = user.last_name || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('phone').value = user.phone || '';
    document.getElementById('province').value = user.province || '';
    document.getElementById('region_zone').value = user.region_zone || 'north';
    document.getElementById('address_detail').value = user.address_detail || '';

  } catch (err) {
    console.error('โหลดโปรไฟล์ไม่สำเร็จ:', err.message);
  }
}

async function saveUserProfile(e) {
  e.preventDefault();
  if (!requireLogin()) return;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  const userId = document.getElementById('user_id').value;
  const userData = {
    first_name: document.getElementById('first_name').value,
    last_name: document.getElementById('last_name').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    province: document.getElementById('province').value,
    region_zone: document.getElementById('region_zone').value,
    address_detail: document.getElementById('address_detail').value
  };

  try {
    await api.put(`/users/${userId}`, userData);
    alert('✓ บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว!');
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการเชื่อมต่อ:', error);
    alert('ไม่สามารถบันทึกข้อมูลได้: ' + error.message);
  } finally {
    submitBtn.disabled = false;
  }
}

function toggleProfileField(fieldId, button) {
    const input = document.getElementById(fieldId);

    if (!input) return;

    const isHidden = input.dataset.private === "true";

    if (isHidden) {
        // แสดงข้อมูล
        if (fieldId === "email") {
            input.type = "email";
        } else if (fieldId === "phone") {
            input.type = "tel";
        } else {
            input.type = "text";
        }

        input.dataset.private = "false";

        button.innerHTML = '<i class="fa-solid fa-eye"></i>';
        button.title = "ซ่อนข้อมูล";

    } else {
        // ซ่อนข้อมูล
        input.type = "password";
        input.dataset.private = "true";

        button.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
        button.title = "แสดงข้อมูล";
    }
}

window.toggleProfileField = toggleProfileField;