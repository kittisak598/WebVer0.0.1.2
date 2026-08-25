const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "loveanimal",
    port: 3306
});

db.connect((err) => {
    if (err) {
        console.log("เชื่อมต่อฐานข้อมูลไม่สำเร็จ");
        console.log(err);
    } else {
        console.log("Database Connected");
    }
});

module.exports = db;