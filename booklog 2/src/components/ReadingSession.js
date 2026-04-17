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
    const u1 = onSnapshot(doc(db, "users", userId, entryType, entryId), d => {
      if (d.exists()) setEntry({ id: d.id, ...d.data() });
    });
    const u2 = onSnapshot(
      query(collection(db, "users", userId, entryType, entryId, "notes"), orderBy("createdAt", "asc")),
      snap => setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { u1(); u2(); };
  }, [entryId, entryType, userId]);

  useEffect(() => { pageRef.current?.focus(); }, []);

  const save = async () => {
    if (!text.trim()) return;
    await addDoc(collection(db, "users", userId, entryType, entryId, "notes"), {
      page: page.trim(), text: text.trim(), type: noteType, createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "users", userId, entryType, entryId), { updatedAt: serverTimestamp() });
    setText(""); setPage("");
    pageRef.current?.focus();
  };

  const deleteNote = async (id) => {
    await deleteDoc(doc(db, "users", userId, entryType, entryId, "notes", id));
  };

  const saveEdit = async (id) => {
    await updateDoc(doc(db, "users", userId, entryType, entryId, "notes", id), { text: editText, page: editPage });
    setEditingId(null);
  };

  const setUseful = async (value) => {
    await updateDoc(doc(db, "users", userId, entryType, entryId), { useful: value, updatedAt: serverTimestamp() });
  };

  if (!entry) return <div className="wrap mono">loading...</div>;

  const title = entry.isChapter && entry.chapterTitle
    ? `${entry.chapterTitle} (${entry.chapterNumber || "ch."} of ${entry.title})`
    : entry.title;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 1000, overflowY: "auto" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "10px 14px 60px" }}>

        {/* Header */}
        <div style={{ borderBottom: "2px solid #000", paddingBottom: 6, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <span className="mono" style={{ cursor: "pointer" }} onClick={onBack}>← back</span>
            <span className="mono" style={{ margin: "0 8px", color: "#ccc" }}>|</span>
            <span style={{ fontStyle: "italic", fontSize: 20, fontWeight: "bold" }}>{title}</span>
            {entry.author && <span className="mono" style={{ color: "#555", marginLeft: 8 }}>{entry.author}</span>}
          </div>
          <span className="mono" style={{ cursor: "pointer", color: "#00c", textDecoration: "underline" }}
            onClick={() => onViewDetail(entryId, entryType)}>
            [full log]
          </span>
        </div>

        {/* Useful verdict */}
        <div className="mono" style={{ marginBottom: 10, fontSize: 13 }}>
          mark as:{" "}
          <span onClick={() => setUseful(true)}
            style={{ cursor: "pointer", color: entry.useful === true ? "green" : "#00c", textDecoration: "underline", marginRight: 10, fontWeight: entry.useful === true ? "bold" : "normal" }}>
            [useful]
          </span>
          <span onClick={() => setUseful(false)}
            style={{ cursor: "pointer", color: entry.useful === false ? "#c00" : "#00c", textDecoration: "underline", fontWeight: entry.useful === false ? "bold" : "normal" }}>
            [not useful]
          </span>
          {entry.useful != null && (
            <span onClick={() => setUseful(null)}
              style={{ cursor: "pointer", color: "#999", textDecoration: "underline", marginLeft: 10 }}>
              [clear]
            </span>
          )}
        </div>

        {/* Notes table */}
        <table className="bordered" style={{ marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ width: 42 }}>pg</th>
              <th style={{ width: 50 }}>type</th>
              <th>note / quote</th>
              <th style={{ width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {notes.map(note => (
              <tr key={note.id}>
                <td className="pg-col">{note.page || "—"}</td>
                <td className="type-col">{note.type}</td>
                <td>
                  {editingId === note.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <input value={editPage} onChange={e => setEditPage(e.target.value)}
                          style={{ width: 50 }} placeholder="pg" />
                        <textarea value={editText} onChange={e => setEditText(e.target.value)}
                          rows={2} style={{ flex: 1 }} />
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => saveEdit(note.id)}>save</button>
                        <button onClick={() => setEditingId(null)}>cancel</button>
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontStyle: note.type === "quote" ? "italic" : "normal", fontSize: 16 }}>
                      {note.text}
                    </span>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  <span className="mono" style={{ fontSize: 12, color: "#00c", cursor: "pointer", textDecoration: "underline", marginRight: 6 }}
                    onClick={() => { setEditingId(note.id); setEditText(note.text); setEditPage(note.page || ""); }}>
                    edit
                  </span>
                  <span className="mono" style={{ fontSize: 13, color: "#999", cursor: "pointer" }}
                    onClick={() => deleteNote(note.id)}>×</span>
                </td>
              </tr>
            ))}

            {/* Input row */}
            <tr className="add-row">
              <td className="pg-col">
                <input ref={pageRef} value={page} onChange={e => setPage(e.target.value)}
                  placeholder="pg" style={{ width: 38, fontSize: 13 }}
                  onKeyDown={e => { if (e.key === "Tab") { e.preventDefault(); textRef.current?.focus(); } }} />
              </td>
              <td>
                <select value={noteType} onChange={e => setNoteType(e.target.value)}
                  style={{ width: 46, fontSize: 12, padding: "2px 2px" }}>
                  <option value="quote">q</option>
                  <option value="note">n</option>
                </select>
              </td>
              <td>
                <textarea ref={textRef} value={text} onChange={e => setText(e.target.value)}
                  rows={2} placeholder="type and press enter to save..."
                  style={{ width: "100%", fontSize: 16 }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); } }} />
              </td>
              <td>
                <button className="primary" onClick={save} style={{ fontSize: 12, padding: "2px 8px" }}>save</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mono" style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
          tab: pg → text &nbsp;|&nbsp; enter: save &nbsp;|&nbsp; shift+enter: new line
        </div>

        {notes.length === 0 && (
          <p style={{ fontStyle: "italic", color: "#888", marginTop: 16, fontSize: 15 }}>No notes yet.</p>
        )}
      </div>
    </div>
  );
}
