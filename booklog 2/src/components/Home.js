import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { logActivity } from "../activityLogger";

function StarDisplay({ value, size = 13 }) {
  return (
    <span style={{ fontSize: size, color: "#555" }}>
      {[1,2,3,4,5].map(s => s <= value ? "★" : "☆").join("")}
    </span>
  );
}

function BookFocus({ book, userId, onBack, onViewDetail }) {
  const [quoteText, setQuoteText] = useState("");
  const [quotePage, setQuotePage] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [showQuoteNote, setShowQuoteNote] = useState(false);
  const [rumText, setRumText] = useState("");
  const [ruminations, setRuminations] = useState([]);
  const [savedQuote, setSavedQuote] = useState(false);
  const [savedRum, setSavedRum] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [notePage, setNotePage] = useState("");
  const [savedNote, setSavedNote] = useState(false);
  const quoteRef = useRef(null);
  const rumRef = useRef(null);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "users", userId, "books", book.id, "ruminations"), orderBy("createdAt", "desc")),
      snap => setRuminations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [book.id, userId]);

  const saveQuote = async () => {
    if (!quoteText.trim()) return;
    const newQuote = { page: quotePage.trim(), text: quoteText.trim(), quoteNote: quoteNote.trim(), savedAt: new Date().toISOString() };
    await updateDoc(doc(db, "users", userId, "books", book.id), {
      quotes: [...(book.quotes || []), newQuote], updatedAt: serverTimestamp()
    });
    await logActivity(userId, "quote", { text: "Added a quote to", bookTitle: book.title, bookId: book.id });
    setQuoteText(""); setQuotePage(""); setQuoteNote(""); setShowQuoteNote(false);
    setSavedQuote(true);
    setTimeout(() => setSavedQuote(false), 2000);
  };

  const saveNote = async () => {
    if (!noteText.trim()) return;
    const newNote = { page: notePage.trim(), text: noteText.trim(), type: "note", savedAt: new Date().toISOString() };
    await updateDoc(doc(db, "users", userId, "books", book.id), {
      readingNotes: [...(book.readingNotes || []), newNote], updatedAt: serverTimestamp()
    });
    await logActivity(userId, "note", { text: "Added a reading note to", bookTitle: book.title, bookId: book.id });
    setNoteText(""); setNotePage("");
    setSavedNote(true);
    setTimeout(() => setSavedNote(false), 2000);
  };

  const saveRumination = async () => {
    if (!rumText.trim()) return;
    await addDoc(collection(db, "users", userId, "books", book.id, "ruminations"), {
      text: rumText.trim(), createdAt: serverTimestamp(),
    });
    await logActivity(userId, "rumination", { text: "Added a rumination to", bookTitle: book.title, bookId: book.id });
    setRumText("");
    setSavedRum(true);
    setTimeout(() => setSavedRum(false), 2000);
  };

  const markAsRead = async () => {
    const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    await updateDoc(doc(db, "users", userId, "books", book.id), { currentlyReading: false, dateRead: today });
    onBack();
  };

  const cardStyle = { background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden", marginBottom: 10 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#f4f4f4", zIndex: 1000, overflowY: "auto" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 0 20px" }}>
        <div style={{ display: "flex", gap: 16 }}>
          <button onClick={markAsRead} style={{ ...ghostBtn, color: "#aaa" }}>mark as read</button>
          <button onClick={() => onViewDetail(book.id)} style={ghostBtn}>view log</button>
        </div>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#aaa", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "4px 8px" }}>×</button>
      </div>

      {/* Book header */}
      <div style={{ ...cardStyle, padding: "24px" }}>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          {book.coverUrl
            ? <img src={book.coverUrl} alt={book.title} style={{ width: 80, height: 116, objectFit: "cover", border: "1px solid #ddd", borderRadius: 3, flexShrink: 0 }} />
            : <div style={{ width: 80, height: 116, background: "#e8e8e8", border: "1px solid #ddd", borderRadius: 3, flexShrink: 0 }} />}
          <div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 22, color: "#1a1a1a", marginBottom: 6, lineHeight: 1.2 }}>{book.title}</div>
            <div style={{ fontSize: 14, color: "#555", marginBottom: 6 }}>{book.author}{book.translator ? `, trans. ${book.translator}` : ""}</div>
            {book.year && <div style={{ fontSize: 13, color: "#aaa" }}>{book.year}</div>}
          </div>
        </div>
      </div>

      {/* Add quote */}
      <div style={cardStyle}>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 13, color: "#aaa", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Quote</div>
          <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
            <input value={quotePage} onChange={e => setQuotePage(e.target.value)}
              placeholder="pg"
              style={{ width: 44, fontSize: 14, border: "none", outline: "none", background: "none", color: "#e8318a", flexShrink: 0 }}
              onKeyDown={e => { if (e.key === "Tab") { e.preventDefault(); quoteRef.current?.focus(); } }} />
            <textarea ref={quoteRef} value={quoteText} onChange={e => setQuoteText(e.target.value)} rows={3}
              placeholder="Paste or type a quote..."
              style={{ flex: 1, fontSize: 14, border: "none", outline: "none", background: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.6 }}
              onKeyDown={e => {
                if (e.key === "Tab") { e.preventDefault(); setShowQuoteNote(true); }
                if (e.key === "Enter" && !e.shiftKey && !showQuoteNote) { e.preventDefault(); saveQuote(); }
              }} />
          </div>
          {showQuoteNote && (
            <input value={quoteNote} onChange={e => setQuoteNote(e.target.value)}
              placeholder="Note about this quote (optional)"
              style={{ width: "100%", fontSize: 13, border: "none", outline: "none", background: "none", color: "#888", borderTop: "0.5px solid #f0f0f0", paddingTop: 8, boxSizing: "border-box" }}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); saveQuote(); } }} />
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            {!showQuoteNote && (
              <button onClick={() => setShowQuoteNote(true)} style={{ background: "none", border: "none", color: "#ccc", fontSize: 12, cursor: "pointer", padding: 0 }}>+ add note</button>
            )}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
              {savedQuote && <span style={{ fontSize: 12, color: "#e8318a" }}>saved!</span>}
              <button onClick={saveQuote} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 13, cursor: "pointer" }}>Save quote</button>
            </div>
          </div>
        </div>

        {/* Recent quotes */}
        {book.quotes?.length > 0 && (
          <div style={{ borderTop: "1px solid #f0f0f0" }}>
            {book.quotes.slice(-3).reverse().map((q, i) => (
              <div key={i} style={{ padding: "10px 20px", borderBottom: i === Math.min(book.quotes.length, 3) - 1 ? "none" : "0.5px solid #f5f5f5", background: "#f9f9f9" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                  {q.page && <span style={{ fontSize: 12, color: "#e8318a", flexShrink: 0 }}>{q.page}</span>}
                  <span style={{ fontSize: 13, color: "#444", lineHeight: 1.5 }}>{q.text}</span>
                </div>
                {q.quoteNote && <div style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginTop: 4, marginLeft: q.page ? 24 : 0 }}>{q.quoteNote}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reading notes */}
      <div style={cardStyle}>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 13, color: "#aaa", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Reading Note</div>
          <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
            <input value={notePage} onChange={e => setNotePage(e.target.value)}
              placeholder="pg"
              style={{ width: 44, fontSize: 14, border: "none", outline: "none", background: "none", color: "#e8318a", flexShrink: 0 }} />
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3}
              placeholder="A note, thought, or observation..."
              style={{ flex: 1, fontSize: 14, border: "none", outline: "none", background: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.6 }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveNote(); } }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 8 }}>
            {savedNote && <span style={{ fontSize: 12, color: "#e8318a" }}>saved!</span>}
            <button onClick={saveNote} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 13, cursor: "pointer" }}>Save note</button>
          </div>
        </div>
        {(book.readingNotes || []).length > 0 && (
          <div style={{ borderTop: "1px solid #f0f0f0" }}>
            {[...(book.readingNotes || [])].slice(-3).reverse().map((n, i, arr) => (
              <div key={i} style={{ padding: "10px 20px", borderBottom: i === arr.length - 1 ? "none" : "0.5px solid #f5f5f5", background: "#f9f9f9" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                  {n.page && <span style={{ fontSize: 12, color: "#e8318a", flexShrink: 0 }}>{n.page}</span>}
                  <span style={{ fontSize: 13, color: "#0000ee", lineHeight: 1.5 }}>{n.text}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add rumination */}
      <div style={cardStyle}>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 13, color: "#aaa", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Rumination</div>
          <textarea ref={rumRef} value={rumText} onChange={e => setRumText(e.target.value)} rows={4}
            placeholder="A thought, reflection, connection..."
            style={{ width: "100%", fontSize: 14, border: "none", outline: "none", background: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.7, boxSizing: "border-box" }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveRumination(); } }} />
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 8 }}>
            {savedRum && <span style={{ fontSize: 12, color: "#e8318a" }}>saved!</span>}
            <button onClick={saveRumination} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 13, cursor: "pointer" }}>Save</button>
          </div>
        </div>

        {/* Recent ruminations */}
        {ruminations.length > 0 && (
          <div style={{ borderTop: "1px solid #f0f0f0" }}>
            {ruminations.slice(0, 3).map((rum, i) => (
              <div key={rum.id} style={{ padding: "12px 20px", borderBottom: i === Math.min(ruminations.length, 3) - 1 ? "none" : "0.5px solid #f5f5f5", background: "#f9f9f9" }}>
                <div style={{ fontSize: 13, color: "#444", lineHeight: 1.6 }}>{rum.text}</div>
                <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>
                  {rum.createdAt?.toDate ? rum.createdAt.toDate().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

export default function Home({ userId, onSelect }) {
  const [books, setBooks] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [focusedBook, setFocusedBook] = useState(null);

  useEffect(() => {
    let b = false, a = false;
    const u1 = onSnapshot(query(collection(db, "users", userId, "books"), orderBy("createdAt", "desc")),
      snap => { setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() }))); b = true; if (a) setLoading(false); });
    const u2 = onSnapshot(query(collection(db, "users", userId, "articles"), orderBy("createdAt", "desc")),
      snap => { setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() }))); a = true; if (b) setLoading(false); });
    return () => { u1(); u2(); };
  }, [userId]);

  const currentlyReading = books.filter(b => b.currentlyReading);

  if (focusedBook) {
    const liveBook = books.find(b => b.id === focusedBook.id) || focusedBook;
    return <BookFocus book={liveBook} userId={userId} onBack={() => setFocusedBook(null)} onViewDetail={onSelect} />;
  }

  const cardStyle = { background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden", marginBottom: 10 };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 60px" }}>
      {loading && <p style={{ color: "#aaa", fontSize: 15, padding: "20px 0" }}>loading...</p>}

      {!loading && currentlyReading.length === 0 && (
        <div style={{ ...cardStyle, padding: "32px 24px", textAlign: "center" }}>
          <p style={{ color: "#aaa", fontSize: 15, margin: 0 }}>Nothing currently reading — log a book to get started.</p>
        </div>
      )}

      {currentlyReading.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, color: "#444", fontWeight: 500, marginBottom: 12 }}>Currently Reading</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {currentlyReading.map(book => (
              <div key={book.id} onClick={() => setFocusedBook(book)}
                style={{ width: 120, cursor: "pointer", flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                {book.coverUrl
                  ? <img src={book.coverUrl} alt={book.title} style={{ width: 120, height: 172, objectFit: "cover", border: "1px solid #ddd", borderRadius: 6, display: "block", marginBottom: 8 }} />
                  : <div style={{ width: 120, height: 172, background: "#e8e8e8", border: "1px solid #ddd", borderRadius: 6, marginBottom: 8 }} />}
                <div style={{ fontFamily: "Georgia, serif", fontSize: 13, color: "#1a1a1a", lineHeight: 1.3, marginBottom: 3 }}>{book.title}</div>
                <div style={{ fontSize: 12, color: "#888" }}>{book.author}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && <ActivityFeed userId={userId} books={books} articles={articles} />}
    </div>
  );
}

const ghostBtn = { background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13, padding: "4px 0" };

function ActivityFeed({ userId, books, articles }) {
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "users", userId, "activity"), orderBy("createdAt", "desc")),
      snap => setActivity(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 40))
    );
  }, [userId]);

  const recentBooks = books.filter(b => !b.currentlyReading).slice(0, 4);
  const recentArticles = articles.slice(0, 3);

  if (activity.length === 0) {
    // Fallback — show recent books/articles
    if (recentBooks.length === 0 && recentArticles.length === 0) return null;
    return (
      <div style={{ marginTop: 10 }}>
        {recentBooks.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: "#aaa", fontWeight: 500, marginBottom: 8 }}>Recently read</div>
            <div style={{ background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden" }}>
              {recentBooks.map((book, i) => (
                <div key={book.id} style={{ padding: "11px 16px", borderBottom: i === recentBooks.length - 1 ? "none" : "0.5px solid #f0f0f0", fontSize: 14 }}>
                  <span style={{ fontFamily: "Georgia, serif", color: "#1a1a1a" }}>{book.title}</span>
                  {book.author && <span style={{ color: "#aaa", fontSize: 13 }}> · {book.author}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const today = new Date();
  const todayStr = today.toDateString();
  const yesterdayStr = new Date(today - 86400000).toDateString();

  const getDateLabel = (ts) => {
    if (!ts?.toDate) return null;
    const d = ts.toDate();
    const ds = d.toDateString();
    if (ds === todayStr) return "Earlier today";
    if (ds === yesterdayStr) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  };

  // Group by day
  const groups = [];
  const seen = {};
  activity.forEach(entry => {
    const label = getDateLabel(entry.createdAt);
    if (!label) return;
    if (!seen[label]) { seen[label] = true; groups.push({ label, entries: [] }); }
    groups[groups.length - 1].entries.push(entry);
  });

  // Summarise each group into concise lines
  const summarise = (entries) => {
    const byTitle = {};
    entries.forEach(e => {
      const title = e.bookTitle || e.articleTitle || "Unknown";
      const id = e.bookId || e.articleId;
      const isArticle = !!e.articleId;
      if (!byTitle[title]) byTitle[title] = { title, id, isArticle, actions: [] };
      byTitle[title].actions.push(e.text || e.type || "");
    });

    // Also group standalone actions
    const lines = Object.values(byTitle).map(item => {
      const actions = [...new Set(item.actions)];
      const actionStr = actions.map(a => {
        if (a.includes("quote")) return "added a quote";
        if (a.includes("rumination")) return "added a rumination";
        if (a.includes("note")) return "added a reading note";
        if (a.includes("shelf")) return "added to shelf";
        if (a.includes("tag")) return "added a tag";
        if (a.includes("currently reading")) return "started reading";
        if (a.includes("Finished") || a.includes("finished")) return "finished reading";
        if (a.includes("Logged") || a.includes("logged")) return "logged";
        return a;
      }).join(", ");
      return { title: item.title, id: item.id, isArticle: item.isArticle, actionStr };
    });
    return lines;
  };

  return (
    <div style={{ marginTop: 10 }}>
      {groups.map(({ label, entries }) => {
        const lines = summarise(entries);
        return (
          <div key={label} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: "#aaa", fontWeight: 500, marginBottom: 8 }}>{label}</div>
            <div style={{ background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden" }}>
              {lines.map((line, i) => (
                <div key={i} style={{ padding: "11px 16px", borderBottom: i === lines.length - 1 ? "none" : "0.5px solid #f0f0f0", fontSize: 14, color: "#444", lineHeight: 1.5 }}>
                  {line.actionStr} <span style={{ fontFamily: line.isArticle ? "inherit" : "Georgia, serif", color: "#1a1a1a" }}>
                    {line.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
