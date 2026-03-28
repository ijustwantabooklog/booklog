import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

function StarDisplay({ value, size = 12 }) {
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
    <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.8px", textTransform: "uppercase", color: "#aaa", marginBottom: 12 }}>
      {children}
    </div>
  );
}

function getBookShelves(book) {
  if (book.shelves && book.shelves.length > 0) return book.shelves;
  if (book.shelf) return [book.shelf];
  return [];
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

  const shelves = [...new Set(books.flatMap(b => getBookShelves(b)).filter(Boolean))].sort();
  const tags = [...new Set(books.flatMap(b => b.tags || []).filter(Boolean))].sort();
  const currentlyReading = books.filter(b => b.currentlyReading);
  const finished = books.filter(b => !b.currentlyReading);

  const filtered = finished.filter(b => {
    if (activeShelf && !getBookShelves(b).includes(activeShelf)) return false;
    if (activeTag && !(b.tags || []).includes(activeTag)) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 60px" }}>
      <div style={{ display: "flex", gap: 48, alignItems: "flex-start", marginTop: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>

          {currentlyReading.length > 0 && (
            <div style={{ marginBottom: 36 }}>
              <SectionHeading>Currently reading</SectionHeading>
              {currentlyReading.map(book => (
                <div key={book.id} onClick={() => onSelect(book.id)}
                  style={{ display: "flex", gap: 16, padding: "12px 0", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  {book.coverUrl
                    ? <img src={book.coverUrl} alt={book.title} style={{ width: 36, height: 52, objectFit: "cover", borderRadius: 2, flexShrink: 0 }} />
                    : <div style={{ width: 36, height: 52, background: "#e0e0e0", borderRadius: 2, flexShrink: 0 }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "Georgia, serif", fontSize: 15, color: "#1a1a1a" }}>{book.title}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{book.author}</div>
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e8318a", marginTop: 6, flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}

          {!loading && filtered.length > 0 && <SectionHeading>Activity</SectionHeading>}
          {loading && <p style={{ color: "#aaa", fontSize: 14, padding: "20px 0" }}>loading...</p>}
          {!loading && books.length === 0 && (
            <p style={{ fontSize: 14, color: "#aaa", padding: "40px 0" }}>no books yet — tap "Log it" to add your first</p>
          )}

          {filtered.map((book) => (
            <div key={book.id} onClick={() => onSelect(book.id)}
              style={{ display: "flex", gap: 16, padding: "14px 0", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <div style={{ minWidth: 100, flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: "#bbb" }}>{formatDate(book.dateRead)}</div>
              </div>
              {book.coverUrl
                ? <img src={book.coverUrl} alt={book.title} style={{ width: 36, height: 52, objectFit: "cover", borderRadius: 2, flexShrink: 0 }} />
                : <div style={{ width: 36, height: 52, background: "#e0e0e0", borderRadius: 2, flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 15, color: "#1a1a1a", marginBottom: 2 }}>{book.title}</div>
                <div style={{ fontSize: 12, color: "#888" }}>{book.author}{book.translator ? `, trans. ${book.translator}` : ""}</div>
                {book.rating > 0 && <div style={{ marginTop: 4 }}><StarDisplay value={book.rating} size={12} /></div>}
              </div>
            </div>
          ))}
        </div>

        {(shelves.length > 0 || tags.length > 0) && (
          <div style={{ width: 160, flexShrink: 0, paddingTop: 4 }}>
            {shelves.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <SectionHeading>Shelves</SectionHeading>
                {shelves.map(shelf => (
                  <div key={shelf} onClick={() => { setActiveTag(null); setActiveShelf(p => p === shelf ? null : shelf); }}
                    style={{ fontSize: 13, padding: "4px 0", cursor: "pointer", color: activeShelf === shelf ? "#e8318a" : "#444", fontWeight: activeShelf === shelf ? 500 : 400 }}>
                    {shelf}
                    <span style={{ fontSize: 11, color: "#ccc", marginLeft: 5 }}>{books.filter(b => getBookShelves(b).includes(shelf)).length}</span>
                  </div>
                ))}
              </div>
            )}
            {tags.length > 0 && (
              <div>
                <SectionHeading>Tags</SectionHeading>
                {tags.map(tag => (
                  <div key={tag} onClick={() => { setActiveShelf(null); setActiveTag(p => p === tag ? null : tag); }}
                    style={{ fontSize: 13, padding: "4px 0", cursor: "pointer", color: activeTag === tag ? "#e8318a" : "#444", fontWeight: activeTag === tag ? 500 : 400 }}>
                    #{tag}
                    <span style={{ fontSize: 11, color: "#ccc", marginLeft: 5 }}>{books.filter(b => (b.tags || []).includes(tag)).length}</span>
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
