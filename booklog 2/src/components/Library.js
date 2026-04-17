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
  const filtered = all
    .filter(e => e.title?.toLowerCase().includes(search.toLowerCase()) || e.author?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.title || "").localeCompare(b.title || ""));

  const getTitle = (e) => e.isChapter && e.chapterTitle ? `${e.chapterTitle} [${e.title}]` : e.title;

  const usefulLabel = (u) => {
    if (u === true) return <span className="mono" style={{ fontSize: 12, color: "green" }}> [useful]</span>;
    if (u === false) return <span className="mono" style={{ fontSize: 12, color: "#c00" }}> [not useful]</span>;
    return null;
  };

  return (
    <div className="wrap">
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="search titles, authors..." style={{ width: 280 }} />
        <span className="mono" style={{ fontSize: 13 }}>
          {["all","books","articles"].map(t => (
            <span key={t}>
              <span onClick={() => setTab(t)}
                style={{ cursor: "pointer", color: tab === t ? "#000" : "#00c", textDecoration: tab === t ? "none" : "underline", fontWeight: tab === t ? "bold" : "normal", marginRight: 10 }}>
                [{t}]
              </span>
            </span>
          ))}
        </span>
      </div>

      {loading && <p className="mono">loading...</p>}
      {!loading && filtered.length === 0 && <p style={{ fontStyle: "italic", color: "#555" }}>nothing found</p>}

      {!loading && filtered.length > 0 && (
        <table className="bordered">
          <thead>
            <tr>
              <th>title</th>
              <th style={{ width: 180 }}>author</th>
              <th style={{ width: 80 }}>verdict</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(entry => (
              <tr key={entry.id}>
                <td style={{ fontSize: 16 }}>
                  <a onClick={() => onViewDetail(entry.id, entry.col)} style={{ fontStyle: "italic" }}>{getTitle(entry)}</a>
                  {entry.col === "articles" && <span className="mono" style={{ fontSize: 12, color: "#888" }}> [article]</span>}
                  {entry.currentlyReading && <span className="mono" style={{ fontSize: 12, color: "#888" }}> [reading]</span>}
                </td>
                <td className="mono" style={{ fontSize: 13, color: "#555" }}>{entry.author}</td>
                <td>{usefulLabel(entry.useful)}</td>
                <td style={{ textAlign: "right" }}>
                  <a className="mono" style={{ fontSize: 12 }} onClick={() => onOpenSession(entry.id, entry.col)}>[open →]</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
