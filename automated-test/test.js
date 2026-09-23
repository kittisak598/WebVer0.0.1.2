const fs = require("fs");
const path = require("path");

const {
    createPetEmbedding
} = require("../backend/petEmbedding");

// =====================================================
// TEST SETTINGS
// =====================================================

// จำนวนรูปสูงสุดที่ต้องการทดสอบ
// เปลี่ยนเป็น 1000 เมื่อต้องการทดสอบ 1,000 รูป
const MAX_IMAGES = 1000;

// Dataset
const DATASET_DIR = path.join(
    __dirname,
    "dataset"
);

// Folder สำหรับผลลัพธ์
const RESULT_DIR = path.join(
    __dirname,
    "results"
);

// นามสกุลไฟล์รูปที่รองรับ
const IMAGE_EXTENSIONS = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp"
];

// แสดงความคืบหน้า Pair Test ทุกกี่คู่
const PAIR_PROGRESS_STEP = 10000;

// =====================================================
// PREPARE RESULT FOLDER
// =====================================================

if (!fs.existsSync(RESULT_DIR)) {
    fs.mkdirSync(RESULT_DIR, {
        recursive: true
    });
}

// =====================================================
// FORMAT NUMBER
// =====================================================

function formatNumber(number) {

    return Number(number)
        .toLocaleString("en-US");
}

// =====================================================
// FORMAT PERCENT
// =====================================================

function formatPercent(value) {

    return `${(
        value * 100
    ).toFixed(2)}%`;
}

// =====================================================
// AVERAGE
// =====================================================

function average(values) {

    if (values.length === 0) {
        return 0;
    }

    return values.reduce(
        (sum, value) =>
            sum + value,
        0
    ) / values.length;
}

// =====================================================
// MIN / MAX แบบรองรับข้อมูลจำนวนมาก
// =====================================================

function getMinValue(values) {

    if (values.length === 0) {
        return 0;
    }

    let min = values[0];

    for (let i = 1; i < values.length; i++) {

        if (values[i] < min) {
            min = values[i];
        }
    }

    return min;
}

function getMaxValue(values) {

    if (values.length === 0) {
        return 0;
    }

    let max = values[0];

    for (let i = 1; i < values.length; i++) {

        if (values[i] > max) {
            max = values[i];
        }
    }

    return max;
}

// =====================================================
// COSINE SIMILARITY
// =====================================================

function cosineSimilarity(a, b) {

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (
        let i = 0;
        i < a.length;
        i++
    ) {

        dot +=
            a[i] * b[i];

        normA +=
            a[i] * a[i];

        normB +=
            b[i] * b[i];
    }

    if (
        normA === 0 ||
        normB === 0
    ) {
        return 0;
    }

    return dot / (
        Math.sqrt(normA) *
        Math.sqrt(normB)
    );
}

// =====================================================
// READ DATASET
//
// หลักการ:
// 1. หาโฟลเดอร์สัตว์ทั้งหมด
// 2. ต้องมีอย่างน้อย 2 รูปต่อสัตว์
// 3. รอบแรกเอา 2 รูปต่อสัตว์ก่อน
// 4. ถ้ายังไม่ครบ MAX_IMAGES
//    ค่อยเติมรูปที่เหลือ
// =====================================================

function readDataset() {

    if (!fs.existsSync(DATASET_DIR)) {
        throw new Error(
            `ไม่พบ Dataset: ${DATASET_DIR}`
        );
    }

    // ---------------------------------------------
    // อ่านโฟลเดอร์สัตว์
    // ---------------------------------------------

    const folders =
        fs.readdirSync(
            DATASET_DIR,
            {
                withFileTypes: true
            }
        )
        .filter(
            item =>
                item.isDirectory()
        )
        .sort(
            (a, b) =>
                a.name.localeCompare(
                    b.name,
                    undefined,
                    {
                        numeric: true
                    }
                )
        );

    const petFolders = [];

    // ---------------------------------------------
    // อ่านรูปของแต่ละสัตว์
    // ---------------------------------------------

    for (
        const folder of folders
    ) {

        const petName =
            folder.name;

        const folderPath =
            path.join(
                DATASET_DIR,
                petName
            );

        const files =
            fs.readdirSync(
                folderPath
            )
            .filter(file => {

                const ext =
                    path.extname(
                        file
                    ).toLowerCase();

                return IMAGE_EXTENSIONS
                    .includes(ext);
            })
            .sort(
                (a, b) =>
                    a.localeCompare(
                        b,
                        undefined,
                        {
                            numeric: true
                        }
                    )
            );

        // ต้องมีอย่างน้อย 2 รูป
        if (files.length < 2) {
            continue;
        }

        petFolders.push({

            pet: petName,

            images:
                files.map(
                    file => ({
                        pet: petName,

                        fileName: file,

                        filePath:
                            path.join(
                                folderPath,
                                file
                            )
                    })
                )
        });
    }

    // ---------------------------------------------
    // จำนวนสัตว์ที่สามารถใช้ทดสอบ SAME ได้
    // ---------------------------------------------

    const validPetCount =
        petFolders.length;

    // ---------------------------------------------
    // เลือกรูป
    //
    // รอบแรก:
    // 2 รูปต่อสัตว์
    //
    // เพื่อรับประกันว่า SAME PET มีคู่ทดสอบ
    // ---------------------------------------------

    const selectedImages = [];

    const nextIndex =
        new Map();

    for (
        const folder of petFolders
    ) {

        nextIndex.set(
            folder.pet,
            0
        );
    }

    // =================================================
    // ROUND 1
    // เอา 2 รูปแรกจากทุกสัตว์
    // =================================================

    for (
        const folder of petFolders
    ) {

        if (
            selectedImages.length >=
            MAX_IMAGES
        ) {
            break;
        }

        selectedImages.push(
            folder.images[0]
        );

        nextIndex.set(
            folder.pet,
            1
        );

        if (
            selectedImages.length >=
            MAX_IMAGES
        ) {
            break;
        }

        selectedImages.push(
            folder.images[1]
        );
    }

    // =================================================
    // ROUND 2+
    //
    // เติมรูปที่เหลือแบบกระจาย
    // =================================================

    let added = true;

    while (
        selectedImages.length <
            MAX_IMAGES &&
        added
    ) {

        added = false;

        for (
            const folder of petFolders
        ) {

            if (
                selectedImages.length >=
                MAX_IMAGES
            ) {
                break;
            }

            const index =
                nextIndex.get(
                    folder.pet
                );

            if (
                index >=
                folder.images.length
            ) {
                continue;
            }

            selectedImages.push(
                folder.images[index]
            );

            nextIndex.set(
                folder.pet,
                index + 1
            );

            added = true;
        }
    }

    return {

        petFolders,

        images:
            selectedImages,

        validPetCount
    };
}

// =====================================================
// CALCULATE METRICS
// =====================================================

function calculateMetrics(
    pairs,
    threshold
) {

    let TP = 0;
    let TN = 0;
    let FP = 0;
    let FN = 0;

    for (
        const pair of pairs
    ) {

        const actualSame =
            pair.expected ===
            "SAME";

        const predictedSame =
            pair.similarity >=
            threshold;

        if (
            actualSame &&
            predictedSame
        ) {
            TP++;
        }

        else if (
            actualSame &&
            !predictedSame
        ) {
            FN++;
        }

        else if (
            !actualSame &&
            !predictedSame
        ) {
            TN++;
        }

        else if (
            !actualSame &&
            predictedSame
        ) {
            FP++;
        }
    }

    const total =
        TP +
        TN +
        FP +
        FN;

    const accuracy =
        total === 0
            ? 0
            : (
                TP + TN
            ) / total;

    const precision =
        TP + FP === 0
            ? 0
            : TP /
                (TP + FP);

    const recall =
        TP + FN === 0
            ? 0
            : TP /
                (TP + FN);

    const f1 =
        precision + recall === 0
            ? 0
            : (
                2 *
                precision *
                recall
            ) /
            (
                precision +
                recall
            );

    return {
        threshold,
        TP,
        TN,
        FP,
        FN,
        accuracy,
        precision,
        recall,
        f1
    };
}

// =====================================================
// TOP-1 MATCHING
//
// จำลองระบบจริงของเว็บ:
//
// Query Image
//      ↓
// Compare กับ Gallery
//      ↓
// เรียง Similarity
//      ↓
// ดูอันดับ 1
//      ↓
// ถูกตัวหรือไม่?
// =====================================================

function calculateTop1(
    images
) {

    const groups = {};

    // แบ่งรูปตามสัตว์
    for (
        const image of images
    ) {

        if (
            !groups[image.pet]
        ) {
            groups[image.pet] = [];
        }

        groups[image.pet].push(
            image
        );
    }

    const gallery = [];
    const queries = [];

    // รูปแรก = Gallery
    // รูปที่เหลือ = Query
    for (
        const petName
        of Object.keys(groups)
    ) {

        const petImages =
            groups[petName];

        if (
            petImages.length === 0
        ) {
            continue;
        }

        gallery.push(
            petImages[0]
        );

        for (
            let i = 1;
            i < petImages.length;
            i++
        ) {

            queries.push(
                petImages[i]
            );
        }
    }

    let correct = 0;

    const results = [];

    for (
        const query of queries
    ) {

        const matches = [];

        for (
            const target of gallery
        ) {

            const similarity =
                cosineSimilarity(
                    query.embedding,
                    target.embedding
                );

            matches.push({

                pet: target.pet,

                fileName:
                    target.fileName,

                similarity

            });
        }

        matches.sort(
            (a, b) =>
                b.similarity -
                a.similarity
        );

        const best =
            matches[0];

        const isCorrect =
            best.pet ===
            query.pet;

        if (isCorrect) {
            correct++;
        }

        results.push({

            queryPet:
                query.pet,

            queryFile:
                query.fileName,

            matchedPet:
                best.pet,

            matchedFile:
                best.fileName,

            similarity:
                best.similarity,

            similarityPercent:
                best.similarity * 100,

            result:
                isCorrect
                    ? "CORRECT"
                    : "WRONG"
        });
    }

    return {

        galleryCount:
            gallery.length,

        queryCount:
            queries.length,

        correct,

        wrong:
            queries.length -
            correct,

        accuracy:
            queries.length === 0
                ? 0
                : correct /
                    queries.length,

        results
    };
}

// =====================================================
// SAVE CSV
// =====================================================

function saveCSV(
    filePath,
    rows
) {

    if (
        rows.length === 0
    ) {
        return;
    }

    const headers =
        Object.keys(
            rows[0]
        );

    const output = [
        headers.join(",")
    ];

    for (
        const row of rows
    ) {

        const values =
            headers.map(
                header => {

                    let value =
                        row[header];

                    if (
                        typeof value ===
                        "string"
                    ) {

                        value =
                            value.replace(
                                /"/g,
                                '""'
                            );

                        return `"${value}"`;
                    }

                    return value;
                }
            );

        output.push(
            values.join(",")
        );
    }

    fs.writeFileSync(
        filePath,
        output.join("\n"),
        "utf8"
    );
}

// =====================================================
// MAIN
// =====================================================

async function main() {

    console.log("");
    console.log(
        "============================================"
    );
    console.log(
        "       PET MATCHING AUTOMATED TEST"
    );
    console.log(
        "       (ระบบทดสอบอัตโนมัติ)"
    );
    console.log(
        "============================================"
    );
    console.log("");

    // =================================================
    // STEP 1 - DATASET
    // =================================================

    console.log(
        "[1] DATASET (ชุดข้อมูล)"
    );

    console.log(
        "กำลังอ่าน Dataset..."
    );

    const dataset =
        readDataset();

    const images =
        dataset.images;

    const petFolders =
        dataset.petFolders;

    const petCount = [
        ...new Set(
            images.map(
                image => image.pet
            )
        )
    ].length;

    console.log(
        `จำนวนสัตว์ที่ใช้ทดสอบ (Animals): ${formatNumber(
            petCount
        )}`
    );

    console.log(
        `จำนวนรูปที่เลือก (Images): ${formatNumber(
            images.length
        )}/${formatNumber(
            MAX_IMAGES
        )}`
    );

    console.log("");

    if (
        images.length === 0
    ) {

        console.log(
            "❌ ไม่พบรูปใน Dataset"
        );

        return;
    }

    if (
        images.length <
        MAX_IMAGES
    ) {

        console.log(
            `⚠️ Dataset มีรูปเพียง ${formatNumber(
                images.length
            )} รูป`
        );

        console.log(
            `ยังไม่ถึงเป้าหมาย ${formatNumber(
                MAX_IMAGES
            )} รูป`
        );

        console.log("");
    }

    // =================================================
    // STEP 2 - EMBEDDING
    // =================================================

    console.log(
        "[2] EMBEDDING (สร้างข้อมูลตัวแทนรูป)"
    );

    console.log(
        "กำลังสร้าง Embedding..."
    );

    console.log("");

    for (
        let i = 0;
        i < images.length;
        i++
    ) {

        const image =
            images[i];

        image.embedding =
            await createPetEmbedding(
                image.filePath
            );

        if (
            (
                i + 1
            ) % 25 === 0 ||
            i === images.length - 1
        ) {

            console.log(
                `Embedding: ${formatNumber(
                    i + 1
                )}/${formatNumber(
                    images.length
                )}`
            );
        }
    }

    console.log("");

    console.log(
        "✅ Embedding เสร็จครบทุกภาพ"
    );

    console.log("");

    // =================================================
    // STEP 3 - PAIR TEST
    // =================================================

    console.log(
        "[3] PAIR TEST (ทดสอบเปรียบเทียบเป็นคู่)"
    );

    const totalPairs =
        (
            images.length *
            (
                images.length - 1
            )
        ) / 2;

    console.log(
        `จำนวนคู่ทั้งหมดที่ต้องทดสอบ: ${formatNumber(
            totalPairs
        )} คู่`
    );

    console.log(
        "กำลังเปรียบเทียบ..."
    );

    console.log("");

    const pairs = [];

    const sameScores = [];

    const differentScores = [];

    let pairCount = 0;

    let lastProgress = 0;

    for (
        let i = 0;
        i < images.length;
        i++
    ) {

        for (
            let j = i + 1;
            j < images.length;
            j++
        ) {

            const imageA =
                images[i];

            const imageB =
                images[j];

            const similarity =
                cosineSimilarity(
                    imageA.embedding,
                    imageB.embedding
                );

            const samePet =
                imageA.pet ===
                imageB.pet;

            const pair = {

                imageA:
                    `${imageA.pet}/${imageA.fileName}`,

                imageB:
                    `${imageB.pet}/${imageB.fileName}`,

                expected:
                    samePet
                        ? "SAME"
                        : "DIFFERENT",

                similarity,

                similarityPercent:
                    similarity * 100
            };

            pairs.push(pair);

            pairCount++;

            if (samePet) {

                sameScores.push(
                    similarity
                );

            } else {

                differentScores.push(
                    similarity
                );
            }

            // แสดง Progress
            if (
                pairCount -
                lastProgress >=
                PAIR_PROGRESS_STEP
                ||
                pairCount === totalPairs
            ) {

                const percent =
                    (
                        pairCount /
                        totalPairs
                    ) * 100;

                console.log(
                    `Pair Test: ${formatNumber(
                        pairCount
                    )}/${formatNumber(
                        totalPairs
                    )} คู่ ` +
                    `(${percent.toFixed(1)}%)`
                );

                lastProgress =
                    pairCount;
            }
        }
    }

    console.log("");

    console.log(
        "✅ Pair Test เสร็จแล้ว"
    );

    console.log("");

    // =================================================
    // STEP 4 - SIMILARITY SUMMARY
    // =================================================

    const sameAverage =
        average(
            sameScores
        );

    const differentAverage =
        average(
            differentScores
        );
        
    const sameMin =
        getMinValue(sameScores);

    const sameMax =
        getMaxValue(sameScores);

    const differentMin =
        getMinValue(differentScores);

    const differentMax =
        getMaxValue(differentScores);


    console.log(
        "============================================"
    );

    console.log(
        "      SIMILARITY SUMMARY"
    );

    console.log(
        "      (สรุปคะแนนความคล้าย)"
    );

    console.log(
        "============================================"
    );

    console.log("");

    console.log(
        "SAME PET (สัตว์ตัวเดียวกัน)"
    );

    console.log(
        `จำนวนคู่: ${formatNumber(
            sameScores.length
        )}`
    );

    console.log(
        `Average (ค่าเฉลี่ย): ${formatPercent(
            sameAverage
        )}`
    );

    console.log(
        `Minimum (ต่ำสุด): ${formatPercent(
            sameMin
        )}`
    );

    console.log(
        `Maximum (สูงสุด): ${formatPercent(
            sameMax
        )}`
    );

    console.log("");

    console.log(
        "DIFFERENT PET (สัตว์คนละตัว)"
    );

    console.log(
        `จำนวนคู่: ${formatNumber(
            differentScores.length
        )}`
    );

    console.log(
        `Average (ค่าเฉลี่ย): ${formatPercent(
            differentAverage
        )}`
    );

    console.log(
        `Minimum (ต่ำสุด): ${formatPercent(
            differentMin
        )}`
    );

    console.log(
        `Maximum (สูงสุด): ${formatPercent(
            differentMax
        )}`
    );

    console.log("");

    // =================================================
    // STEP 5 - THRESHOLD TEST
    // =================================================

    console.log(
        "============================================"
    );

    console.log(
        "       THRESHOLD TEST"
    );

    console.log(
        "       (ทดสอบเกณฑ์การตัดสิน)"
    );

    console.log(
        "============================================"
    );

    console.log("");

    const thresholdResults = [];

    let bestThreshold =
        null;

    for (
        let threshold = 0.20;
        threshold <= 0.85;
        threshold += 0.05
    ) {

        const metrics =
            calculateMetrics(
                pairs,
                threshold
            );

        const row = {

            threshold:
                `${(
                    threshold * 100
                ).toFixed(0)}%`,

            accuracy:
                formatPercent(
                    metrics.accuracy
                ),

            precision:
                formatPercent(
                    metrics.precision
                ),

            recall:
                formatPercent(
                    metrics.recall
                ),

            f1Score:
                formatPercent(
                    metrics.f1
                ),

            TP: metrics.TP,
            TN: metrics.TN,
            FP: metrics.FP,
            FN: metrics.FN
        };

        thresholdResults.push(row);

        console.log(
            `Threshold ${row.threshold}` +
            ` | Accuracy ${row.accuracy}` +
            ` | Precision ${row.precision}` +
            ` | Recall ${row.recall}` +
            ` | F1 ${row.f1Score}`
        );

        if (
            bestThreshold === null ||
            metrics.f1 >
            bestThreshold.f1
        ) {

            bestThreshold =
                metrics;
        }
    }

    console.log("");

    // =================================================
    // STEP 6 - BEST THRESHOLD
    // =================================================

    console.log(
        "============================================"
    );

    console.log(
        "       BEST THRESHOLD"
    );

    console.log(
        "       (เกณฑ์ที่ดีที่สุดจากการทดสอบ)"
    );

    console.log(
        "============================================"
    );

    console.log("");

    console.log(
        `Threshold (เกณฑ์): ${
            (
                bestThreshold.threshold *
                100
            ).toFixed(0)
        }%`
    );

    console.log(
        `Accuracy (ความถูกต้อง): ${formatPercent(
            bestThreshold.accuracy
        )}`
    );

    console.log(
        `Precision (ความแม่นเมื่อทายว่าใช่): ${formatPercent(
            bestThreshold.precision
        )}`
    );

    console.log(
        `Recall (ความสามารถในการหาให้ครบ): ${formatPercent(
            bestThreshold.recall
        )}`
    );

    console.log(
        `F1-score (สมดุล Precision/Recall): ${formatPercent(
            bestThreshold.f1
        )}`
    );

    console.log("");

    // =================================================
    // STEP 7 - TOP-1 MATCHING
    // =================================================

    console.log(
        "============================================"
    );

    console.log(
        "       TOP-1 MATCHING TEST"
    );

    console.log(
        "       (ทดสอบการหาโพสต์ที่ตรงที่สุด)"
    );

    console.log(
        "============================================"
    );

    console.log("");

    const top1 =
        calculateTop1(
            images
        );

    console.log(
        `Gallery (รูปอ้างอิง): ${formatNumber(
            top1.galleryCount
        )} รูป`
    );

    console.log(
        `Query (รูปที่ใช้ค้นหา): ${formatNumber(
            top1.queryCount
        )} รูป`
    );

    console.log(
        `Correct (จับคู่ถูก): ${formatNumber(
            top1.correct
        )}`
    );

    console.log(
        `Wrong (จับคู่ผิด): ${formatNumber(
            top1.wrong
        )}`
    );

    console.log(
        `Top-1 Accuracy (ความแม่นของอันดับ 1): ${formatPercent(
            top1.accuracy
        )}`
    );

    console.log("");

    // =================================================
    // STEP 8 - QUICK SUMMARY
    // =================================================

    console.log(
        "============================================"
    );

    console.log(
        "       FINAL TEST SUMMARY"
    );

    console.log(
        "       (สรุปผลการทดสอบ)"
    );

    console.log(
        "============================================"
    );

    console.log("");

    console.log(
        `Images Tested (จำนวนรูป): ${formatNumber(
            images.length
        )}`
    );

    console.log(
        `Animals Tested (จำนวนสัตว์): ${formatNumber(
            petCount
        )}`
    );

    console.log(
        `Pairs Tested (จำนวนคู่): ${formatNumber(
            totalPairs
        )}`
    );

    console.log("");

    console.log(
        "Same Pet Average (ความคล้ายเฉลี่ยของตัวเดียวกัน):"
    );

    console.log(
        `  ${formatPercent(
            sameAverage
        )}`
    );

    console.log("");

    console.log(
        "Different Pet Average (ความคล้ายเฉลี่ยของคนละตัว):"
    );

    console.log(
        `  ${formatPercent(
            differentAverage
        )}`
    );

    console.log("");

    console.log(
        "Best Threshold (เกณฑ์ที่ดีที่สุด):"
    );

    console.log(
        `  ${(
            bestThreshold.threshold *
            100
        ).toFixed(0)}%`
    );

    console.log("");

    console.log(
        "Pair Accuracy (ความถูกต้องของการจำแนกคู่):"
    );

    console.log(
        `  ${formatPercent(
            bestThreshold.accuracy
        )}`
    );

    console.log("");

    console.log(
        "Top-1 Accuracy (ความถูกต้องของการ Match อันดับ 1):"
    );

    console.log(
        `  ${formatPercent(
            top1.accuracy
        )}`
    );

    console.log("");

    // =================================================
    // STEP 9 - SAVE RESULTS
    // =================================================

    saveCSV(
        path.join(
            RESULT_DIR,
            "pair_results.csv"
        ),
        pairs
    );

    saveCSV(
        path.join(
            RESULT_DIR,
            "threshold_results.csv"
        ),
        thresholdResults
    );

    saveCSV(
        path.join(
            RESULT_DIR,
            "top1_results.csv"
        ),
        top1.results
    );

    const summary = {

        dataset: {

            imagesTested:
                images.length,

            animalsTested:
                petCount,

            pairsTested:
                totalPairs
        },

        similarity: {

            samePet: {

                average:
                    sameAverage,

                minimum:
                    sameMin,

                maximum:
                    sameMax
            },

            differentPet: {

                average:
                    differentAverage,

                minimum:
                    differentMin,

                maximum:
                    differentMax
            }
        },

        bestThreshold: {

            threshold:
                bestThreshold.threshold,

            accuracy:
                bestThreshold.accuracy,

            precision:
                bestThreshold.precision,

            recall:
                bestThreshold.recall,

            f1Score:
                bestThreshold.f1,

            TP:
                bestThreshold.TP,

            TN:
                bestThreshold.TN,

            FP:
                bestThreshold.FP,

            FN:
                bestThreshold.FN
        },

        top1Matching: {

            gallery:
                top1.galleryCount,

            queries:
                top1.queryCount,

            correct:
                top1.correct,

            wrong:
                top1.wrong,

            accuracy:
                top1.accuracy
        }
    };

    fs.writeFileSync(
        path.join(
            RESULT_DIR,
            "summary.json"
        ),
        JSON.stringify(
            summary,
            null,
            2
        ),
        "utf8"
    );

    // =================================================
    // FINISH
    // =================================================

    console.log("");

    console.log(
        "============================================"
    );

    console.log(
        "          TEST FINISHED ✅"
    );

    console.log(
        "          (ทดสอบเสร็จสมบูรณ์)"
    );

    console.log(
        "============================================"
    );

    console.log("");

    console.log(
        "Results saved to:"
    );

    console.log(
        "results/pair_results.csv"
    );

    console.log(
        "results/threshold_results.csv"
    );

    console.log(
        "results/top1_results.csv"
    );

    console.log(
        "results/summary.json"
    );

    console.log("");
}

// =====================================================
// RUN
// =====================================================

main().catch(error => {

    console.error("");

    console.error(
        "❌ TEST ERROR"
    );

    console.error(
        error
    );

});