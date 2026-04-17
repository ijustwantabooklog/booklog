import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export default function Journal({ userId, onOpenSession, onViewDetail }) {
  const [books, setBooks] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    let b = false, a = false;
    const u1 = onSnapshot(query(collection(db, "users", userId, "books"), orderBy("updatedAt", "desc")),
      snap => { setBooks(snap.docs.map(d => ({ id: d.id, col: "books", ...d.data() }))); b = true; if (a) setLoading(false); });
    const u2 = onSnapshot(query(collection(db, "users", userId, "articles"), orderBy("updatedAt", "desc")),
      snap => { setArticles(snap.docs.map(d => ({ id: d.id, col: "articles", ...d.data() }))); a = true; if (b) setLoading(false); });
    return () => { u1(); u2(); };
  }, [userId]);

  const all = [...books, ...articles].sort((a, b) => {
    const ta = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(0);
    const tb = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(0);
    return tb - ta;
  });

  // Group by day
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const getLabel = (ts) => {
    if (!ts?.toDate) return null;
    const d = ts.toDate().toDateString();
    if (d === today) return "Today";
    if (d === yesterday) return "Yesterday";
    return ts.toDate().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  const groups = [];
  const seen = {};
  all.forEach(entry => {
    const label = getLabel(entry.updatedAt);
    if (!label) return;
    if (!seen[label]) { seen[label] = true; groups.push({ label, entries: [] }); }
    groups[groups.length - 1].entries.push(entry);
  });

  const getTitle = (entry) => {
    if (entry.isChapter && entry.chapterTitle) return `${entry.chapterTitle} [ch. of ${entry.title}]`;
    return entry.title;
  };

  return (
    <div className="page-wrap">
      {loading && <p style={{ color: "#666", fontStyle: "italic" }}>loading...</p>}
      {!loading && groups.length === 0 && (
        <p style={{ color: "#666", fontStyle: "italic" }}>Nothing logged yet. Click "+ Log" to start.</p>
      )}

      {groups.map(({ label, entries }) => (
        <div key={label} style={{ marginBottom: 20 }}>
          <div className="section-head">{label}</div>
          <table>
            <tbody>
              {entries.map(entry => (
                <React.Fragment key={entry.id}>
                  <tr style={{ cursor: "pointer" }}
                    onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                    onMouseEnter={e => e.currentTarget.style.background = "#f9f9f9"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    <td style={{ width: 16, fontFamily: "Arial, sans-serif", fontSize: 11, color: "#999" }}>
                      {expanded === entry.id ? "▼" : "▶"}
                    </td>
                    <td>
                      <span style={{ fontFamily: "Georgia, serif", color: "#00e", textDecoration: "underline" }}>{getTitle(entry)}</span>
                      <span style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: "#555", marginLeft: 8 }}>{entry.author}</span>
                      {entry.col === "articles" && <span style={{ fontFamily: "Arial, sans-serif", fontSize: 11, color: "#e8318a", border: "1px solid #e8318a", padding: "0 4px", marginLeft: 8 }}>article</span>}
                    </td>
                  </tr>
                  {expanded === entry.id && (
                    <tr>
                      <td></td>
                      <td style={{ paddingBottom: 8, paddingTop: 4 }}>
                        <div style={{ display: "flex", gap: 12, fontFamily: "Arial, sans-serif", fontSize: 13 }}>
                          <span className="link" onClick={() => onOpenSession(entry.id, entry.col)}>open reading session →</span>
                          <span className="link" onClick={() => onViewDetail(entry.id, entry.col)}>view full log</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
