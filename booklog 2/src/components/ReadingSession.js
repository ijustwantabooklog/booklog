import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, collection, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from "firebase/firestore";

export default function ReadingSession({ entryId, entryType, userId, onBack, onViewDetail }) {
  const [entry, setEntry] = useState(null);
  const [notes, setNotes] = useState([]);
  const [page, setPage] = useState("");
  const [text, setText] = useState("");
  const [noteType, setNoteType] = useState("quote");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editPage, setEditPage] = useState("");
  const textRef = useRef(null);
  const pageRef = useRef(null);

  useEffect(() => {
    const col = entryType === "books" ? "books" : "articles";
    const u1 = onSnapshot(doc(db, "users", userId, col, entryId), d => {
      if (d.exists()) setEntry({ id: d.id, ...d.data() });
    });
    const u2 = onSnapshot(
      query(collection(db, "users", userId, col, entryId, "notes"), orderBy("createdAt", "asc")),
      snap => setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { u1(); u2(); };
  }, [entryId, entryType, userId]);

  useEffect(() => {
    pageRef.current?.focus();
  }, []);

  const save = async () => {
    if (!text.trim()) return;
    const col = entryType === "books" ? "books" : "articles";
    await addDoc(collection(db, "users", userId, col, entryId, "notes"), {
      page: page.trim(),
      text: text.trim(),
      type: noteType,
      useful: null,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "users", userId, col, entryId), { updatedAt: serverTimestamp() });
    setText(""); setPage("");
    pageRef.current?.focus();
  };

  const markUseful = async (noteId, value) => {
    const col = entryType === "books" ? "books" : "articles";
    await updateDoc(doc(db, "users", userId, col, entryId, "notes", noteId), { useful: value });
  };

  const deleteNote = async (noteId) => {
    const col = entryType === "books" ? "books" : "articles";
    await deleteDoc(doc(db, "users", userId, col, entryId, "notes", noteId));
  };

  const saveEdit = async (noteId) => {
    const col = entryType === "books" ? "books" : "articles";
    await updateDoc(doc(db, "users", userId, col, entryId, "notes", noteId), { text: editText, page: editPage });
    setEditingId(null);
  };

  if (!entry) return <div style={{ padding: 20 }}>loading...</div>;

  const title = entry.isChapter && entry.chapterTitle
    ? `${entry.chapterTitle} (${entry.chapterNumber || "chapter"} of ${entry.title})`
    : entry.title;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "12px 16px 60px" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #ccc", paddingBottom: 8, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <span className="link" onClick={onBack} style={{ fontFamily: "Arial, sans-serif", fontSize: 13 }}>← back</span>
          <span style={{ margin: "0 8px", color: "#ccc" }}>|</span>
          <span style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: "bold" }}>{title}</span>
          {entry.author && <span style={{ fontFamily: "Arial, sans-serif", fontSize: 13, color: "#555", marginLeft: 8 }}>{entry.author}</span>}
        </div>
        <span className="link" style={{ fontFamily: "Arial, sans-serif", fontSize: 13 }} onClick={() => onViewDetail(entryId, entryType)}>
          view full log →
        </span>
      </div>

      {/* Input row */}
      <div style={{ display: "flex", gap: 0, marginBottom: 4, alignItems: "stretch" }}>
        {/* Type toggle */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0, marginRight: 6, flexShrink: 0 }}>
          {[["quote","Q"],["note","N"]].map(([val, label]) => (
            <button key={val} onClick={() => setNoteType(val)}
              style={{ padding: "2px 8px", fontSize: 12, background: noteType === val ? "#000" : "#f0f0f0", color: noteType === val ? "#fff" : "#000", border: "1px solid #999", borderBottom: val === "quote" ? "none" : "1px solid #999", fontFamily: "Arial, sans-serif", cursor: "pointer" }}>
              {label}
            </button>
          ))}
        </div>
        {/* Page input */}
        <input ref={pageRef} value={page} onChange={e => setPage(e.target.value)} placeholder="pg"
          style={{ width: 52, flexShrink: 0, borderRight: "none", textAlign: "center", color: "#e8318a" }}
          onKeyDown={e => { if (e.key === "Tab") { e.preventDefault(); textRef.current?.focus(); } }} />
        {/* Text input */}
        <textarea ref={textRef} value={text} onChange={e => setText(e.target.value)} rows={3}
          placeholder={noteType === "quote" ? "Type or paste quote..." : "Write a note..."}
          style={{ flex: 1, resize: "vertical", borderLeft: "none" }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); } }} />
        <button onClick={save} className="primary"
          style={{ marginLeft: 6, alignSelf: "flex-end", padding: "4px 12px", whiteSpace: "nowrap", width: "auto" }}>
          Save
        </button>
      </div>
      <div style={{ fontFamily: "Arial, sans-serif", fontSize: 11, color: "#999", marginBottom: 16 }}>
        Tab to move from page → text. Enter to save. Shift+Enter for new line.
      </div>

      {/* Notes table */}
      {notes.length > 0 && (
        <table>
          <thead>
            <tr>
              <th style={{ width: 50 }}>Pg</th>
              <th style={{ width: 40 }}>Type</th>
              <th>Content</th>
              <th style={{ width: 120, textAlign: "right" }}>Useful?</th>
            </tr>
          </thead>
          <tbody>
            {notes.map(note => (
              <tr key={note.id} style={{ background: note.useful === false ? "#fff8f8" : note.useful === true ? "#f8fff8" : "#fff" }}>
                <td style={{ color: "#e8318a", fontFamily: "Arial, sans-serif", fontSize: 13 }}>{note.page || "—"}</td>
                <td style={{ fontFamily: "Arial, sans-serif", fontSize: 11, color: "#666" }}>{note.type}</td>
                <td>
                  {editingId === note.id ? (
                    <div style={{ display: "flex", gap: 4, flexDirection: "column" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <input value={editPage} onChange={e => setEditPage(e.target.value)} style={{ width: 52 }} placeholder="pg" />
                        <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2} style={{ flex: 1, resize: "vertical" }} />
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => saveEdit(note.id)} style={{ width: "auto", padding: "2px 10px" }}>save</button>
                        <button onClick={() => setEditingId(null)} style={{ width: "auto", padding: "2px 10px" }}>cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontFamily: note.type === "quote" ? "Georgia, serif" : "Arial, sans-serif", fontSize: 14 }}>{note.text}</span>
                      <span className="link" style={{ marginLeft: 8, fontSize: 12 }} onClick={() => { setEditingId(note.id); setEditText(note.text); setEditPage(note.page || ""); }}>edit</span>
                      <span style={{ marginLeft: 6, fontSize: 12, color: "#aaa", cursor: "pointer" }} onClick={() => deleteNote(note.id)}>×</span>
                    </div>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    <button onClick={() => markUseful(note.id, true)}
                      style={{ width: "auto", padding: "1px 8px", fontSize: 12, background: note.useful === true ? "#006600" : "#f0f0f0", color: note.useful === true ? "#fff" : "#000", border: "1px solid #999" }}>
                      ✓ useful
                    </button>
                    <button onClick={() => markUseful(note.id, false)}
                      style={{ width: "auto", padding: "1px 8px", fontSize: 12, background: note.useful === false ? "#cc0000" : "#f0f0f0", color: note.useful === false ? "#fff" : "#000", border: "1px solid #999" }}>
                      ✗
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {notes.length === 0 && (
        <p style={{ color: "#666", fontStyle: "italic", marginTop: 20 }}>No notes yet. Start typing above.</p>
      )}
    </div>
  );
}
