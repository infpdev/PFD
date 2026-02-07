import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import morgan from "morgan";
import { renderAdmin } from "./dist/server/ssrEntries.js";
import cookieParser from "cookie-parser";
import { spawn } from "child_process";
import { WebSocketServer } from "ws";
import express from "express";
import { db } from "./db/index.js";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const manifestPath = path.join(
  __dirname,
  "dist",
  "client",
  ".vite",
  "manifest.json",
);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
const SEARCH_TYPES = ["Name", "Uan", "Date", "Eno"];

// Spawn FastAPI backend for PDF generation. In production, this is a separate process.

const root = process.cwd();

const isProd = process.env.NODE_ENV === "production";

if (true || isProd) {
  const py = spawn(
    "uvicorn",
    ["backend.main:app", "--host", "127.0.0.1", "--port", "8001"],
    {
      cwd: root,
      stdio: "inherit",
    },
  );

  py.on("error", (err) => {
    console.error("Failed to start FastAPI:", err);
  });
}

const app = express();

const wss = new WebSocketServer({ noServer: true });

// Track connected clients
const wsClients = new Set();

wss.on("connection", (ws) => {
  wsClients.add(ws);

  ws.on("close", () => {
    wsClients.delete(ws);
  });
});

app.use(morgan("dev"));
if (!isProd)
  app.use(
    cors({
      origin: (origin, callback) => {
        // allow non-browser tools (curl, Postman)
        if (!origin) return callback(null, true);

        // localhost (any port)
        if (/^http:\/\/localhost:\d+$/.test(origin)) {
          return callback(null, true);
        }

        // 127.0.0.1
        if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
          return callback(null, true);
        }

        // LAN IPs (192.168.x.x)
        if (/^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin)) {
          return callback(null, true);
        }

        // Optional: 10.x.x.x private range
        if (/^http:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(origin)) {
          return callback(null, true);
        }

        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    }),
  );

app.use(cookieParser());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ======================= SQLITE / POSTGRES ========================
// await db.run(`
//   DROP TABLE IF EXISTS submissions CASCADE;
// `)

if (process.env.NODE_ENV === "production") {
  await db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      uan TEXT,
      eno TEXT,
      dos DATE NOT NULL,
      edited_by JSONB DEFAULT '[]',
      data JSONB NOT NULL,
      docs JSONB
    )
  `);
} else {
  await db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      uan TEXT,
      eno TEXT,
      dos TEXT,
      edited_by TEXT,
      data TEXT,
      docs TEXT
    )
  `);
}

await db.run(`CREATE INDEX IF NOT EXISTS idx_submissions_latest
ON submissions (dos DESC, id DESC);
`);

// db.run(`
//   ALTER TABLE submissions
//   ADD COLUMN eno INTEGER
// `);

const users = {
  1: {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
    role: "admin",
    default_submission_password: process.env.ADMIN_DEFAULT_SUBMISSION_PASSWORD,
  },
};

const usersByUsername = {};

usersByUsername[process.env.ADMIN_USERNAME] = 1;

// To display latest submissions on loading the admin page
let latestSubmissionsCache = {
  data: null,
  lastComputed: 0,
};

const CACHE_TTL = 60 * 5000; // 5 min (adjust as you like)

const sessions = new Map(); // sessionId -> userId

const intakeSessions = new Map();
/*
  adminUserId -> {
    token: string,
    active: boolean,
    startedAt: number,
    password: string
  }
*/

const tokenToAdmin = new Map();
/*
  token -> adminUserId
*/

function generateToken() {
  return crypto.randomUUID(16);
}

// ============================================== Middleware ==============================================

function requireAuth(req, res, next) {
  const sessionId = req?.cookies?.session_id;
  if (!sessionId) {
    console.log("Error finding session ID");
    return res.status(401).redirect("/login");
  }

  const userId = sessions.get(sessionId);

  if (!userId) {
    return res.status(401).redirect("/login");
  }

  req.userId = userId;
  next();
}

function requireAuthNoRedirect(req, res, next) {
  const sessionId = req.cookies?.session_id;
  if (!sessionId) {
    return res.status(401).json({ error: "Missing session ID" });
  }

  const userId = sessions.get(sessionId);
  if (!userId || !users[userId]) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  req.userId = userId;
  next();
}

function requireIntakeToken(req, res, next) {
  const token = req.query.token;
  if (!token) {
    return res.status(403).sendFile(path.resolve("dist/client/404.html"));
  }

  const adminId = tokenToAdmin.get(token);
  if (!adminId) {
    return res.status(403).sendFile(path.resolve("dist/client/404.html"));
  }

  const session = intakeSessions.get(adminId);
  if (!session || !session.active) {
    return res.status(403).sendFile(path.resolve("dist/client/404.html"));
  }

  req.intakeAdminId = adminId;
  next();
}

function gateApiByToken(req, res, next) {
  const sessionId = req.cookies?.session_id;
  req.isAdmin = false;
  if (sessionId) {
    const userId = sessions.get(sessionId);
    const user = users[userId];

    if (user && user.role === "admin") {
      req.userId = userId;
      req.isAdmin = true;
      return next();
    }
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Invalid Authorization format" });
  }

  const adminId = tokenToAdmin.get(token);
  if (!adminId) {
    return res
      .status(403)
      .json({ error: "Invalid intake token", invalid_token: true });
  }

  const intakeSession = intakeSessions.get(adminId);
  if (!intakeSession || !intakeSession.active) {
    return res.status(403).json({ error: "Intake session is not active" });
  }

  // attach trusted context
  req.intakeAdminId = adminId;
  req.intakeToken = token;

  next();
}

// ============================================== ENDPOINTS ==============================================

// ================ Config APIs ================
app.post("/api/intake/start", requireAuth, (req, res) => {
  const adminId = req.userId;

  const existing = intakeSessions.get(adminId);
  if (existing) {
    existing.active = true;
    return res.json({ token: existing.token, password: existing.password });
  }

  const token = generateToken();

  const password =
    users[adminId]?.default_submission_password ?? crypto.randomUUID();

  intakeSessions.set(adminId, {
    token,
    active: true,
    startedAt: Date.now(),
    password,
  });

  tokenToAdmin.set(token, adminId);

  res.json({ token, password });
});

app.post("/api/intake/stop", requireAuth, (req, res) => {
  const adminId = req.userId;

  const session = intakeSessions.get(adminId);
  if (!session) {
    return res.status(404).json({ error: "No active intake" });
  }

  session.active = false;

  res.json({ success: true });
});

app.post("/api/intake/restart", requireAuth, (req, res) => {
  const adminId = req.userId;

  const old = intakeSessions.get(adminId);
  if (old) {
    tokenToAdmin.delete(old.token);
  }

  const token = generateToken();

  intakeSessions.set(adminId, {
    token,
    active: true,
    startedAt: Date.now(),
  });

  tokenToAdmin.set(token, adminId);

  res.json({ token });
});

app.get("/api/intake/status", requireAuth, (req, res) => {
  const session = intakeSessions.get(req.userId);
  res.json(session ?? { active: false });
});

app.post("/api/intake/check-token", gateApiByToken, async (req, res) => {
  return res.json({ valid: true });
});

app.put("/api/intake/password", requireAuth, (req, res) => {
  const adminId = req.userId;
  const { password } = req.body;

  if (!password || password.length < 3) {
    return res.status(400).json({ error: "Invalid password" });
  }

  const session = intakeSessions.get(adminId);
  if (!session) {
    return res.status(404).json({ error: "No active intake session" });
  }

  session.password = password;

  res.json({ success: true });
});

app.get("/me", requireAuthNoRedirect, (req, res) => {
  res.json({
    id: req.userId,
    name: users[req.userId]["username"],
    role: users[req.userId]["role"],
  });
});

app.post("/login", (req, res) => {
  const { name, pass } = req.body;

  const userId = usersByUsername[name];
  const user = users[userId];

  if (!userId) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (user.password !== pass) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, Number(userId));

  res.cookie("session_id", sessionId, {
    httpOnly: true,
    // secure: process.env.NODE_ENV === "production",
    secure: false,
    path: "/",
    sameSite: "lax",
  });

  res.json({ success: true });
});

app.post("/logout", (req, res) => {
  const sessionId = req.cookies?.session_id;
  if (sessionId) sessions.delete(sessionId);

  res.clearCookie("session_id");
  return res.redirect("/login");
});

app.get("/login", (req, res) => {
  res.sendFile(path.resolve("dist/client/index.html"));
});

app.get("/pf", requireIntakeToken, (req, res) => {
  const pfEntry = manifest["src/pf.client.tsx"];
  const spaEntry = manifest["index.html"];

  if (!pfEntry || !spaEntry) {
    return res.status(500).sendFile(path.resolve("dist/client/404.html"));
  }

  // 1️⃣ Global CSS from SPA
  const globalCss = (spaEntry.css || [])
    .map((css) => `<link rel="stylesheet" href="/${css}">`)
    .join("\n");

  // 2️⃣ PF JS entry
  const pfJs = `/${pfEntry.file}`;

  res.type("html").send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>EPF Digital Form</title>
        ${globalCss}
      </head>
      <body>
        <div id="pf-root"></div>
        <script type="module" src="${pfJs}"></script>
      </body>
    </html>
  `);
});

app.get(/^\/pf\/admin(\/.*)?$/, requireAuth, (req, res) => {
  const adminClient = manifest["src/admin.client.tsx"];
  const spaEntry = manifest["index.html"];

  if (!adminClient || !spaEntry) {
    return res.status(500).sendFile(path.resolve("dist/client/404.html"));
  }

  // 1️⃣ Global CSS (from main SPA)
  const globalCss = (spaEntry.css || [])
    .map((css) => `<link rel="stylesheet" href="/${css}">`)
    .join("\n");

  // 2️⃣ Admin page SSR HTML
  const html = renderAdmin(req.originalUrl);

  // 3️⃣ Admin hydration script
  const adminJs = `/${adminClient.file}`;

  res.type("html").send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Admin</title>
        ${globalCss}
      </head>
      <body>
        <div id="root">${html}</div>
        <script type="module" src="${adminJs}"></script>
      </body>
    </html>
  `);
});

app.post("/get-pdf", requireAuth, async (req, res) => {
  const { id: submissionId } = req.body;

  if (!submissionId) {
    return res.status(400).json({ error: "Missing submission ID" });
  }

  const rsp = await fetch("http://127.0.0.1:8001/get-pdf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      submission_id: submissionId,
    }),
  });

  if (!rsp.ok) {
    console.log(rsp);
    return res.status(400).json({ error: "Failed to generate PDF" });
  }

  const pdfBuffer = Buffer.from(await rsp.arrayBuffer());

  const filename = rsp.headers.get("x-filename") || "submission.pdf";

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Access-Control-Expose-Headers", "X-Filename");
  res.setHeader("X-Filename", filename);

  return res.send(pdfBuffer);
});

app.post("/api/forms/process", gateApiByToken, async (req, res) => {
  const payload = req.body;

  const memberName = payload?.forms?.form_11?.personal_details?.member_name;

  if (!memberName) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  // 🔐 Intake password check
  if (!req.isAdmin) {
    const adminId = req.intakeAdminId;
    const session = intakeSessions.get(adminId);
    const password = payload.password;

    if (!session || !session.active) {
      return res.status(403).json({ error: "Intake not active" });
    }

    if (session.password !== password) {
      console.log(
        `🔴 Submission attempt by ${memberName} blocked: Invalid password`,
      );
      return res.status(403).json({ error: "Invalid submission password" });
    }
  } else {
    console.log(
      `🟢 Admin ${users[req.userId]?.username} bypassed submission password`,
    );
  }

  let forms = payload.forms;
  const docs = payload.documents;

  const uan = forms.form_11.previous_employment.uan || "";
  const dob = forms.form_11.personal_details.date_of_birth;
  const eno = forms.form_2.employee_no;

  forms = normalizeForms(forms);

  // 🧼 Sanitize
  const safeName = sanitizeName(memberName);
  const safeUan = sanitizeUan(uan);
  const safeDob = sanitizeDob(dob);
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    // ✅ INSERT with RETURNING (Postgres-safe)
    const rows = await db.query(
      `
      INSERT INTO submissions (name, uan, eno, dos, data, docs)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, uan, eno, dos
      `,
      [
        safeName,
        safeUan,
        eno,
        today,
        forms, // pass objects, not strings
        docs,
      ],
    );

    const inserted = rows[0];

    console.log("New submission:", {
      id: inserted.id,
      name: inserted.name,
      uan: inserted.uan,
      eno: inserted.eno,
    });

    getLatestSubmissions(db, true).catch(console.error);

    return res.json(true);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "DB insert failed" });
  }
});

function broadcastLatestSubmissions(data) {
  const payload = JSON.stringify({
    type: "latest-submissions",
    data,
  });

  for (const ws of wsClients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  }
}

app.post("/api/search", requireAuthNoRedirect, async (req, res) => {
  const { type, value } = req.body;

  const error = validateSearchPayload(type, value);
  if (error) {
    console.log("Search failed: ", error, " type: ", type);
    return res.status(400).json({ error });
  }

  try {
    let results = await searchSubmissions(db, type, value);

    results.forEach((row) => {
      let ids = [];

      try {
        ids = row.edited_by
          ? typeof row.edited_by === "string"
            ? JSON.parse(row.edited_by)
            : row.edited_by
          : [];
      } catch {
        ids = [];
      }

      row.edited_by = ids
        .map((uid) => {
          const key = String(uid);
          return users[key]?.username;
        })
        .filter(Boolean);
    });

    return res.json({
      count: results.length,
      results,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/submissions/latest", requireAuthNoRedirect, async (req, res) => {
  try {
    const data = await getLatestSubmissions(db);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch latest submissions" });
  }
});

async function computeLatestSubmissions(db) {
  try {
    // Get latest unique dates
    const dateRows = await db.query(`
      SELECT DISTINCT dos
      FROM submissions
      ORDER BY dos DESC
      LIMIT 5
    `);

    if (!dateRows.length) {
      latestSubmissionsCache = {
        data: [],
        lastComputed: Date.now(),
      };
      return [];
    }

    const dates = dateRows.map((r) => r.dos);

    // Build PostgreSQL-compatible placeholders
    const placeholders = dates.map((_, i) => `$${i + 1}`).join(",");

    const submissions = await db.query(
      `
      SELECT id, name, uan, eno, dos, edited_by
      FROM submissions
      WHERE dos IN (${placeholders})
      ORDER BY dos DESC, id DESC
      `,
      dates,
    );

    // Normalize edited_by (SQLite TEXT vs Postgres array/JSON)
    submissions.forEach((row) => {
      let editors = [];

      // Normalize edited_by from DB
      if (Array.isArray(row.edited_by)) {
        editors = row.edited_by;
      } else if (typeof row.edited_by === "string") {
        try {
          const parsed = JSON.parse(row.edited_by);
          editors = Array.isArray(parsed) ? parsed : [];
        } catch {
          editors = [];
        }
      }

      row.edited_by = editors
        .map((uid) => {
          const key = String(uid);
          return users[key]?.username;
        })
        .filter(Boolean);

      // console.log(editorIds, row.edited_by);
    });

    latestSubmissionsCache = {
      data: submissions,
      lastComputed: Date.now(),
    };

    // Broadcast update
    broadcastLatestSubmissions(submissions);

    return submissions;
  } catch (err) {
    console.error("computeLatestSubmissions error:", err);
    throw err;
  }
}

async function getLatestSubmissions(db, force = false) {
  if (
    !force &&
    latestSubmissionsCache.data &&
    Date.now() - latestSubmissionsCache.lastComputed < CACHE_TTL
  ) {
    return latestSubmissionsCache.data;
  }

  // Recompute latest submissions and broadcast
  return computeLatestSubmissions(db);
}

async function searchSubmissions(db, type, value) {
  const normalized = normalizeSearch(type, value);

  let sql = "";
  let params = [];

  switch (type) {
    case "Name": {
      const { conditions, params: queryParams } = buildNameSearch(
        normalized,
        1,
      );

      sql = `
        SELECT id, name, uan, eno, edited_by, dos
        FROM submissions
        WHERE ${conditions}
        ORDER BY dos DESC
      `;
      params = queryParams;
      break;
    }

    case "Uan": {
      sql = `
        SELECT id, name, uan, eno, edited_by, dos
        FROM submissions
        WHERE uan LIKE $1
        ORDER BY dos DESC
      `;
      params = [`${normalized}%`];
      break;
    }

    case "Eno": {
      sql = `
        SELECT id, name, uan, eno, edited_by, dos
        FROM submissions
        WHERE eno LIKE $1
        ORDER BY dos DESC
      `;
      params = [`${normalized}%`];
      break;
    }

    case "Date": {
      sql = `
        SELECT id, name, uan, eno, edited_by, dos
        FROM submissions
        WHERE dos BETWEEN ($1::date - INTERVAL '2 days')
                        AND ($1::date + INTERVAL '2 days')
        ORDER BY dos DESC
      `;
      params = [normalized];
      break;
    }

    default:
      throw new Error("Invalid search type");
  }

  try {
    const rows = await db.query(sql, params);
    return rows;
  } catch (err) {
    console.error("searchSubmissions error:", err);
    throw err;
  }
}

app.get("/api/submission/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const shouldSendDocs = req.query.shouldSendDocs === "true";

  const submissionId = Number(id);
  if (!Number.isInteger(submissionId)) {
    return res.status(400).json({ error: "Invalid submission ID" });
  }

  const baseColumns = `
    id, name, uan, dos, eno, edited_by, data
  `;

  const sql = `
    SELECT ${baseColumns}${shouldSendDocs ? ", docs" : ""}
    FROM submissions
    WHERE id = $1
  `;

  try {
    const rows = await db.query(sql, [submissionId]);
    const row = rows[0];

    if (!row) {
      return res.status(404).json({ error: "Submission not found" });
    }

    let parsedData;
    let parsedDocs = null;

    try {
      parsedData =
        typeof row.data === "string" ? JSON.parse(row.data) : row.data;

      if (shouldSendDocs && row.docs) {
        parsedDocs =
          typeof row.docs === "string" ? JSON.parse(row.docs) : row.docs;
      }
    } catch (e) {
      console.error("JSON parse failed for submission", submissionId);
      return res.status(500).json({ error: "Corrupted submission data" });
    }

    const response = {
      id: row.id,
      uan: row.uan,
      forms: parsedData,
      dos: row.dos,
    };

    if (shouldSendDocs) {
      response.docs = parsedDocs;
    }

    return res.json(response);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});

app.put("/api/submission/:id", requireAuthNoRedirect, async (req, res) => {
  const submissionId = Number(req.params.id);
  const { updates } = req.body;

  if (!Number.isInteger(submissionId)) {
    return res.status(400).json({ error: "Invalid submission ID" });
  }

  if (!updates || typeof updates !== "object") {
    return res.status(400).json({ error: "Invalid updates payload" });
  }

  try {
    // Fetch row
    const rows = await db.query(
      `
      SELECT id, name, uan, eno, dos, data, edited_by
      FROM submissions
      WHERE id = $1
      `,
      [submissionId],
    );

    const row = rows[0];
    if (!row) {
      return res.status(404).json({ error: "Submission not found" });
    }

    let editors = [];

    // Normalize edited_by from DB
    if (Array.isArray(row.edited_by)) {
      editors = row.edited_by;
    } else if (typeof row.edited_by === "string") {
      try {
        const parsed = JSON.parse(row.edited_by);
        editors = Array.isArray(parsed) ? parsed : [];
      } catch {
        editors = [];
      }
    }

    // Ensure editors is a *plain array* of numbers
    editors = editors.map(Number).filter(Number.isInteger);

    // Add current editor
    if (!editors.includes(req.userId)) {
      editors.push(req.userId);
    }

    // Parse JSON (SQLite vs Postgres safe)
    let parsedData =
      typeof row.data === "string" ? JSON.parse(row.data) : row.data;

    // Apply partial updates
    for (const [rawPath, value] of Object.entries(updates)) {
      const path = normalizePath(rawPath);
      setNestedValue(parsedData, path, value);
    }
    parsedData = normalizeForms(parsedData);
    console.log(parsedData);

    // Derive mirrored fields
    const pd = parsedData?.form_11?.personal_details ?? {};
    const updatedName = pd.member_name ?? row.name;
    const updatedUan = parsedData?.form_11?.previous_employment?.uan ?? row.uan;
    const updatedEno = parsedData?.form_2?.employee_no ?? row.eno;

    // Update
    await db.run(
      `
      UPDATE submissions
      SET
        name = $1,
        uan = $2,
        eno = $3,
        edited_by = $4::jsonb,
        data = $5
      WHERE id = $6
      `,
      [
        updatedName,
        updatedUan,
        updatedEno,
        JSON.stringify(editors),
        JSON.stringify(parsedData),
        submissionId,
      ],
    );

    // Refresh cache (fire-and-forget)
    getLatestSubmissions(db, true).catch(console.error);

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});

// ===================== BULK EXCEL (TSV) =====================
app.post("/api/bulk-excel", requireAuthNoRedirect, async (req, res) => {
  const { ids, columnOrder } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Invalid or empty IDs array" });
  }

  // 1️⃣ PostgreSQL-compatible placeholders
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");

  const sql = `
    SELECT id, name, uan, eno, data
    FROM submissions
    WHERE id IN (${placeholders})
  `;

  try {
    // 2️⃣ Promise-based query
    const rows = await db.query(sql, ids);

    const clean = (val) =>
      val == null
        ? ""
        : String(val)
            .replace(/[\t\n\r]/g, " ")
            .trim();

    const columnExtractors = {
      name: (f11, f2, row) =>
        clean(f11?.personal_details?.member_name || row.name),
      eno: (f11, f2, row) => clean(f2?.employee_no || row.eno || ""),
      uan: (f11, f2, row) =>
        clean(f11?.previous_employment?.uan || row.uan || ""),
      bank_acc: (f11) => clean(f11?.kyc_details?.bank_account_no || ""),
      ifsc: (f11) => clean(f11?.kyc_details?.ifsc_code || ""),
      phone: (f11, f2) =>
        clean(f11?.contact_details?.mobile_no || f2?.mobile_no || ""),
      nominee_name: (_, f2) => clean(f2?.epf_nominees?.[0]?.name || ""),
      nominee_dob: (_, f2) => clean(f2?.epf_nominees?.[0]?.date_of_birth || ""),
      nominee_rel: (_, f2) => clean(f2?.epf_nominees?.[0]?.relationship || ""),
    };

    const order = columnOrder || Object.keys(columnExtractors);

    const tsvRows = rows
      .map((row) => {
        const forms =
          typeof row.data === "string" ? JSON.parse(row.data) : row.data;

        const f11 = forms?.form_11 || {};
        const f2 = forms?.form_2 || {};

        return order
          .filter((key) => columnExtractors[key])
          .map((key) => columnExtractors[key](f11, f2, row))
          .join("\t");
      })
      .filter(Boolean);

    res.type("text/plain").send(tsvRows.join("\n"));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
});

// ===================== BULK PDF (ZIP) =====================
app.post("/api/bulk-pdf", requireAuthNoRedirect, async (req, res) => {
  const { ids } = req.body;

  if (!ids.every((id) => Number.isInteger(id))) {
    return res.status(400).json({ error: "Invalid submission IDs" });
  }

  try {
    // Call FastAPI bulk PDF endpoint
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 60_000); // 60s

    const rsp = await fetch(`${FASTAPI_URL}/bulk-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
      signal: controller.signal,
    });

    if (!rsp.ok) {
      console.error("FastAPI bulk-pdf error:", rsp.status);
      return res.status(500).json({ error: "Failed to generate PDFs" });
    }

    const zipBuffer = Buffer.from(await rsp.arrayBuffer());

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="submissions_${new Date().toISOString().split("T")[0]}.zip"`,
    );
    return res.send(zipBuffer);
  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "PDF generation timed out" });
    }
    console.error("Bulk PDF error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

function normalizePath(path) {
  if (path.startsWith("forms.")) {
    return path.slice("forms.".length);
  }
  return path;
}

function setNestedValue(obj, path, value) {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (typeof current[key] !== "object" || current[key] === null) {
      current[key] = {};
    }
    current = current[key];
  }

  current[parts[parts.length - 1]] = value;
}

export function normalizeForms(forms) {
  if (!forms?.form_11) return forms;
  console.log("normalizing");
  const f11pd = forms.form_11.personal_details || {};
  const f11cd = forms.form_11.contact_details || {};
  const f11decl = forms.form_11.declaration || {};

  if (forms.form_2) {
    const f2 = forms.form_2;

    f2.member_name = f11pd.member_name;
    f2.father_husband_name = f11pd.parent_spouse_name;
    f2.date_of_birth = f11pd.date_of_birth;
    f2.gender = f11pd.gender;
    f2.marital_status = f11pd.marital_status;
    f2.mobile_no = f11cd.mobile_no;

    // Signature mirroring
    if (f11decl.signature_data) {
      f2.declaration ??= {};
      f2.declaration.signature_data = {
        image: "same",
        bbox: { ...f11decl.signature_data.bbox },
      };
    }
  }

  return forms;
}

function buildNameSearch(normalizedValue, startIndex = 1) {
  const words = normalizedValue.split(/\s+/).filter(Boolean);

  const conditions = words
    .map((_, i) => `name ILIKE $${startIndex + i}`)
    .join(" AND ");

  const params = words.map((w) => `%${w}%`);

  return { conditions, params };
}

function normalizeSearch(type, value) {
  switch (type) {
    case "Name":
      return value.trim().toUpperCase();

    case "Uan":
    case "Eno":
      return value.replace(/\D/g, "");

    case "Date":
      return value; // YYYY-MM-DD

    default:
      return value;
  }
}

function sanitizeName(name) {
  return name
    .split("")
    .filter((c) => /[a-zA-Z0-9 _-]/.test(c))
    .join("")
    .trim()
    .toUpperCase();
}

function sanitizeUan(uan) {
  return String(uan)
    .replace(/[^0-9]/g, "")
    .trim();
}

function sanitizeDob(dos) {
  return String(dos);
}

function validateSearchPayload(type, value) {
  if (!SEARCH_TYPES.includes(type)) {
    return "Invalid search type";
  }

  if (typeof value !== "string" || !value.trim()) {
    return "Search value is required";
  }

  switch (type) {
    case "Uan":
      // No validation for now
      break;

    case "Eno":
      // No validation for now
      break;

    case "Date":
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return "DOB must be in YYYY-MM-DD format";
      }
      break;

    case "Name":
      if (value.length < 2) {
        return "Name must be at least 2 characters";
      }
      break;
  }

  return null;
}

app.use("/assets", express.static(path.join(__dirname, "dist/client/assets")));

app.use(express.static(path.join(__dirname, "dist/client")));

app.use((req, res) => {
  return res.status(404).sendFile(path.resolve("dist/client/404.html"));
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
server.on("upgrade", (req, socket, head) => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies?.session_id;
  const userId = sessions.get(sessionId);

  if (!userId || users[userId].role !== "admin") {
    socket.destroy();
    return;
  }

  console.log("WEBSOCKET CONNECTED BY: ", users[userId]["username"]);

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(";").forEach((part) => {
    const [key, ...rest] = part.trim().split("=");
    cookies[key] = decodeURIComponent(rest.join("="));
  });

  return cookies;
}
