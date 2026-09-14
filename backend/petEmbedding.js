const ort = require("onnxruntime-node");
const sharp = require("sharp");
const path = require("path");

let session = null;

async function loadModel() {
    if (!session) {
        const modelPath = path.join(
            __dirname,
            "../models/model.onnx"
        );

        console.log("กำลังโหลด Pet Recognition Model...");

        session =
            await ort.InferenceSession.create(modelPath);

        console.log("Pet Recognition Model พร้อมใช้งาน ✅");
    }

    return session;
}

async function createPetEmbedding(imagePath) {

    const model = await loadModel();

    // เตรียมรูป 224x224 RGB
    const { data } = await sharp(imagePath)
        .resize(224, 224)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const mean = [
        0.485,
        0.456,
        0.406
    ];

    const std = [
        0.229,
        0.224,
        0.225
    ];

    const inputData = new Float32Array(
        3 * 224 * 224
    );

    for (let y = 0; y < 224; y++) {

        for (let x = 0; x < 224; x++) {

            const pixelIndex =
                (y * 224 + x) * 3;

            const r =
                data[pixelIndex] / 255;

            const g =
                data[pixelIndex + 1] / 255;

            const b =
                data[pixelIndex + 2] / 255;

            const index =
                y * 224 + x;

            inputData[index] =
                (r - mean[0]) / std[0];

            inputData[
                224 * 224 + index
            ] =
                (g - mean[1]) / std[1];

            inputData[
                2 * 224 * 224 + index
            ] =
                (b - mean[2]) / std[2];
        }
    }

    const inputTensor =
        new ort.Tensor(
            "float32",
            inputData,
            [1, 3, 224, 224]
        );

    const results =
        await model.run({
            input: inputTensor
        });

    const embedding =
        results.embedding.data;

    return Array.from(embedding);
}

module.exports = {
    createPetEmbedding
};