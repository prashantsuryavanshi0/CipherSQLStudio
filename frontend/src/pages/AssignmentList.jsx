import React, { useEffect, useState } from "react";
import { api } from "../api";
import { Link } from "react-router-dom";

export default function AssignmentList() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        const res = await api.get("/assignments");
        setItems(res.data);
      } catch (e) {
        setErr(e?.response?.data?.error || "Failed to load assignments");
      }
    })();
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <div className="logo">CS</div>
          <div>
            <h1 className="topbar__title">CipherSQLStudio</h1>
            <p className="topbar__subtitle">Practice SQL with real-time execution</p>
          </div>
        </div>
      </header>

      <main className="container">
        {err ? <div className="alert alert--error">{err}</div> : null}

        <section className="list">
          <h2 className="sectionTitle">Assignments</h2>

          <div className="cards">
            {items.map((a) => (
              <Link key={a.id} to={`/attempt/${a.id}`} className="card">
                <div className="card__top">
                  <span className={`pill pill--${a.difficulty.toLowerCase()}`}>
                    {a.difficulty}
                  </span>
                </div>

                <div className="card__body">
                  <h3 className="card__title">{a.title}</h3>
                  <p className="card__desc">{a.description}</p>
                </div>

                <div className="card__cta">Attempt →</div>
              </Link>
            ))}
          </div>
        </section>

        <footer className="footer">
          <div className="muted">
            Tip: This build supports SELECT-only execution for safety.
          </div>
        </footer>
      </main>
    </div>
  );
}