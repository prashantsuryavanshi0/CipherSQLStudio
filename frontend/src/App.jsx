import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, Link, useNavigate, useParams } from "react-router-dom";

const API = "http://localhost:5000";

async function apiGet(path) {
  const res = await fetch(`${API}${path}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

function Badge({ children, type = "default" }) {
  return <span className={`badge badge-${type}`}>{children}</span>;
}

function Layout({ children }) {
  return (
    <div className="page">
      <header className="header">
        <div className="brand">
          <div className="logo">CS</div>
          <div>
            <div className="title">CipherSQLStudio</div>
            <div className="subtitle">Practice SQL with real-time execution</div>
          </div>
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}

function Home() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    apiGet("/assignments").then(setItems);
  }, []);

  return (
    <Layout>
      <h2 className="sectionTitle">Assignments</h2>
      <div className="grid">
        {items.map((a) => (
          <div key={a.id} className="card">
            <div className="cardTop">
              <h3>{a.title}</h3>
              <Badge type={a.difficulty === "Hard" ? "danger" : "success"}>
                {a.difficulty}
              </Badge>
            </div>
            <p className="muted">{a.description}</p>
            <Link className="link" to={`/attempt/${a.id}`}>
              Attempt →
            </Link>
          </div>
        ))}
      </div>

      <div className="note">
        Tip: This build supports <b>SELECT-only</b> execution for safety, and
        validates your answer automatically.
      </div>
    </Layout>
  );
}

function Attempt() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(null); // "correct" | "wrong"
  const [msg, setMsg] = useState("");
  const [hint, setHint] = useState("");

  useEffect(() => {
    apiGet(`/assignments/${id}`).then((a) => {
      setAssignment(a);
      setQuery(a.starterQuery || "");
    });
  }, [id]);

  const runQuery = async () => {
    setMsg("");
    setHint("");
    setStatus(null);

    const data = await apiPost("/execute", { query });
    if (data?.error) {
      setMsg(data.error);
      return;
    }
    setResult(data);
  };

  const validate = async () => {
    setMsg("");
    setHint("");
    setStatus(null);

    const data = await apiPost("/validate", { assignmentId: id, query });
    if (data?.error) {
      setMsg(data.error);
      return;
    }

    setResult(data.got);
    setStatus(data.correct ? "correct" : "wrong");

    if (!data.correct) {
      setMsg("Incorrect. Your output doesn't match expected output.");
    }
  };

  const getHint = async () => {
    setMsg("");
    const data = await apiPost("/hint", { question: assignment?.question, query });
    if (data?.error) setMsg(data.error);
    else setHint(data.hint);
  };

  if (!assignment) return <Layout>Loading...</Layout>;

  return (
    <Layout>
      <div className="topRow">
        <div className="brandSmall">
          <div className="logo">CS</div>
          <div>
            <div className="title">CipherSQLStudio</div>
            <div className="subtitle">Attempt Assignment</div>
          </div>
        </div>

        <button className="btn ghost" onClick={() => navigate("/")}>
          ← Back
        </button>
      </div>

      <div className="attemptGrid">
        {/* Left */}
        <div className="panel">
          <div className="panelTop">
            <h3>{assignment.title}</h3>
            <Badge type={assignment.difficulty === "Hard" ? "danger" : "success"}>
              {assignment.difficulty}
            </Badge>
          </div>

          <div className="block">
            <div className="label">Question</div>
            <pre className="question">{assignment.question}</pre>
          </div>

          <div className="block">
            <div className="label">Sample Data</div>
            {assignment.tables?.map((t) => (
              <div key={t.name} className="sample">
                <div className="sampleTitle">{t.name}</div>
                <div className="muted">Schema</div>
                <div className="schema">
                  {t.name}(
                  {t.columns.map((c) => `${c.name} ${c.type}`).join(", ")}
                  )
                </div>

                <div className="muted" style={{ marginTop: 10 }}>
                  Rows
                </div>
                <pre className="rows">{JSON.stringify(t.sampleRows, null, 2)}</pre>
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div className="panel">
          <div className="panelTop">
            <h3>SQL Editor</h3>

            <div className="actions">
              <button className="btn" onClick={runQuery}>
                Run Query
              </button>
              <button className="btn primary" onClick={validate}>
                Submit (Validate)
              </button>
              <button className="btn ghost" onClick={getHint}>
                Get Hint
              </button>
            </div>
          </div>

          <textarea
            className="editor"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
          />

          {status === "correct" && (
            <div className="alert success">✅ Correct Answer!</div>
          )}
          {status === "wrong" && <div className="alert danger">❌ Incorrect</div>}
          {msg && <div className="alert danger">{msg}</div>}
          {hint && (
            <div className="alert hint">
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{hint}</pre>
            </div>
          )}

          <div className="block">
            <div className="label">Results</div>

            {!result?.rows?.length ? (
              <div className="muted">No results yet. Run a SELECT query.</div>
            ) : (
              <div className="tableWrap">
                <table className="table">
                  <thead>
                    <tr>
                      {result.columns.map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((r, idx) => (
                      <tr key={idx}>
                        {result.columns.map((c) => (
                          <td key={c}>{String(r[c] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="note small">
            ✅ “Submit (Validate)” checks your output against the hidden solution
            on backend.
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/attempt/:id" element={<Attempt />} />
    </Routes>
  );
}