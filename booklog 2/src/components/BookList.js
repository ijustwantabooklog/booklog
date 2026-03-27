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

export default function BookList({ userId, userName, onSelect, onNew, onSignOut }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "users", userId, "books"),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [userId]);

  const firstName = userName?.split(" ")[0]?.toLowerCase() || "jenny";

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 20px 60px" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "32px 0 24px",
        borderBottom: "1px solid #e8e8e8",
        marginBottom: 8,
      }}>
        <span style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 400 }}>
          {firstName}/
        </span>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <button onClick={onSignOut} style={{ background: "none", border: "none", color: "#bbb", fontSize: 12 }}>
            sign out
          </button>
          <button onClick={onNew} style={{
            background: "#e8318a", color: "#fff", border: "none",
            borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 500,
          }}>
            Log it
          </button>
        </div>
      </div>

      {loading && <p style={{ color: "#aaa", fontSize: 14, padding: "20px 0" }}>loading...</p>}

      {!loading && books.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
          <p style={{ fontSize: 15, marginBottom: 8 }}>no books yet</p>
          <p style={{ fontSize: 13 }}>tap "Log it" to add your first one</p>
        </div>
      )}

      {books.map((book) => (
        <div
          key={book.id}
          onClick={() => onSelect(book.id)}
          style={{
            display: "flex", gap: 20, padding: "20px 0",
            borderBottom: "1px solid #f0f0f0", cursor: "pointer",
          }}
        >
          {book.coverUrl ? (
            <img src={book.coverUrl} alt={book.title} style={{ width: 52, height: 74, objectFit: "cover", borderRadius: 3, flexShrink: 0 }} />
          ) : (
            <div style={{ width: 52, height: 74, background: "#e0e0e0", borderRadius: 3, flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 17, marginBottom: 3, color: "#1a1a1a" }}>
              {book.title}
            </div>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>
              {book.author}{book.translator ? `, trans. ${book.translator}` : ""}
            </div>
            <StarDisplay value={book.rating} size={14} />
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 5 }}>
              read {book.dateRead}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
