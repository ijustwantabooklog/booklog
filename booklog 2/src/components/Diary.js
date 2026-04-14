import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d) ? null : d;
}

export default function Diary({ userId, onSelectBook, onSelectArticle }) {
  const [books, setBooks] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let b = false, a = false;
    const u1 = onSnapshot(query(collection(db, "users", userId, "books"), orderBy("createdAt", "desc")),
      snap => { setBooks(snap.docs.map(d => ({ id: d.id, type: "book", ...d.data() }))); b = true; if (a) setLoading(false); });
    const u2 = onSnapshot(query(collection(db, "users", userId, "articles"), orderBy("createdAt", "desc")),
      snap => { setArticles(snap.docs.map(d => ({ id: d.id, type: "article", ...d.data() }))); a = true; if (b) setLoading(false); });
    return () => { u1(); u2(); };
  }, [userId]);

  const allEntries = [...books.filter(b => !b.currentlyReading), ...articles]
    .sort((a, b) => {
      const da = parseDate(a.dateRead), db2 = parseDate(b.dateRead);
      if (!da && !db2) return 0;
      if (!da) return 1;
      if (!db2) return -1;
      return db2 - da;
    });

  const groups = [];
  const seen = {};
  allEntries.forEach(entry => {
    const d = parseDate(entry.dateRead);
    const key = d ? d.toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "Unknown date";
    if (!seen[key]) { seen[key] = true; groups.push({ key, entries: [] }); }
    groups[groups.length - 1].entries.push({ ...entry, _date: d });
  });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px" }}>
      {loading && <p style={{ color: "#666", fontStyle: "italic" }}>loading...</p>}
      {!loading && allEntries.length === 0 && <p style={{ color: "#666", fontStyle: "italic" }}>nothing logged yet</p>}

      {groups.map(({ key, entries }) => (
        <div key={key} style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "Arial, sans-serif", fontSize: 12, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", color: "#555", borderBottom: "1px solid #ccc", paddingBottom: 3, marginBottom: 8 }}>{key}</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.id}
                  onClick={() => entry.type === "book" ? onSelectBook(entry.id) : onSelectArticle(entry.id)}
                  style={{ cursor: "pointer", borderBottom: "1px solid #eee" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f9f9f9"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <td style={{ width: 28, padding: "5px 8px 5px 0", verticalAlign: "top", fontFamily: "Arial, sans-serif", fontSize: 12, color: "#999" }}>
                    {entry._date ? entry._date.getDate() : "—"}
                  </td>
                  {entry.type === "book" && (
                    <td style={{ width: 44, padding: "5px 8px 5px 0", verticalAlign: "top" }}>
                      {entry.coverUrl
                        ? <img src={entry.coverUrl} alt={entry.title} style={{ width: 36, height: 52, objectFit: "cover", border: "1px solid #999", display: "block" }} />
                        : <div style={{ width: 36, height: 52, border: "1px solid #999", background: "#ddd" }} />}
                    </td>
                  )}
                  {entry.type === "article" && (
                    <td style={{ width: 44, padding: "5px 8px 5px 0", verticalAlign: "top" }}>
                      <div style={{ width: 36, height: 52, border: "1px solid #999", background: "#e8e8ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontFamily: "Arial, sans-serif", fontSize: 9, color: "#555", textAlign: "center" }}>art</span>
                      </div>
                    </td>
                  )}
                  <td style={{ padding: "5px 8px", verticalAlign: "top" }}>
                    <div style={{ fontFamily: "Georgia, serif", fontSize: 15, color: "#00e", textDecoration: "underline" }}>{entry.title}</div>
                    <div style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: "#555", marginTop: 2 }}>
                      {entry.type === "book"
                        ? `${entry.author}${entry.translator ? `, trans. ${entry.translator}` : ""}`
                        : [entry.author, entry.publication].filter(Boolean).join(" · ")}
                    </div>
                    {entry.type === "book" && entry.rating > 0 && (
                      <div style={{ fontSize: 13, marginTop: 2 }}>{[1,2,3,4,5].map(s => s <= entry.rating ? "★" : "☆").join("")}</div>
                    )}
                  </td>
                  {entry.type === "article" && (
                    <td style={{ textAlign: "right", verticalAlign: "middle", padding: "5px 0" }}>
                      <span style={{ fontFamily: "Arial, sans-serif", fontSize: 11, color: "#e8318a", border: "1px solid #e8318a", padding: "1px 6px" }}>article</span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
