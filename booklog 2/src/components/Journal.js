import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, collectionGroup } from "firebase/firestore";

export default function Journal({ userId, onOpenSession, onViewDetail }) {
  const [books, setBooks] = useState([]);
  const [articles, setArticles] = useState([]);
  const [noteCounts, setNoteCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    let b = false, a = false;
    const u1 = onSnapshot(query(collection(db, "users", userId, "books"), orderBy("updatedAt", "desc")),
      snap => { setBooks(snap.docs.map(d => ({ id: d.id, col: "books", ...d.data() }))); b = true; if (a) setLoading(false); });
    const u2 = onSnapshot(query(collection(db, "users", userId, "articles"), orderBy("updatedAt", "desc")),
      snap => { setArticles(snap.docs.map(d => ({ id: d.id, col: "articles", ...d.data() }))); a = true; if (b) setLoading(false); });
    return () => { u1(); u2(); };
  }, [userId]);

  // Load note counts whenever entries change
  useEffect(() => {
    const allEntries = [...books, ...articles];
    if (allEntries.length === 0) return;
    const unsubs = allEntries.map(entry => {
      const unsub = onSnapshot(
        query(collection(db, "users", userId, entry.col, entry.id, "notes"), orderBy("createdAt", "asc")),
        snap => setNoteCounts(prev => ({ ...prev, [entry.id]: snap.size }))
      );
      return unsub;
    });
    return () => unsubs.forEach(u => u());
  }, [books.length, articles.length, userId]);

  const all = [...books, ...articles].sort((a, b) => {
    const ta = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(0);
    const tb = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(0);
    return tb - ta;
  });

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const getLabel = (ts) => {
    if (!ts?.toDate) return null;
    const d = ts.toDate();
    const ds = d.toDateString();
    if (ds === today) return "Today — " + d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    if (ds === yesterday) return "Yesterday — " + d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  const groups = [];
  const seen = {};
  all.forEach(entry => {
    const label = getLabel(entry.updatedAt);
    if (!label) return;
    if (!seen[label]) { seen[label] = true; groups.push({ label, entries: [] }); }
    groups[groups.length - 1].entries.push(entry);
  });

  const getTitle = (e) => e.isChapter && e.chapterTitle ? `${e.chapterTitle} [ch. of ${e.title}]` : e.title;

  // This month stats
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const monthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const monthEntries = all.filter(e => {
    const d = e.updatedAt?.toDate ? e.updatedAt.toDate() : null;
    return d && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const monthBooks = monthEntries.filter(e => e.col === "books").length;
  const monthArticles = monthEntries.filter(e => e.col === "articles").length;
  const monthNotes = monthEntries.reduce((sum, e) => sum + (noteCounts[e.id] || 0), 0);

  return (
    <div className="wrap">

      {/* This month stats */}
      {!loading && (monthBooks > 0 || monthArticles > 0) && (
        <div style={{ border: "1px solid #ccc", padding: "8px 12px", marginBottom: 20, background: "#fafafa", fontFamily: "Arial, Helvetica, sans-serif", fontSize: 13 }}>
          <span style={{ fontWeight: "bold", marginRight: 12 }}>{monthName}</span>
          {monthBooks > 0 && <span style={{ marginRight: 12 }}>{monthBooks} {monthBooks === 1 ? "book" : "books"}</span>}
          {monthArticles > 0 && <span style={{ marginRight: 12 }}>{monthArticles} {monthArticles === 1 ? "article" : "articles"}</span>}
          {monthNotes > 0 && <span style={{ color: "#555" }}>{monthNotes} {monthNotes === 1 ? "note" : "notes"} taken</span>}
        </div>
      )}

      {loading && <p className="mono">loading...</p>}
      {!loading && groups.length === 0 && (
        <p style={{ fontStyle: "italic", color: "#555" }}>Nothing logged yet. Click [+ new entry] to start.</p>
      )}

      {groups.map(({ label, entries }) => {
        const isToday = label.startsWith("Today");
        const bCount = entries.filter(e => e.col === "books").length;
        const aCount = entries.filter(e => e.col === "articles").length;
        const totalNotes = entries.reduce((sum, e) => sum + (noteCounts[e.id] || 0), 0);
        const parts = [];
        if (bCount > 0) parts.push(`${bCount} ${bCount === 1 ? "book" : "books"}`);
        if (aCount > 0) parts.push(`${aCount} ${aCount === 1 ? "article" : "articles"}`);
        if (totalNotes > 0) parts.push(`${totalNotes} ${totalNotes === 1 ? "note" : "notes"}`);

        return (
          <div key={label} style={{ marginBottom: 24, ...(isToday ? { background: "#fff9a0", border: "1px solid #000", padding: "8px 10px" } : {}) }}>
            <div className="day-head" style={{ fontSize: isToday ? 16 : 13, borderBottom: isToday ? "2px solid #000" : "1px dotted #999", marginBottom: isToday ? 8 : 4 }}>
              {label}
              <span style={{ fontWeight: "normal", color: isToday ? "#555" : "#aaa", marginLeft: 10, fontSize: 12 }}>
                {parts.join(", ")}
              </span>
            </div>

            {entries.map(entry => {
              const noteCount = noteCounts[entry.id] || 0;
              return (
                <div key={entry.id}>
                  <div style={{ padding: "6px 0 4px", borderBottom: "1px solid #eee" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <a onClick={() => onOpenSession(entry.id, entry.col)}
                        style={{ fontStyle: entry.col === "books" ? "italic" : "normal", fontSize: 17, lineHeight: 1.3 }}>
                        {entry.col === "articles" ? `"${getTitle(entry)}"` : getTitle(entry)}
                      </a>
                      <span className={entry.col === "books" ? "stamp stamp-book" : "stamp stamp-article"}>
                        {entry.col === "books" ? "book" : "article"}
                      </span>
                    </div>
                    <div style={{ marginTop: 2, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 13, color: "#555" }}>
                        {entry.author}
                        {noteCount > 0 && <span style={{ color: "#888" }}> — {noteCount} {noteCount === 1 ? "note" : "notes"}</span>}
                        {entry.useful === true && <span style={{ color: "green" }}> — [useful]</span>}
                        {entry.useful === false && <span style={{ color: "#c00" }}> — [not useful]</span>}
                        {entry.updatedAt?.toDate && (
                          <span style={{ color: "#aaa" }}> — {entry.updatedAt.toDate().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()}</span>
                        )}
                      </span>
                      <span style={{ display: "flex", gap: 10, flexShrink: 0, marginLeft: 12 }}>
                        <a style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 12 }}
                          onClick={() => onViewDetail(entry.id, entry.col)}>[full log]</a>
                        <a style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 12 }}
                          onClick={() => setExpanded(p => ({ ...p, [entry.id]: !p[entry.id] }))}>
                          {expanded[entry.id] ? "[−]" : "[+]"}
                        </a>
                      </span>
                    </div>
                  </div>

                  {expanded[entry.id] && (
                    <EntryNotes userId={userId} entryId={entry.id} entryCol={entry.col} />
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function EntryNotes({ userId, entryId, entryCol }) {
  const [notes, setNotes] = useState([]);
  useEffect(() => {
    return onSnapshot(
      query(collection(db, "users", userId, entryCol, entryId, "notes"), orderBy("createdAt", "asc")),
      snap => setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [userId, entryId, entryCol]);

  if (notes.length === 0) return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 12, color: "#888", padding: "4px 0 4px 12px" }}>no notes yet</div>
  );

  return (
    <div style={{ borderLeft: "2px solid #ccc", marginLeft: 6, marginBottom: 4 }}>
      {notes.filter(n => n.type !== "general").map(note => (
        <div key={note.id} style={{ padding: "3px 8px", borderBottom: "1px solid #f5f5f5", display: "flex", gap: 10 }}>
          <span style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#aaa", minWidth: 32, textAlign: "right", fontSize: 12, flexShrink: 0 }}>{note.page || "—"}</span>
          <span style={{ fontStyle: note.type === "quote" ? "italic" : "normal", fontSize: 14 }}>{note.text}</span>
        </div>
      ))}
      {notes.filter(n => n.type === "general").map(note => (
        <div key={note.id} style={{ padding: "3px 8px", borderBottom: "1px solid #f5f5f5", fontFamily: "Arial, Helvetica, sans-serif", fontSize: 13, color: "#555", fontStyle: "italic" }}>
          {note.text}
        </div>
      ))}
    </div>
  );
}
