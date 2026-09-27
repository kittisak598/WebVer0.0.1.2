// =====================================================
// ANIMAL LANDMARK
// ตรวจจับหมา / แมว + วาดโครงสร้างลง petOverlay
// =====================================================

import {
    AnimalDetector
} from "https://cdn.jsdelivr.net/npm/rtmlib-ts@0.0.5/+esm";

let animalDetector = null;
let animalDetecting = false;
let inputCanvas = null;
let inputCtx = null;

// =====================================================
// SETTINGS
// =====================================================

const DET_CONFIDENCE = 0.20;
const POSE_CONFIDENCE = 0.20;

// =====================================================
// INIT DETECTOR
// =====================================================

async function initAnimalDetector() {

    if (animalDetector) {
        return animalDetector;
    }

    console.log(
        "🐶🐱 กำลังโหลด Animal Detector..."
    );

    animalDetector =
        new AnimalDetector({

            // ตรวจเฉพาะหมาและแมว
            classes: [
                "dog",
                "cat"
            ],

            // =========================================
            // ใช้ RTMPose-m สำหรับ Animal Pose
            // =========================================

            poseModel:
                "https://huggingface.co/datasets/DavidPagnon/rtmlib_models/resolve/main/mmpose/rtmposev1/rtmpose-m_simcc-ap10k_pt-aic-coco_210e-256x256-7a041aa1_20230206.onnx",

            // RTMPose AP10K ใช้ 256x256
            poseInputSize: [
                256,
                256
            ],

            // Detection
            detConfidence:
                0.30,

            // Landmark
            poseConfidence:
                0.30,

            // ใช้ WASM
            backend:
                "wasm",

            cache:
                true
        });

    await animalDetector.init();

    console.log(
        "✅ Animal Detector พร้อมใช้งาน"
    );

    return animalDetector;
}

// =====================================================
// PREPARE INPUT CANVAS
// =====================================================

function prepareInputCanvas(
    width,
    height
) {

    if (!inputCanvas) {

        inputCanvas =
            document.createElement(
                "canvas"
            );

        inputCtx =
            inputCanvas.getContext(
                "2d"
            );
    }

    if (
        !inputCanvas ||
        !inputCtx
    ) {
        return false;
    }

    inputCanvas.width =
        width;

    inputCanvas.height =
        height;

    return true;
}

// =====================================================
// DRAW POINT
// =====================================================

function drawPoint(
    ctx,
    point
) {

    if (!point) {
        return;
    }

    // rtmlib keypoint:
    // { x, y, score, visible, name }

    const x =
        point.x;

    const y =
        point.y;

    const score =
        point.score;

    if (
        !Number.isFinite(x) ||
        !Number.isFinite(y)
    ) {
        return;
    }

    if (
        typeof score === "number" &&
        score < POSE_CONFIDENCE
    ) {
        return;
    }

    ctx.fillStyle =
        "#00ff88";

    ctx.beginPath();

    ctx.arc(
        x,
        y,
        5,
        0,
        Math.PI * 2
    );

    ctx.fill();
}

// =====================================================
// DRAW LINE
// =====================================================

function drawLine(
    ctx,
    points,
    a,
    b
) {

    const p1 =
        points[a];

    const p2 =
        points[b];

    if (
        !p1 ||
        !p2
    ) {
        return;
    }

    if (
        !Number.isFinite(p1.x) ||
        !Number.isFinite(p1.y) ||
        !Number.isFinite(p2.x) ||
        !Number.isFinite(p2.y)
    ) {
        return;
    }

    if (
        p1.score < POSE_CONFIDENCE ||
        p2.score < POSE_CONFIDENCE
    ) {
        return;
    }

    ctx.beginPath();

    ctx.moveTo(
        p1.x,
        p1.y
    );

    ctx.lineTo(
        p2.x,
        p2.y
    );

    ctx.stroke();
}

// =====================================================
// DRAW ANIMAL
// =====================================================

function drawAnimal(
    ctx,
    animal
) {

    const animalClass =
        String(
            animal.className || ""
        ).toLowerCase();

    // เอาเฉพาะหมา / แมว
    if (
        animalClass !== "dog" &&
        animalClass !== "cat"
    ) {
        return;
    }

    // =================================================
    // BOUNDING BOX
    // =================================================

    if (animal.bbox) {

        const x =
            animal.bbox.x1;

        const y =
            animal.bbox.y1;

        const width =
            animal.bbox.x2 -
            animal.bbox.x1;

        const height =
            animal.bbox.y2 -
            animal.bbox.y1;

        ctx.strokeStyle =
            "#00ff88";

        ctx.lineWidth =
            3;

        ctx.strokeRect(
            x,
            y,
            width,
            height
        );

        ctx.fillStyle =
            "#00ff88";

        ctx.font =
            "18px Arial";

        const confidence =
            Number(
                animal.bbox.confidence || 0
            );

        ctx.fillText(
            `${animalClass} ${(
                confidence * 100
            ).toFixed(0)}%`,
            x,
            Math.max(
                20,
                y - 8
            )
        );
    }

    // =================================================
    // KEYPOINTS
    // =================================================

    const points =
        animal.keypoints;

    if (
        !Array.isArray(points) ||
        points.length === 0
    ) {

        console.warn(
            "⚠️ ไม่พบ Keypoints",
            animal
        );

        return;
    }

    // วาดจุดทั้งหมด
    for (
        const point of points
    ) {

        drawPoint(
            ctx,
            point
        );
    }

    // =================================================
    // COCO17
    //
    // 0  nose
    // 1  left_eye
    // 2  right_eye
    // 3  left_ear
    // 4  right_ear
    // 5  left_shoulder
    // 6  right_shoulder
    // 7  left_elbow
    // 8  right_elbow
    // 9  left_wrist
    // 10 right_wrist
    // 11 left_hip
    // 12 right_hip
    // 13 left_knee
    // 14 right_knee
    // 15 left_ankle
    // 16 right_ankle
    // =================================================

    const connections = [

        // HEAD
        [0, 1],
        [0, 2],
        [1, 3],
        [2, 4],
        [1, 2],
        [3, 4],

        // BODY
        [5, 6],
        [5, 11],
        [6, 12],
        [11, 12],

        // FRONT LEFT
        [5, 7],
        [7, 9],

        // FRONT RIGHT
        [6, 8],
        [8, 10],

        // BACK LEFT
        [11, 13],
        [13, 15],

        // BACK RIGHT
        [12, 14],
        [14, 16]
    ];

    ctx.strokeStyle =
        "#00ff88";

    ctx.lineWidth =
        3;

    for (
        const [a, b]
        of connections
    ) {

        drawLine(
            ctx,
            points,
            a,
            b
        );
    }
}

// =====================================================
// DETECT ONE FRAME
// =====================================================

async function detectAnimalFrame() {

    if (
        animalDetecting
    ) {
        return;
    }

    const video =
        document.getElementById(
            "petVideo"
        );

    const overlay =
        document.getElementById(
            "petOverlay"
        );

    if (
        !video ||
        !overlay
    ) {
        return;
    }

    if (
        video.readyState < 2 ||
        video.videoWidth === 0 ||
        video.videoHeight === 0
    ) {
        return;
    }

    animalDetecting =
        true;

    try {

        // =============================================
        // OVERLAY
        // =============================================

        overlay.width =
            video.videoWidth;

        overlay.height =
            video.videoHeight;

        const ctx =
            overlay.getContext(
                "2d"
            );

        if (!ctx) {
            return;
        }

        ctx.clearRect(
            0,
            0,
            overlay.width,
            overlay.height
        );

        // =============================================
        // MODEL
        // =============================================

        const detector =
            await initAnimalDetector();

        // =============================================
        // INPUT CANVAS
        // =============================================

        if (
            !prepareInputCanvas(
                video.videoWidth,
                video.videoHeight
            )
        ) {
            return;
        }

        inputCtx.drawImage(
            video,
            0,
            0,
            video.videoWidth,
            video.videoHeight
        );

        // =============================================
        // DETECT
        // =============================================

        const animals =
            await detector.detectFromVideo(
                video,
                inputCanvas
            );

        // =============================================
        // DEBUG
        // =============================================

        console.log(
            "🐾 Animal Detection:",
            animals.length
        );

        if (
            animals.length > 0
        ) {

            console.log(
                "🐾 Animal Result:",
                animals.map(
                    animal => ({
                        className:
                            animal.className,

                        confidence:
                            animal.bbox.confidence,

                        keypoints:
                            animal.keypoints.length
                    })
                )
            );
        }

        // =============================================
        // DRAW
        // =============================================

        for (
            const animal of animals
        ) {

            drawAnimal(
                ctx,
                animal
            );
        }

    } catch (error) {

        console.error(
            "❌ Animal Detection Error:",
            error
        );

        // สำคัญ:
        // หยุด loop ชั่วคราวเมื่อ Model error
        // ไม่ให้ Console ยิง error รัว ๆ
        stopAnimalLandmarkLoop();

    } finally {

        animalDetecting =
            false;
    }
}

// =====================================================
// START LOOP
// =====================================================

function startAnimalLandmarkLoop() {

    if (
        window.animalLandmarkLoopRunning
    ) {
        return;
    }

    window.animalLandmarkLoopRunning =
        true;

    console.log(
        "▶️ เริ่ม Animal Landmark"
    );

    async function loop() {

        if (
            !window
                .animalLandmarkLoopRunning
        ) {
            return;
        }

        await detectAnimalFrame();

        if (
            window
                .animalLandmarkLoopRunning
        ) {

            requestAnimationFrame(
                loop
            );
        }
    }

    loop();
}

// =====================================================
// STOP LOOP
// =====================================================

function stopAnimalLandmarkLoop() {

    window.animalLandmarkLoopRunning =
        false;

    const canvas =
        document.getElementById(
            "petOverlay"
        );

    if (canvas) {

        const ctx =
            canvas.getContext(
                "2d"
            );

        if (ctx) {

            ctx.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
            );
        }
    }

    console.log(
        "⏹️ หยุด Animal Landmark"
    );
}

// =====================================================
// EXPORT
// =====================================================

window.initAnimalDetector =
    initAnimalDetector;

window.startAnimalLandmarkLoop =
    startAnimalLandmarkLoop;

window.stopAnimalLandmarkLoop =
    stopAnimalLandmarkLoop;

console.log(
    "✅ animal-landmark.js โหลดแล้ว"
);