const path = require("path");
const express = require("express");
const cors = require("cors");
const db = require("./db");
const multer = require("multer");

const { createPetEmbedding } = require("./petEmbedding");

const app = express();

console.log("🔥 SERVER FILE:", __filename);

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname,"../uploads")));

app.use(express.static(path.join(__dirname, "../")));

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(null, path.join(__dirname, "../uploads"));

    },

    filename: (req, file, cb) => {

        const filename =
            Date.now() +
            "-" +
            file.originalname;

        cb(null, filename);

    }

});

const upload = multer({
    storage
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../index.html"));
});

app.get("/test", (req, res) => {
    res.send("TEST OK");
});

// ===========================
// REGISTER
// ===========================
app.post("/auth/register", (req, res) => {

    const {
        first_name,
        last_name,
        username,
        email,
        password
    } = req.body;

    if (!first_name || !last_name || !username || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "กรุณากรอกข้อมูลให้ครบ"
        });
    }

    db.query(
        "SELECT * FROM users WHERE username=? OR email=?",
        [username, email],
        (err, rows) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.sqlMessage
                });
            }

            if (rows.length > 0) {
                return res.json({
                    success: false,
                    message: "Username หรือ Email มีอยู่แล้ว"
                });
            }

            db.query(
                `INSERT INTO users
                (first_name,last_name,username,email,password)
                VALUES(?,?,?,?,?)`,
                [
                    first_name,
                    last_name,
                    username,
                    email,
                    password
                ],
                (err2, result) => {

                    if (err2) {
                        return res.status(500).json({
                            success:false,
                            message:err2.sqlMessage
                        });
                    }

                    res.json({
                        success:true,
                        data:{
                            id:result.insertId,
                            token:"demo-token"
                        }
                    });

                }
            );

        }
    );

});

// ===========================
// LOGIN
// ===========================

app.post("/auth/login",(req,res)=>{

    const {identifier,password}=req.body;

    db.query(
        `SELECT * FROM users
        WHERE (email=? OR username=?)
        AND password=?`,
        [
            identifier,
            identifier,
            password
        ],
        (err,rows)=>{

            if(err){

                return res.status(500).json({
                    success:false,
                    message:err.sqlMessage
                });

            }

            if(rows.length==0){

                return res.json({
                    success:false,
                    message:"อีเมลหรือรหัสผ่านไม่ถูกต้อง"
                });

            }

            res.json({

                success:true,

                data:{
                    id:rows[0].id,
                    token:"demo-token",
                    first_name:rows[0].first_name,
                    last_name:rows[0].last_name
                }

            });

        }
    );

});

// ===========================
// GET PROFILE
// ===========================

app.get("/users/:id",(req,res)=>{

    db.query(

        "SELECT * FROM users WHERE id=?",

        [req.params.id],

        (err,rows)=>{

            if(err){

                return res.status(500).json({
                    success:false,
                    message:err.sqlMessage
                });

            }

            if(rows.length==0){

                return res.json({
                    success:false
                });

            }

            res.json({
                success:true,
                data:rows[0]
            });

        }

    );

});

// ===========================
// UPDATE PROFILE
// ===========================

app.put("/users/:id",(req,res)=>{

    const{

        first_name,
        last_name,
        email,
        phone,
        province,
        region_zone,
        address_detail

    }=req.body;

    db.query(

`UPDATE users SET

first_name=?,
last_name=?,
email=?,
phone=?,
province=?,
region_zone=?,
address_detail=?

WHERE id=?`,

[
first_name,
last_name,
email,
phone,
province,
region_zone,
address_detail,
req.params.id
],

(err)=>{

if(err){

return res.status(500).json({

success:false,
message:err.sqlMessage

});

}

res.json({

success:true

});

}

);

});

// ===========================
// GET POSTS
// ===========================

app.get("/posts", (req, res) => {

    db.query(`
        SELECT
            posts.*,
            users.first_name,
            users.last_name
        FROM posts
        LEFT JOIN users
        ON posts.user_id = users.id
        ORDER BY posts.id DESC
    `, (err, rows) => {

        if (err) {
            return res.status(500).json({
                success: false,
                message: err.sqlMessage
            });
        }

        res.json({
            success: true,
            data: rows
        });

    });

});

// ===========================
// CREATE POST
// ===========================
app.post("/posts", async (req, res) => {

    console.log("ข้อมูลที่ /posts ได้รับ:");
    console.log(req.body);

    const {
        user_id,
        pet_name,
        pet_type,
        breed,
        province,
        description,
        image,
        latitude,
        longitude
    } = req.body;

    try {

        let petEmbedding = null;

        // ถ้ามีรูป ให้สร้าง Pet Embedding
        if (image) {

            const imagePath = path.join(
                __dirname,
                "..",
                image
            );

            console.log("กำลังสร้าง Pet Embedding...");
            console.log("Image path:", imagePath);

            petEmbedding =
                await createPetEmbedding(imagePath);

            console.log(
                "สร้าง Pet Embedding สำเร็จ ✅"
            );

            console.log(
                "จำนวนค่า:",
                petEmbedding.length
            );
        }

        db.query(
            `INSERT INTO posts
            (
                user_id,
                pet_name,
                pet_type,
                breed,
                province,
                description,
                image,
                latitude,
                longitude,
                pet_embedding
            )
            VALUES(?,?,?,?,?,?,?,?,?,?)`,
            [
                user_id,
                pet_name,
                pet_type,
                breed,
                province,
                description,
                image || "",
                latitude,
                longitude,
                petEmbedding
                    ? JSON.stringify(petEmbedding)
                    : null
            ],
            (err, result) => {

                if (err) {

                    console.log(err);

                    return res.status(500).json({
                        success: false,
                        message: err.sqlMessage
                    });
                }

                res.json({
                    success: true,
                    id: result.insertId
                });

            }
        );

    } catch (error) {

        console.error(
            "สร้าง Pet Embedding ไม่สำเร็จ:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "ไม่สามารถสร้าง Pet Embedding ได้"
        });
    }
});

// ===========================
// PET SCAN - FIND SIMILAR PETS
// ===========================

function cosineSimilarity(a, b) {

    if (!Array.isArray(a) || !Array.isArray(b)) {
        return 0;
    }

    if (a.length !== b.length) {
        return 0;
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {

        dotProduct += a[i] * b[i];

        magnitudeA += a[i] * a[i];

        magnitudeB += b[i] * b[i];
    }

    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }

    return dotProduct /
        (
            Math.sqrt(magnitudeA) *
            Math.sqrt(magnitudeB)
        );
}


app.post("/pet-scan", async (req, res) => {

    try {

        const { image } = req.body;

        if (!image) {

            return res.status(400).json({
                success: false,
                message: "ไม่ได้ส่งรูปสัตว์"
            });
        }

        const imagePath = path.join(
            __dirname,
            "..",
            image
        );

        console.log("\n==============================");
        console.log("PET SCAN");
        console.log("==============================");

        console.log(
            "กำลังสร้าง Embedding จากรูปที่สแกน..."
        );

        const scanEmbedding =
            await createPetEmbedding(imagePath);

        console.log(
            "Scan Embedding สำเร็จ:",
            scanEmbedding.length
        );


        // ดึงโพสต์ที่มี Embedding
        db.query(
            `
            SELECT
                posts.*,
                users.first_name,
                users.last_name
            FROM posts
            LEFT JOIN users
            ON posts.user_id = users.id
            WHERE posts.pet_embedding IS NOT NULL
            `,
            (err, rows) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        success: false,
                        message: err.sqlMessage
                    });
                }


                const results = [];


                for (const post of rows) {

                    try {

                        const storedEmbedding =
                            JSON.parse(
                                post.pet_embedding
                            );

                        const similarity =
                            cosineSimilarity(
                                scanEmbedding,
                                storedEmbedding
                            );

                        results.push({
                            ...post,
                            similarity
                        });

                    } catch (error) {

                        console.log(
                            "อ่าน Embedding ไม่ได้ของ post:",
                            post.id
                        );

                    }
                }


                // เรียงจากเหมือนมาก → เหมือนน้อย
                results.sort(
                    (a, b) =>
                        b.similarity -
                        a.similarity
                );


                // เอาแค่ 10 อันดับแรก
                const topResults =
                    results.slice(0, 10);


                console.log(
                    "\nผลการค้นหา:"
                );

                topResults.forEach((post, index) => {

                    console.log(
                        `${index + 1}. Post ${post.id} - similarity: ${post.similarity}`
                    );

                });


                res.json({
                    success: true,
                    data: topResults
                });

            }
        );

    } catch (error) {

        console.error(
            "Pet Scan Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "ไม่สามารถสแกนสัตว์เลี้ยงได้"
        });
    }
});

// ===========================
// DELETE POST
// ===========================

app.delete("/posts/:id", (req, res) => {

    db.query(
        "DELETE FROM posts WHERE id=?",
        [req.params.id],
        (err) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.sqlMessage
                });
            }

            res.json({
                success: true
            });

        }
    );

});

// ===========================
// NOTIFICATIONS
// ===========================

app.get("/notifications/:userId", (req, res) => {

    db.query(

        "SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC",

        [req.params.userId],

        (err, rows) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.sqlMessage
                });
            }

            res.json({
                success: true,
                data: rows
            });

        }

    );

});

// ===========================
// CREATE NOTIFICATION
// ===========================

app.post("/notifications", (req, res) => {

    const {
        user_id,
        message
    } = req.body;

    db.query(

        `INSERT INTO notifications
        (user_id,message)
        VALUES(?,?)`,

        [
            user_id,
            message
        ],

        (err, result) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.sqlMessage
                });
            }

            res.json({
                success: true,
                id: result.insertId
            });

        }

    );

});

// ===========================
// GET CHAT CONTACTS
// ===========================

app.get("/chat-contacts/:userId", (req, res) => {

    const userId = Number(req.params.userId);

    db.query(
        `
        SELECT
            u.id,
            u.first_name,
            u.last_name,
            MAX(m.created_at) AS last_message_at

        FROM messages m

        INNER JOIN users u
        ON u.id =
            CASE
                WHEN m.sender_id = ?
                THEN m.receiver_id
                ELSE m.sender_id
            END

        WHERE
            m.sender_id = ?
            OR
            m.receiver_id = ?

        GROUP BY
            u.id,
            u.first_name,
            u.last_name

        ORDER BY
            last_message_at DESC
        `,
        [
            userId,
            userId,
            userId
        ],
        (err, rows) => {

            if (err) {

                return res.status(500).json({
                    success: false,
                    message: err.sqlMessage
                });

            }

            res.json({
                success: true,
                data: rows
            });

        }
    );

});

// ===========================
// GET MESSAGES
// ===========================

app.get("/messages/:user1/:user2", (req, res) => {

    const { user1, user2 } = req.params;

    db.query(

        `SELECT *
        FROM messages
        WHERE
        (sender_id=? AND receiver_id=?)
        OR
        (sender_id=? AND receiver_id=?)
        ORDER BY created_at ASC`,

        [
            user1,
            user2,
            user2,
            user1
        ],

        (err, rows) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.sqlMessage
                });
            }

            res.json({
                success: true,
                data: rows
            });

        }

    );

});

// ===========================
// SEND MESSAGE
// ===========================

app.post("/messages", (req, res) => {

    const {
        sender_id,
        receiver_id,
        message
    } = req.body;

    db.query(

        `INSERT INTO messages
        (sender_id,receiver_id,message)
        VALUES(?,?,?)`,

        [
            sender_id,
            receiver_id,
            message
        ],

        (err, result) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.sqlMessage
                });
            }

            res.json({
                success: true,
                id: result.insertId
            });

        }

    );

});

// Upload รูป
app.post("/upload", upload.single("image"), (req, res) => {

    if (!req.file) {

        return res.status(400).json({
            success: false,
            message: "ไม่ได้เลือกรูป"
        });

    }

    res.json({

        success: true,

        data: {

            image: "/uploads/" + req.file.filename

        }

    });

});

// ===========================
// 404 API
// ===========================

app.use((req, res) => {

    res.status(404).json({
        success: false,
        message: "API Not Found"
    });

});


// ===========================
// START SERVER
// ===========================

const PORT = 3000;

app.listen(PORT, () => {

    console.log("=================================");
    console.log(" Love Animal Backend");
    console.log("=================================");
    console.log("Server : http://localhost:" + PORT);
    console.log("Test   : http://localhost:" + PORT + "/test");
    console.log("=================================");

});
