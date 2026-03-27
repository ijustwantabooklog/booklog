import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

function StarDisplay({ value, size = 13 }) {
  return (
    <span style={{ fontSize: size, letterSpacing: 1, color: "#1a1a1a" }}>
      {[1,2,3,4,5].map(s => s <= value ? "★" : "☆").join("")}
    </span>
  );
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isNaN(d)) return d;
  return null;
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

  // Sort books by dateRead descending
  const sorted = [...books].sort((a, b) => {
    const da = parseDate(a.dateRead);
    const db2 = parseDate(b.dateRead);
    if (!da && !db2) return 0;
    if (!da) return 1;
    if (!db2) return -1;
    return db2 - da;
  });

  // Group by "Month Year"
  const groups = [];
  const seen = {};
  sorted.forEach(book => {
    const d = parseDate(book.dateRead);
    const key = d ? `${d.toLocaleString("en-US", { month: "long" })} ${d.getFullYear()}` : "Unknown date";
    if (!seen[key]) { seen[key] = true; groups.push({ key, books: [] }); }
    groups[groups.length - 1].books.push({ ...book, _date: d });
  });

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 20px 60px" }}>
      {loading && <p style={{ color: "#aaa", fontSize: 14, padding: "20px 0" }}>loading...</p>}

      {!loading && sorted.length === 0 && (
        <p style={{ color: "#aaa", fontSize: 14, padding: "40px 0" }}>no books logged yet</p>
      )}

      {groups.map(({ key, books: groupBooks }) => {
        const firstDate = groupBooks[0]?._date;
        const monthAbbr = firstDate ? firstDate.toLocaleString("en-US", { month: "short" }).toUpperCase() : "—";
        const yearNum = firstDate ? firstDate.getFullYear() : "";

        return (
          <div key={key} style={{ marginBottom: 0 }}>
            {groupBooks.map((book, i) => {
              const isFirstInGroup = i === 0;
              const day = book._date ? String(book._date.getDate()).padStart(2, "0") : "—";

              return (
                <div key={book.id} onClick={() => onSelectBook(book.id)}
                  style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: "1px solid #f0f0f0", cursor: "pointer", padding: "14px 0" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>

                  {/* Month block — only show on first of group */}
                  <div style={{ width: 72, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                    {isFirstInGroup ? (
                      <div style={{
                        width: 52, background: "#f0f0f0", borderRadius: 6, padding: "5px 0",
                        textAlign: "center", border: "1px solid #e4e4e4"
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.8px", color: "#e8318a" }}>{monthAbbr}</div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#333" }}>{yearNum}</div>
                      </div>
                    ) : null}
                  </div>

                  {/* Day */}
                  <div style={{ width: 36, flexShrink: 0, textAlign: "center", fontSize: 20, fontWeight: 300, color: "#bbb", fontVariantNumeric: "tabular-nums" }}>
                    {day}
                  </div>

                  {/* Title + Year */}
                  <div style={{ flex: 1, minWidth: 0, padding: "0 16px" }}>
                    <span style={{ fontFamily: "Georgia, serif", fontSize: 16, color: "#1a1a1a" }}>{book.title}</span>
                    {book.year && <span style={{ fontSize: 13, color: "#bbb", marginLeft: 10 }}>{book.year}</span>}
                  </div>

                  {/* Rating */}
                  <div style={{ flexShrink: 0 }}>
                    {book.rating ? <StarDisplay value={book.rating} size={13} /> : <span style={{ fontSize: 13, color: "#ddd" }}>not rated</span>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
