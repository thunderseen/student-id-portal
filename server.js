const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "students_db.json");

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(express.static(path.join(__dirname, "public")));

function readDb() {
  if (!fs.existsSync(DB_FILE)) return [];
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    return false;
  }
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", count: readDb().length });
});

app.post("/api/submit", (req, res) => {
  const rec = req.body;
  if (!rec || !rec.name || !rec.name.trim()) {
    return res.status(400).json({ error: "Student name is required" });
  }
  const db = readDb();
  const newStudent = {
    id: rec.id || ("st_" + Date.now()),
    name: (rec.name || "").trim(),
    idNo: (rec.idNo || "").trim(),
    father: (rec.father || "").trim(),
    blood: (rec.blood || "").trim(),
    nid: (rec.nid || "").trim(),
    district: (rec.district || "বরিশাল").trim(),
    mobile: (rec.mobile || "").trim(),
    validity: (rec.validity || "ডিসেম্বর ২০২৬").trim(),
    submittedAt: new Date().toISOString()
  };

  const existingIdx = db.findIndex(s =>
    (newStudent.idNo && s.idNo === newStudent.idNo) ||
    (newStudent.name && newStudent.mobile && s.name === newStudent.name && s.mobile === newStudent.mobile)
  );

  if (existingIdx >= 0) db[existingIdx] = newStudent;
  else db.push(newStudent);

  writeDb(db);
  res.json({ success: true, count: db.length, student: newStudent });
});

app.get("/api/students", (req, res) => {
  const auth = req.headers["x-admin-password"] || req.query.password;
  if (auth !== "sabasagol") {
    return res.status(401).json({ error: "Unauthorized: Admin password required" });
  }
  res.json(readDb());
});

app.delete("/api/students/:id", (req, res) => {
  const auth = req.headers["x-admin-password"] || req.query.password;
  if (auth !== "sabasagol") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  let db = readDb();
  db = db.filter(s => s.id !== req.params.id);
  writeDb(db);
  res.json({ success: true, count: db.length });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
