import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, updateDoc, deleteDoc, collection, query, orderBy, addDoc, serverTimestamp, getDocs } from "firebase/firestore";

export default function ProjectDetail({ projectId, userId, onBack, onSelectBook, onSelectArticle }) {
  const [project, setProject] = useState(null);
  const [books, setBooks] = useState([]);
  const [articles, setArticles] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [notes, setNotes] = useState([]);
  const [editingProject, setEditingProject] = useState(false);
  const [projectTitleInput, setProjectTitleInput] = useState("");
  const [projectDescInput, setProjectDescInput] = useState("");
  const [newNoteText, setNewNoteText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [showQuotePicker, setShowQuotePicker] = useState(null);
  const [atSearch, setAtSearch] = useState("");
  const [showAtMenu, setShowAtMenu] = useState(false);
  const [atCursorPos, setAtCursorPos] = useState(0);
  const noteRef = useRef(null);

  useEffect(() => {
    const unsub1 = onSnapshot(doc(db, "users", userId, "projects", projectId), d => {
      if (d.exists()) setProject({ id: d.id, ...d.data() });
    });
    const unsub2 = onSnapshot(query(collection(db, "users", userId, "books"), orderBy("title")),
      snap => setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsub3 = onSnapshot(query(collection(db, "users", userId, "articles"), orderBy("title")),
      snap => setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsub4 = onSnapshot(query(collection(db, "users", userId, "projects", projectId, "materials"), orderBy("addedAt", "asc")),
      snap => setMaterials(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsub5 = onSnapshot(query(collection(db, "users", userId, "projects", projectId, "notes"), orderBy("createdAt", "asc")),
      snap => setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
  }, [projectId, userId]);

  const saveProject = async () => {
    await updateDoc(doc(db, "users", userId, "projects", projectId), {
      title: projectTitleInput.trim(),
      description: projectDescInput.trim(),
      updatedAt: serverTimestamp(),
    });
    setEditingProject(false);
  };

  const togglePublic = async () => {
    await updateDoc(doc(db, "users", userId, "projects", projectId), { public: !project.public, updatedAt: serverTimestamp() });
  };

  const deleteProject = async () => {
    if (!window.confirm("Delete this project?")) return;
    await deleteDoc(doc(db, "users", userId, "projects", projectId));
    onBack();
  };

  const addMaterial = async (item, type) => {
    if (materials.find(m => m.refId === item.id)) return;
    await addDoc(collection(db, "users", userId, "projects", projectId, "materials"), {
      refId: item.id, type, title: item.title, author: item.author || "",
      addedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "users", userId, "projects", projectId), { updatedAt: serverTimestamp() });
    setShowAddMaterial(false); setAddSearch("");
  };

  const removeMaterial = async (id) => {
    await deleteDoc(doc(db, "users", userId, "projects", projectId, "materials", id));
  };

  const addNote = async (text) => {
    if (!text.trim()) return;
    await addDoc(collection(db, "users", userId, "projects", projectId, "notes"), {
      text: text.trim(), createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "users", userId, "projects", projectId), { updatedAt: serverTimestamp() });
    setNewNoteText("");
  };

  const saveNote = async (id) => {
    if (!editingNoteText.trim()) return;
    await updateDoc(doc(db, "users", userId, "projects", projectId, "notes", id), { text: editingNoteText.trim() });
    setEditingNoteId(null);
  };

  const deleteNote = async (id) => {
    await deleteDoc(doc(db, "users", userId, "projects", projectId, "notes", id));
  };

  const insertQuote = (quote, sourceTitle, sourceId, sourceType) => {
    const quoteText = `\n[${sourceTitle}, p.${quote.page || "?"}]: "${quote.text}"\n`;
    setNewNoteText(prev => prev + quoteText);
    setShowQuotePicker(null);
    noteRef.current?.focus();
  };

  // Parse note text to render @mentions as links
  const renderNoteText = (text) => {
    const parts = text.split(/(@\[[^\]]+\]\([^)]+\))/g);
    return parts.map((part, i) => {
      const match = part.match(/@\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        const [, title, id] = match;
        const mat = materials.find(m => m.refId === id);
        return (
          <span key={i} onClick={() => mat?.type === "article" ? onSelectArticle?.(id) : onSelectBook?.(id)}
            style={{ color: "#e8318a", cursor: "pointer", textDecoration: "underline" }}>
            @{title}
          </span>
        );
      }
      // Also render quote blocks
      return <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part}</span>;
    });
  };

  const handleNoteKeyDown = (e) => {
    if (e.key === "@") {
      setAtCursorPos(e.target.selectionStart + 1);
      setAtSearch("");
      setShowAtMenu(true);
    }
    if (e.key === "Escape") setShowAtMenu(false);
    if (e.key === "Enter" && !e.shiftKey && !showAtMenu) {
      e.preventDefault();
      addNote(newNoteText);
    }
  };

  const insertMention = (mat) => {
    const mention = `@[${mat.title}](${mat.refId})`;
    const before = newNoteText.slice(0, atCursorPos - 1);
    const after = newNoteText.slice(atCursorPos - 1);
    const withoutPartial = after.replace(/^[^@\s]*/, "");
    setNewNoteText(before + mention + withoutPartial);
    setShowAtMenu(false);
    noteRef.current?.focus();
  };

  const filteredMentions = materials.filter(m =>
    m.title.toLowerCase().includes(atSearch.toLowerCase())
  );

  const filteredAdd = [...books, ...articles.map(a => ({ ...a, _isArticle: true }))]
    .filter(i => i.title?.toLowerCase().includes(addSearch.toLowerCase()) || i.author?.toLowerCase().includes(addSearch.toLowerCase()))
    .filter(i => !materials.find(m => m.refId === i.id));

  if (!project) return <div style={{ padding: 40, color: "#aaa", fontSize: 14 }}>loading...</div>;

  const cardStyle = { background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden", marginBottom: 10 };
  const sectionHeading = { fontSize: 15, color: "#444", fontWeight: 500, borderBottom: "1px solid #e0e0e0", padding: "14px 16px 10px" };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 0 16px" }}>
        <button onClick={onBack} style={ghostBtn}>← back</button>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <button onClick={togglePublic} style={{ ...ghostBtn, color: project.public ? "#e8318a" : "#aaa", border: `1px solid ${project.public ? "#e8318a" : "#ddd"}`, borderRadius: 6, padding: "4px 12px", fontSize: 12 }}>
            {project.public ? "public" : "private"}
          </button>
          <button onClick={deleteProject} style={{ ...ghostBtn, color: "#e8318a" }}>delete</button>
        </div>
      </div>

      {/* Header — click to edit */}
      {editingProject ? (
        <div style={{ ...cardStyle, padding: "24px" }}>
          <input value={projectTitleInput} onChange={e => setProjectTitleInput(e.target.value)} autoFocus
            style={{ width: "100%", fontSize: 24, fontFamily: "Georgia, serif", border: "none", outline: "none", marginBottom: 8, color: "#1a1a1a" }} />
          <textarea value={projectDescInput} onChange={e => setProjectDescInput(e.target.value)} rows={2}
            style={{ width: "100%", fontSize: 14, border: "none", outline: "none", resize: "none", color: "#888", fontFamily: "inherit", lineHeight: 1.6 }} />
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button onClick={saveProject} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 13, cursor: "pointer" }}>Save</button>
            <button onClick={() => setEditingProject(false)} style={{ background: "none", border: "none", color: "#aaa", fontSize: 13, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ ...cardStyle, padding: "24px", cursor: "pointer" }}
          onClick={() => { setProjectTitleInput(project.title); setProjectDescInput(project.description || ""); setEditingProject(true); }}>
          <div style={{ fontSize: 24, fontFamily: "Georgia, serif", color: "#1a1a1a", marginBottom: 4 }}>{project.title}</div>
          {project.description
            ? <div style={{ fontSize: 14, color: "#888", lineHeight: 1.5 }}>{project.description}</div>
            : <div style={{ fontSize: 14, color: "#ccc" }}>Add a description...</div>}
        </div>
      )}

      {/* Two column layout */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>

        {/* Left — Project Notes */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, color: "#444", fontWeight: 500, marginBottom: 10 }}>Project Notes</div>

          {/* Existing notes */}
          {notes.map(note => (
            <div key={note.id} style={{ ...cardStyle }}>
              {editingNoteId === note.id ? (
                <div style={{ padding: "16px" }}>
                  <textarea value={editingNoteText} onChange={e => setEditingNoteText(e.target.value)} rows={4} autoFocus
                    style={{ width: "100%", fontSize: 14, border: "none", outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.7, padding: 0, boxSizing: "border-box" }} />
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <button onClick={() => saveNote(note.id)} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>Save</button>
                    <button onClick={() => setEditingNoteId(null)} style={{ background: "none", border: "none", color: "#aaa", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                    <button onClick={() => deleteNote(note.id)} style={{ background: "none", border: "none", color: "#e8318a", fontSize: 12, cursor: "pointer", marginLeft: "auto" }}>delete</button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "16px", cursor: "pointer" }}
                  onClick={() => { setEditingNoteId(note.id); setEditingNoteText(note.text); }}>
                  <div style={{ fontSize: 14, color: "#333", lineHeight: 1.7 }}>{renderNoteText(note.text)}</div>
                  <div style={{ fontSize: 11, color: "#bbb", marginTop: 8 }}>
                    {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* New note input */}
          <div style={{ ...cardStyle, position: "relative" }}>
            <div style={{ padding: "16px" }}>
              <textarea ref={noteRef} value={newNoteText} onChange={e => {
                setNewNoteText(e.target.value);
                if (showAtMenu) {
                  const afterAt = e.target.value.slice(atCursorPos - 1);
                  const partial = afterAt.match(/^([^@\s]*)/)?.[1] || "";
                  setAtSearch(partial);
                }
              }}
                onKeyDown={handleNoteKeyDown}
                placeholder="Write a note... (@ to mention a material, Enter to save)"
                rows={3}
                style={{ width: "100%", fontSize: 14, border: "none", outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.7, padding: 0, boxSizing: "border-box" }} />

              {/* @ mention menu */}
              {showAtMenu && filteredMentions.length > 0 && (
                <div style={{ position: "absolute", left: 16, right: 16, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", zIndex: 100, maxHeight: 180, overflowY: "auto" }}>
                  {filteredMentions.map(mat => (
                    <div key={mat.id} onClick={() => insertMention(mat)}
                      style={{ padding: "8px 14px", fontSize: 13, cursor: "pointer", color: "#333", borderBottom: "0.5px solid #f5f5f5" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f9f9f9"}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}>
                      <span style={{ fontFamily: mat.type === "book" ? "Georgia, serif" : "inherit" }}>{mat.title}</span>
                      <span style={{ fontSize: 11, color: "#aaa", marginLeft: 8 }}>{mat.type}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                {/* Quote picker button */}
                <div style={{ position: "relative" }}>
                  <button onClick={() => setShowQuotePicker(showQuotePicker ? null : "open")}
                    style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#888", cursor: "pointer" }}>
                    + insert quote
                  </button>
                  {showQuotePicker === "open" && (
                    <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", zIndex: 100, width: 320, maxHeight: 300, overflowY: "auto" }}>
                      {materials.length === 0 && <div style={{ padding: "12px", fontSize: 13, color: "#aaa" }}>Add materials first.</div>}
                      {materials.map(mat => {
                        const source = mat.type === "book" ? books.find(b => b.id === mat.refId) : articles.find(a => a.id === mat.refId);
                        if (!source?.quotes?.length) return null;
                        return (
                          <div key={mat.id}>
                            <div style={{ padding: "8px 12px", fontSize: 12, color: "#aaa", background: "#f9f9f9", fontWeight: 500 }}>{mat.title}</div>
                            {source.quotes.map((q, qi) => (
                              <div key={qi} onClick={() => insertQuote(q, mat.title, mat.refId, mat.type)}
                                style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", color: "#333", borderBottom: "0.5px solid #f5f5f5", lineHeight: 1.5 }}
                                onMouseEnter={e => e.currentTarget.style.background = "#f0f0f0"}
                                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                                {q.page && <span style={{ color: "#e8318a", marginRight: 6 }}>{q.page}</span>}
                                {q.text.length > 80 ? q.text.slice(0, 80) + "..." : q.text}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button onClick={() => addNote(newNoteText)}
                  style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 13, cursor: "pointer" }}>
                  Add note
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Materials */}
        <div style={{ width: 260, flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 15, color: "#444", fontWeight: 500 }}>Materials</div>
            <button onClick={() => setShowAddMaterial(p => !p)}
              style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 6, padding: "3px 10px", fontSize: 12, color: "#666", cursor: "pointer" }}>+ add</button>
          </div>

          {showAddMaterial && (
            <div style={{ ...cardStyle, padding: "12px" }}>
              <input value={addSearch} onChange={e => setAddSearch(e.target.value)} autoFocus
                placeholder="Search your books & articles..."
                style={{ width: "100%", padding: "7px 10px", fontSize: 13, border: "1px solid #e0e0e0", borderRadius: 6, outline: "none", boxSizing: "border-box" }} />
              <div style={{ marginTop: 6, maxHeight: 200, overflowY: "auto" }}>
                {filteredAdd.map(item => (
                  <div key={item.id} onClick={() => addMaterial(item, item._isArticle ? "article" : "book")}
                    style={{ padding: "7px 4px", fontSize: 13, cursor: "pointer", color: "#333", borderBottom: "0.5px solid #f5f5f5", display: "flex", alignItems: "center", gap: 8 }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f9f9f9"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    <span style={{ fontFamily: item._isArticle ? "inherit" : "Georgia, serif", flex: 1 }}>{item.title}</span>
                    {item._isArticle && <span style={{ fontSize: 10, color: "#e8318a", border: "1px solid #e8318a", borderRadius: 3, padding: "1px 4px", flexShrink: 0 }}>article</span>}
                  </div>
                ))}
                {filteredAdd.length === 0 && <div style={{ fontSize: 13, color: "#aaa", padding: "8px 4px" }}>Nothing found.</div>}
              </div>
            </div>
          )}

          {materials.length === 0 && !showAddMaterial && (
            <div style={{ fontSize: 13, color: "#aaa" }}>No materials yet.</div>
          )}

          {materials.map((mat, i) => (
            <div key={mat.id} style={{ ...cardStyle, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div onClick={() => mat.type === "article" ? onSelectArticle?.(mat.refId) : onSelectBook?.(mat.refId)}
                    style={{ fontSize: 14, color: "#0000ee", textDecoration: "underline", cursor: "pointer", fontFamily: mat.type === "book" ? "Georgia, serif" : "inherit", lineHeight: 1.3, marginBottom: 2 }}>
                    {mat.title}
                  </div>
                  {mat.author && <div style={{ fontSize: 12, color: "#888" }}>{mat.author}</div>}
                  {mat.type === "article" && <span style={{ fontSize: 10, color: "#e8318a", border: "1px solid #e8318a", borderRadius: 3, padding: "1px 4px", display: "inline-block", marginTop: 3 }}>article</span>}
                </div>
                <button onClick={() => removeMaterial(mat.id)} style={{ background: "none", border: "none", color: "#ddd", fontSize: 14, cursor: "pointer", flexShrink: 0, padding: 0 }}>×</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const ghostBtn = { background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13, padding: "4px 0" };
