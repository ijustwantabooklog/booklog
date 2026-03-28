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

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatActivityDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function BookList({ userId, onSelect }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeShelf, setActiveShelf] = useState(null);
  const [activeTag, setActiveTag] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "users", userId, "books"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [userId]);

  const shelves = [...new Set(books.flatMap(b => b.shelves || []).filter(Boolean))].sort();
  const tags = [...new Set(books.flatMap(b => b.tags || []).filter(Boolean))].sort();
  const currentlyReading = books.filter(b => b.currentlyReading);
  const finished = books.filter(b => !b.currentlyReading);

  const filtered = finished.filter(b => {
    if (activeShelf && !(b.shelves || []).includes(activeShelf)) return false;
    if (activeTag && !(b.tags || []).includes(activeTag)) return false;
    return true;
  });

  // Build activity entries
  const activityEntries = [...books]
    .sort((a, b) => {
      const ta = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(0);
      const tb = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(0);
      return tb - ta;
    })
    .map(book => {
      const date = formatActivityDate(book.updatedAt || book.createdAt);
      if (book.currentlyReading) return { id: book.id, text: `Marked as currently reading`, title: book.title, date };
      if (book.rating > 0 && book.notes) return { id: book.id, text: `Read and reviewed`, title: book.title, date };
      if (book.rating > 0) return { id: book.id, text: `Read and rated`, title: book.title, date };
      return { id: book.id, text: `Logged`, title: book.title, date };
    });

  const cardStyle = { background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden" };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 60px" }}>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Currently Reading */}
          {currentlyReading.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 16, color: "#444", fontWeight: 500, marginBottom: 10 }}>Currently Reading</div>
              <div style={{ ...cardStyle, padding: "20px 16px" }}>
                <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
                  {currentlyReading.map(book => (
                    <div key={book.id} onClick={() => onSelect(book.id)}
                      style={{ flexShrink: 0, cursor: "pointer", textAlign: "center", width: 90 }}>
                      {book.coverUrl
                        ? <img src={book.coverUrl} alt={book.title} style={{ width: 80, height: 115, objectFit: "cover", border: "1px solid #ddd", borderRadius: 3, display: "block", margin: "0 auto" }} />
                        : <div style={{ width: 80, height: 115, background: "#e8e8e8", border: "1px solid #ddd", borderRadius: 3, margin: "0 auto" }} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Activity */}
          {!loading && activityEntries.length > 0 && (
            <div>
              <div style={{ fontSize: 16, color: "#444", fontWeight: 500, marginBottom: 10 }}>Activity</div>
              <div style={cardStyle}>
                {activityEntries.map((entry, i) => (
                  <div key={entry.id} onClick={() => onSelect(entry.id)}
                    style={{ padding: "12px 16px", borderBottom: i === activityEntries.length - 1 ? "none" : "0.5px solid #ebebeb", fontSize: 14, color: "#444", cursor: "pointer", lineHeight: 1.5 }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    {entry.text} <strong style={{ color: "#333" }}>{entry.title}</strong> on {entry.date}.
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && <p style={{ color: "#aaa", fontSize: 15, padding: "20px 0" }}>loading...</p>}
          {!loading && books.length === 0 && <p style={{ fontSize: 15, color: "#aaa", padding: "20px 0" }}>no books yet — tap "Log it" to add your first</p>}
        </div>

        {/* Sidebar */}
        {(shelves.length > 0 || tags.length > 0) && (
          <div style={{ width: 190, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, marginTop: 26 }}>
            {shelves.length > 0 && (
              <div style={cardStyle}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#444", borderBottom: "1px solid #e0e0e0", padding: "14px 16px 10px" }}>Shelves</div>
                {shelves.map((shelf, i) => (
                  <div key={shelf} onClick={() => { setActiveTag(null); setActiveShelf(p => p === shelf ? null : shelf); }}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: i === shelves.length - 1 ? "none" : "0.5px solid #ebebeb", cursor: "pointer" }}>
                    <span style={{ fontSize: 14, color: activeShelf === shelf ? "#cc0000" : "#0000ee", textDecoration: "underline" }}>{shelf}</span>
                    <span style={{ fontSize: 12, color: "#aaa" }}>{books.filter(b => (b.shelves || []).includes(shelf)).length}</span>
                  </div>
                ))}
              </div>
            )}
            {tags.length > 0 && (
              <div style={cardStyle}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#444", borderBottom: "1px solid #e0e0e0", padding: "14px 16px 10px" }}>Tags</div>
                {tags.map((tag, i) => (
                  <div key={tag} onClick={() => { setActiveShelf(null); setActiveTag(p => p === tag ? null : tag); }}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: i === tags.length - 1 ? "none" : "0.5px solid #ebebeb", cursor: "pointer" }}>
                    <span style={{ fontSize: 14, color: activeTag === tag ? "#cc0000" : "#0000ee", textDecoration: "underline" }}>#{tag}</span>
                    <span style={{ fontSize: 12, color: "#aaa" }}>{books.filter(b => (b.tags || []).includes(tag)).length}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
