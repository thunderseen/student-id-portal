// Fast In-Memory + Persistent Backend Server for e-Learning & Earning Ltd. ID Card Studio
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

// Fast static serving from both public/ and root directory with caching
app.use(express.static(path.join(__dirname, "public"), { maxAge: "5m" }));
app.use(express.static(__dirname, { maxAge: "5m" }));

// In-memory cache so API requests respond in < 2ms without disk I/O delay
let memoryDb = [];
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) memoryDb = parsed;
  }
} catch (err) {
  memoryDb = [];
}

function persistDbAsync() {
  fs.writeFile(DB_FILE, JSON.stringify(memoryDb, null, 2), "utf8", () => {});
}

// 1. Ultra-fast Health & Keep-Alive endpoint
app.get("/api/health", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ status: "ok", count: memoryDb.length });
});

// 2. Instant Student Submission endpoint
app.post("/api/submit", (req, res) => {
  const rec = req.body;
  if (!rec || !rec.name || !rec.name.trim()) {
    return res.status(400).json({ error: "Student name is required" });
  }

  const newStudent = {
    id: rec.id || ("st_" + Date.now()),
    lang: rec.lang || "bn",
    font: rec.font || "",
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

  const existingIdx = memoryDb.findIndex(s =>
    (newStudent.idNo && s.idNo === newStudent.idNo) ||
    (newStudent.name && newStudent.mobile && s.name === newStudent.name && s.mobile === newStudent.mobile)
  );

  if (existingIdx >= 0) memoryDb[existingIdx] = newStudent;
  else memoryDb.push(newStudent);

  persistDbAsync();
  res.json({ success: true, count: memoryDb.length, student: newStudent });
});

// 3. Admin Get All Students (Protected with password: sabasagol)
app.get("/api/students", (req, res) => {
  const auth = req.headers["x-admin-password"] || req.query.password;
  if (auth !== "sabasagol") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.setHeader("Cache-Control", "no-store");
  res.json(memoryDb);
});

// 4. Admin Delete Student
app.delete("/api/students/:id", (req, res) => {
  const auth = req.headers["x-admin-password"] || req.query.password;
  if (auth !== "sabasagol") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  memoryDb = memoryDb.filter(s => s.id !== req.params.id);
  persistDbAsync();
  res.json({ success: true, count: memoryDb.length });
});

// Serve index.html from either root or public/
app.get("*", (req, res) => {
  const rootIdx = path.join(__dirname, "index.html");
  const pubIdx = path.join(__dirname, "public", "index.html");
  if (fs.existsSync(rootIdx)) return res.sendFile(rootIdx);
  if (fs.existsSync(pubIdx)) return res.sendFile(pubIdx);
  res.status(404).send("index.html not found");
});

app.listen(PORT, () => {
  console.log("Fast ID Card Server running on port", PORT);
});
