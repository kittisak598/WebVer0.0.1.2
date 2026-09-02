// ==========================================================
// รายการโพสต์
// ==========================================================

let allPosts = [];

async function loadPostList() {
    await fetchAndRenderPosts();
}

async function fetchAndRenderPosts() {

    const container = document.getElementById("postCardContainer");

    if (!container) return;

    container.innerHTML = "กำลังโหลด...";

    try {

        const result = await api.get("/posts");

        allPosts = result.data;

        renderPostCards(allPosts);

    } catch (err) {

        container.innerHTML = err.message;

    }

}

function renderPostCards(posts) {

    const container = document.getElementById("postCardContainer");

    if (!Array.isArray(posts) || posts.length === 0) {

        container.innerHTML = "<p>ยังไม่มีโพสต์</p>";

        return;

    }

    container.innerHTML = posts.map(post => `

        <div class="card-minimal">

            ${post.image
                ? `<img src="http://localhost:3000${post.image}" style="width:100%;border-radius:10px;">`
                : ""
            }

            <h3>${post.pet_name}</h3>

            <p>${post.description ?? ""}</p>

            <p><b>จังหวัด :</b> ${post.province}</p>

            <button onclick="startConversation(${post.id},${post.user_id},'เจ้าของโพสต์')">
                แชท
            </button>

        </div>

    `).join("");

}

// ==========================================================
// สร้างโพสต์
// ==========================================================

async function handlePostSubmit(e) {

    e.preventDefault();

    if (!requireLogin()) return;

    let image = "";

    const file = document.getElementById("postImage").files[0];

    console.log("ไฟล์ที่เลือก:", file);

    if (file) {

        const formData = new FormData();

        formData.append("image", file);

        const uploadResult =
            await api.postForm("/upload", formData);

        console.log("ผลจาก /upload:", uploadResult);

        image = uploadResult.data.image;

        console.log("image ที่จะส่งเข้า /posts:", image);
    }

    console.log({
    lat: document.getElementById("postLat").value,
    lng: document.getElementById("postLng").value
});

    await api.post("/posts", {

    user_id: getCurrentUserId(),

    pet_name:
        document.getElementById("postPetName").value,

    pet_type: "",

    breed: "",

    province:
        document.getElementById("postProvince").value,

    description:
        document.getElementById("postDescription").value,

    image: image,

    latitude:
        document.getElementById("postLat").value,

    longitude:
        document.getElementById("postLng").value

    });

    alert("สร้างโพสต์สำเร็จ");

    e.target.reset();

    loadPostList();

    switchTab("postlist");

}

// ==========================================================
// เตรียมฟอร์มสร้างโพสต์
// ==========================================================

function setupPostForm() {

    // จังหวัดในหน้าสร้างโพสต์
    populateProvinceSelect("postProvince", {
        group: true,
        includeAllOption: false
    });

    // จังหวัดในหน้ารายการโพสต์
    populateProvinceSelect("provincePostFilter", {
        group: true,
        includeAllOption: true
    });

}

// ==========================================================
// ค้นหาและกรองโพสต์
// ==========================================================

function filterPostCards() {

    const keyword = document
        .getElementById("searchInput")
        .value
        .toLowerCase();

    const province =
        document.getElementById("provincePostFilter").value;

    const filtered = allPosts.filter(post => {

        const matchKeyword =
            (post.pet_name || "").toLowerCase().includes(keyword) ||
            (post.description || "").toLowerCase().includes(keyword);

        const matchProvince =
            province === "all" ||
            province === "" ||
            post.province === province;

        return matchKeyword && matchProvince;

    });

    renderPostCards(filtered);

}