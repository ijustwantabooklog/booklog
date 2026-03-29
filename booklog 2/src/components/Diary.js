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

export default function Diary({ userId, onSelectBook }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "users", userId, "books"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [userId]);

  const finished = books
    .filter(b => !b.currentlyReading)
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
  finished.forEach(book => {
    const d = parseDate(book.dateRead);
    const key = d
      ? d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : "Unknown date";
    if (!seen[key]) {
      seen[key] = true;
      groups.push({ key, books: [] });
    }
    groups[groups.length - 1].books.push({ ...book, _date: d });
  });

  const cardStyle = { background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden" };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 60px" }}>
      {loading && <p style={{ color: "#aaa", fontSize: 15, padding: "20px 0" }}>loading...</p>}
      {!loading && finished.length === 0 && <p style={{ color: "#aaa", fontSize: 15, padding: "20px 0" }}>no books logged yet</p>}

      {groups.map(({ key, books: groupBooks }) => (
        <div key={key} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, color: "#444", fontWeight: 500, marginBottom: 10 }}>{key}</div>
          <div style={cardStyle}>
            {groupBooks.map((book, i) => {
              const day = book._date ? book._date.getDate() : "—";
              return (
                <div key={book.id} onClick={() => onSelectBook(book.id)}
                  style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "12px 16px", borderBottom: i === groupBooks.length - 1 ? "none" : "0.5px solid #ebebeb", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <div style={{ fontSize: 13, color: "#aaa", minWidth: 28, flexShrink: 0, paddingTop: 2, textAlign: "right" }}>{day}</div>
                  {book.coverUrl
                    ? <img src={book.coverUrl} alt={book.title} style={{ width: 36, height: 52, objectFit: "cover", border: "1px solid #ddd", borderRadius: 2, flexShrink: 0 }} />
                    : <div style={{ width: 36, height: 52, background: "#e8e8e8", border: "1px solid #ddd", borderRadius: 2, flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, color: "#0000ee", textDecoration: "underline", marginBottom: 2, fontFamily: "Georgia, serif" }}>{book.title}</div>
                    <div style={{ fontSize: 13, color: "#444" }}>{book.author}{book.translator ? `, trans. ${book.translator}` : ""}</div>
                    {book.rating > 0 && <div style={{ marginTop: 3 }}><StarDisplay value={book.rating} /></div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
