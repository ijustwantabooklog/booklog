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

export default function ShelfView({ userId, filter, filterType, onSelect, onBack }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "users", userId, "books"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [userId]);

  const filtered = books.filter(b => {
    if (filterType === "shelf") return (b.shelves || []).includes(filter);
    if (filterType === "tag") return (b.tags || []).includes(filter);
    return false;
  });

  const cardStyle = { background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden" };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0 16px" }}>
        <span onClick={onBack} style={{ fontSize: 13, color: "#aaa", cursor: "pointer" }}>← back</span>
        <span style={{ fontSize: 16, color: "#444", fontWeight: 500 }}>
          {filterType === "tag" ? `#${filter}` : filter}
        </span>
        <span style={{ fontSize: 13, color: "#aaa" }}>· {filtered.length} {filtered.length === 1 ? "book" : "books"}</span>
      </div>

      {loading && <p style={{ color: "#aaa", fontSize: 15 }}>loading...</p>}
      {!loading && filtered.length === 0 && <p style={{ color: "#aaa", fontSize: 15 }}>no books found</p>}

      {!loading && filtered.length > 0 && (
        <div style={cardStyle}>
          {filtered.map((book, i) => (
            <div key={book.id} onClick={() => onSelect(book.id)}
              style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "12px 16px", borderBottom: i === filtered.length - 1 ? "none" : "0.5px solid #ebebeb", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              {book.coverUrl
                ? <img src={book.coverUrl} alt={book.title} style={{ width: 36, height: 52, objectFit: "cover", border: "1px solid #ddd", borderRadius: 2, flexShrink: 0 }} />
                : <div style={{ width: 36, height: 52, background: "#e8e8e8", border: "1px solid #ddd", borderRadius: 2, flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, color: "#0000ee", textDecoration: "underline", marginBottom: 2, fontFamily: "Georgia, serif" }}>{book.title}</div>
                <div style={{ fontSize: 13, color: "#444" }}>{book.author}{book.translator ? `, trans. ${book.translator}` : ""}</div>
                {book.rating > 0 && <div style={{ marginTop: 3 }}><StarDisplay value={book.rating} /></div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
