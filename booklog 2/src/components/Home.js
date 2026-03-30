import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { addAnnotation } from "../annotationHelpers";
import { logActivity } from "../activityLogger";

function StarDisplay({ value, size = 13 }) {
  return (
    <span style={{ fontSize: size, color: "#555" }}>
      {[1,2,3,4,5].map(s => s <= value ? "★" : "☆").join("")}
    </span>
  );
}

function BookFocus({ book, userId, onBack, onViewDetail }) {
  const [newType, setNewType] = useState("quote");
  const [newText, setNewText] = useState("");
  const [newPage, setNewPage] = useState("");
  const [newQuoteNote, setNewQuoteNote] = useState("");
  const [showQuoteNote, setShowQuoteNote] = useState(false);
  const [newRum, setNewRum] = useState("");
  const [annotations, setAnnotations] = useState([]);
  const [ruminations, setRuminations] = useState([]);
  const [saved, setSaved] = useState(false);
  const [savedRum, setSavedRum] = useState(false);
  const textRef = useRef(null);

  useEffect(() => {
    const u1 = onSnapshot(
      query(collection(db, "users", userId, "books", book.id, "annotations"), orderBy("createdAt", "desc")),
      snap => setAnnotations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const u2 = onSnapshot(
      query(collection(db, "users", userId, "books", book.id, "ruminations"), orderBy("createdAt", "desc")),
      snap => setRuminations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { u1(); u2(); };
  }, [book.id, userId]);

  useEffect(() => {
    setTimeout(() => textRef.current?.focus(), 100);
  }, []);

  const saveAnnotation = async () => {
    if (!newText.trim()) return;
    await addAnnotation(userId, book.id, "books", {
      type: newType,
      text: newText.trim(),
      page: newPage.trim(),
      quoteNote: newType === "quote" ? newQuoteNote.trim() : "",
      bookTitle: book.title,
    });
    setNewText(""); setNewPage(""); setNewQuoteNote(""); setShowQuoteNote(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); textRef.current?.focus(); }, 1500);
  };

  const saveRumination = async () => {
    if (!newRum.trim()) return;
    await addDoc(collection(db, "users", userId, "books", book.id, "ruminations"), {
      text: newRum.trim(), createdAt: serverTimestamp(),
    });
    await logActivity(userId, "rumination", { text: "Added a rumination to", bookTitle: book.title, bookId: book.id });
    setNewRum("");
    setSavedRum(true);
    setTimeout(() => setSavedRum(false), 1500);
  };

  const markAsRead = async () => {
    const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    await updateDoc(doc(db, "users", userId, "books", book.id), { currentlyReading: false, dateRead: today });
    await logActivity(userId, "finished", { text: "Finished reading", bookTitle: book.title, bookId: book.id });
    onBack();
  };

  const recentAnnotations = annotations.slice(0, 3);
  const recentRuminations = ruminations.slice(0, 2);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#f4f4f4", zIndex: 1000, overflowY: "auto" }}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "24px 32px 60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 0 20px" }}>
          <div style={{ display: "flex", gap: 16 }}>
            <button onClick={markAsRead} style={{ ...ghostBtn, color: "#aaa" }}>mark as read</button>
            <button onClick={() => onViewDetail(book.id)} style={ghostBtn}>view full log</button>
          </div>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "#aaa", fontSize: 24, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* Book header */}
        <div style={{ background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, padding: "20px 24px", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            {book.coverUrl
              ? <img src={book.coverUrl} alt={book.title} style={{ width: 60, height: 86, objectFit: "cover", border: "1px solid #ddd", borderRadius: 2, flexShrink: 0 }} />
              : <div style={{ width: 60, height: 86, background: "#e8e8e8", border: "1px solid #ddd", borderRadius: 2, flexShrink: 0 }} />}
            <div>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "#1a1a1a", marginBottom: 4, lineHeight: 1.2 }}>{book.title}</div>
              <div style={{ fontSize: 13, color: "#888" }}>{book.author}{book.translator ? `, trans. ${book.translator}` : ""}</div>
            </div>
          </div>
        </div>

        {/* Annotation input */}
        <div style={{ background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, padding: "16px 20px", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {["quote", "note"].map(t => (
              <button key={t} onClick={() => setNewType(t)}
                style={{ background: newType === t ? "#e8318a" : "none", color: newType === t ? "#fff" : "#aaa", border: "1px solid", borderColor: newType === t ? "#e8318a" : "#e0e0e0", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer", textTransform: "capitalize" }}>
                {t}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
            <input value={newPage} onChange={e => setNewPage(e.target.value)} placeholder="pg"
              style={{ width: 40, fontSize: 14, border: "none", outline: "none", color: "#e8318a", background: "none", flexShrink: 0 }}
              onKeyDown={e => { if (e.key === "Tab") { e.preventDefault(); textRef.current?.focus(); } }} />
            <textarea ref={textRef} value={newText} onChange={e => setNewText(e.target.value)} rows={3}
              placeholder={newType === "quote" ? "Paste or type a quote..." : "A note or observation..."}
              style={{ flex: 1, fontSize: 14, border: "none", outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.6, background: "none", color: newType === "note" ? "#0000ee" : "#333" }}
              onKeyDown={e => {
                if (e.key === "Tab" && newType === "quote") { e.preventDefault(); setShowQuoteNote(true); }
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveAnnotation(); }
              }} />
          </div>
          {newType === "quote" && showQuoteNote && (
            <input value={newQuoteNote} onChange={e => setNewQuoteNote(e.target.value)}
              placeholder="Note (optional)"
              style={{ width: "100%", fontSize: 13, border: "none", outline: "none", color: "#888", borderTop: "0.5px solid #f0f0f0", paddingTop: 8, background: "none", boxSizing: "border-box" }}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); saveAnnotation(); } }} />
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            {newType === "quote" && !showQuoteNote
              ? <button onClick={() => setShowQuoteNote(true)} style={{ background: "none", border: "none", color: "#ccc", fontSize: 12, cursor: "pointer", padding: 0 }}>+ add note</button>
              : <div />}
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {saved && <span style={{ fontSize: 12, color: "#e8318a" }}>saved!</span>}
              <button onClick={saveAnnotation} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 13, cursor: "pointer" }}>Save</button>
            </div>
          </div>
        </div>

        {/* Recent annotations */}
        {recentAnnotations.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
            {recentAnnotations.map((a, i) => (
              <div key={a.id} style={{ padding: "10px 20px", borderBottom: i === recentAnnotations.length - 1 ? "none" : "0.5px solid #f5f5f5", background: "#f9f9f9" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                  {a.page && <span style={{ fontSize: 11, color: "#e8318a", flexShrink: 0 }}>{a.page}</span>}
                  <span style={{ fontSize: 13, color: a.type === "note" ? "#0000ee" : "#444", lineHeight: 1.5 }}>{a.text}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rumination input */}
        <div style={{ background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, padding: "16px 20px", marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Rumination</div>
          <textarea value={newRum} onChange={e => setNewRum(e.target.value)} rows={3}
            placeholder="A thought, reflection, connection... (Enter to save)"
            style={{ width: "100%", fontSize: 14, border: "none", outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.7, background: "none", boxSizing: "border-box" }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveRumination(); } }} />
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 8 }}>
            {savedRum && <span style={{ fontSize: 12, color: "#e8318a" }}>saved!</span>}
            <button onClick={saveRumination} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 13, cursor: "pointer" }}>Save</button>
          </div>
        </div>

        {/* Recent ruminations */}
        {recentRuminations.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden" }}>
            {recentRuminations.map((r, i) => (
              <div key={r.id} style={{ padding: "10px 20px", borderBottom: i === recentRuminations.length - 1 ? "none" : "0.5px solid #f5f5f5", background: "#f9f9f9" }}>
                <p style={{ fontSize: 13, color: "#444", lineHeight: 1.6, margin: 0 }}>{r.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home({ userId, onSelect }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [focusedBook, setFocusedBook] = useState(null);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, "users", userId, "books"), orderBy("createdAt", "desc")),
      snap => { setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });
    const u2 = onSnapshot(query(collection(db, "users", userId, "activity"), orderBy("createdAt", "desc")),
      snap => setActivity(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 40)));
    return () => { u1(); u2(); };
  }, [userId]);

  const currentlyReading = books.filter(b => b.currentlyReading);

  if (focusedBook) {
    const liveBook = books.find(b => b.id === focusedBook.id) || focusedBook;
    return <BookFocus book={liveBook} userId={userId} onBack={() => setFocusedBook(null)} onViewDetail={onSelect} />;
  }

  const cardStyle = { background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden", marginBottom: 10 };

  // Activity feed grouped by day
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const getDateLabel = (ts) => {
    if (!ts?.toDate) return null;
    const d = ts.toDate();
    const ds = d.toDateString();
    if (ds === today) return "Earlier today";
    if (ds === yesterday) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  };

  const groups = [];
  const seen = {};
  activity.forEach(entry => {
    const label = getDateLabel(entry.createdAt);
    if (!label) return;
    if (!seen[label]) { seen[label] = true; groups.push({ label, entries: [] }); }
    groups[groups.length - 1].entries.push(entry);
  });

  // Summarise each group
  const summarise = (entries) => {
    const byTitle = {};
    entries.forEach(e => {
      const title = e.bookTitle || e.articleTitle || "";
      if (!title) return;
      const id = e.bookId || e.articleId;
      if (!byTitle[title]) byTitle[title] = { title, id, actions: [] };
      byTitle[title].actions.push(e.text || "");
    });
    return Object.values(byTitle).map(item => {
      const unique = [...new Set(item.actions)];
      const actionStr = unique.map(a => {
        if (a.includes("quote")) return "added a quote";
        if (a.includes("rumination")) return "added a rumination";
        if (a.includes("note")) return "added a reading note";
        if (a.includes("shelf")) return "added to a shelf";
        if (a.includes("tag")) return "added a tag";
        if (a.includes("currently reading") || a.includes("Marked as currently reading")) return "started reading";
        if (a.includes("Finished") || a.includes("finished")) return "finished reading";
        if (a.includes("Logged") || a.includes("logged")) return "logged";
        return a;
      }).join(", ");
      return { ...item, actionStr };
    });
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 32px 60px" }}>
      {loading && <p style={{ color: "#aaa", fontSize: 15, padding: "20px 0" }}>loading...</p>}

      {!loading && currentlyReading.length === 0 && (
        <div style={{ ...cardStyle, padding: "32px 24px", textAlign: "center", marginBottom: 16 }}>
          <p style={{ color: "#aaa", fontSize: 15, margin: 0 }}>Nothing currently reading.</p>
        </div>
      )}

      {currentlyReading.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>Currently Reading</div>
          {currentlyReading.map((book, i) => (
            <div key={book.id} onClick={() => setFocusedBook(book)}
              style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: "0.5px solid #f0f0f0", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
              {book.coverUrl
                ? <img src={book.coverUrl} alt={book.title} style={{ width: 36, height: 52, objectFit: "cover", border: "0.5px solid #e0e0e0", borderRadius: 2, flexShrink: 0 }} />
                : <div style={{ width: 36, height: 52, background: "#e8e8e8", border: "0.5px solid #e0e0e0", borderRadius: 2, flexShrink: 0 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 15, color: "#1a1a1a", marginBottom: 2 }}>{book.title}</div>
                <div style={{ fontSize: 12, color: "#888" }}>{book.author}</div>
              </div>
              <span style={{ fontSize: 13, color: "#ccc" }}>→</span>
            </div>
          ))}
        </div>
      )}

      {/* Activity feed */}
      {groups.length > 0 && groups.map(({ label, entries }) => {
        const lines = summarise(entries);
        if (lines.length === 0) return null;
        return (
          <div key={label} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>{label}</div>
            {lines.map((line, i) => (
              <div key={i} onClick={() => line.id && onSelect(line.id)}
                style={{ padding: "7px 0", borderBottom: "0.5px solid #f0f0f0", fontSize: 14, color: "#666", lineHeight: 1.5, cursor: line.id ? "pointer" : "default" }}
                onMouseEnter={e => { if (line.id) e.currentTarget.style.color = "#1a1a1a"; }}
                onMouseLeave={e => e.currentTarget.style.color = "#666"}>
                {line.actionStr} <span style={{ fontFamily: "Georgia, serif", color: "#1a1a1a" }}>{line.title}</span>
              </div>
            ))}
          </div>
        );
      })}

      {!loading && groups.length === 0 && books.filter(b => !b.currentlyReading).slice(0, 4).length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>Recently read</div>
          {books.filter(b => !b.currentlyReading).slice(0, 4).map((book, i) => (
            <div key={book.id} onClick={() => onSelect(book.id)}
              style={{ padding: "7px 0", borderBottom: "0.5px solid #f0f0f0", fontSize: 14, cursor: "pointer", color: "#666" }}
              onMouseEnter={e => e.currentTarget.style.color = "#1a1a1a"}
              onMouseLeave={e => e.currentTarget.style.color = "#666"}>
              <span style={{ fontFamily: "Georgia, serif", color: "#1a1a1a" }}>{book.title}</span>
              {book.author && <span style={{ color: "#aaa", fontSize: 13 }}> · {book.author}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ghostBtn = { background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13, padding: "4px 0" };
