import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.PG_HOST || "localhost",
  port: Number(process.env.PG_PORT || 5432),
  user: process.env.PG_USER || "postgres",
  password: String(process.env.PG_PASSWORD || ""),
  database: process.env.PG_DATABASE || "ciphysqlstudio_sandbox",
});


const ASSIGNMENTS = [
  {
    id: "1",
    title: "Select all users",
    difficulty: "Easy",
    description: "Basic SELECT from a single table",
    question:
      "Write a SQL query to fetch all rows from the users table.\n\nReturn: id, name, age",
    starterQuery: "SELECT id, name, age FROM users;", // ok (not harmful)
    solutionQuery: "SELECT id, name, age FROM users ORDER BY id;",
    tables: [
      {
        name: "users",
        columns: [
          { name: "id", type: "INT" },
          { name: "name", type: "TEXT" },
          { name: "age", type: "INT" },
        ],
        sampleRows: [
          { id: 1, name: "Asha", age: 22 },
          { id: 2, name: "Ravi", age: 30 },
          { id: 3, name: "Meera", age: 28 },
        ],
      },
    ],
  },
  {
    id: "2",
    title: "Filter users by age",
    difficulty: "Easy",
    description: "Practice WHERE clause",
    question:
      "Write a SQL query to fetch users whose age is greater than 25.\n\nReturn: id, name, age",
    //  NOT the final answer. Give partial.
    starterQuery: "SELECT id, name, age FROM users WHERE age > ?;",
    solutionQuery: "SELECT id, name, age FROM users WHERE age > 25 ORDER BY id;",
    tables: [
      {
        name: "users",
        columns: [
          { name: "id", type: "INT" },
          { name: "name", type: "TEXT" },
          { name: "age", type: "INT" },
        ],
        sampleRows: [
          { id: 1, name: "Asha", age: 22 },
          { id: 2, name: "Ravi", age: 30 },
          { id: 3, name: "Meera", age: 28 },
        ],
      },
    ],
  },
  {
    id: "8",
    title: "Group users by age",
    difficulty: "Hard",
    description: "Practice GROUP BY + COUNT",
    question:
      "Write a SQL query to count how many users exist for each age.\n\nReturn: age, total_users",
    //  starter (not full)
    starterQuery: "SELECT age, COUNT(*) FROM users GROUP BY age;",
    solutionQuery:
      "SELECT age, COUNT(*) AS total_users FROM users GROUP BY age ORDER BY age;",
    tables: [
      {
        name: "users",
        columns: [
          { name: "id", type: "INT" },
          { name: "name", type: "TEXT" },
          { name: "age", type: "INT" },
        ],
        sampleRows: [
          { id: 1, name: "Asha", age: 22 },
          { id: 2, name: "Ravi", age: 30 },
          { id: 3, name: "Meera", age: 28 },
        ],
      },
    ],
  },
];

//  Strict SQL safety (SELECT only)
function assertSafeSelect(query) {
  if (!query || typeof query !== "string") return "query is required";

  const q = query.trim().toLowerCase();

  if (!q.startsWith("select")) return "Only SELECT queries allowed";

  // block multiple statements
  const pieces = q.split(";").filter(Boolean);
  if (pieces.length > 1) return "Multiple statements not allowed";

  // block unsafe keywords (extra safety)
  const bad = ["insert", "update", "delete", "drop", "alter", "truncate", "create"];
  if (bad.some((w) => q.includes(w))) return "Only safe SELECT allowed";

  return null;
}

function normalizeRows(rows) {
  // convert values to string, trim, null safe
  return rows.map((r) => {
    const out = {};
    for (const k of Object.keys(r)) {
      const v = r[k];
      out[k] = v === null || v === undefined ? null : String(v).trim();
    }
    return out;
  });
}

function sameColumns(colsA, colsB) {
  if (colsA.length !== colsB.length) return false;
  for (let i = 0; i < colsA.length; i++) {
    if (colsA[i] !== colsB[i]) return false;
  }
  return true;
}

function deepEqualRows(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ka = Object.keys(a[i]).sort();
    const kb = Object.keys(b[i]).sort();
    if (ka.join(",") !== kb.join(",")) return false;
    for (const k of ka) {
      if (a[i][k] !== b[i][k]) return false;
    }
  }
  return true;
}

app.get("/", (req, res) => res.send("Backend working ✅"));

app.get("/assignments", (req, res) => {
  //  Don't send solutionQuery to frontend
  res.json(
    ASSIGNMENTS.map(({ solutionQuery, ...rest }) => rest)
  );
});

app.get("/assignments/:id", (req, res) => {
  const a = ASSIGNMENTS.find((x) => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: "Assignment not found" });

  const { solutionQuery, ...safe } = a; // hide solution query
  res.json(safe);
});

app.post("/execute", async (req, res) => {
  try {
    const { query } = req.body || {};
    const errMsg = assertSafeSelect(query);
    if (errMsg) return res.status(400).json({ error: errMsg });

    const result = await pool.query(query);
    res.json({
      columns: result.fields.map((f) => f.name),
      rows: result.rows,
    });
  } catch (err) {
    console.error("EXECUTE ERROR:", err);
    res.status(500).json({ error: err?.message || String(err) });
  }
});

/**
 *  VALIDATION endpoint
 * body: { assignmentId, query }
 * - runs user's query
 * - runs backend solutionQuery
 * - compares columns + rows (normalized)
 * - returns { correct, expected, got }
 */
app.post("/validate", async (req, res) => {
  try {
    const { assignmentId, query } = req.body || {};
    const assignment = ASSIGNMENTS.find((x) => x.id === String(assignmentId));
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    const errMsg = assertSafeSelect(query);
    if (errMsg) return res.status(400).json({ error: errMsg });

    // user result
    const userResult = await pool.query(query);
    const userCols = userResult.fields.map((f) => f.name);
    const userRows = normalizeRows(userResult.rows);

    // expected result (secret)
    const solResult = await pool.query(assignment.solutionQuery);
    const solCols = solResult.fields.map((f) => f.name);
    const solRows = normalizeRows(solResult.rows);

    const correct =
      sameColumns(userCols, solCols) && deepEqualRows(userRows, solRows);

    res.json({
      correct,
      expected: { columns: solCols, rows: solRows },
      got: { columns: userCols, rows: userRows },
    });
  } catch (err) {
    console.error("VALIDATE ERROR:", err);
    res.status(500).json({ error: err?.message || String(err) });
  }
});

app.post("/hint", (req, res) => {
  const { question, query } = req.body || {};
  const tips = [];
  const q = String(query || "").toLowerCase();
  const qs = String(question || "").toLowerCase();

  if (!q.includes("select")) tips.push("Start with SELECT.");
  if (qs.includes("where") || qs.includes("greater") || qs.includes("filter")) {
    if (!q.includes("where")) tips.push("You likely need a WHERE condition.");
  }
  if (qs.includes("count") || qs.includes("group")) {
    if (!q.includes("group by")) tips.push("You likely need GROUP BY.");
    if (!q.includes("count(")) tips.push("You likely need COUNT(*).");
  }
  tips.push("Run query and verify columns + row count.");

  res.json({
    hint: "Hint (fallback mode — no API key configured):\n- " + tips.join("\n- "),
  });
});

app.listen(5000, () => console.log("Server running on http://localhost:5000 ✅"));