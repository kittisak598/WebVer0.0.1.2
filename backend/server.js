const path = require("path");
const express = require("express");
const cors = require("cors");
const db = require("./db");
const multer = require("multer");

const app = express();

console.log("🔥 SERVER FILE:", __filename);
console.log("🔥 FACE ROUTE LOADED");

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
app.post("/posts", upload.single("image"), (req, res) => {

    const {
        user_id,
        pet_name,
        pet_type,
        breed,
        province,
        description,
        latitude,
        longitude
    } = req.body;

    const image = req.file
        ? "/uploads/" + req.file.filename
        : "";

    console.log(req.body);

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
            longitude
        )
        VALUES(?,?,?,?,?,?,?,?,?)`,
        [
            user_id,
            pet_name,
            pet_type,
            breed,
            province,
            description,
            image,
            latitude,
            longitude
        ],
        (err,result)=>{

            if(err){
                return res.status(500).json({
                    success:false,
                    message:err.sqlMessage
                });
            }

            res.json({
                success:true,
                id:result.insertId
            });

        }
    );

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

// ===========================
// REGISTER FACE
// ===========================

app.post("/face/register", (req, res) => {

    const {
        user_id,
        face_angle,
        face_embedding
    } = req.body;

    // ==============================
    // ตรวจสอบข้อมูล
    // ==============================

    if (!user_id) {

        return res.status(400).json({
            success: false,
            message: "ไม่พบ User ID"
        });

    }

    if (!face_angle) {

        return res.status(400).json({
            success: false,
            message: "ไม่พบมุมใบหน้า"
        });

    }

    const allowedAngles = [
        "front",
        "left",
        "right"
    ];

    if (!allowedAngles.includes(face_angle)) {

        return res.status(400).json({
            success: false,
            message: "มุมใบหน้าไม่ถูกต้อง"
        });

    }

    if (!Array.isArray(face_embedding)) {

        return res.status(400).json({
            success: false,
            message: "ไม่พบ Face Embedding"
        });

    }

    if (face_embedding.length !== 128) {

        return res.status(400).json({
            success: false,
            message: "Face Embedding ต้องมี 128 ค่า"
        });

    }


    // ==============================
    // ตรวจสอบว่า User มีอยู่จริง
    // ==============================

    db.query(
        "SELECT id FROM users WHERE id = ?",
        [user_id],
        (err, users) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    success: false,
                    message: "เกิดข้อผิดพลาดในการตรวจสอบ User"
                });

            }

            if (users.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "ไม่พบผู้ใช้งาน"
                });

            }


            // ==============================
            // ลบ Face มุมเดิมของ User นี้
            // ==============================

            db.query(
                `DELETE FROM face_data
                 WHERE user_id = ?
                 AND face_angle = ?`,
                [user_id, face_angle],
                (deleteErr) => {

                    if (deleteErr) {

                        console.error(deleteErr);

                        return res.status(500).json({
                            success: false,
                            message: "ไม่สามารถบันทึก Face ID ได้"
                        });

                    }


                    // ==============================
                    // บันทึก Face ใหม่
                    // ==============================

                    db.query(
                        `INSERT INTO face_data
                        (
                            user_id,
                            face_embedding,
                            face_angle
                        )
                        VALUES (?, ?, ?)`,
                        [
                            user_id,
                            JSON.stringify(face_embedding),
                            face_angle
                        ],
                        (insertErr) => {

                            if (insertErr) {

                                console.error(insertErr);

                                return res.status(500).json({
                                    success: false,
                                    message: "ไม่สามารถบันทึก Face Embedding ได้"
                                });

                            }

                            console.log(
                                "FACE REGISTER → User:",
                                user_id,
                                "| Angle:",
                                face_angle
                            );

                            return res.json({

                                success: true,

                                message:
                                    `ลงทะเบียนใบหน้า ${face_angle} สำเร็จ`

                            });

                        }
                    );

                }
            );

        }
    );

});

// ===========================
// FACE LOGIN
// ===========================

app.post("/face/login", (req, res) => {

    const {
        face_embedding
    } = req.body;

    if (!Array.isArray(face_embedding)) {

        return res.status(400).json({
            success: false,
            message: "ไม่พบ Face Embedding"
        });

    }

    if (face_embedding.length !== 128) {

        return res.status(400).json({
            success: false,
            message: "Face Embedding ต้องมี 128 ค่า"
        });

    }

    // ดึง Face Embedding ทั้งหมด
    db.query(
        `SELECT
            face_data.user_id,
            face_data.face_embedding,
            face_data.face_angle,
            users.first_name,
            users.last_name,
            users.username,
            users.email
         FROM face_data
         INNER JOIN users
         ON face_data.user_id = users.id`,
        (err, rows) => {

            if (err) {

                return res.status(500).json({
                    success: false,
                    message: err.sqlMessage
                });

            }

            if (rows.length === 0) {

                return res.json({
                    success: false,
                    message: "ยังไม่มีผู้ใช้งานที่ลงทะเบียน Face ID"
                });

            }

            let bestMatch = null;
            let bestDistance = Infinity;

            // เก็บคะแนนที่ดีที่สุดของแต่ละ User
            const userMatches = {};

            rows.forEach(row => {

                let storedEmbedding;

                try {

                    storedEmbedding =
                        typeof row.face_embedding === "string"
                            ? JSON.parse(row.face_embedding)
                            : row.face_embedding;

                } catch (error) {

                    console.log(
                        "❌ อ่าน Face Embedding ไม่ได้ User:",
                        row.user_id
                    );

                    return;
                }

                if (!Array.isArray(storedEmbedding)) {
                    return;
                }

                if (storedEmbedding.length !== 128) {
                    return;
                }

                // Euclidean Distance
                let distance = 0;

                for (let i = 0; i < 128; i++) {

                    const difference =
                        face_embedding[i] - storedEmbedding[i];

                    distance += difference * difference;

                }

                distance = Math.sqrt(distance);

                console.log(
                    "FACE CHECK →",
                    "User:", row.user_id,
                    "| Angle:", row.face_angle,
                    "| Distance:", distance
                );

                // เก็บ Face ที่ดีที่สุดของ User แต่ละคน
                if (!userMatches[row.user_id]) {

                    userMatches[row.user_id] = {
                        user: row,
                        bestDistance: distance,
                        bestAngle: row.face_angle
                    };

                } else if (
                    distance < userMatches[row.user_id].bestDistance
                ) {

                    userMatches[row.user_id].bestDistance =
                        distance;

                    userMatches[row.user_id].bestAngle =
                        row.face_angle;

                    userMatches[row.user_id].user =
                        row;

                }

            });

            // หา User ที่มี Face ตรงที่สุด
            Object.values(userMatches).forEach(match => {

                console.log(
                    "USER RESULT →",
                    "User:", match.user.user_id,
                    "| Best Angle:", match.bestAngle,
                    "| Best Distance:", match.bestDistance
                );

                if (match.bestDistance < bestDistance) {

                    bestDistance = match.bestDistance;

                    bestMatch = match.user;

                    bestMatch.matchAngle =
                        match.bestAngle;

                }

            });

            console.log("==============================");
            console.log("FACE LOGIN RESULT");
            console.log("Best User ID:", bestMatch?.user_id);
            console.log("Best Angle:", bestMatch?.matchAngle);
            console.log("Best Distance:", bestDistance);
            console.log("==============================");


            // Threshold
            const FACE_THRESHOLD = 0.6;

            if (!bestMatch || bestDistance > FACE_THRESHOLD) {

                return res.json({
                    success: false,
                    message: "ไม่สามารถยืนยันใบหน้าได้",
                    distance: bestDistance
                });

            }

            // พบผู้ใช้
            res.json({

                success: true,

                message: "เข้าสู่ระบบด้วย Face ID สำเร็จ",

                data: {

                    id: bestMatch.user_id,

                    first_name: bestMatch.first_name,

                    last_name: bestMatch.last_name,

                    username: bestMatch.username,

                    email: bestMatch.email,

                    token: "demo-token",

                    distance: bestDistance

                }

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
