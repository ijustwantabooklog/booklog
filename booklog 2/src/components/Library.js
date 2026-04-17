import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export default function Library({ userId, onOpenSession, onViewDetail }) {
  const [books, setBooks] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  useEffect(() => {
    let b = false, a = false;
    const u1 = onSnapshot(query(collection(db, "users", userId, "books"), orderBy("title")),
      snap => { setBooks(snap.docs.map(d => ({ id: d.id, col: "books", ...d.data() }))); b = true; if (a) setLoading(false); });
    const u2 = onSnapshot(query(collection(db, "users", userId, "articles"), orderBy("title")),
      snap => { setArticles(snap.docs.map(d => ({ id: d.id, col: "articles", ...d.data() }))); a = true; if (b) setLoading(false); });
    return () => { u1(); u2(); };
  }, [userId]);

  const all = tab === "books" ? books : tab === "articles" ? articles : [...books, ...articles];
  const filtered = all.filter(e =>
    e.title?.toLowerCase().includes(search.toLowerCase()) ||
    e.author?.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => (a.title || "").localeCompare(b.title || ""));

  const getTitle = (e) => e.isChapter && e.chapterTitle ? `${e.chapterTitle} [${e.title}]` : e.title;

  return (
    <div className="page-wrap">
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ maxWidth: 300 }} />
        <div style={{ display: "flex", border: "1px solid #999" }}>
          {[["all","All"],["books","Books"],["articles","Articles"]].map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)}
              style={{ padding: "3px 10px", fontSize: 12, border: "none", borderRight: val !== "articles" ? "1px solid #999" : "none", background: tab === val ? "#000" : "#f0f0f0", color: tab === val ? "#fff" : "#000", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p style={{ color: "#666", fontStyle: "italic" }}>loading...</p>}
      {!loading && filtered.length === 0 && <p style={{ color: "#666", fontStyle: "italic" }}>nothing found</p>}

      {!loading && filtered.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th style={{ width: 180 }}>Author</th>
              <th style={{ width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(entry => (
              <tr key={entry.id}
                onMouseEnter={e => e.currentTarget.style.background = "#f9f9f9"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                <td>
                  <span className="link" style={{ fontFamily: "Georgia, serif" }} onClick={() => onViewDetail(entry.id, entry.col)}>{getTitle(entry)}</span>
                  {entry.col === "articles" && <span style={{ fontFamily: "Arial, sans-serif", fontSize: 11, color: "#e8318a", border: "1px solid #e8318a", padding: "0 4px", marginLeft: 6 }}>article</span>}
                  {entry.currentlyReading && <span style={{ fontFamily: "Arial, sans-serif", fontSize: 11, color: "#e8318a", border: "1px solid #e8318a", padding: "0 4px", marginLeft: 4 }}>reading</span>}
                </td>
                <td style={{ fontFamily: "Arial, sans-serif", fontSize: 13, color: "#555" }}>{entry.author}</td>
                <td style={{ textAlign: "right" }}>
                  <span className="link" style={{ fontSize: 13 }} onClick={() => onOpenSession(entry.id, entry.col)}>open →</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
