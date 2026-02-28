import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";

export default function Attempt() {
  const { id } = useParams();

  const [assignment, setAssignment] = useState(null);
  const [sql, setSql] = useState("SELECT * FROM users;");
  const [cols, setCols] = useState([]);
  const [rows, setRows] = useState([]);

  const [hint, setHint] = useState("");
  const [err, setErr] = useState("");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        const res = await api.get(`/assignments/${id}`);
        setAssignment(res.data);
        setSql(res.data.starterQuery || "SELECT * FROM users;");
      } catch (e) {
        setErr(e?.response?.data?.error || "Failed to load assignment");
      }
    })();
  }, [id]);

  const schemaText = useMemo(() => {
    if (!assignment) return "";
    return assignment.tables
      .map((t) => `${t.name}(${t.columns.map((c) => `${c.name} ${c.type}`).join(", ")})`)
      .join("\n");
  }, [assignment]);

  const runQuery = async () => {
    try {
      setRunning(true);
      setErr("");
      setHint("");
      setCols([]);
      setRows([]);

      const res = await api.post("/execute", { query: sql });
      setCols(res.data.columns || []);
      setRows(res.data.rows || []);
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to execute query");
    } finally {
      setRunning(false);
    }
  };

  const getHint = async () => {
    try {
      setErr("");
      const res = await api.post("/hint", {
        question: assignment?.question || "",
        query: sql,
      });
      setHint(res.data.hint || "");
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to get hint");
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <div className="logo">CS</div>
          <div>
            <h1 className="topbar__title">CipherSQLStudio</h1>
            <p className="topbar__subtitle">Attempt Assignment</p>
          </div>
        </div>

        <div className="topbar__actions">
          <Link className="btn btn--ghost" to="/">
            ← Back
          </Link>
        </div>
      </header>

      <main className="container">
        {err ? <div className="alert alert--error">{err}</div> : null}

        {!assignment ? (
          <div className="skeleton">Loading...</div>
        ) : (
          <div className="grid">
            {/* LEFT */}
            <section className="panel">
              <div className="panel__header">
                <h2 className="panel__title">{assignment.title}</h2>
                <span className={`pill pill--${assignment.difficulty.toLowerCase()}`}>
                  {assignment.difficulty}
                </span>
              </div>

              <h3 className="sectionTitle sectionTitle--sm">Question</h3>
              <pre className="box box--mono">{assignment.question}</pre>

              <h3 className="sectionTitle sectionTitle--sm">Sample Data</h3>
              {assignment.tables.map((t) => (
                <div key={t.name} className="box">
                  <div className="box__title">{t.name}</div>

                  <div className="subBox">
                    <div className="subBox__title">Schema</div>
                    <pre className="box box--mono box--thin">{schemaText}</pre>
                  </div>

                  <div className="subBox">
                    <div className="subBox__title">Rows</div>
                    <pre className="box box--mono box--thin">
                      {JSON.stringify(t.sampleRows || [], null, 2)}
                    </pre>
                  </div>
                </div>
              ))}
            </section>

            {/* RIGHT */}
            <section className="panel">
              <div className="panel__header">
                <h2 className="panel__title">SQL Editor</h2>
                <div className="panel__tools">
                  <button className="btn" onClick={runQuery} disabled={running}>
                    {running ? "Running..." : "Run Query"}
                  </button>
                  <button className="btn btn--secondary" onClick={getHint}>
                    Get Hint
                  </button>
                </div>
              </div>

              <textarea
                className="editor"
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                placeholder="Write your SELECT query..."
              />

              {hint ? (
                <>
                  <h3 className="sectionTitle sectionTitle--sm">Hint</h3>
                  <pre className="box box--mono">{hint}</pre>
                </>
              ) : null}

              <h3 className="sectionTitle sectionTitle--sm">Results</h3>

              {cols.length === 0 ? (
                <div className="muted">No results yet. Run a SELECT query.</div>
              ) : (
                <div className="table">
                  <table className="table__inner">
                    <thead>
                      <tr>
                        {cols.map((c) => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, idx) => (
                        <tr key={idx}>
                          {cols.map((c) => (
                            <td key={c}>{String(r?.[c] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}