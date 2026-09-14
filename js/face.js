// ========================================
// PET SCAN CAMERA
// ========================================

// เก็บ Camera Stream
let petStream = null;


// ========================================
// เปิดกล้องสำหรับสแกนสัตว์เลี้ยง
// ========================================

async function startPetCamera() {

    // ถ้ามีกล้องเปิดอยู่แล้ว
    if (
        petStream &&
        petStream.getVideoTracks().length > 0 &&
        petStream.getVideoTracks()[0].readyState === "live"
    ) {
        console.log("🟢 Pet Camera เปิดอยู่แล้ว");
        return;
    }

    const video = document.getElementById("petVideo");
    const status = document.getElementById("petScanStatus");

    if (!video) {
        throw new Error("ไม่พบ petVideo");
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser นี้ไม่รองรับการเปิดกล้อง");
    }

    if (status) {
        status.textContent = "กำลังขอสิทธิ์ใช้กล้อง...";
    }

    console.log("กำลังขอสิทธิ์ใช้กล้อง...");

    petStream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: "environment",
            width: {
                ideal: 640
            },
            height: {
                ideal: 480
            }
        },
        audio: false
    });

    console.log("ได้ Pet Camera Stream แล้ว");

    video.srcObject = petStream;

    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;

    await video.play();

    console.log(
        "เปิด Pet Camera สำเร็จ",
        video.videoWidth,
        "x",
        video.videoHeight
    );

    if (status) {
        status.textContent =
            "เปิดกล้องแล้ว กรุณาหันกล้องไปที่ใบหน้าสัตว์เลี้ยง";
    }
}


// ========================================
// ปิดกล้อง
// ========================================

function stopPetCamera() {

    // ปิด Camera Stream
    if (petStream) {

        petStream.getTracks().forEach(track => {
            track.stop();
        });

        petStream = null;
    }


    // ล้าง Video
    const video = document.getElementById("petVideo");

    if (video) {
        video.pause();
        video.srcObject = null;
    }


    // ล้าง Overlay
    const canvas = document.getElementById("petOverlay");

    if (canvas) {

        const ctx = canvas.getContext("2d");

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );
    }


    console.log("🔴 Pet Camera ปิดแล้ว");
}


// ========================================
// เปิดกล้องจากปุ่ม
// ========================================

async function startFaceScanCamera() {

    const status = document.getElementById("petScanStatus");

    try {

        if (status) {
            status.textContent = "กำลังเปิดกล้อง...";
        }

        await startPetCamera();

    } catch (error) {

        console.error(
            "❌ Pet Camera Error:",
            error
        );

        if (status) {
            status.textContent =
                "❌ " + error.message;
        }

    }
}

// ========================================
// เริ่มสแกนสัตว์เลี้ยง
// ========================================

async function startPetScan() {

    const video = document.getElementById("petVideo");
    const status = document.getElementById("petScanStatus");
    const resultBox = document.getElementById("petScanResult");

    try {

        // ========================================
        // ตรวจสอบกล้อง
        // ========================================

        if (
            !petStream ||
            petStream.getVideoTracks().length === 0 ||
            petStream.getVideoTracks()[0].readyState !== "live"
        ) {

            if (status) {
                status.textContent =
                    "กรุณาเปิดกล้องก่อนเริ่มสแกน";
            }

            return;
        }


        // ========================================
        // ตรวจสอบ Video
        // ========================================

        if (
            !video ||
            video.readyState < 2 ||
            video.videoWidth === 0 ||
            video.videoHeight === 0
        ) {

            if (status) {
                status.textContent =
                    "กำลังเตรียมภาพจากกล้อง...";
            }

            return;
        }


        // ========================================
        // สถานะ
        // ========================================

        if (status) {
            status.textContent =
                "กำลังจับภาพสัตว์เลี้ยง...";
        }

        console.log("🐶 เริ่มจับภาพ Pet Scan");


        // ========================================
        // สร้าง Canvas
        // ========================================

        const canvas = document.createElement("canvas");

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");

        if (!ctx) {
            throw new Error("ไม่สามารถสร้าง Canvas ได้");
        }


        // ========================================
        // จับภาพจากกล้อง
        // ========================================

        ctx.drawImage(
            video,
            0,
            0,
            canvas.width,
            canvas.height
        );


        // ========================================
        // แปลงภาพเป็น Blob
        // ========================================

        const blob = await new Promise(resolve => {

            canvas.toBlob(
                resolve,
                "image/jpeg",
                0.9
            );

        });

        if (!blob) {
            throw new Error("ไม่สามารถสร้างไฟล์ภาพได้");
        }


        console.log(
            "📸 จับภาพสำเร็จ:",
            canvas.width,
            "x",
            canvas.height
        );


        // ========================================
        // เตรียมส่งไป /upload
        // ========================================

        if (status) {
            status.textContent =
                "กำลังอัปโหลดภาพ...";
        }

        const formData = new FormData();

        formData.append(
            "image",
            blob,
            "pet-scan.jpg"
        );


        // ========================================
        // ส่งรูปไป Backend
        // ========================================

        const response = await fetch(
            "http://localhost:3000/upload",
            {
                method: "POST",
                body: formData
            }
        );


        const result = await response.json();

        console.log(
            "📤 Upload Result:",
            result
        );


        // ========================================
        // ตรวจสอบ Upload
        // ========================================

        if (!response.ok || !result.success) {

            throw new Error(
                result.message ||
                "อัปโหลดภาพไม่สำเร็จ"
            );

        }


        const imagePath =
            result.data.image;


        console.log(
            "✅ Upload สำเร็จ:",
            imagePath
        );

        // ========================================
// ส่งภาพไป Pet Scan API
// ========================================

if (status) {
    status.textContent =
        "กำลังวิเคราะห์และค้นหาสัตว์เลี้ยง...";
}

console.log(
    "🔎 กำลังส่งภาพไป /pet-scan:",
    imagePath
);


const scanResponse = await fetch(
    "http://localhost:3000/pet-scan",
    {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            image: imagePath
        })
    }
);


const scanResult =
    await scanResponse.json();


console.log(
    "🔎 Pet Scan Result:",
    scanResult
);


// ========================================
// ตรวจสอบผล Scan
// ========================================

if (
    !scanResponse.ok ||
    !scanResult.success
) {

    throw new Error(
        scanResult.message ||
        "ไม่สามารถสแกนสัตว์เลี้ยงได้"
    );

}


// ========================================
// เก็บผลลัพธ์
// ========================================

const results =
    scanResult.data || [];


console.log(
    "พบผลลัพธ์:",
    results.length
);


// ========================================
// แสดงผลบนเว็บ
// ========================================

if (resultBox) {

    resultBox.style.display = "block";


    if (results.length === 0) {

        resultBox.innerHTML = `
            <div style="text-align:center;">

                <i
                    class="fa-solid fa-paw"
                    style="
                        font-size:2rem;
                        color:var(--primary-orange);
                        margin-bottom:0.8rem;
                    "
                ></i>

                <h3>
                    ยังไม่พบข้อมูลสัตว์เลี้ยง
                </h3>

                <p class="text-muted-sm">
                    ยังไม่มีโพสต์ที่มีข้อมูลสำหรับเปรียบเทียบ
                </p>

            </div>
        `;

    } else {

        resultBox.innerHTML = `

            <div>

                <h3 style="margin-bottom:1rem;">
                    ผลการค้นหา
                </h3>

                ${results.map((post, index) => `

                    <div
                        style="
                            display:flex;
                            gap:12px;
                            padding:12px;
                            margin-bottom:10px;
                            border:1px solid var(--border-light);
                            border-radius:12px;
                            background:#fff;
                        "
                    >

                        <img
                            src="${post.image}"
                            style="
                                width:80px;
                                height:80px;
                                object-fit:cover;
                                border-radius:10px;
                            "
                        >

                        <div style="flex:1;">

                            <strong>
                                ${index + 1}.
                                ${post.pet_name || "ไม่ระบุชื่อ"}
                            </strong>

                            <div class="text-muted-sm">
                                ประเภท:
                                ${post.pet_type || "-"}
                            </div>

                            <div class="text-muted-sm">
                                จังหวัด:
                                ${post.province || "-"}
                            </div>

                            <div class="text-muted-sm">
                                Similarity:
                                ${Number(post.similarity).toFixed(4)}
                            </div>

                        </div>

                    </div>

                `).join("")}

            </div>
        `;
    }
}


// ========================================
// สถานะสำเร็จ
// ========================================

if (status) {

    status.textContent =
        "สแกนเสร็จแล้ว ✅";

}


console.log(
    "✅ Pet Scan ทำงานครบแล้ว"
);

    } catch (error) {

        console.error(
            "❌ Pet Scan Error:",
            error
        );

        if (status) {
            status.textContent =
                "❌ " + error.message;
        }

    }

}


// ========================================
// Alias สำหรับ nav.js
// ========================================

// nav.js เดิมเรียก stopFaceCamera()
// เพื่อไม่ให้ส่วนอื่นของระบบพัง
function stopFaceCamera() {
    stopPetCamera();
}


// ========================================
// Export Functions
// ========================================

window.startFaceScanCamera = startFaceScanCamera;
window.startPetCamera = startPetCamera;
window.stopPetCamera = stopPetCamera;
window.stopFaceCamera = stopFaceCamera;
window.startPetScan = startPetScan;


// ========================================
// Debug
// ========================================

console.log("✅ pet scan camera js โหลดสำเร็จ");
console.log(
    "startFaceScanCamera:",
    typeof window.startFaceScanCamera
);
console.log(
    "startPetScan:",
    typeof window.startPetScan
);