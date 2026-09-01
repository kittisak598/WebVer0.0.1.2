// ========================================
// FACE RECOGNITION
// ========================================

let faceStream = null;
let faceModelsLoaded = false;


// ========================================
// โหลด AI Models
// ========================================

async function loadFaceModels() {

    if (faceModelsLoaded) return;

    console.log("กำลังโหลด Face AI Models...");

    const MODEL_URL = "/models";

    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);

    faceModelsLoaded = true;

    console.log("Face AI Models โหลดสำเร็จ");
}


// ========================================
// เปิดกล้อง
// ========================================

async function startFaceCamera() {

    const video = document.getElementById("faceVideo");

    if (!video) {
        throw new Error("ไม่พบ faceVideo");
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser นี้ไม่รองรับการเปิดกล้อง");
    }

    console.log("กำลังขอสิทธิ์ใช้กล้อง...");

    faceStream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: "user",
            width: {
                ideal: 640
            },
            height: {
                ideal: 480
            }
        },
        audio: false
    });

    console.log("ได้ Camera Stream แล้ว");

    video.srcObject = faceStream;

    await video.play();

    console.log(
        "เปิดกล้องสำเร็จ",
        video.videoWidth,
        "x",
        video.videoHeight
    );
}


// ========================================
// ปิดกล้อง
// ========================================

function stopFaceCamera() {

    if (faceStream) {

        faceStream.getTracks().forEach(track => {
            track.stop();
        });

        faceStream = null;
    }

    const video = document.getElementById("faceVideo");

    if (video) {
        video.srcObject = null;
    }
}


// ========================================
// สร้าง Face Embedding
// ========================================

async function getFaceEmbedding() {

    const video = document.getElementById("faceVideo");

    if (!video) {
        throw new Error("ไม่พบกล้อง");
    }

    console.log("เริ่มตรวจจับใบหน้า...");
    console.log(
        "Video:",
        video.videoWidth,
        "x",
        video.videoHeight,
        "readyState:",
        video.readyState
    );

    const detection = await faceapi
        .detectSingleFace(
            video,
            new faceapi.TinyFaceDetectorOptions({
                inputSize: 320,
                scoreThreshold: 0.5
            })
        )
        .withFaceLandmarks(true)
        .withFaceDescriptor();

    console.log("Detection result:", detection);

    if (!detection) {
        throw new Error(
            "ไม่พบใบหน้า กรุณาหันหน้าเข้ากล้อง"
        );
    }

    console.log(
        "พบใบหน้า Score:",
        detection.detection.score
    );

    const embedding = Array.from(
        detection.descriptor
    );

    console.log(
        "Embedding length:",
        embedding.length
    );

    if (embedding.length !== 128) {
        throw new Error(
            "Face Embedding ต้องมี 128 ค่า"
        );
    }

    return embedding;
}

// ========================================
// เปิดกล้อง + โหลด Model
// ========================================

async function startFaceScanCamera() {

    try {

        document.getElementById("faceStatus").textContent =
            "กำลังโหลด AI...";

        await loadFaceModels();

        document.getElementById("faceStatus").textContent =
            "กำลังเปิดกล้อง...";

        await startFaceCamera();

        document.getElementById("faceStatus").textContent =
            "เปิดกล้องแล้ว กรุณาหันหน้าเข้ากล้อง";

    } catch (error) {

        console.error(error);

        document.getElementById("faceStatus").textContent =
            error.message;
    }
}


// ========================================
// REGISTER FACE ID
// ========================================

async function registerFace() {

    try {

        // ต้อง Login ก่อน
        if (!requireLogin()) {
            return;
        }

        const userId = getCurrentUserId();

        document.getElementById("faceStatus").textContent =
            "กำลังตรวจสอบใบหน้า...";

        // สร้าง Face Embedding
        const embedding = await getFaceEmbedding();

        console.log("Embedding:", embedding);
        console.log("จำนวนค่า:", embedding.length);

        document.getElementById("faceStatus").textContent =
            "กำลังบันทึก Face ID...";

        // ส่งไป Server
        const response = await fetch(
            "http://localhost:3000/face/register",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    user_id: Number(userId),
                    face_embedding: embedding
                })
            }
        );

        const result = await response.json();

        console.log("Register Face:", result);

        if (!result.success) {
            throw new Error(result.message);
        }

        document.getElementById("faceStatus").textContent =
            "✅ ลงทะเบียน Face ID สำเร็จ";

        alert("ลงทะเบียน Face ID สำเร็จ");

    } catch (error) {

        console.error("Register Face Error:", error);

        document.getElementById("faceStatus").textContent =
            error.message;
    }
}


// ========================================
// FACE LOGIN
// ========================================

async function loginWithFace() {

    const status = document.getElementById("faceStatus");

    try {

        console.log("===== FACE LOGIN START =====");

        if (!status) {
            throw new Error("ไม่พบ faceStatus");
        }

        status.textContent = "กำลังโหลด AI...";

        // โหลด Model
        await loadFaceModels();

        console.log("Models พร้อมแล้ว");

        // ========================================
        // ตรวจสอบกล้อง
        // ========================================

        if (
            !faceStream ||
            faceStream.getVideoTracks().length === 0 ||
            faceStream.getVideoTracks()[0].readyState !== "live"
        ) {

            console.log("กำลังเปิดกล้องใหม่...");

            status.textContent = "กำลังเปิดกล้อง...";

            await startFaceCamera();
        }

        const video = document.getElementById("faceVideo");

        if (!video) {
            throw new Error("ไม่พบ faceVideo");
        }

        // รอ video พร้อม
        if (video.readyState < 2) {

            console.log("กำลังรอ Video...");

            await new Promise((resolve) => {

                video.onloadeddata = resolve;

            });
        }

        console.log(
            "Video พร้อม",
            video.videoWidth,
            "x",
            video.videoHeight
        );

        status.textContent =
            "กำลังสแกนใบหน้า กรุณามองกล้อง...";

        // ========================================
        // สร้าง Face Embedding
        // ========================================

        console.log("กำลังตรวจจับใบหน้า...");

        const embedding = await getFaceEmbedding();

        console.log(
            "ตรวจพบใบหน้าแล้ว",
            embedding.length
        );

        status.textContent =
            "กำลังค้นหาบัญชีของคุณ...";

        // ========================================
        // ส่งไป Server
        // ========================================

        console.log("กำลังส่ง /face/login");

        const response = await fetch(
            "http://localhost:3000/face/login",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    face_embedding: embedding
                })
            }
        );

        console.log(
            "Server status:",
            response.status
        );

        const result = await response.json();

        console.log(
            "Face Login Result:",
            result
        );

        if (!result.success) {
            throw new Error(
                result.message || "ไม่สามารถเข้าสู่ระบบด้วยใบหน้าได้"
            );
        }

        // ========================================
        // LOGIN SUCCESS
        // ========================================

        saveSession(result.data);

        status.textContent =
            "✅ เข้าสู่ระบบด้วย Face ID สำเร็จ";

        alert(
            "เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ " +
            result.data.first_name
        );

        stopFaceCamera();

        switchTab("profile");

    } catch (error) {

        console.error(
            "❌ Face Login Error:",
            error
        );

        if (status) {
            status.textContent =
                "❌ " + error.message;
        }
    }
}


// ========================================
// สำหรับเรียกใช้จากที่อื่น
// ========================================

async function saveFaceEmbedding() {

    return registerFace();

}

// ========================================
// เปิดหน้า Face ID และเริ่ม Login ด้วยใบหน้า
// ========================================

async function goToFaceLogin() {

    // เปิดหน้า Face ID ก่อน
    switchTab("faceid");

    // รอให้ Browser แสดงหน้าและสร้าง layout เสร็จ
    await new Promise(resolve => setTimeout(resolve, 300));

    const video = document.getElementById("faceVideo");
    const status = document.getElementById("faceStatus");

    if (!video) {
        console.error("ไม่พบ faceVideo");
        return;
    }

    if (status) {
        status.textContent = "กำลังเปิดกล้อง...";
    }

    try {

        // โหลด Model ก่อน
        await loadFaceModels();

        // เปิดกล้อง
        await startFaceCamera();

        // บังคับให้ video เล่น
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;

        await video.play();

        console.log(
            "Face Login Camera:",
            video.videoWidth,
            "x",
            video.videoHeight
        );

        if (status) {
            status.textContent =
                "กำลังสแกนใบหน้า กรุณามองกล้อง...";
        }

        // เริ่มตรวจจับและ Login
        await loginWithFace();

    } catch (error) {

        console.error("Face Login Start Error:", error);

        if (status) {
            status.textContent = "❌ " + error.message;
        }
    }
}

// ========================================
// EXPORT FUNCTIONS TO WINDOW
// ========================================

window.startFaceScanCamera = startFaceScanCamera;
window.registerFace = registerFace;
window.loginWithFace = loginWithFace;
window.saveFaceEmbedding = saveFaceEmbedding;
window.goToFaceLogin = goToFaceLogin;

console.log("✅ face.js โหลดสำเร็จ");
console.log("loginWithFace:", typeof window.loginWithFace);
console.log("startFaceScanCamera:", typeof window.startFaceScanCamera);
