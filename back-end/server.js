const express = require('express');
const app = express();
const port = 8080;
const bodyParser = require('body-parser');
const cors = require("cors");
const mysql = require('mysql');
const md5 = require('md5');



app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: "",
    database: 'mindbetter'
});

// ✅ Login: POST /api/login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = md5(password); // หรือ bcrypt แล้วแต่ระบบ
  console.log("Attempting login for user:", hashedPassword);

  const sql = "SELECT * FROM users WHERE email = ? AND password_hash = ?";
  pool.query(sql, [email, hashedPassword], (err, results) => {
    if (err) return res.json({ result: false, message: err.message });

    if (results.length === 0) {
      return res.json({ result: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
    }

    const user = results[0];
    res.json({
      result: true,
      data: {
        user_id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role_id: user.role_id,
        role_name: user.role_name
      }
    });
  });
});

// Save PHQ9 Result
app.post("/api/phq9/save", (req, res) => {
    const { user_id, total_score, result_text, recommended_action, answers } = req.body;

    const sql = "INSERT INTO phq9_results (user_id, total_score, result_text, recommended_action) VALUES (?, ?, ?, ?)";
    pool.query(sql, [user_id, total_score, result_text, recommended_action], (error, results) => {
        if (error) {
            res.json({ result: false, message: error.message });
        } else {
            const resultId = results.insertId;

            // บันทึกคำตอบทั้ง 9 ข้อ
            if (answers && answers.length === 9) {
                const values = answers.map((score, index) => [resultId, index + 1, score]);
                const insertAnswers = "INSERT INTO phq9_answers (result_id, question_number, score) VALUES ?";
                pool.query(insertAnswers, [values], (err2) => {
                    if (err2) {
                        return res.json({ result: false, message: "บันทึกผลแล้ว แต่คำตอบล้มเหลว: " + err2.message });
                    }
                    res.json({ result: true, message: "บันทึกสำเร็จ" });
                });
            } else {
                res.json({ result: true, message: "บันทึกเฉพาะผลรวม (ไม่มีคำตอบ)" });
            }
        }
    });
});

// Get PHQ9 History for specific user
app.get("/api/phq9/history/:user_id", (req, res) => {
    const userId = req.params.user_id;

    const sql = "SELECT id, total_score, result_text, recommended_action, created_at FROM phq9_results WHERE user_id = ? ORDER BY created_at DESC";
    pool.query(sql, [userId], (error, results) => {
        if (error) {
            res.json({ result: false, message: error.message });
        } else {
            res.json({ result: true, data: results });
        }
    });
});

// Get All PHQ9 Results
app.get("/api/phq9/all", (req, res) => {
    const sql = `
        SELECT id, user_id, total_score, result_text, recommended_action, created_at 
        FROM phq9_results 
        ORDER BY created_at DESC
    `;

    pool.query(sql, (error, results) => {
        if (error) {
            res.json({ result: false, message: error.message });
        } else {
            res.json({ result: true, data: results });
        }
    });
});

// ✅ NEW: Get PHQ9 Result Detail by ID
app.get("/api/phq9/detail/:id", (req, res) => {
    const resultId = req.params.id;
    const sql = `
        SELECT id, user_id, total_score, result_text, recommended_action, created_at
        FROM phq9_results
        WHERE id = ?
    `;

    pool.query(sql, [resultId], (error, results) => {
        if (error) {
            res.json({ result: false, message: error.message });
        } else if (results.length === 0) {
            res.json({ result: false, message: "ไม่พบข้อมูลผลประเมิน" });
        } else {
            res.json({ result: true, data: results[0] });
        }
    });
});

// ✅ NEW: Get PHQ9 Answers by Result ID
app.get("/api/phq9/answers/:result_id", (req, res) => {
    const resultId = req.params.result_id;

    const sql = `
        SELECT question_number, score
        FROM phq9_answers
        WHERE result_id = ?
        ORDER BY question_number ASC
    `;

    pool.query(sql, [resultId], (error, results) => {
        if (error) {
            res.json({ result: false, message: error.message });
        } else {
            res.json({ result: true, data: results });
        }
    });
});

app.listen(port, () => {
    console.log(`PHQ9 backend listening at http://localhost:${port}`);
});
