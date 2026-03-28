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
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

  const cardStyle = { background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden" };
  const rowStyle = { display: "flex", alignItems: "flex-start", gap: 16, padding: "14px 16px", borderBottom: "0.5px solid #ebebeb" };
  const sectionLabelStyle = { fontSize: 16, color: "#444", fontWeight: 500 };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 60px" }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>

          {currentlyReading.length > 0 && (
            <div style={cardStyle}>
              <div style={{ ...rowStyle, alignItems: "center" }}>
                <span style={sectionLabelStyle}>Currently Reading</span>
              </div>
              {currentlyReading.map((book, i) => (
                <div key={book.id} onClick={() => onSelect(book.id)}
                  style={{ ...rowStyle, borderBottom: i === currentlyReading.length - 1 ? "none" : "0.5px solid #ebebeb", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  {book.coverUrl
                    ? <img src={book.coverUrl} alt={book.title} style={{ width: 36, height: 52, objectFit: "cover", border: "1px solid #ddd", borderRadius: 2, flexShrink: 0 }} />
                    : <div style={{ width: 36, height: 52, background: "#e8e8e8", border: "1px solid #ddd", borderRadius: 2, flexShrink: 0 }} />}
                  <div>
                    <div style={{ fontSize: 15, color: "#0000ee", textDecoration: "underline", marginBottom: 2, fontFamily: "Georgia, serif" }}>{book.title}</div>
                    <div style={{ fontSize: 13, color: "#444" }}>{book.author}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div style={cardStyle}>
              <div style={{ ...rowStyle, alignItems: "center" }}>
                <span style={sectionLabelStyle}>Activity</span>
              </div>
              {filtered.map((book, i) => (
                <div key={book.id} onClick={() => onSelect(book.id)}
                  style={{ ...rowStyle, borderBottom: i === filtered.length - 1 ? "none" : "0.5px solid #ebebeb", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <div style={{ fontSize: 13, color: "#555", minWidth: 100, flexShrink: 0, paddingTop: 2 }}>{formatDate(book.dateRead)}</div>
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

          {loading && <p style={{ color: "#aaa", fontSize: 15, padding: "20px 0" }}>loading...</p>}
          {!loading && books.length === 0 && <p style={{ fontSize: 15, color: "#aaa", padding: "20px 0" }}>no books yet — tap "Log it" to add your first</p>}
        </div>

        {(shelves.length > 0 || tags.length > 0) && (
          <div style={{ width: 190, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {shelves.length > 0 && (
              <div style={cardStyle}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#444", borderBottom: "1px solid #e0e0e0", padding: "14px 16px 10px", marginBottom: 0 }}>Shelves</div>
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
