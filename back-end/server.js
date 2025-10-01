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
  database: 'mind_better'
});

// (Optional) Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// ✅ Login: POST /api/login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = md5(password); // หรือใช้ bcrypt ตามระบบจริง
  console.log("Attempting login for user:", email);

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

/* ============================
 * PHQ-2 Endpoints (NEW)
 * ============================ */

// Save PHQ2 Result
app.post("/api/phq2/save", (req, res) => {
  const { user_id, total_score, result_text, recommended_action, answers } = req.body;

  if (!Number.isInteger(user_id)) {
    return res.json({ result: false, message: "user_id ไม่ถูกต้อง" });
  }
  if (!Number.isInteger(total_score) || total_score < 0 || total_score > 2) {
    return res.json({ result: false, message: "total_score (PHQ-2) ต้องอยู่ระหว่าง 0–2" });
  }

  const sql = "INSERT INTO phq2_results (user_id, total_score, result_text, recommended_action) VALUES (?, ?, ?, ?)";
  pool.query(sql, [user_id, total_score, result_text || "", recommended_action || ""], (error, results) => {
    if (error) {
      return res.json({ result: false, message: error.message });
    }
    const resultId = results.insertId;

    // บันทึกคำตอบทั้ง 2 ข้อ (optional)
    if (Array.isArray(answers) && answers.length === 2) {
      for (const sc of answers) {
        if (!(sc === 0 || sc === 1)) {
          return res.json({ result: false, message: "PHQ-2: score ต้องเป็น 0 หรือ 1 เท่านั้น" });
        }
      }
      const values = answers.map((score, index) => [resultId, index + 1, score]);
      const insertAnswers = "INSERT INTO phq2_answers (result_id, question_number, score) VALUES ?";
      pool.query(insertAnswers, [values], (err2) => {
        if (err2) {
          return res.json({ result: false, message: "บันทึกผลแล้ว แต่คำตอบล้มเหลว: " + err2.message });
        }
        res.json({ result: true, message: "บันทึกสำเร็จ", id: resultId });
      });
    } else {
      res.json({ result: true, message: "บันทึกเฉพาะผลรวม (ไม่มีคำตอบ)", id: resultId });
    }
  });
});

// Get PHQ2 History for specific user
app.get("/api/phq2/history/:user_id", (req, res) => {
  const userId = req.params.user_id;
  const sql = `
    SELECT id, total_score, result_text, recommended_action, created_at
    FROM phq2_results
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;
  pool.query(sql, [userId], (error, results) => {
    if (error) return res.json({ result: false, message: error.message });
    res.json({ result: true, data: results });
  });
});

// Get All PHQ2 Results
app.get("/api/phq2/all", (_req, res) => {
  const sql = `
    SELECT id, user_id, total_score, result_text, recommended_action, created_at
    FROM phq2_results
    ORDER BY created_at DESC
  `;
  pool.query(sql, (error, results) => {
    if (error) return res.json({ result: false, message: error.message });
    res.json({ result: true, data: results });
  });
});

// Get PHQ2 Result Detail by ID
app.get("/api/phq2/detail/:id", (req, res) => {
  const resultId = req.params.id;
  const sql = `
    SELECT id, user_id, total_score, result_text, recommended_action, created_at
    FROM phq2_results
    WHERE id = ?
  `;
  pool.query(sql, [resultId], (error, results) => {
    if (error) return res.json({ result: false, message: error.message });
    if (results.length === 0) return res.json({ result: false, message: "ไม่พบข้อมูลผลประเมิน" });
    res.json({ result: true, data: results[0] });
  });
});

// Get PHQ2 Answers by Result ID
app.get("/api/phq2/answers/:result_id", (req, res) => {
  const resultId = req.params.result_id;
  const sql = `
    SELECT question_number, score
    FROM phq2_answers
    WHERE result_id = ?
    ORDER BY question_number ASC
  `;
  pool.query(sql, [resultId], (error, results) => {
    if (error) return res.json({ result: false, message: error.message });
    res.json({ result: true, data: results });
  });
});

/* ============================
 * PHQ-9 Endpoints (EXISTING)
 * ============================ */

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
          res.json({ result: true, message: "บันทึกสำเร็จ", id: resultId });
        });
      } else {
        res.json({ result: true, message: "บันทึกเฉพาะผลรวม (ไม่มีคำตอบ)", id: resultId });
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
app.get("/api/phq9/all", (_req, res) => {
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

// Get PHQ9 Result Detail by ID
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

// Get PHQ9 Answers by Result ID
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

/* ============================
 * PHQ-8 Endpoints (NEW)
 * ============================ */

// Save PHQ8 Result
app.post("/api/phq8/save", (req, res) => {
  const { user_id, total_score, result_text, recommended_action, answers } = req.body;

  if (!Number.isInteger(user_id)) {
    return res.json({ result: false, message: "user_id ไม่ถูกต้อง" });
  }
  if (!Number.isInteger(total_score) || total_score < 0) {
    return res.json({ result: false, message: "total_score (PHQ-8) ต้องเป็นจำนวนเต็มไม่ติดลบ" });
  }

  const sql = "INSERT INTO phq8_results (user_id, total_score, result_text, recommended_action) VALUES (?, ?, ?, ?)";
  pool.query(sql, [user_id, total_score, result_text || "", recommended_action || ""], (error, results) => {
    if (error) {
      return res.json({ result: false, message: error.message });
    }
    const resultId = results.insertId;

    // บันทึกคำตอบทั้ง 8 ข้อ (optional)
    if (Array.isArray(answers) && answers.length === 8) {
      for (const sc of answers) {
        if (!Number.isInteger(sc) || sc < 0) {
          return res.json({ result: false, message: "PHQ-8: score ต่อข้อ ต้องเป็นจำนวนเต็มไม่ติดลบ" });
        }
      }
      const values = answers.map((score, index) => [resultId, index + 1, score]);
      const insertAnswers = "INSERT INTO phq8_answers (result_id, question_number, score) VALUES ?";
      pool.query(insertAnswers, [values], (err2) => {
        if (err2) {
          return res.json({ result: false, message: "บันทึกผลแล้ว แต่คำตอบล้มเหลว: " + err2.message });
        }
        res.json({ result: true, message: "บันทึกสำเร็จ", id: resultId });
      });
    } else {
      res.json({ result: true, message: "บันทึกเฉพาะผลรวม (ไม่มีคำตอบ)", id: resultId });
    }
  });
});

// Get PHQ8 History for specific user
app.get("/api/phq8/history/:user_id", (req, res) => {
  const userId = req.params.user_id;
  const sql = `
    SELECT id, total_score, result_text, recommended_action, created_at
    FROM phq8_results
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;
  pool.query(sql, [userId], (error, results) => {
    if (error) return res.json({ result: false, message: error.message });
    res.json({ result: true, data: results });
  });
});

// Get All PHQ8 Results
app.get("/api/phq8/all", (_req, res) => {
  const sql = `
    SELECT id, user_id, total_score, result_text, recommended_action, created_at
    FROM phq8_results
    ORDER BY created_at DESC
  `;
  pool.query(sql, (error, results) => {
    if (error) return res.json({ result: false, message: error.message });
    res.json({ result: true, data: results });
  });
});

// Get PHQ8 Result Detail by ID
app.get("/api/phq8/detail/:id", (req, res) => {
  const resultId = req.params.id;
  const sql = `
    SELECT id, user_id, total_score, result_text, recommended_action, created_at
    FROM phq8_results
    WHERE id = ?
  `;
  pool.query(sql, [resultId], (error, results) => {
    if (error) return res.json({ result: false, message: error.message });
    if (results.length === 0) return res.json({ result: false, message: "ไม่พบข้อมูลผลประเมิน" });
    res.json({ result: true, data: results[0] });
  });
});

// Get PHQ8 Answers by Result ID
app.get("/api/phq8/answers/:result_id", (req, res) => {
  const resultId = req.params.result_id;
  const sql = `
    SELECT question_number, score
    FROM phq8_answers
    WHERE result_id = ?
    ORDER BY question_number ASC
  `;
  pool.query(sql, [resultId], (error, results) => {
    if (error) return res.json({ result: false, message: error.message });
    res.json({ result: true, data: results });
  });
});

/* ===========================================
 * Generic Assessments Router (PHQ-2/9/8) — รองรับ frontend ของคุณ
 * =========================================== */

const TYPE_MAP = {
  '2q': 'phq2', 'phq2': 'phq2',
  '9q': 'phq9', 'phq9': 'phq9',
  '8q': 'phq8', 'phq8': 'phq8',
};

const TABLES = {
  phq2: { results: 'phq2_results', answers: 'phq2_answers', len: 2, min: 0, max: 1 },
  phq9: { results: 'phq9_results', answers: 'phq9_answers', len: 9, min: 0, max: 3 },
  phq8: { results: 'phq8_results', answers: 'phq8_answers', len: 8, min: 0, max: Number.MAX_SAFE_INTEGER },
};

// GET /api/assessments/history/:user_id?type=phq2|phq9|phq8
app.get('/api/assessments/history/:user_id', (req, res) => {
  console.log("TEST api/assessment");
  const userId = req.params.user_id;
  const typeRaw = req.query.type;
  const type = typeRaw ? TYPE_MAP[String(typeRaw).toLowerCase()] : null;

  if (type) {
    const t = TABLES[type];
    const sql = `
      SELECT id, user_id, total_score, result_text, recommended_action, created_at, '${type}' AS type
      FROM ${t.results}
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;
    return pool.query(sql, [userId], (err, rows) => {
      if (err) return res.json({ result: false, message: err.message, data: [] });
      res.json({ result: true, data: rows });
    });
  }

  // รวมทุกแบบ
  const sqlUnion = `
    SELECT * FROM (
      SELECT id, user_id, total_score, result_text, recommended_action, created_at, 'phq2' AS type
      FROM phq2_results WHERE user_id = ?
      UNION ALL
      SELECT id, user_id, total_score, result_text, recommended_action, created_at, 'phq9' AS type
      FROM phq9_results WHERE user_id = ?
      UNION ALL
      SELECT id, user_id, total_score, result_text, recommended_action, created_at, 'phq8' AS type
      FROM phq8_results WHERE user_id = ?
    ) t
    ORDER BY created_at DESC
  `;
  pool.query(sqlUnion, [userId, userId, userId], (err, rows) => {
    if (err) return res.json({ result: false, message: err.message, data: [] });
    res.json({ result: true, data: rows });
  });
});

// POST /api/assessments — บันทึกแบบ generic
// body: { type:'phq2'|'phq9'|'phq8'|'2q'|'9q'|'8q', user_id, total_score?, result_text?, recommended_action?, answers?: number[len] }
app.post('/api/assessments', (req, res) => {
    console.log("/api/assessments")
    console.log("Debug req: " , req.body)
  try {
    const { type: typeRaw, user_id, total_score, result_text, recommended_action, answers } = req.body || {};
    const type = TYPE_MAP[String(typeRaw || '').toLowerCase()];
    if (!type || !TABLES[type]) return res.status(400).json({ result: false, message: 'unknown type' });
    if (!Number.isInteger(user_id)) return res.status(400).json({ result: false, message: 'invalid user_id' });

    const t = TABLES[type];

    console.log("t value: " , t)

    // answers optional, ถ้ามีต้อง validate
    let scores = Array.isArray(answers) ? answers.slice() : null;
    if (scores) {
      if (scores.length !== t.len) {
        return res.status(400).json({ result: false, message: `answers length must be ${t.len}` });
      }
      scores = scores.map(v => Number(v));
      if (scores.some(v => !Number.isFinite(v) || v < t.min || v > t.max || !Number.isInteger(v))) {
        return res.status(400).json({ result: false, message: `answers must be integers in [${t.min}, ${t.max}]` });
      }
    }

    // ถ้าไม่ส่ง total_score มา จะคำนวณจาก answers
    const total = Number.isFinite(Number(total_score))
      ? Number(total_score)
      : (scores ? scores.reduce((s, v) => s + v, 0) : null);

    if (!Number.isFinite(total) || total < 0) {
      return res.status(400).json({ result: false, message: 'invalid total_score' });
    }

    const sqlInsertResult = `INSERT INTO ${t.results} (user_id, total_score, result_text, recommended_action) VALUES (?, ?, ?, ?)`;
    pool.query(sqlInsertResult, [user_id, total, result_text || '', recommended_action || ''], (err, r) => {
      if (err) return res.json({ result: false, message: err.message });
      const resultId = r.insertId;

      // ถ้าไม่มี answers → จบ
      if (!scores) {
        return res.json({ result: true, id: resultId, message: 'saved (result only)' });
      }

      // มี answers → insert ชุด
      const values = scores.map((score, idx) => [resultId, idx + 1, score]);
      const sqlInsertAnswers = `INSERT INTO ${t.answers} (result_id, question_number, score) VALUES ?`;
      pool.query(sqlInsertAnswers, [values], (err2) => {
        if (err2) return res.json({ result: false, message: 'saved result, but answers failed: ' + err2.message });
        res.json({ result: true, id: resultId, message: 'saved' });
      });
    });
  } catch (e) {
    res.status(500).json({ result: false, message: e.message });
  }
});

// DELETE /api/assessments/:id — จะลองลบจาก phq2 → phq9 → phq8 ตามลำดับ
app.delete('/api/assessments/:id', (req, res) => {
  const id = req.params.id;
  const types = ['phq2', 'phq9', 'phq8'];

  const tryDelete = (idx) => {
    if (idx >= types.length) return res.status(404).json({ result: false, message: 'not found' });
    const type = types[idx];
    const sql = `DELETE FROM ${TABLES[type].results} WHERE id = ?`;
    pool.query(sql, [id], (err, r) => {
      if (err) return res.json({ result: false, message: err.message });
      if (r.affectedRows > 0) return res.json({ result: true, message: `deleted from ${type}` });
      tryDelete(idx + 1);
    });
  };
  tryDelete(0);
});

// GET /api/assessments/stats/:user_id — สถิติย่อ
app.get('/api/assessments/stats/:user_id', (req, res) => {
  const userId = req.params.user_id;

  const q = (tbl, type) => (`
    SELECT
      '${type}' AS type,
      COUNT(*) AS count_items,
      ROUND(AVG(total_score), 2) AS avg_total,
      (SELECT total_score FROM ${tbl} WHERE user_id = ? ORDER BY created_at DESC LIMIT 1) AS last_total,
      (SELECT created_at  FROM ${tbl} WHERE user_id = ? ORDER BY created_at DESC LIMIT 1) AS last_time
    FROM ${tbl}
    WHERE user_id = ?
  `);

  const sql = `
    ${q('phq2_results','phq2')}
    UNION ALL
    ${q('phq9_results','phq9')}
    UNION ALL
    ${q('phq8_results','phq8')}
  `;
  pool.query(sql, [userId, userId, userId, userId, userId, userId, userId, userId, userId], (err, rows) => {
    if (err) return res.json({ result: false, message: err.message, data: null });
    res.json({ result: true, data: rows });
  });
});

/* (Optional) Backward-compat alias — ถ้า frontend เก่าเรียก /assessment/8q และ /assessment/:instrument/history/:user_id */
app.post("/assessment/8q", (req, res, next) => {
  req.url = "/api/phq8/save";
  app._router.handle(req, res, next);
});
app.get('/assessment/:instrument/history/:user_id', (req, res, next) => {
  const map = { '2q':'phq2','phq2':'phq2','9q':'phq9','phq9':'phq9','8q':'phq8','phq8':'phq8' };
  const inst = map[String(req.params.instrument || '').toLowerCase()];
  if (!inst) return res.status(404).send('Unknown instrument');
  req.url = `/api/${inst}/history/${req.params.user_id}`;
  app._router.handle(req, res, next);
});

app.listen(port, () => {
  console.log(`MindBetter backend listening at http://localhost:${port}`);
});
