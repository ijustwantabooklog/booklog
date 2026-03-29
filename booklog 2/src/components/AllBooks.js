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

export default function AllBooks({ userId, onSelect }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("alpha");

  useEffect(() => {
    const q = query(collection(db, "users", userId, "books"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [userId]);

  const sorted = [...books].sort((a, b) => {
    if (sort === "alpha") return (a.title || "").localeCompare(b.title || "");
    return 0; // already sorted by createdAt desc from firebase
  });

  const filtered = sorted.filter(b =>
    b.title?.toLowerCase().includes(search.toLowerCase()) ||
    b.author?.toLowerCase().includes(search.toLowerCase())
  );

  const cardStyle = { background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden" };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 60px" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title or author..."
          style={{ flex: 1, padding: "10px 14px", fontSize: 14, border: "1px solid #e2e2e2", borderRadius: 10, background: "#fff", outline: "none" }}
        />
        <div style={{ display: "flex", background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
          {[["alpha", "A–Z"], ["date", "Date added"]].map(([val, label]) => (
            <button key={val} onClick={() => setSort(val)} style={{
              padding: "10px 16px", fontSize: 13, border: "none", cursor: "pointer",
              background: sort === val ? "#e8318a" : "none",
              color: sort === val ? "#fff" : "#888",
              borderRight: val === "alpha" ? "1px solid #e2e2e2" : "none",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {loading && <p style={{ color: "#aaa", fontSize: 15, padding: "20px 0" }}>loading...</p>}
      {!loading && filtered.length === 0 && <p style={{ color: "#aaa", fontSize: 15, padding: "20px 0" }}>no books found</p>}

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
              {book.currentlyReading && (
                <span style={{ fontSize: 11, color: "#e8318a", border: "1px solid #e8318a", borderRadius: 4, padding: "2px 7px", flexShrink: 0, marginTop: 2 }}>reading</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
