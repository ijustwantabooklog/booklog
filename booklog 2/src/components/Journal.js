import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export default function Journal({ userId, onOpenSession, onViewDetail }) {
  const [books, setBooks] = useState([]);
  const [articles, setArticles] = useState([]);
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

  const getTitle = (e) => e.isChapter && e.chapterTitle
    ? `${e.chapterTitle} [ch. of ${e.title}]`
    : e.title;

  const usefulLabel = (u) => {
    if (u === true) return " — [useful]";
    if (u === false) return " — [not useful]";
    return "";
  };

  return (
    <div className="wrap">
      {loading && <p className="mono">loading...</p>}
      {!loading && groups.length === 0 && (
        <p style={{ fontStyle: "italic", color: "#555" }}>Nothing logged yet. Click [+ new entry] to start.</p>
      )}

      {groups.map(({ label, entries }) => (
        <div key={label} style={{ marginBottom: 20 }}>
          <div className="day-head">
            {label}
            <span className="mono" style={{ fontWeight: "normal", color: "#888", marginLeft: 10, fontSize: 12 }}>
              {(() => {
                const bCount = entries.filter(e => e.col === "books").length;
                const aCount = entries.filter(e => e.col === "articles").length;
                const parts = [];
                if (bCount > 0) parts.push(`${bCount} book${bCount > 1 ? "s" : ""}`);
                if (aCount > 0) parts.push(`${aCount} article${aCount > 1 ? "s" : ""}`);
                return parts.join(", ");
              })()}
            </span>
          </div>
          {entries.map(entry => (
            <div key={entry.id}>
              <div style={{ padding: "6px 0 4px", borderBottom: "1px solid #eee" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span className="mono" style={{ cursor: "pointer", userSelect: "none", flexShrink: 0 }}
                    onClick={() => setExpanded(p => ({ ...p, [entry.id]: !p[entry.id] }))}>
                    {expanded[entry.id] ? "▼" : "▶"}
                  </span>
                  <a onClick={() => onOpenSession(entry.id, entry.col)}
                    style={{ fontStyle: entry.col === "books" ? "italic" : "normal", fontSize: 17, lineHeight: 1.3 }}>
                    {entry.col === "articles" ? `"${getTitle(entry)}"` : getTitle(entry)}
                  </a>
                </div>
                <div style={{ paddingLeft: 18, marginTop: 2, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="mono" style={{ fontSize: 13, color: "#555" }}>
                    {entry.author}
                    {entry.col === "articles" && <span style={{ color: "#888" }}> — article</span>}
                    {entry.useful === true && <span style={{ color: "green" }}> — [useful]</span>}
                    {entry.useful === false && <span style={{ color: "#c00" }}> — [not useful]</span>}
                  </span>
                  <a className="mono" style={{ fontSize: 12, flexShrink: 0, marginLeft: 12 }}
                    onClick={() => onViewDetail(entry.id, entry.col)}>[full log]</a>
                </div>
              </div>

              {expanded[entry.id] && (
                <EntryNotes userId={userId} entryId={entry.id} entryCol={entry.col} />
              )}
            </div>
          ))}
        </div>
      ))}
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
    <div className="mono" style={{ paddingLeft: 20, fontSize: 12, color: "#888", padding: "3px 0 3px 20px" }}>no notes yet</div>
  );

  return (
    <div style={{ paddingLeft: 20, borderLeft: "2px solid #eee", marginLeft: 6, marginBottom: 4 }}>
      {notes.map(note => (
        <div key={note.id} style={{ padding: "2px 0", borderBottom: "1px solid #f5f5f5", display: "flex", gap: 8 }}>
          <span className="mono" style={{ color: "#888", minWidth: 36, textAlign: "right", fontSize: 12 }}>{note.page || "—"}</span>
          <span style={{ fontStyle: note.type === "quote" ? "italic" : "normal", fontSize: 15 }}>{note.text}</span>
        </div>
      ))}
    </div>
  );
}
