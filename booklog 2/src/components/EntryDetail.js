import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, deleteDoc, collection, query, orderBy } from "firebase/firestore";

export default function EntryDetail({ entryId, entryType, userId, onBack, onOpenSession }) {
  const [entry, setEntry] = useState(null);
  const [notes, setNotes] = useState([]);
  const [showNotUseful, setShowNotUseful] = useState(false);

  useEffect(() => {
    const u1 = onSnapshot(doc(db, "users", userId, entryType, entryId), d => {
      if (d.exists()) setEntry({ id: d.id, ...d.data() });
    });
    const u2 = onSnapshot(
      query(collection(db, "users", userId, entryType, entryId, "notes"), orderBy("createdAt", "asc")),
      snap => setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { u1(); u2(); };
  }, [entryId, entryType, userId]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this entry and all its notes?")) return;
    await deleteDoc(doc(db, "users", userId, entryType, entryId));
    onBack();
  };

  if (!entry) return <div style={{ padding: 20 }}>loading...</div>;

  const usefulNotes = notes.filter(n => n.useful !== false);
  const notUsefulNotes = notes.filter(n => n.useful === false);
  const title = entry.isChapter && entry.chapterTitle
    ? `${entry.chapterTitle} (${entry.chapterNumber || "chapter"} of ${entry.title})`
    : entry.title;

  const renderNotes = (list) => (
    <table style={{ marginTop: 8 }}>
      <thead>
        <tr>
          <th style={{ width: 50 }}>Pg</th>
          <th style={{ width: 50 }}>Type</th>
          <th>Content</th>
          <th style={{ width: 60 }}>Useful</th>
        </tr>
      </thead>
      <tbody>
        {list.map(note => (
          <tr key={note.id} style={{ background: note.useful === false ? "#fff8f8" : "#fff" }}>
            <td style={{ color: "#e8318a", fontFamily: "Arial, sans-serif", fontSize: 13 }}>{note.page || "—"}</td>
            <td style={{ fontFamily: "Arial, sans-serif", fontSize: 11, color: "#666" }}>{note.type}</td>
            <td style={{ fontFamily: note.type === "quote" ? "Georgia, serif" : "Arial, sans-serif", fontSize: 14 }}>{note.text}</td>
            <td style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: note.useful === true ? "green" : note.useful === false ? "red" : "#999" }}>
              {note.useful === true ? "✓" : note.useful === false ? "✗" : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="page-wrap">
      <div style={{ marginBottom: 12 }}>
        <span className="link" onClick={onBack} style={{ fontFamily: "Arial, sans-serif", fontSize: 13 }}>← back</span>
      </div>

      <div style={{ borderBottom: "1px solid #ccc", paddingBottom: 10, marginBottom: 12 }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 20 }}>{title}</h1>
        <div style={{ fontFamily: "Arial, sans-serif", fontSize: 13, color: "#555", marginTop: 4 }}>
          {entry.author}
          {entryType === "articles" && entry.publication && ` · ${entry.publication}`}
          {(entry.year || entry.datePublished) && ` · ${entry.year || entry.datePublished}`}
        </div>
        {entry.url && <div style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: "#00e", marginTop: 4 }}>
          <a href={entry.url.startsWith("http") ? entry.url : `https://doi.org/${entry.url}`} target="_blank" rel="noopener noreferrer">{entry.url}</a>
        </div>}
        <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
          <button onClick={() => onOpenSession(entryId, entryType)} style={{ width: "auto", padding: "3px 12px" }}>Open reading session →</button>
          <button onClick={handleDelete} style={{ width: "auto", padding: "3px 12px", color: "#cc0000", borderColor: "#cc0000" }}>Delete entry</button>
        </div>
      </div>

      {notes.length === 0 && <p style={{ color: "#666", fontStyle: "italic" }}>No notes yet.</p>}

      {usefulNotes.length > 0 && (
        <div>
          <div className="section-head">Notes ({usefulNotes.length})</div>
          {renderNotes(usefulNotes)}
        </div>
      )}

      {notUsefulNotes.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="section-head" style={{ cursor: "pointer" }} onClick={() => setShowNotUseful(p => !p)}>
            Not useful ({notUsefulNotes.length}) {showNotUseful ? "▼" : "▶"}
          </div>
          {showNotUseful && renderNotes(notUsefulNotes)}
        </div>
      )}
    </div>
  );
}
