import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, deleteDoc } from "firebase/firestore";

function StarDisplay({ value, size = 20 }) {
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

  const shelves = book.shelves || [];
  const tags = book.tags || [];
  const notes = book.notes || book.review || "";

  return (
    <div style={{ maxWidth: 660, margin: "0 auto", padding: "0 20px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 0 20px" }}>
        <button onClick={onBack} style={ghostBtn}>← back</button>
        <div style={{ display: "flex", gap: 16 }}>
          <button onClick={handleDelete} style={{ ...ghostBtn, color: "#e8318a" }}>delete</button>
          <button onClick={() => onEdit(book)} style={ghostBtn}>edit</button>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, padding: "24px" }}>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 16 }}>book</div>
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", marginBottom: 24 }}>
          {book.coverUrl
            ? <img src={book.coverUrl} alt={book.title} style={{ width: 100, height: 140, objectFit: "cover", borderRadius: 3, flexShrink: 0 }} />
            : <div style={{ width: 100, height: 140, background: "#e0e0e0", borderRadius: 3, flexShrink: 0 }} />}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 400, margin: "0 0 6px", color: "#1a1a1a", lineHeight: 1.2 }}>{book.title}</h1>
            <div style={{ fontSize: 14, color: "#555", marginBottom: 12 }}>
              {book.author}{book.translator ? `, translation by ${book.translator}` : ""}. {book.year}.
            </div>
            {book.rating > 0 && <StarDisplay value={book.rating} size={20} />}
          </div>
        </div>

        {(shelves.length > 0 || tags.length > 0) && (
          <div style={{ marginTop: 16, fontSize: 13, color: "#555", lineHeight: 1.8 }}>
            {shelves.length > 0 && (
              <div><span style={{ color: "#aaa" }}>Shelves: </span>{shelves.join(", ")}</div>
            )}
            {tags.length > 0 && (
              <div><span style={{ color: "#aaa" }}>Tags: </span>{tags.map(t => `#${t}`).join(" ")}</div>
            )}
          </div>
        )}

        {!book.currentlyReading && (
          <div style={{ fontSize: 12, color: "#aaa", marginTop: 12 }}>read on {book.dateRead}.</div>
        )}
      </div>

      {(notes || book.quotes?.length > 0) && (
        <div style={{ background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, padding: "24px", marginTop: 10 }}>
          {notes && <p style={{ fontSize: 14, color: "#333", lineHeight: 1.7, margin: "0 0 16px" }}>{notes}</p>}
          {book.quotes?.length > 0 && (
            <div>
              {book.quotes.map((q, i) => (
                <div key={i} style={{ padding: "10px 0", borderBottom: i === book.quotes.length - 1 ? "none" : "0.5px solid #f0f0f0" }}>
                  <div style={{ display: "flex", gap: 20, alignItems: "baseline" }}>
                    <span style={{ fontSize: 13, color: "#e8318a", minWidth: 36, flexShrink: 0 }}>{q.page}</span>
                    <span style={{ fontSize: 14, color: "#444", lineHeight: 1.5, flex: 1 }}>{q.text}</span>
                  </div>
                  {q.quoteNote && (
                    <div style={{ marginLeft: 56, marginTop: 5, fontSize: 13, color: "#888", fontStyle: "italic", lineHeight: 1.5 }}>{q.quoteNote}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const ghostBtn = { background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13, padding: "4px 0" };
