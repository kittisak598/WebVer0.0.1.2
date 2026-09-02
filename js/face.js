// ========================================
// FACE RECOGNITION
// ========================================

let faceStream = null;
let faceModelsLoaded = false;
let faceDetectionLoop = null;


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

    // ถ้ามีกล้องเปิดอยู่แล้ว ไม่ต้องเปิดใหม่
    if (
        faceStream &&
        faceStream.getVideoTracks().length > 0 &&
        faceStream.getVideoTracks()[0].readyState === "live"
    ) {
        console.log("🟢 Camera เปิดอยู่แล้ว");
        return;
    }

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

    // ========================================
    // หยุด Face Detection Loop
    // ========================================

    if (faceDetectionLoop) {
        cancelAnimationFrame(faceDetectionLoop);
        faceDetectionLoop = null;
    }


    // ========================================
    // ล้างกรอบ / Landmark บน Canvas
    // ========================================

    const canvas = document.getElementById("faceOverlay");

    if (canvas) {

        const ctx = canvas.getContext("2d");

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );
    }


    // ========================================
    // ปิด Camera Stream
    // ========================================

    if (faceStream) {

        faceStream.getTracks().forEach(track => {
            track.stop();
        });

        faceStream = null;
    }


    // ========================================
    // ล้าง Video
    // ========================================

    const video = document.getElementById("faceVideo");

    if (video) {
        video.pause();
        video.srcObject = null;
    }

    console.log("🔴 Face Camera + Overlay ปิดแล้ว");
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
// FACE DETECTION OVERLAY
// ========================================

async function startFaceOverlay() {

    const video = document.getElementById("faceVideo");
    const canvas = document.getElementById("faceOverlay");

    if (!video || !canvas) {
        console.error("❌ ไม่พบ faceVideo หรือ faceOverlay");
        return;
    }

    console.log("🟢 เริ่ม Face Detection Overlay");

    if (faceDetectionLoop) {
        cancelAnimationFrame(faceDetectionLoop);
        faceDetectionLoop = null;
    }

    const ctx = canvas.getContext("2d");

    canvas.style.zIndex = "10";

    let detecting = false;

    async function detectFace() {

        if (
            !video ||
            video.readyState < 2 ||
            video.videoWidth === 0 ||
            video.videoHeight === 0
        ) {
            faceDetectionLoop =
                requestAnimationFrame(detectFace);
            return;
        }

        // ========================================
        // ตั้งขนาด Canvas ให้เท่ากับ Video
        // ========================================

        if (
            canvas.width !== video.videoWidth ||
            canvas.height !== video.videoHeight
        ) {

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            console.log(
                "Canvas:",
                canvas.width,
                "x",
                canvas.height
            );
        }

        // ป้องกัน AI ตรวจซ้อนกันหลายรอบ
        if (!detecting) {

            detecting = true;

            try {

                const detections = await faceapi
                    .detectAllFaces(
                        video,
                        new faceapi.TinyFaceDetectorOptions({
                            inputSize: 320,
                            scoreThreshold: 0.5
                        })
                    )
                    .withFaceLandmarks(true);

                // ล้าง Overlay เดิม
                ctx.clearRect(
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                // ========================================
                // ปรับตำแหน่ง Detection
                // ========================================

                const displaySize = {
                    width: video.videoWidth,
                    height: video.videoHeight
                };

                const resizedDetections =
                    faceapi.resizeResults(
                        detections,
                        displaySize
                    );

                // ========================================
                // วาดกรอบ + Landmark
                // ========================================

                faceapi.draw.drawDetections(
                    canvas,
                    resizedDetections
                );

                faceapi.draw.drawFaceLandmarks(
                    canvas,
                    resizedDetections
                );

                // ========================================
                // Debug
                // ========================================

                if (resizedDetections.length > 0) {

                    console.log(
                        "🟢 พบใบหน้า:",
                        resizedDetections.length
                    );

                    console.log(
                        "Score:",
                        resizedDetections[0].detection.score
                    );

                }

            } catch (error) {

                console.error(
                    "❌ Face Overlay Error:",
                    error
                );
            }

            detecting = false;
        }

        faceDetectionLoop =
            requestAnimationFrame(detectFace);
    }

    detectFace();
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
        startFaceOverlay();

        document.getElementById("faceStatus").textContent =
            "เปิดกล้องแล้ว กรุณาหันหน้าเข้ากล้อง";

    } catch (error) {

        console.error(error);

        document.getElementById("faceStatus").textContent =
            error.message;
    }
}

async function getFaceDirection() {

    const video = document.getElementById("faceVideo");

    if (!video) {
        throw new Error("ไม่พบกล้อง");
    }

    const detection = await faceapi
        .detectSingleFace(
            video,
            new faceapi.TinyFaceDetectorOptions({
                inputSize: 320,
                scoreThreshold: 0.5
            })
        )
        .withFaceLandmarks(true);

    if (!detection) {
        return null;
    }

    const landmarks = detection.landmarks.positions;

    // จุดจมูก
    const nose = landmarks[30];

    // ตาซ้าย
    const leftEye = landmarks[36];

    // ตาขวา
    const rightEye = landmarks[45];

    // ระยะจากจมูกถึงตาซ้าย
    const distLeft =
        Math.abs(nose.x - leftEye.x);

    // ระยะจากจมูกถึงตาขวา
    const distRight =
        Math.abs(nose.x - rightEye.x);

    const ratio =
        distLeft / distRight;

    console.log(
        "FACE DIRECTION →",
        "Left:", distLeft,
        "Right:", distRight,
        "Ratio:", ratio
    );

    /*
        ratio ใกล้ 1
        = หน้าตรง

        ratio มากกว่า 1
        = หันไปทางหนึ่ง

        ratio น้อยกว่า 1
        = หันอีกทางหนึ่ง
    */

    if (ratio > 1.35) {
        return "left";
    }

    if (ratio < 0.75) {
        return "right";
    }

    return "front";
}

async function testFaceDirection() {

    const direction =
        await getFaceDirection();

    console.log(
        "ทิศใบหน้า:",
        direction
    );

    const status =
        document.getElementById("faceStatus");

    if (status) {

        if (!direction) {

            status.textContent =
                "❌ ไม่พบใบหน้า";

        } else {

            status.textContent =
                "ตรวจพบ: " + direction;

        }
    }
}


async function registerFaceAngle(angle) {

    const userId = getCurrentUserId();

    if (!userId) {
        throw new Error("กรุณาเข้าสู่ระบบก่อนลงทะเบียน Face ID");
    }

    const status = document.getElementById("faceStatus");

    if (status) {
        status.textContent = "กำลังตรวจจับใบหน้า...";
    }

    const embedding = await getFaceEmbedding();

    console.log(
        "FACE REGISTER → User:",
        userId,
        "| Angle:",
        angle
    );

    const response = await fetch(
        "http://localhost:3000/face/register",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                user_id: Number(userId),
                face_angle: angle,
                face_embedding: embedding
            })
        }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {

        throw new Error(
            result.message || "ไม่สามารถลงทะเบียนใบหน้าได้"
        );

    }

    console.log(
        "บันทึกสำเร็จ:",
        angle
    );

    return result;

}

async function registerAllFaceAngles() {

    const status = document.getElementById("faceStatus");

    try {

        // =========================
        // ฟังก์ชันรอจนกว่าจะหันถูกมุม
        // =========================

        async function waitForDirection(
    requiredDirection,
    message
) {

    if (status) {
        status.textContent = message;
    }

    while (true) {

        const direction =
            await getFaceDirection();

        console.log(
            "กำลังรอ:",
            requiredDirection,
            "| ตรวจพบ:",
            direction
        );

        if (status && direction) {

            if (direction === requiredDirection) {

                status.textContent =
                    "✅ ตรวจพบ " +
                    requiredDirection +
                    " แล้ว";

            } else {

                status.textContent =
                    message +
                    "\n\n" +
                    "ตอนนี้ตรวจพบ: " +
                    direction;
            }
        }

        if (direction === requiredDirection) {
            break;
        }

        await new Promise(
            resolve => setTimeout(resolve, 300)
        );
    }
}


        // =========================
        // 1. หน้าตรง
        // =========================

        await waitForDirection(
            "front",
            "📸 กรุณามองหน้าตรงเข้ากล้อง..."
        );

        if (status) {
            status.textContent =
                "✅ ตรวจหน้าตรงแล้ว กำลังบันทึก...";
        }

        await registerFaceAngle("front");


        // =========================
        // 2. หันซ้าย
        // =========================

        await waitForDirection(
            "left",
            "⬅️ กรุณาหันหน้าไปทางซ้าย..."
        );

        if (status) {
            status.textContent =
                "✅ ตรวจหน้าซ้ายแล้ว กำลังบันทึก...";
        }

        await registerFaceAngle("left");


        // =========================
        // 3. หันขวา
        // =========================

        await waitForDirection(
            "right",
            "➡️ กรุณาหันหน้าไปทางขวา..."
        );

        if (status) {
            status.textContent =
                "✅ ตรวจหน้าขวาแล้ว กำลังบันทึก...";
        }

        await registerFaceAngle("right");


        // =========================
        // สำเร็จ
        // =========================

        if (status) {
            status.textContent =
                "✅ ลงทะเบียนใบหน้าครบทั้ง 3 มุมแล้ว";
        }

        alert(
            "ลงทะเบียน Face ID สำเร็จ\n\n" +
            "✓ หน้าตรง\n" +
            "✓ หันซ้าย\n" +
            "✓ หันขวา"
        );

    } catch (error) {

        console.error(
            "Face Registration Error:",
            error
        );

        if (status) {
            status.textContent =
                "❌ " + error.message;
        }

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

        startFaceOverlay();

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

window.registerAllFaceAngles = registerAllFaceAngles;

window.getFaceDirection = getFaceDirection;
window.testFaceDirection = testFaceDirection;

console.log("✅ face.js โหลดสำเร็จ");
console.log("loginWithFace:", typeof window.loginWithFace);
console.log("startFaceScanCamera:", typeof window.startFaceScanCamera);
