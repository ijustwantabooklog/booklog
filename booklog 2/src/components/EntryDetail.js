import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, deleteDoc, updateDoc, collection, query, orderBy, addDoc, serverTimestamp } from "firebase/firestore";

export default function EntryDetail({ entryId, entryType, userId, onBack, onOpenSession }) {
  const [entry, setEntry] = useState(null);
  const [notes, setNotes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showProjectPrompt, setShowProjectPrompt] = useState(false);

  useEffect(() => {
    const u1 = onSnapshot(doc(db, "users", userId, entryType, entryId), d => {
      if (d.exists()) setEntry({ id: d.id, ...d.data() });
    });
    const u2 = onSnapshot(
      query(collection(db, "users", userId, entryType, entryId, "notes"), orderBy("createdAt", "asc")),
      snap => setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const u3 = onSnapshot(
      query(collection(db, "users", userId, "projects"), orderBy("createdAt", "desc")),
      snap => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { u1(); u2(); u3(); };
  }, [entryId, entryType, userId]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this entry and all its notes?")) return;
    await deleteDoc(doc(db, "users", userId, entryType, entryId));
    onBack();
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
    <div className="wrap">
      <div style={{ marginBottom: 8 }}>
        <a className="mono" onClick={onBack} style={{ fontSize: 13 }}>← back</a>
      </div>

      <div style={{ borderBottom: "2px solid #000", paddingBottom: 8, marginBottom: 10 }}>
        <h1 style={{ fontStyle: entryType === "books" ? "italic" : "normal" }}>{entryType === "articles" ? `"${title}"` : title}</h1>
        <div className="mono" style={{ color: "#555", marginTop: 4 }}>
          {entry.author}
          {entryType === "articles" && entry.publication && ` · ${entry.publication}`}
          {(entry.year || entry.datePublished) && ` · ${entry.year || entry.datePublished}`}
        </div>
        {entry.url && (
          <div style={{ marginTop: 4 }}>
            <a href={entry.url.startsWith("http") ? entry.url : `https://doi.org/${entry.url}`}
              target="_blank" rel="noopener noreferrer" className="mono" style={{ fontSize: 13 }}>
              {entry.url}
            </a>
          </div>
        )}
      </div>

      {/* Verdict + actions */}
      <div className="mono" style={{ marginBottom: 8, fontSize: 13 }}>
        verdict:{" "}
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
        <span style={{ marginLeft: 20 }}>
          <a className="mono" style={{ fontSize: 13 }} onClick={() => onOpenSession(entryId, entryType)}>[open reading session →]</a>
        </span>
        <span style={{ marginLeft: 16 }}>
          <span className="mono" style={{ fontSize: 13, color: "#c00", cursor: "pointer", textDecoration: "underline" }}
            onClick={handleDelete}>[delete]</span>
        </span>
      </div>

      {/* Project prompt */}
      {showProjectPrompt && (
        <div style={{ border: "1px solid #999", padding: "8px 10px", marginBottom: 10, background: "#fffde8" }}>
          <span className="mono" style={{ fontSize: 13 }}>add to project:{" "}</span>
          {projects.map(p => (
            <span key={p.id}>
              <span className="mono" style={{ fontSize: 13, color: "#00c", textDecoration: "underline", cursor: "pointer", marginRight: 10 }}
                onClick={() => addToProject(p.id)}>
                {p.title}
              </span>
            </span>
          ))}
          <span className="mono" style={{ fontSize: 13, color: "#999", textDecoration: "underline", cursor: "pointer" }}
            onClick={() => setShowProjectPrompt(false)}>[skip]</span>
        </div>
      )}

      {/* Notes */}
      {notes.length === 0 && <p style={{ fontStyle: "italic", color: "#888" }}>No notes yet.</p>}
      {notes.length > 0 && (
        <table className="bordered">
          <thead>
            <tr>
              <th style={{ width: 42 }}>pg</th>
              <th style={{ width: 50 }}>type</th>
              <th>content</th>
            </tr>
          </thead>
          <tbody>
            {notes.map(note => (
              <tr key={note.id}>
                <td className="pg-col">{note.page || "—"}</td>
                <td className="type-col">{note.type}</td>
                <td style={{ fontStyle: note.type === "quote" ? "italic" : "normal", fontSize: 16, color: note.type === "general" ? "#333" : "#000" }}>{note.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
