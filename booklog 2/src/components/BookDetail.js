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
  const [tab, setTab] = useState("log");

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

      {/* back / edit / delete */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 0 20px" }}>
        <button onClick={onBack} style={ghostBtn}>← back</button>
        <div style={{ display: "flex", gap: 16 }}>
          <button onClick={handleDelete} style={{ ...ghostBtn, color: "#e8318a" }}>delete</button>
          <button onClick={() => onEdit(book)} style={ghostBtn}>edit</button>
        </div>
      </div>

      {/* Tab slider — centered */}
      <div style={{ display: "flex", justifyContent: "center", gap: 0, marginBottom: 28, background: "#f0f0f0", borderRadius: 20, padding: 3, width: "fit-content", margin: "0 auto 28px" }}>
        {["log", "notes"].map(id => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: "6px 22px",
            borderRadius: 20,
            border: tab === id ? "none" : "none",
            background: tab === id ? "#e8318a" : "none",
            color: tab === id ? "#fff" : "#888",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}>
            {tab === id && <span style={{ fontSize: 11 }}>✓</span>}
            {id.charAt(0).toUpperCase() + id.slice(1)}
          </button>
        ))}
      </div>

      {/* LOG TAB */}
      {tab === "log" && (
        <div style={{ background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, padding: "24px" }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 6 }}>jenny/</div>
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

          {notes && <p style={{ fontSize: 14, color: "#333", lineHeight: 1.7, margin: "0 0 16px" }}>{notes}</p>}

          {book.quotes?.length > 0 && (
            <div style={{ margin: "0 0 20px" }}>
              {book.quotes.map((q, i) => (
                <div key={i} style={{ display: "flex", gap: 20, padding: "7px 0", borderBottom: "0.5px solid #f0f0f0" }}>
                  <span style={{ fontSize: 13, color: "#e8318a", minWidth: 36 }}>{q.page}</span>
                  <span style={{ fontSize: 14, color: "#444", lineHeight: 1.5, flex: 1 }}>{q.text}</span>
                </div>
              ))}
            </div>
          )}

          {shelves.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "16px 0 8px" }}>
              {shelves.map(s => (
                <span key={s} style={{ fontSize: 12, border: "1px solid #ccc", borderRadius: 4, padding: "3px 10px", color: "#555" }}>{s}</span>
              ))}
            </div>
          )}

          {tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0" }}>
              {tags.map(t => (
                <span key={t} style={{ fontSize: 13, color: "#555", fontFamily: "Georgia, serif", fontStyle: "italic" }}>#{t}</span>
              ))}
            </div>
          )}

          {!book.currentlyReading && (
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 12 }}>read on {book.dateRead}.</div>
          )}
        </div>
      )}

      {/* NOTES TAB */}
      {tab === "notes" && (
        <div style={{ background: "#f4f4f4", borderRadius: 10, padding: "24px" }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 17, color: "#1a1a1a", marginBottom: 4, fontWeight: 400 }}>{book.title}</div>
            <div style={{ fontSize: 13, color: "#888" }}>
              {book.author}{book.translator ? `, translation by ${book.translator}` : ""}. {book.year} edition.
            </div>
          </div>

          {notes && <p style={{ fontSize: 14, color: "#444", lineHeight: 1.7, margin: "0 0 16px" }}>{notes}</p>}

          {book.quotes?.length > 0 && (
            <div>
              {book.quotes.map((q, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                    <span style={{ fontSize: 13, color: "#e8318a", minWidth: 36 }}>{q.page}</span>
                    <span style={{ fontSize: 14, color: "#444", lineHeight: 1.6, flex: 1,
                      background: q.quoteNote ? "#ffe8f0" : "none",
                      padding: q.quoteNote ? "2px 6px" : "0",
                      borderRadius: q.quoteNote ? 3 : 0,
                    }}>{q.text}</span>
                  </div>
                  {q.quoteNote && (
                    <div style={{ marginLeft: 52, marginTop: 5, fontSize: 13, color: "#888", fontStyle: "italic", lineHeight: 1.5 }}>
                      {q.quoteNote}
                    </div>
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
