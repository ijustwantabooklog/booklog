import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

function StarDisplay({ value }) {
  return <span style={{ color: "#555" }}>{[1,2,3,4,5].map(s => s <= value ? "★" : "☆").join("")}</span>;
}

export default function AllBooks({ userId, onSelect }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("alpha");

  useEffect(() => {
    return onSnapshot(query(collection(db, "users", userId, "books"), orderBy("createdAt", "desc")), snap => {
      setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [userId]);

  const sorted = [...books].sort((a, b) =>
    sort === "alpha" ? (a.title || "").localeCompare(b.title || "") : 0
  );
  const filtered = sorted.filter(b =>
    b.title?.toLowerCase().includes(search.toLowerCase()) ||
    b.author?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by title or author..."
          style={{ flex: 1 }} />
        <div>
          {[["alpha","A–Z"],["date","Date added"]].map(([val, label]) => (
            <button key={val} onClick={() => setSort(val)}
              style={{ padding: "4px 12px", fontSize: 13, border: "1px solid #999", borderRight: val === "date" ? "1px solid #999" : "none", background: sort === val ? "#e8318a" : "#f0f0f0", color: sort === val ? "#fff" : "#333", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p style={{ color: "#666", fontStyle: "italic" }}>loading...</p>}
      {!loading && filtered.length === 0 && <p style={{ color: "#666", fontStyle: "italic" }}>no books found</p>}

      {!loading && filtered.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {filtered.map(book => (
              <tr key={book.id} onClick={() => onSelect(book.id)} style={{ cursor: "pointer", borderBottom: "1px solid #eee" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f9f9f9"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                <td style={{ width: 44, padding: "6px 8px 6px 0", verticalAlign: "top" }}>
                  {book.coverUrl
                    ? <img src={book.coverUrl} alt={book.title} style={{ width: 36, height: 52, objectFit: "cover", border: "1px solid #999", display: "block" }} />
                    : <div style={{ width: 36, height: 52, border: "1px solid #999", background: "#ddd" }} />}
                </td>
                <td style={{ padding: "6px 8px", verticalAlign: "top" }}>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 15, color: "#00e", textDecoration: "underline" }}>{book.title}</div>
                  <div style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: "#555", marginTop: 2 }}>{book.author}{book.translator ? `, trans. ${book.translator}` : ""}</div>
                  {book.rating > 0 && <div style={{ marginTop: 2, fontSize: 13 }}><StarDisplay value={book.rating} /></div>}
                </td>
                <td style={{ textAlign: "right", verticalAlign: "middle", padding: "6px 0" }}>
                  {book.currentlyReading && <span style={{ fontFamily: "Arial, sans-serif", fontSize: 11, color: "#e8318a", border: "1px solid #e8318a", padding: "1px 6px" }}>reading</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
