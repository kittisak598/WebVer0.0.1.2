const path = require("path");
const fs = require("fs");

async function testPetScan() {

    try {

        // ใช้รูปหมาที่มีอยู่แล้ว
        const imagePath = path.join(
            __dirname,
            "../uploads/dog2-flipped.jpg"
        );

        if (!fs.existsSync(imagePath)) {

            throw new Error(
                "ไม่พบไฟล์รูป: " + imagePath
            );
        }

        console.log("พบรูปภาพ ✅");
        console.log("กำลังอัปโหลดเพื่อทดสอบ Pet Scan...");

        /*
         * ส่งรูปเข้า /upload ก่อน
         */

        const imageBuffer =
            fs.readFileSync(imagePath);

        const blob = new Blob(
            [imageBuffer]
        );

        const formData = new FormData();

        formData.append(
            "image",
            blob,
            path.basename(imagePath)
        );

        const uploadResponse =
            await fetch(
                "http://localhost:3000/upload",
                {
                    method: "POST",
                    body: formData
                }
            );

        const uploadResult =
            await uploadResponse.json();

        console.log(
            "Upload result:",
            uploadResult
        );

        if (!uploadResult.success) {

            throw new Error(
                "Upload ไม่สำเร็จ"
            );
        }

        const uploadedImage =
            uploadResult.data.image;

        console.log(
            "\nส่งรูปเข้า /pet-scan..."
        );

        /*
         * ส่ง image path เข้า Pet Scan
         */

        const scanResponse =
            await fetch(
                "http://localhost:3000/pet-scan",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        image: uploadedImage
                    })
                }
            );

        const scanResult =
            await scanResponse.json();

        console.log(
            "\nผลลัพธ์ Pet Scan:"
        );

        console.log(
            JSON.stringify(
                scanResult,
                null,
                2
            )
        );

    } catch (error) {

        console.error(
            "\nPet Scan Test ไม่สำเร็จ ❌"
        );

        console.error(error);
    }
}

testPetScan();