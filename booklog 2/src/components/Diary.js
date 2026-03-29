import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

function StarDisplay({ value, size = 13 }) {
  return (
    <span style={{ fontSize: size, color: "#555" }}>
      {[1,2,3,4,5].map(s => s <= value ? "★" : "☆").join("")}
    </span>
  );
}

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
    let booksLoaded = false, articlesLoaded = false;
    const unsub1 = onSnapshot(
      query(collection(db, "users", userId, "books"), orderBy("createdAt", "desc")),
      snap => { setBooks(snap.docs.map(d => ({ id: d.id, type: "book", ...d.data() }))); booksLoaded = true; if (articlesLoaded) setLoading(false); }
    );
    const unsub2 = onSnapshot(
      query(collection(db, "users", userId, "articles"), orderBy("createdAt", "desc")),
      snap => { setArticles(snap.docs.map(d => ({ id: d.id, type: "article", ...d.data() }))); articlesLoaded = true; if (booksLoaded) setLoading(false); }
    );
    return () => { unsub1(); unsub2(); };
  }, [userId]);

  // Combine and sort by dateRead
  const allEntries = [...books.filter(b => !b.currentlyReading), ...articles]
    .sort((a, b) => {
      const da = parseDate(a.dateRead);
      const db2 = parseDate(b.dateRead);
      if (!da && !db2) return 0;
      if (!da) return 1;
      if (!db2) return -1;
      return db2 - da;
    });

  // Group by month/year
  const groups = [];
  const seen = {};
  allEntries.forEach(entry => {
    const d = parseDate(entry.dateRead);
    const key = d ? d.toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "Unknown date";
    if (!seen[key]) { seen[key] = true; groups.push({ key, entries: [] }); }
    groups[groups.length - 1].entries.push({ ...entry, _date: d });
  });

  const cardStyle = { background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden", marginBottom: 10 };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 60px" }}>
      {loading && <p style={{ color: "#aaa", fontSize: 15, padding: "20px 0" }}>loading...</p>}
      {!loading && allEntries.length === 0 && <p style={{ color: "#aaa", fontSize: 15, padding: "20px 0" }}>nothing logged yet</p>}

      {groups.map(({ key, entries }) => (
        <div key={key} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, color: "#444", fontWeight: 500, marginBottom: 10 }}>{key}</div>
          <div style={cardStyle}>
            {entries.map((entry, i) => {
              const day = entry._date ? entry._date.getDate() : "—";
              const isBook = entry.type === "book";
              return (
                <div key={entry.id}
                  onClick={() => isBook ? onSelectBook(entry.id) : onSelectArticle(entry.id)}
                  style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "12px 16px", borderBottom: i === entries.length - 1 ? "none" : "0.5px solid #ebebeb", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <div style={{ fontSize: 13, color: "#aaa", minWidth: 28, flexShrink: 0, paddingTop: 2, textAlign: "right" }}>{day}</div>
                  {isBook ? (
                    entry.coverUrl
                      ? <img src={entry.coverUrl} alt={entry.title} style={{ width: 36, height: 52, objectFit: "cover", border: "1px solid #ddd", borderRadius: 2, flexShrink: 0 }} />
                      : <div style={{ width: 36, height: 52, background: "#e8e8e8", border: "1px solid #ddd", borderRadius: 2, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 36, height: 52, background: "#f0e8ff", border: "1px solid #ddd", borderRadius: 2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 10, color: "#888", textAlign: "center", lineHeight: 1.2 }}>art-<br/>icle</span>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, color: "#0000ee", textDecoration: "underline", marginBottom: 2, fontFamily: isBook ? "Georgia, serif" : "inherit" }}>{entry.title}</div>
                    <div style={{ fontSize: 13, color: "#444" }}>
                      {isBook
                        ? `${entry.author}${entry.translator ? `, trans. ${entry.translator}` : ""}`
                        : [entry.author, entry.publication].filter(Boolean).join(" · ")}
                    </div>
                    {isBook && entry.rating > 0 && <div style={{ marginTop: 3 }}><StarDisplay value={entry.rating} /></div>}
                    {isBook && entry.partialRead && entry.section && <div style={{ fontSize: 11, color: "#888", fontStyle: "italic", marginTop: 2 }}>{entry.section}</div>}
                  </div>
                  {!isBook && <span style={{ fontSize: 11, color: "#e8318a", border: "1px solid #e8318a", borderRadius: 3, padding: "1px 6px", flexShrink: 0, marginTop: 2 }}>article</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
