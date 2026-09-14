const ort = require("onnxruntime-node");
const path = require("path");

async function testModel() {
    try {
        const modelPath = path.join(
            __dirname,
            "../models/model.onnx"
        );

        console.log("กำลังโหลด Model...");
        console.log("Path:", modelPath);

        const session = await ort.InferenceSession.create(modelPath);

        console.log("\nโหลด Model สำเร็จ! ✅");

        console.log("\nInputs:");
        for (const input of session.inputNames) {
            console.log("-", input);
        }

        console.log("\nOutputs:");
        for (const output of session.outputNames) {
            console.log("-", output);
        }

    } catch (error) {
        console.error("\nโหลด Model ไม่สำเร็จ ❌");
        console.error(error);
    }
}

testModel();
