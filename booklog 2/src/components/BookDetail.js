import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, deleteDoc } from "firebase/firestore";

function StarDisplay({ value, size = 22 }) {
  return (
    <span style={{ fontSize: size, letterSpacing: 2, color: "#1a1a1a" }}>
      {[1,2,3,4,5].map(s => s <= value ? "★" : "☆").join("")}
    </span>
  );
}

export default function BookDetail({ bookId, userId, onBack, onEdit }) {
  const [book, setBook] = useState(null);

  useEffect(() => {
    return onSnapshot(doc(db, "users", userId, "books", bookId), (d) => {
      if (d.exists()) setBook({ id: d.id, ...d.data() });
    });
  }, [bookId, userId]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this book?")) return;
    await deleteDoc(doc(db, "users", userId, "books", bookId));
    onBack();
  };

  if (!book) return <div style={{ padding: 40, color: "#aaa", fontSize: 14 }}>loading...</div>;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 20px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 0 20px" }}>
        <button onClick={onBack} style={ghostBtn}>← back</button>
        <div style={{ display: "flex", gap: 16 }}>
          <button onClick={handleDelete} style={{ ...ghostBtn, color: "#e8318a" }}>delete</button>
          <button onClick={() => onEdit(book)} style={ghostBtn}>edit</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 28, alignItems: "flex-start", marginBottom: 32 }}>
        {book.coverUrl ? (
          <img src={book.coverUrl} alt={book.title} style={{ width: 90, height: 128, objectFit: "cover", borderRadius: 3, flexShrink: 0 }} />
        ) : (
          <div style={{ width: 90, height: 128, background: "#e0e0e0", borderRadius: 3, flexShrink: 0 }} />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4, letterSpacing: "0.5px" }}>jenny/</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 30, fontWeight: 400, margin: "0 0 8px", color: "#1a1a1a", lineHeight: 1.2 }}>
            {book.title}
          </h1>
          <div style={{ fontSize: 15, color: "#444", marginBottom: 4 }}>
            {book.author}{book.translator ? `, translation by ${book.translator}` : ""}. {book.year}.
          </div>
          <div style={{ marginTop: 12 }}>
            <StarDisplay value={book.rating} size={22} />
          </div>
        </div>
      </div>

      {book.review && (
        <p style={{ fontSize: 15, color: "#333", lineHeight: 1.7, margin: "0 0 16px" }}>{book.review}</p>
      )}

      {book.quotes?.length > 0 && (
        <div style={{ margin: "8px 0 20px" }}>
          {book.quotes.map((q, i) => (
            <div key={i} style={{ display: "flex", gap: 20, alignItems: "baseline", padding: "6px 0" }}>
              <span style={{ fontSize: 13, color: "#e8318a", minWidth: 36, fontVariantNumeric: "tabular-nums" }}>{q.page}</span>
              <span style={{ fontSize: 14, color: "#444", lineHeight: 1.5 }}>{q.text}</span>
            </div>
          ))}
        </div>
      )}

      {book.tags?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "16px 0 8px" }}>
          {book.tags.map((tag) => (
            <span key={tag} style={{ fontSize: 12, border: "1px solid #ccc", borderRadius: 4, padding: "3px 10px", color: "#444" }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <div style={{ fontSize: 12, color: "#aaa", marginTop: 10 }}>read on {book.dateRead}.</div>
    </div>
  );
}

const ghostBtn = { background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13, padding: "4px 0" };
