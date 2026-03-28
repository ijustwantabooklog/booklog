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

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setTab(id)} style={{
      padding: "6px 18px", borderRadius: 20, border: tab === id ? "none" : "1px solid #ccc",
      background: tab === id ? "#e8318a" : "none",
      color: tab === id ? "#fff" : "#888",
      fontSize: 13, cursor: "pointer", fontFamily: "inherit",
    }}>{label}</button>
  );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 20px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 0 16px" }}>
        <button onClick={onBack} style={ghostBtn}>← back</button>
        <div style={{ display: "flex", gap: 16 }}>
          <button onClick={handleDelete} style={{ ...ghostBtn, color: "#e8318a" }}>delete</button>
          <button onClick={() => onEdit(book)} style={ghostBtn}>edit</button>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <TabBtn id="log" label="Log" />
        <TabBtn id="notes" label="Notes" />
      </div>

      {/* LOG TAB */}
      {tab === "log" && (
        <>
          <div style={{ display: "flex", gap: 28, alignItems: "flex-start", marginBottom: 32 }}>
            {book.coverUrl
              ? <img src={book.coverUrl} alt={book.title} style={{ width: 90, height: 128, objectFit: "cover", borderRadius: 3, flexShrink: 0 }} />
              : <div style={{ width: 90, height: 128, background: "#e0e0e0", borderRadius: 3, flexShrink: 0 }} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>jenny/</div>
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 400, margin: "0 0 8px", color: "#1a1a1a", lineHeight: 1.2 }}>{book.title}</h1>
              <div style={{ fontSize: 15, color: "#444", marginBottom: 4 }}>
                {book.author}{book.translator ? `, translation by ${book.translator}` : ""}. {book.year}.
              </div>
              {book.rating > 0 && <div style={{ marginTop: 10 }}><StarDisplay value={book.rating} size={20} /></div>}
            </div>
          </div>

          {notes && <p style={{ fontSize: 15, color: "#333", lineHeight: 1.7, margin: "0 0 20px" }}>{notes}</p>}

          {book.quotes?.length > 0 && (
            <div style={{ margin: "0 0 20px" }}>
              {book.quotes.map((q, i) => (
                <div key={i} style={{ display: "flex", gap: 20, padding: "8px 0", borderBottom: "0.5px solid #f0f0f0" }}>
                  <span style={{ fontSize: 13, color: "#e8318a", minWidth: 36 }}>{q.page}</span>
                  <span style={{ fontSize: 14, color: "#444", lineHeight: 1.5, flex: 1 }}>{q.text}</span>
                </div>
              ))}
            </div>
          )}

          {shelves.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "16px 0 8px" }}>
              {shelves.map(s => (
                <span key={s} style={{ fontSize: 12, border: "1px solid #ccc", borderRadius: 4, padding: "3px 10px", color: "#444" }}>{s}</span>
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
        </>
      )}

      {/* NOTES TAB */}
      {tab === "notes" && (
        <div style={{ background: "#f4f4f4", borderRadius: 10, padding: "20px 24px" }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 18, color: "#1a1a1a", marginBottom: 4 }}>{book.title}</div>
            <div style={{ fontSize: 13, color: "#888" }}>
              {book.author}{book.translator ? `, translation by ${book.translator}` : ""}. {book.year}.
            </div>
          </div>

          {notes && <p style={{ fontSize: 14, color: "#444", lineHeight: 1.7, margin: "0 0 20px" }}>{notes}</p>}

          {book.quotes?.length > 0 && (
            <div>
              {book.quotes.map((q, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                    <span style={{ fontSize: 13, color: "#e8318a", minWidth: 36 }}>{q.page}</span>
                    <span style={{ fontSize: 14, color: "#444", lineHeight: 1.6, flex: 1 }}>{q.text}</span>
                  </div>
                  {q.quoteNote && (
                    <div style={{ marginLeft: 52, marginTop: 6, fontSize: 13, color: "#888", fontStyle: "italic", lineHeight: 1.5 }}>
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
