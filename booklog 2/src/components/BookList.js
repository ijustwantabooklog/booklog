import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

function StarDisplay({ value, size = 14 }) {
  return (
    <span style={{ fontSize: size, letterSpacing: 1, color: "#1a1a1a" }}>
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

function SectionHeading({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.8px", textTransform: "uppercase", color: "#aaa", marginBottom: 14 }}>
      {children}
    </div>
  );
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

  // Calculate top offset for sidebar to align with Activity heading
  const activityOffset = currentlyReading.length > 0
    ? (currentlyReading.length * 80) + 60
    : 0;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 60px" }}>
      <div style={{ display: "flex", gap: 48, alignItems: "flex-start", marginTop: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Currently reading */}
          {currentlyReading.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <SectionHeading>Currently reading</SectionHeading>
              {currentlyReading.map(book => (
                <div key={book.id} onClick={() => onSelect(book.id)}
                  style={{ display: "flex", gap: 18, padding: "14px 0", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  {book.coverUrl
                    ? <img src={book.coverUrl} alt={book.title} style={{ width: 42, height: 60, objectFit: "cover", borderRadius: 2, flexShrink: 0 }} />
                    : <div style={{ width: 42, height: 60, background: "#e0e0e0", borderRadius: 2, flexShrink: 0 }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "Georgia, serif", fontSize: 18, color: "#1a1a1a", marginBottom: 3 }}>{book.title}</div>
                    <div style={{ fontSize: 14, color: "#aaa", marginTop: 2 }}>{book.author}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Activity */}
          {!loading && filtered.length > 0 && <SectionHeading>Activity</SectionHeading>}
          {loading && <p style={{ color: "#aaa", fontSize: 15, padding: "20px 0" }}>loading...</p>}
          {!loading && books.length === 0 && (
            <p style={{ fontSize: 15, color: "#aaa", padding: "40px 0" }}>no books yet — tap "Log it" to add your first</p>
          )}

          {filtered.map((book) => (
            <div key={book.id} onClick={() => onSelect(book.id)}
              style={{ display: "flex", gap: 18, padding: "16px 0", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <div style={{ minWidth: 110, flexShrink: 0 }}>
                <div style={{ fontSize: 13, color: "#bbb" }}>{formatDate(book.dateRead)}</div>
              </div>
              {book.coverUrl
                ? <img src={book.coverUrl} alt={book.title} style={{ width: 42, height: 60, objectFit: "cover", borderRadius: 2, flexShrink: 0 }} />
                : <div style={{ width: 42, height: 60, background: "#e0e0e0", borderRadius: 2, flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 18, color: "#1a1a1a", marginBottom: 3 }}>{book.title}</div>
                <div style={{ fontSize: 14, color: "#888" }}>{book.author}{book.translator ? `, trans. ${book.translator}` : ""}</div>
                {book.rating > 0 && <div style={{ marginTop: 5 }}><StarDisplay value={book.rating} size={14} /></div>}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar — aligned with Activity */}
        {(shelves.length > 0 || tags.length > 0) && (
          <div style={{ width: 160, flexShrink: 0, paddingTop: activityOffset }}>
            {shelves.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <SectionHeading>Shelves</SectionHeading>
                {shelves.map(shelf => (
                  <div key={shelf} onClick={() => { setActiveTag(null); setActiveShelf(p => p === shelf ? null : shelf); }}
                    style={{ fontSize: 15, padding: "5px 0", cursor: "pointer", color: activeShelf === shelf ? "#e8318a" : "#444", fontWeight: activeShelf === shelf ? 500 : 400 }}>
                    {shelf}
                    <span style={{ fontSize: 12, color: "#ccc", marginLeft: 6 }}>{books.filter(b => (b.shelves || []).includes(shelf)).length}</span>
                  </div>
                ))}
              </div>
            )}
            {tags.length > 0 && (
              <div>
                <SectionHeading>Tags</SectionHeading>
                {tags.map(tag => (
                  <div key={tag} onClick={() => { setActiveShelf(null); setActiveTag(p => p === tag ? null : tag); }}
                    style={{ fontSize: 15, padding: "5px 0", cursor: "pointer", color: activeTag === tag ? "#e8318a" : "#444", fontWeight: activeTag === tag ? 500 : 400 }}>
                    #{tag}
                    <span style={{ fontSize: 12, color: "#ccc", marginLeft: 6 }}>{books.filter(b => (b.tags || []).includes(tag)).length}</span>
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
