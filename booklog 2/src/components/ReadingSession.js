import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, collection, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from "firebase/firestore";

export default function ReadingSession({ entryId, entryType, userId, onBack, onViewDetail }) {
  const [entry, setEntry] = useState(null);
  const [notes, setNotes] = useState([]);
  const [generalNotes, setGeneralNotes] = useState([]);

  // Page-attributed input
  const [page, setPage] = useState("");
  const [text, setText] = useState("");
  const [noteType, setNoteType] = useState("quote");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editPage, setEditPage] = useState("");

  // General notes input
  const [generalText, setGeneralText] = useState("");
  const [editingGeneralId, setEditingGeneralId] = useState(null);
  const [editingGeneralText, setEditingGeneralText] = useState("");

  // Project prompt
  const [projects, setProjects] = useState([]);
  const [showProjectPrompt, setShowProjectPrompt] = useState(false);

  const textRef = useRef(null);
  const pageRef = useRef(null);
  const generalRef = useRef(null);

  useEffect(() => {
    const u1 = onSnapshot(doc(db, "users", userId, entryType, entryId), d => {
      if (d.exists()) setEntry({ id: d.id, ...d.data() });
    });
    const u2 = onSnapshot(
      query(collection(db, "users", userId, entryType, entryId, "notes"), orderBy("createdAt", "asc")),
      snap => setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(n => n.type !== "general"))
    );
    const u3 = onSnapshot(
      query(collection(db, "users", userId, entryType, entryId, "notes"), orderBy("createdAt", "asc")),
      snap => setGeneralNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(n => n.type === "general"))
    );
    const u4 = onSnapshot(
      query(collection(db, "users", userId, "projects"), orderBy("createdAt", "desc")),
      snap => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { u1(); u2(); u3(); u4(); };
  }, [entryId, entryType, userId]);

  useEffect(() => { pageRef.current?.focus(); }, []);

  const saveNote = async () => {
    if (!text.trim()) return;
    await addDoc(collection(db, "users", userId, entryType, entryId, "notes"), {
      page: page.trim(), text: text.trim(), type: noteType, createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "users", userId, entryType, entryId), { updatedAt: serverTimestamp() });
    setText(""); setPage("");
    pageRef.current?.focus();
  };

  const saveGeneral = async () => {
    if (!generalText.trim()) return;
    await addDoc(collection(db, "users", userId, entryType, entryId, "notes"), {
      page: "", text: generalText.trim(), type: "general", createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "users", userId, entryType, entryId), { updatedAt: serverTimestamp() });
    setGeneralText("");
    generalRef.current?.focus();
  };

  const deleteNote = async (id) => {
    await deleteDoc(doc(db, "users", userId, entryType, entryId, "notes", id));
  };

  const saveEdit = async (id) => {
    await updateDoc(doc(db, "users", userId, entryType, entryId, "notes", id), { text: editText, page: editPage });
    setEditingId(null);
  };

  const saveEditGeneral = async (id) => {
    await updateDoc(doc(db, "users", userId, entryType, entryId, "notes", id), { text: editingGeneralText });
    setEditingGeneralId(null);
  };

  const setUseful = async (value) => {
    await updateDoc(doc(db, "users", userId, entryType, entryId), { useful: value, updatedAt: serverTimestamp() });
    if (value === true && projects.length > 0) setShowProjectPrompt(true);
    if (value !== true) setShowProjectPrompt(false);
  };

  const addToProject = async (projectId) => {
    if (!entry) return;
    await addDoc(collection(db, "users", userId, "projects", projectId, "items"), {
      entryId, entryType,
      entryTitle: entry.isChapter && entry.chapterTitle ? entry.chapterTitle : entry.title,
      addedAt: serverTimestamp(),
    });
    setShowProjectPrompt(false);
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
            <span style={{ fontStyle: entryType === "books" ? "italic" : "normal", fontSize: 20, fontWeight: "bold" }}>{entryType === "articles" ? `"${title}"` : title}</span>
            {entry.author && <span className="mono" style={{ color: "#555", marginLeft: 8 }}>{entry.author}</span>}
          </div>
          <span className="mono" style={{ cursor: "pointer", color: "#00c", textDecoration: "underline" }}
            onClick={() => onViewDetail(entryId, entryType)}>[full log]</span>
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
            <span onClick={() => { setUseful(null); setShowProjectPrompt(false); }}
              style={{ cursor: "pointer", color: "#999", textDecoration: "underline", marginLeft: 10 }}>
              [clear]
            </span>
          )}
        </div>

        {/* Project prompt */}
        {showProjectPrompt && (
          <div style={{ border: "1px solid #999", padding: "8px 10px", marginBottom: 10, background: "#fffde8" }}>
            <span className="mono" style={{ fontSize: 13 }}>add to project: </span>
            {projects.map(p => (
              <span key={p.id} className="mono"
                style={{ fontSize: 13, color: "#00c", textDecoration: "underline", cursor: "pointer", marginRight: 10 }}
                onClick={() => addToProject(p.id)}>{p.title}</span>
            ))}
            <span className="mono" style={{ fontSize: 13, color: "#999", textDecoration: "underline", cursor: "pointer" }}
              onClick={() => setShowProjectPrompt(false)}>[skip]</span>
          </div>
        )}

        {/* ── Section 1: Quotes & Notes ── */}
        <div className="section-label" style={{ marginTop: 0 }}>quotes & notes</div>

        <table className="bordered" style={{ marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ width: 52 }}>pg</th>
              <th style={{ width: 60 }}>type</th>
              <th>content</th>
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
                        <input value={editPage} onChange={e => setEditPage(e.target.value)} style={{ width: 50 }} placeholder="pg" />
                        <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2} style={{ flex: 1 }} />
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => saveEdit(note.id)}>save</button>
                        <button onClick={() => setEditingId(null)}>cancel</button>
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontStyle: note.type === "quote" ? "italic" : "normal", fontSize: 16 }}>{note.text}</span>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  <span className="mono" style={{ fontSize: 12, color: "#00c", cursor: "pointer", textDecoration: "underline", marginRight: 6 }}
                    onClick={() => { setEditingId(note.id); setEditText(note.text); setEditPage(note.page || ""); }}>edit</span>
                  <span className="mono" style={{ fontSize: 13, color: "#999", cursor: "pointer" }}
                    onClick={() => deleteNote(note.id)}>×</span>
                </td>
              </tr>
            ))}

            {/* Input row */}
            <tr className="add-row">
              <td className="pg-col">
                <input ref={pageRef} value={page} onChange={e => setPage(e.target.value)}
                  placeholder="pg" style={{ width: 46, fontSize: 13 }}
                  onKeyDown={e => { if (e.key === "Tab") { e.preventDefault(); textRef.current?.focus(); } }} />
              </td>
              <td>
                {/* One-click toggle */}
                <span onClick={() => setNoteType(t => t === "quote" ? "note" : "quote")}
                  className="mono"
                  style={{ fontSize: 13, cursor: "pointer", userSelect: "none", textDecoration: "underline", color: "#00c" }}>
                  {noteType === "quote" ? "quote" : "note"}
                </span>
              </td>
              <td>
                <textarea ref={textRef} value={text} onChange={e => setText(e.target.value)}
                  rows={2} placeholder="type and press enter to save..."
                  style={{ width: "100%", fontSize: 16 }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveNote(); } }} />
              </td>
              <td>
                <button className="primary" onClick={saveNote} style={{ fontSize: 12, padding: "2px 8px" }}>save</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mono" style={{ fontSize: 12, color: "#888", marginTop: 3, marginBottom: 16 }}>
          tab: pg → text &nbsp;|&nbsp; click type to toggle quote/note &nbsp;|&nbsp; enter to save
        </div>

        {/* ── Section 2: General Notes ── */}
        <div className="section-label">general notes</div>

        {generalNotes.map(note => (
          <div key={note.id} style={{ borderBottom: "1px solid #eee", padding: "6px 0", display: "flex", gap: 8, alignItems: "flex-start" }}>
            {editingGeneralId === note.id ? (
              <div style={{ flex: 1 }}>
                <textarea value={editingGeneralText} onChange={e => setEditingGeneralText(e.target.value)}
                  rows={3} style={{ width: "100%", fontSize: 16 }} />
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <button onClick={() => saveEditGeneral(note.id)}>save</button>
                  <button onClick={() => setEditingGeneralId(null)}>cancel</button>
                </div>
              </div>
            ) : (
              <>
                <span style={{ fontSize: 16, flex: 1, lineHeight: 1.5 }}>{note.text}</span>
                <span className="mono" style={{ fontSize: 12, color: "#00c", cursor: "pointer", textDecoration: "underline", whiteSpace: "nowrap" }}
                  onClick={() => { setEditingGeneralId(note.id); setEditingGeneralText(note.text); }}>edit</span>
                <span className="mono" style={{ fontSize: 13, color: "#999", cursor: "pointer" }}
                  onClick={() => deleteNote(note.id)}>×</span>
              </>
            )}
          </div>
        ))}

        <div style={{ marginTop: 8 }}>
          <textarea ref={generalRef} value={generalText} onChange={e => setGeneralText(e.target.value)}
            rows={3} placeholder="general thoughts, connections, context... (enter to save)"
            style={{ width: "100%", fontSize: 16 }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveGeneral(); } }} />
          <button className="primary" onClick={saveGeneral} style={{ marginTop: 4, fontSize: 13 }}>save</button>
        </div>

      </div>
    </div>
  );
}
