const path = require("path");
const { createPetEmbedding } = require("./petEmbedding");

async function test() {
    try {
        const imagePath = path.join(
            __dirname,
            "../uploads/1788352571458-à¸«à¸¡à¸²à¹à¸à¸¢.jpg"
        );

        console.log("กำลังสร้าง Pet Embedding...");

        const embedding =
            await createPetEmbedding(imagePath);

        console.log("\nสร้าง Embedding สำเร็จ! 🎉");

        console.log(
            "จำนวนค่า:",
            embedding.length
        );

        console.log(
            "\n10 ค่าแรก:"
        );

        console.log(
            embedding.slice(0, 10)
        );

    } catch (error) {

        console.error(
            "\nสร้าง Embedding ไม่สำเร็จ ❌"
        );

        console.error(error);
    }
}

test();