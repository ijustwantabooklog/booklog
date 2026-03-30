import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";

function StarDisplay({ value, size = 13 }) {
  return (
    <span style={{ fontSize: size, color: "#555" }}>
      {[1,2,3,4,5].map(s => s <= value ? "★" : "☆").join("")}
    </span>
  );
}

export default function Home({ userId, onSelect, onSelectArticle }) {
  const [books, setBooks] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState(null); // { bookId, type: "quote"|"rumination" }
  const [quoteText, setQuoteText] = useState("");
  const [quotePage, setQuotePage] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [rumText, setRumText] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    let b = false, a = false;
    const u1 = onSnapshot(query(collection(db, "users", userId, "books"), orderBy("createdAt", "desc")),
      snap => { setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() }))); b = true; if (a) setLoading(false); });
    const u2 = onSnapshot(query(collection(db, "users", userId, "articles"), orderBy("createdAt", "desc")),
      snap => { setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() }))); a = true; if (b) setLoading(false); });
    return () => { u1(); u2(); };
  }, [userId]);

  useEffect(() => {
    if (activeAction) setTimeout(() => inputRef.current?.focus(), 50);
  }, [activeAction]);

  const currentlyReading = books.filter(b => b.currentlyReading);
  const recentlyFinished = books.filter(b => !b.currentlyReading).slice(0, 3);
  const recentArticles = articles.slice(0, 3);

  const saveQuote = async (book) => {
    if (!quoteText.trim()) return;
    const newQuote = { page: quotePage.trim(), text: quoteText.trim(), quoteNote: quoteNote.trim() };
    const updated = [...(book.quotes || []), newQuote];
    await updateDoc(doc(db, "users", userId, "books", book.id), { quotes: updated, updatedAt: serverTimestamp() });
    setQuoteText(""); setQuotePage(""); setQuoteNote(""); setActiveAction(null);
  };

  const saveRumination = async (bookId) => {
    if (!rumText.trim()) return;
    await addDoc(collection(db, "users", userId, "books", bookId, "ruminations"), {
      text: rumText.trim(), createdAt: serverTimestamp(),
    });
    setRumText(""); setActiveAction(null);
  };

  const cardStyle = { background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden", marginBottom: 10 };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 60px" }}>

      {loading && <p style={{ color: "#aaa", fontSize: 15, padding: "20px 0" }}>loading...</p>}

      {!loading && currentlyReading.length === 0 && (
        <div style={{ ...cardStyle, padding: "32px 24px", textAlign: "center" }}>
          <p style={{ color: "#aaa", fontSize: 15, margin: 0 }}>Nothing currently reading — log a book to get started.</p>
        </div>
      )}

      {currentlyReading.map(book => (
        <div key={book.id} style={{ ...cardStyle, marginBottom: 16 }}>
          {/* Book header */}
          <div style={{ display: "flex", gap: 20, padding: "20px 20px 0", alignItems: "flex-start" }}>
            {book.coverUrl
              ? <img src={book.coverUrl} alt={book.title} onClick={() => onSelect(book.id)}
                  style={{ width: 64, height: 92, objectFit: "cover", border: "1px solid #ddd", borderRadius: 3, flexShrink: 0, cursor: "pointer" }} />
              : <div onClick={() => onSelect(book.id)} style={{ width: 64, height: 92, background: "#e8e8e8", border: "1px solid #ddd", borderRadius: 3, flexShrink: 0, cursor: "pointer" }} />}
            <div style={{ flex: 1 }}>
              <div onClick={() => onSelect(book.id)} style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "#0000ee", textDecoration: "underline", cursor: "pointer", marginBottom: 4, lineHeight: 1.2 }}>{book.title}</div>
              <div style={{ fontSize: 14, color: "#555", marginBottom: 8 }}>{book.author}{book.translator ? `, trans. ${book.translator}` : ""}</div>
              {book.rating > 0 && <StarDisplay value={book.rating} size={16} />}
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: "flex", gap: 8, padding: "14px 20px", borderBottom: activeAction?.bookId === book.id ? "0.5px solid #f0f0f0" : "none" }}>
            <button onClick={() => setActiveAction(activeAction?.bookId === book.id && activeAction?.type === "quote" ? null : { bookId: book.id, type: "quote" })}
              style={{ background: activeAction?.bookId === book.id && activeAction?.type === "quote" ? "#e8318a" : "none", color: activeAction?.bookId === book.id && activeAction?.type === "quote" ? "#fff" : "#666", border: "1px solid #e0e0e0", borderRadius: 6, padding: "5px 14px", fontSize: 13, cursor: "pointer" }}>
              + quote
            </button>
            <button onClick={() => setActiveAction(activeAction?.bookId === book.id && activeAction?.type === "rumination" ? null : { bookId: book.id, type: "rumination" })}
              style={{ background: activeAction?.bookId === book.id && activeAction?.type === "rumination" ? "#e8318a" : "none", color: activeAction?.bookId === book.id && activeAction?.type === "rumination" ? "#fff" : "#666", border: "1px solid #e0e0e0", borderRadius: 6, padding: "5px 14px", fontSize: 13, cursor: "pointer" }}>
              + rumination
            </button>
            <button onClick={async () => {
              const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
              await updateDoc(doc(db, "users", userId, "books", book.id), { currentlyReading: false, dateRead: today });
            }} style={{ background: "none", color: "#aaa", border: "1px solid #e8e8e8", borderRadius: 6, padding: "5px 14px", fontSize: 13, cursor: "pointer", marginLeft: "auto" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#e8318a"; e.currentTarget.style.color = "#e8318a"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8e8e8"; e.currentTarget.style.color = "#aaa"; }}>
              Mark as read
            </button>
          </div>

          {/* Quote input */}
          {activeAction?.bookId === book.id && activeAction?.type === "quote" && (
            <div style={{ padding: "16px 20px", background: "#fafafa" }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                <input ref={inputRef} value={quotePage} onChange={e => setQuotePage(e.target.value)}
                  placeholder="pg" style={{ width: 48, fontSize: 14, border: "none", outline: "none", background: "none", color: "#e8318a" }}
                  onKeyDown={e => { if (e.key === "Tab") { e.preventDefault(); document.getElementById(`qt-${book.id}`)?.focus(); } }} />
                <textarea id={`qt-${book.id}`} value={quoteText} onChange={e => setQuoteText(e.target.value)} rows={2}
                  placeholder="Quote..."
                  style={{ flex: 1, fontSize: 14, border: "none", outline: "none", background: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.5 }}
                  onKeyDown={e => { if (e.key === "Tab") { e.preventDefault(); document.getElementById(`qn-${book.id}`)?.focus(); } if (e.key === "Enter" && !e.shiftKey && !quoteNote) { e.preventDefault(); saveQuote(book); } }} />
              </div>
              <input id={`qn-${book.id}`} value={quoteNote} onChange={e => setQuoteNote(e.target.value)}
                placeholder="Note (optional)"
                style={{ width: "100%", fontSize: 13, border: "none", outline: "none", background: "none", color: "#888", borderTop: "0.5px solid #ebebeb", paddingTop: 8 }}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); saveQuote(book); } }} />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button onClick={() => saveQuote(book)} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 13, cursor: "pointer" }}>Save</button>
              </div>
            </div>
          )}

          {/* Rumination input */}
          {activeAction?.bookId === book.id && activeAction?.type === "rumination" && (
            <div style={{ padding: "16px 20px", background: "#fafafa" }}>
              <textarea ref={inputRef} value={rumText} onChange={e => setRumText(e.target.value)} rows={3}
                placeholder="A thought, reflection, connection..."
                style={{ width: "100%", fontSize: 14, border: "none", outline: "none", background: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.7, boxSizing: "border-box" }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveRumination(book.id); } }} />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button onClick={() => saveRumination(book.id)} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 13, cursor: "pointer" }}>Save</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Recent reads */}
      {!loading && recentlyFinished.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 15, color: "#444", fontWeight: 500, marginBottom: 10 }}>Recently Finished</div>
          <div style={cardStyle}>
            {recentlyFinished.map((book, i) => (
              <div key={book.id} onClick={() => onSelect(book.id)}
                style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 16px", borderBottom: i === recentlyFinished.length - 1 ? "none" : "0.5px solid #ebebeb", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                {book.coverUrl
                  ? <img src={book.coverUrl} alt={book.title} style={{ width: 36, height: 52, objectFit: "cover", border: "1px solid #ddd", borderRadius: 2, flexShrink: 0 }} />
                  : <div style={{ width: 36, height: 52, background: "#e8e8e8", border: "1px solid #ddd", borderRadius: 2, flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, color: "#0000ee", textDecoration: "underline", marginBottom: 2, fontFamily: "Georgia, serif" }}>{book.title}</div>
                  <div style={{ fontSize: 13, color: "#444" }}>{book.author}</div>
                  {book.rating > 0 && <div style={{ marginTop: 3 }}><StarDisplay value={book.rating} /></div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent articles */}
      {!loading && recentArticles.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 15, color: "#444", fontWeight: 500, marginBottom: 10 }}>Recent Articles</div>
          <div style={cardStyle}>
            {recentArticles.map((article, i) => (
              <div key={article.id} onClick={() => onSelectArticle(article.id)}
                style={{ padding: "12px 16px", borderBottom: i === recentArticles.length - 1 ? "none" : "0.5px solid #ebebeb", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                <div style={{ fontSize: 15, color: "#0000ee", textDecoration: "underline", marginBottom: 2 }}>{article.title}</div>
                <div style={{ fontSize: 13, color: "#444" }}>{[article.author, article.publication].filter(Boolean).join(" · ")}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
