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
                    last_name:rows[0].last_name,
                    role:rows[0].role
                }

            });

        }
    );

});

// ===========================
// CHECK ADMIN
// ===========================
async function requireAdmin(userId) {

    return new Promise((resolve, reject) => {

        db.query(
            "SELECT role FROM users WHERE id = ?",
            [userId],
            (err, rows) => {

                if (err) {
                    return reject(err);
                }

                if (rows.length === 0) {
                    return resolve(false);
                }

                resolve(rows[0].role === "admin");

            }
        );

    });

}

// ===========================
// ADMIN DASHBOARD
// ===========================
app.get("/admin/dashboard", async (req, res) => {

    const userId = req.query.user_id;

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "ไม่พบ user_id"
        });
    }

    try {

        const isAdmin = await requireAdmin(userId);

        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: "ไม่มีสิทธิ์เข้าถึง Admin"
            });
        }

        db.query(
            `
            SELECT

                (SELECT COUNT(*) FROM users) AS totalUsers,

                (SELECT COUNT(*) FROM posts) AS totalPosts,

                (SELECT COUNT(*)
                 FROM posts
                 WHERE status = 'lost') AS lostPosts,

                (SELECT COUNT(*)
                 FROM posts
                 WHERE status = 'found') AS foundPosts

            `,
            (err, rows) => {

                if (err) {

                    console.error(
                        "ADMIN DASHBOARD ERROR:",
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message: err.sqlMessage || err.message
                    });

                }

                res.json({
                    success: true,
                    data: rows[0]
                });

            }
        );

    } catch (error) {

        console.error(
            "ADMIN AUTH ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "ตรวจสอบสิทธิ์ Admin ไม่สำเร็จ"
        });

    }

});

// ===========================
// ADMIN - GET ALL POSTS
// ===========================
app.get("/admin/posts", async (req, res) => {

    const userId = req.query.user_id;

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "ไม่พบ user_id"
        });
    }

    try {

        const isAdmin = await requireAdmin(userId);

        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: "ไม่มีสิทธิ์เข้าถึง Admin"
            });
        }

        db.query(
            `
            SELECT
                posts.id,
                posts.user_id,
                posts.pet_name,
                posts.pet_type,
                posts.breed,
                posts.province,
                posts.description,
                posts.image,
                posts.latitude,
                posts.longitude,
                posts.status,
                posts.created_at,
                users.first_name,
                users.last_name,
                users.username
            FROM posts
            LEFT JOIN users
                ON posts.user_id = users.id
            ORDER BY posts.created_at DESC
            `,
            (err, rows) => {

                if (err) {
                    console.error(
                        "ADMIN GET POSTS ERROR:",
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message: err.sqlMessage || err.message
                    });
                }

                res.json({
                    success: true,
                    data: rows
                });

            }
        );

    } catch (error) {

        console.error(
            "ADMIN AUTH ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "ตรวจสอบสิทธิ์ Admin ไม่สำเร็จ"
        });
    }

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
// ADMIN - DELETE POST
// ===========================
app.delete("/admin/posts/:id", async (req, res) => {

    const userId = req.body.user_id;

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "ไม่พบ user_id"
        });
    }

    try {

        const isAdmin = await requireAdmin(userId);

        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: "ไม่มีสิทธิ์เข้าถึง Admin"
            });
        }

        db.query(
            "DELETE FROM posts WHERE id = ?",
            [req.params.id],
            (err, result) => {

                if (err) {

                    console.error(
                        "ADMIN DELETE POST ERROR:",
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message: err.sqlMessage || err.message
                    });
                }

                if (result.affectedRows === 0) {

                    return res.status(404).json({
                        success: false,
                        message: "ไม่พบโพสต์นี้"
                    });
                }

                res.json({
                    success: true,
                    message: "Admin ลบโพสต์สำเร็จ"
                });

            }
        );

    } catch (error) {

        console.error(
            "ADMIN AUTH ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "ตรวจสอบสิทธิ์ Admin ไม่สำเร็จ"
        });
    }

});

// ===========================
// ADMIN - UPDATE POST STATUS
// ===========================
app.patch("/admin/posts/:id/status", async (req, res) => {

    const adminId = req.body.admin_id;
    const status = req.body.status;

    if (!adminId || !status) {
        return res.status(400).json({
            success: false,
            message: "ข้อมูลไม่ครบ"
        });
    }

    if (!["lost", "found"].includes(status)) {
        return res.status(400).json({
            success: false,
            message: "สถานะไม่ถูกต้อง"
        });
    }

    try {

        const isAdmin = await requireAdmin(adminId);

        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: "ไม่มีสิทธิ์จัดการโพสต์"
            });
        }

        db.query(
            `
            UPDATE posts
            SET status = ?
            WHERE id = ?
            `,
            [
                status,
                req.params.id
            ],
            (err, result) => {

                if (err) {

                    console.error(
                        "ADMIN UPDATE STATUS ERROR:",
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message: err.sqlMessage || err.message
                    });
                }

                if (result.affectedRows === 0) {

                    return res.status(404).json({
                        success: false,
                        message: "ไม่พบโพสต์"
                    });
                }

                res.json({
                    success: true,
                    message: "Admin เปลี่ยนสถานะโพสต์สำเร็จ"
                });

            }
        );

    } catch (error) {

        console.error(
            "ADMIN AUTH ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "ตรวจสอบสิทธิ์ Admin ไม่สำเร็จ"
        });
    }

});

// ===========================
// ADMIN - GET ALL USERS
// ===========================
app.get("/admin/users", async (req, res) => {

    const userId = req.query.user_id;

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: "ไม่พบ user_id"
        });
    }

    try {

        const isAdmin = await requireAdmin(userId);

        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: "ไม่มีสิทธิ์เข้าถึง Admin"
            });
        }

        db.query(
            `
            SELECT
                id,
                first_name,
                last_name,
                username,
                email,
                phone,
                province,
                role,
                created_at
            FROM users
            ORDER BY created_at DESC, id DESC
            `,
            (err, rows) => {

                if (err) {

                    console.error(
                        "ADMIN GET USERS ERROR:",
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message: err.sqlMessage || err.message
                    });
                }

                res.json({
                    success: true,
                    data: rows
                });

            }
        );

    } catch (error) {

        console.error(
            "ADMIN AUTH ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "ตรวจสอบสิทธิ์ Admin ไม่สำเร็จ"
        });
    }

});

// ===========================
// ADMIN - UPDATE USER ROLE
// ===========================
app.patch("/admin/users/:id/role", async (req, res) => {

    const adminId = req.body.admin_id;
    const role = req.body.role;

    if (!adminId || !role) {
        return res.status(400).json({
            success: false,
            message: "ข้อมูลไม่ครบ"
        });
    }

    if (!["user", "admin"].includes(role)) {
        return res.status(400).json({
            success: false,
            message: "Role ไม่ถูกต้อง"
        });
    }

    try {

        const isAdmin = await requireAdmin(adminId);

        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: "ไม่มีสิทธิ์จัดการผู้ใช้"
            });
        }

        db.query(
            `
            UPDATE users
            SET role = ?
            WHERE id = ?
            `,
            [
                role,
                req.params.id
            ],
            (err, result) => {

                if (err) {

                    console.error(
                        "ADMIN UPDATE ROLE ERROR:",
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message: err.sqlMessage || err.message
                    });
                }

                if (result.affectedRows === 0) {

                    return res.status(404).json({
                        success: false,
                        message: "ไม่พบผู้ใช้งาน"
                    });
                }

                res.json({
                    success: true,
                    message: "เปลี่ยนสิทธิ์ผู้ใช้สำเร็จ"
                });

            }
        );

    } catch (error) {

        console.error(
            "ADMIN AUTH ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "ตรวจสอบสิทธิ์ Admin ไม่สำเร็จ"
        });
    }

});

// ===========================
// GET MY POSTS
// ===========================
app.get("/users/:userId/posts", (req, res) => {

    const userId = req.params.userId;

    db.query(
        `
        SELECT
            id,
            user_id,
            pet_name,
            pet_type,
            breed,
            province,
            description,
            image,
            latitude,
            longitude,
            status,
            created_at
        FROM posts
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
        `,
        [userId],
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

                // ==========================================
                // สร้าง Notification เมื่อสร้างโพสต์สำเร็จ
                // ==========================================
                db.query(
                    `
                    INSERT INTO notifications
                    (
                        user_id,
                        message
                    )
                    VALUES (?, ?)
                    `,
                    [
                        user_id,
                        `สร้างโพสต์ตามหา "${pet_name}" สำเร็จแล้ว`
                    ],
                    (notiErr) => {

                        if (notiErr) {

                            console.error(
                                "CREATE POST NOTIFICATION ERROR:",
                                notiErr
                            );

                        }

                        // สร้างโพสต์สำเร็จ แม้ notification จะมีปัญหา
                        return res.json({
                            success: true,
                            id: result.insertId
                        });

                    }
                );

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

        // ==========================================
        // ค่าเกณฑ์จาก Automated Test
        // ==========================================

        const MATCH_THRESHOLD = 0.50;

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

        // ==========================================
        // ดึงโพสต์ที่มี Embedding
        // ==========================================

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

                // ==========================================
                // เปรียบเทียบกับทุกโพสต์
                // ==========================================

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

                            similarity,

                            similarityPercent:
                                similarity * 100,

                            isMatch:
                                similarity >=
                                MATCH_THRESHOLD
                        });

                    } catch (error) {

                        console.log(
                            "อ่าน Embedding ไม่ได้ของ post:",
                            post.id
                        );

                    }
                }

                // ==========================================
                // เรียงจาก Similarity สูง → ต่ำ
                // ==========================================


                results.sort(
                    (a, b) =>
                        b.similarity -
                        a.similarity
                );

                // ==========================================
                // Match ที่ผ่าน Threshold เท่านั้น
                // ==========================================

                const matchedResults =
                    results
                        .filter(
                            post =>
                                post.similarity >=
                                MATCH_THRESHOLD
                        )
                        .slice(0, 10);

                // ==========================================
                // Best Result
                // ==========================================

                const bestResult =
                    results.length > 0
                        ? results[0]
                        : null;

                console.log(
                    "\nผลการค้นหา:"
                );

                if (bestResult) {

                    console.log(
                        `Best Match: Post ${bestResult.id}`
                    );

                    console.log(
                        `Similarity: ${
                            bestResult.similarityPercent.toFixed(2)
                        }%`
                    );

                    console.log(
                        `Threshold: ${
                            MATCH_THRESHOLD * 100
                        }%`
                    );

                    console.log(
                        `Match: ${
                            bestResult.similarity >=
                            MATCH_THRESHOLD
                        }`
                    );
                }

                if (
                    matchedResults.length === 0
                ) {

                    console.log(
                        "❌ ไม่พบโพสต์ที่ผ่านเกณฑ์ Match"
                    );

                } else {

                    matchedResults.forEach(
                        (post, index) => {

                            console.log(
                                `${index + 1}. ` +
                                `Post ${post.id} - ` +
                                `Similarity: ` +
                                `${post.similarityPercent.toFixed(2)}%`
                            );

                        }
                    );
                }

                // ==========================================
                // ส่งผลกลับไปหน้าเว็บ
                // ==========================================

                res.json({

                    success: true,

                    threshold:
                        MATCH_THRESHOLD,

                    thresholdPercent:
                        MATCH_THRESHOLD * 100,

                    bestMatch:

                        bestResult
                            ? {
                                postId:
                                    bestResult.id,

                                similarity:
                                    bestResult.similarity,

                                similarityPercent:
                                    bestResult
                                        .similarityPercent,

                                isMatch:
                                    bestResult
                                        .similarity >=
                                    MATCH_THRESHOLD
                            }
                            : null,

                    data:
                        matchedResults
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

            message:
                "ไม่สามารถสแกนสัตว์เลี้ยงได้"
        });
    }
});

// ===========================
// UPDATE MY POST
// ===========================
app.put("/posts/:id", (req, res) => {

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

    db.query(
        `
        UPDATE posts
        SET
            pet_name=?,
            pet_type=?,
            breed=?,
            province=?,
            description=?,
            latitude=?,
            longitude=?
        WHERE id=?
        AND user_id=?
        `,
        [
            pet_name,
            pet_type,
            breed,
            province,
            description,
            latitude,
            longitude,
            req.params.id,
            user_id
        ],
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.sqlMessage
                });
            }

            if (result.affectedRows === 0) {
                return res.status(403).json({
                    success: false,
                    message: "คุณไม่มีสิทธิ์แก้ไขโพสต์นี้"
                });
            }

            res.json({
                success: true,
                message: "แก้ไขโพสต์สำเร็จ"
            });

        }
    );

});

// ===========================
// UPDATE MY POST
// ===========================
app.put("/posts/:id", (req, res) => {

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

    db.query(
        `
        UPDATE posts
        SET
            pet_name = ?,
            pet_type = ?,
            breed = ?,
            province = ?,
            description = ?,
            latitude = ?,
            longitude = ?
        WHERE id = ?
        AND user_id = ?
        `,
        [
            pet_name,
            pet_type,
            breed,
            province,
            description,
            latitude,
            longitude,
            req.params.id,
            user_id
        ],
        (err, result) => {

            if (err) {

                console.error(
                    "UPDATE POST ERROR:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message: err.sqlMessage || err.message
                });

            }

            if (result.affectedRows === 0) {

                return res.status(403).json({
                    success: false,
                    message: "คุณไม่มีสิทธิ์แก้ไขโพสต์นี้ หรือไม่พบโพสต์"
                });

            }

            res.json({
                success: true,
                message: "แก้ไขโพสต์สำเร็จ"
            });

        }
    );

});

// ===========================
// UPDATE POST STATUS
// ===========================
app.patch("/posts/:id/status", (req, res) => {

    const {
        user_id,
        status
    } = req.body;

    // อนุญาตเฉพาะสถานะที่ระบบใช้
    if (!["lost", "found"].includes(status)) {

        return res.status(400).json({
            success: false,
            message: "สถานะไม่ถูกต้อง"
        });

    }

    // ==========================================
    // ตรวจว่าเป็นเจ้าของโพสต์จริง + ดูสถานะเดิม
    // ==========================================
    db.query(
        `
        SELECT id, user_id, pet_name, status
        FROM posts
        WHERE id = ?
        AND user_id = ?
        `,
        [
            req.params.id,
            user_id
        ],
        (err, rows) => {

            if (err) {

                console.error(
                    "CHECK POST STATUS ERROR:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message: err.sqlMessage || err.message
                });

            }

            if (rows.length === 0) {

                return res.status(403).json({
                    success: false,
                    message: "คุณไม่มีสิทธิ์แก้ไขโพสต์นี้ หรือไม่พบโพสต์"
                });

            }

            const post = rows[0];
            const oldStatus = post.status;

            // ==========================================
            // อัปเดตสถานะ
            // ==========================================
            db.query(
                `
                UPDATE posts
                SET status = ?
                WHERE id = ?
                AND user_id = ?
                `,
                [
                    status,
                    req.params.id,
                    user_id
                ],
                (updateErr, result) => {

                    if (updateErr) {

                        console.error(
                            "UPDATE POST STATUS ERROR:",
                            updateErr
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                updateErr.sqlMessage ||
                                updateErr.message
                        });

                    }

                    if (result.affectedRows === 0) {

                        return res.status(403).json({
                            success: false,
                            message: "ไม่สามารถเปลี่ยนสถานะโพสต์ได้"
                        });

                    }

                    // ==========================================
                    // สร้าง Notification เฉพาะตอน
                    // lost -> found
                    // ==========================================
                    if (oldStatus !== status) {

                        const statusText =
                            status === "found"
                                ? "พบแล้ว"
                                : "กำลังตามหา";

                        db.query(
                            `
                            INSERT INTO notifications
                            (
                                user_id,
                                message
                            )
                            VALUES (?, ?)
                            `,
                            [
                                user_id,
                                `สถานะสัตว์เลี้ยง "${post.pet_name}" เปลี่ยนสถานะเป็น "${statusText}" แล้ว`
                            ],
                            (notiErr) => {

                                if (notiErr) {
                                    console.error(
                                        "CREATE STATUS NOTIFICATION ERROR:",
                                        notiErr
                                    );
                                }

                                return res.json({
                                    success: true,
                                    message: "เปลี่ยนสถานะโพสต์สำเร็จ"
                                });
                            }
                        );

                    } else {

                        return res.json({
                            success: true,
                            message: "เปลี่ยนสถานะโพสต์สำเร็จ"
                        });

                    }

                }
            );

        }
    );

});

// ===========================
// DELETE MY POST
// ===========================
app.delete("/posts/:id", (req, res) => {

    const { user_id } = req.body;

    db.query(
        `
        DELETE FROM posts
        WHERE id = ?
        AND user_id = ?
        `,
        [
            req.params.id,
            user_id
        ],
        (err, result) => {

            if (err) {
                console.error("DELETE POST ERROR:", err);

                return res.status(500).json({
                    success: false,
                    message: err.sqlMessage || err.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(403).json({
                    success: false,
                    message: "คุณไม่มีสิทธิ์ลบโพสต์นี้ หรือไม่พบโพสต์"
                });
            }

            res.json({
                success: true,
                message: "ลบโพสต์สำเร็จ"
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
        conversation_id,
        sender_id,
        receiver_id,
        message
    } = req.body;

    if (!sender_id || !message) {

        return res.status(400).json({
            success: false,
            message: "ข้อมูลข้อความไม่ครบ"
        });

    }

    // ==========================================
    // หา receiver จาก conversation ถ้าไม่ได้ส่งมา
    // ==========================================

    const insertMessage = (finalReceiverId) => {

        if (!finalReceiverId) {

            return res.status(400).json({
                success: false,
                message: "ไม่พบผู้รับข้อความ"
            });

        }

        db.query(

            `INSERT INTO messages
            (
                conversation_id,
                sender_id,
                receiver_id,
                message
            )
            VALUES(?,?,?,?)`,

            [
                conversation_id || null,
                sender_id,
                finalReceiverId,
                message
            ],

            (err, result) => {

                if (err) {

                    console.error(
                        "SEND MESSAGE ERROR:",
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            err.sqlMessage ||
                            err.message
                    });

                }

                // ==========================================
                // สร้าง Notification ให้ผู้รับ
                // ==========================================

                db.query(

                    `SELECT first_name, last_name
                    FROM users
                    WHERE id=?`,

                    [sender_id],

                    (userErr, users) => {

                        if (userErr) {

                            console.error(
                                "GET SENDER ERROR:",
                                userErr
                            );

                            return res.json({
                                success: true,
                                id: result.insertId
                            });

                        }

                        const senderName =
                            users.length > 0
                                ? `${users[0].first_name} ${users[0].last_name}`.trim()
                                : "ผู้ใช้งาน";

                        const notificationMessage =
                            `${senderName} ส่งข้อความใหม่ถึงคุณ`;

                        db.query(

                            `INSERT INTO notifications
                            (
                                user_id,
                                message
                            )
                            VALUES(?,?)`,

                            [
                                finalReceiverId,
                                notificationMessage
                            ],

                            (notiErr) => {

                                if (notiErr) {

                                    console.error(
                                        "CREATE NOTIFICATION ERROR:",
                                        notiErr
                                    );

                                }

                                // ต่อให้ notification มีปัญหา
                                // ข้อความก็ยังถือว่าส่งสำเร็จ

                                res.json({
                                    success: true,
                                    id: result.insertId
                                });

                            }

                        );

                    }

                );

            }

        );

    };

    // ==========================================
    // ถ้ามี receiver_id อยู่แล้ว
    // ==========================================

    if (receiver_id) {

        return insertMessage(
            Number(receiver_id)
        );

    }

    // ==========================================
    // ถ้าไม่มี receiver_id ให้หา
    // จาก conversation_id
    // ==========================================

    if (conversation_id) {

        db.query(

            `SELECT
                user_one_id,
                user_two_id
            FROM conversations
            WHERE id=?`,

            [conversation_id],

            (err, rows) => {

                if (err) {

                    return res.status(500).json({
                        success: false,
                        message: err.sqlMessage
                    });

                }

                if (rows.length === 0) {

                    return res.status(404).json({
                        success: false,
                        message: "ไม่พบ Conversation"
                    });

                }

                const conversation =
                    rows[0];

                const myId =
                    Number(sender_id);

                const finalReceiverId =
                    Number(
                        conversation.user_one_id
                    ) === myId
                        ? Number(
                            conversation.user_two_id
                        )
                        : Number(
                            conversation.user_one_id
                        );

                insertMessage(
                    finalReceiverId
                );

            }

        );

        return;
    }

    return res.status(400).json({
        success: false,
        message: "ไม่พบผู้รับหรือ Conversation"
    });

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
