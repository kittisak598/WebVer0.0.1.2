// ==========================================================
// แผนที่หลัก (หน้าแรก) + แผนที่ตอนสร้างโพสต์
// ==========================================================
window.mainMap = null;
let mainMapMarkers = [];
let postMap = null;
let postMapMarker = null;

// ===========================
// แผนที่หน้าแรก
// ===========================
function initMainMap() {

    window.mainMap = L.map("map").setView([13.7563, 100.5018], 6);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "© OpenStreetMap"
        }
    ).addTo(window.mainMap);

    // โหลดจังหวัดลง filter
    if (typeof populateProvinceSelect === "function") {
        populateProvinceSelect("provinceFilter", {
            includeAllOption: true,
            group: true
        });
    }

    loadMapMarkers();

}

// ===========================
// โหลดหมุดโพสต์
// ===========================
async function loadMapMarkers() {

    try {

        const result = await api.get("/posts");
        const posts = result.data;

        console.log(posts);

        // ลบหมุดเดิม
        mainMapMarkers.forEach(marker => {

            window.mainMap.removeLayer(marker);

        });

        mainMapMarkers = [];

        posts.forEach(post => {

  if (post.latitude == null || post.longitude == null) return;

  const ownerName =
    `${escapeHtml(post.first_name)} ${escapeHtml(post.last_name)}`;

  const popupHtml = `
  <div style="width:240px;">

    ${
      post.image
        ? `
          <img
            src="http://localhost:3000${post.image}"
            style="
              width:100%;
              height:160px;
              object-fit:cover;
              border-radius:10px;
              margin-bottom:8px;
            "
          >
        `
        : `
          <div style="
            width:100%;
            height:160px;
            background:#f1f1f1;
            border-radius:10px;
            display:flex;
            align-items:center;
            justify-content:center;
            margin-bottom:8px;
          ">
            ไม่มีรูป
          </div>
        `
    }

    <b>${escapeHtml(post.pet_name)}</b><br>

    <span>
      จังหวัด : ${escapeHtml(post.province)}
    </span><br>

    <span>
      รายละเอียด : ${escapeHtml(post.description || "-")}
    </span><br><br>

    <button
      onclick="startConversation(
        ${post.id},
        ${post.user_id},
        '${ownerName.replace(/'/g,"\\'")}'
      )"
    >
      แชท
    </button>

  </div>
`;

  const marker = L.marker([
      Number(post.latitude),
      Number(post.longitude)
  ])
  .addTo(window.mainMap)
  .bindPopup(popupHtml);

  mainMapMarkers.push(marker);

});

    }
    catch(err){

        console.error("โหลดหมุดไม่สำเร็จ",err);

    }

}

// ===========================
// เลือกจังหวัด
// ===========================
function filterProvince(){

    const provinceName =
        document.getElementById("provinceFilter").value;

    if(provinceName==="all"){

        window.mainMap.setView([13.7563,100.5018],6);

        return;

    }

    const province=findProvinceData(provinceName);

    if(province){

        window.mainMap.setView(
            [province.lat,province.lng],
            10
        );

    }

}

// ===========================
// กดจากรายการโพสต์
// ===========================
function locateOnMap(latitude, longitude) {

    switchTab("home");

    setTimeout(() => {

        window.mainMap.invalidateSize();

        window.mainMap.setView(
            [Number(latitude), Number(longitude)],
            13
        );

    }, 300);

}

// ===========================
// แผนที่สร้างโพสต์
// ===========================
function initPostMap(){

    if(postMap){

        setTimeout(()=>postMap.invalidateSize(),200);

        return;

    }

    setTimeout(()=>{

        postMap=L.map("postMap")
        .setView([13.7563,100.5018],6);

        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        ).addTo(postMap);

        postMap.on("click",(e)=>{

            const {lat,lng}=e.latlng;

            if(postMapMarker){

                postMap.removeLayer(postMapMarker);

            }

            postMapMarker=L.marker([lat,lng]).addTo(postMap);

            document.getElementById("postLat").value=lat.toFixed(7);
            document.getElementById("postLng").value=lng.toFixed(7);

        });

    },200);

}

// ===========================
// ป้องกัน XSS
// ===========================
function escapeHtml(str){

    const div=document.createElement("div");

    div.textContent=str??"";

    return div.innerHTML;

}