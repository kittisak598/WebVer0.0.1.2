const path = require("path");
const { createPetEmbedding } = require("./petEmbedding");

function cosineSimilarity(a, b) {

    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {

        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }

    return dot /
        (Math.sqrt(magA) * Math.sqrt(magB));
}

async function test() {

    const imagePath = path.join(
        __dirname,
        "../uploads/dog2-flipped.jpg"
    );

    console.log("กำลังสร้าง Embedding ครั้งที่ 1...");

    const embedding1 =
        await createPetEmbedding(imagePath);

    console.log("กำลังสร้าง Embedding ครั้งที่ 2...");

    const embedding2 =
        await createPetEmbedding(imagePath);

    const similarity =
        cosineSimilarity(
            embedding1,
            embedding2
        );

    console.log("\n==============================");
    console.log("RESULT");
    console.log("==============================");

    console.log(
        "Embedding 1:",
        embedding1.slice(0, 5)
    );

    console.log(
        "Embedding 2:",
        embedding2.slice(0, 5)
    );

    console.log(
        "Cosine Similarity:",
        similarity
    );
}

test();
