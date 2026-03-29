import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, updateDoc, deleteDoc, collection, query, orderBy, onSnapshot as onSnap, addDoc, serverTimestamp, getDocs } from "firebase/firestore";

export default function ProjectDetail({ projectId, userId, onBack, onSelectBook, onSelectArticle }) {
  const [project, setProject] = useState(null);
  const [books, setBooks] = useState([]);
  const [articles, setArticles] = useState([]);
  const [items, setItems] = useState([]);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState("");
  const [showAddBook, setShowAddBook] = useState(false);
  const [showAddArticle, setShowAddArticle] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [expandedItem, setExpandedItem] = useState(null);
  const [itemNotes, setItemNotes] = useState({});
  const [editingItemId, setEditingItemId] = useState(null);
  const [showQuotePicker, setShowQuotePicker] = useState(null);

  useEffect(() => {
    const unsub1 = onSnapshot(doc(db, "users", userId, "projects", projectId), d => {
      if (d.exists()) setProject({ id: d.id, ...d.data() });
    });
    const unsub2 = onSnapshot(
      query(collection(db, "users", userId, "books"), orderBy("title")),
      snap => setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsub3 = onSnapshot(
      query(collection(db, "users", userId, "articles"), orderBy("title")),
      snap => setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsub4 = onSnapshot(
      query(collection(db, "users", userId, "projects", projectId, "items"), orderBy("addedAt", "asc")),
      snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [projectId, userId]);

  const saveNotes = async () => {
    await updateDoc(doc(db, "users", userId, "projects", projectId), { notes: notesInput, updatedAt: serverTimestamp() });
    setEditingNotes(false);
  };

  const togglePublic = async () => {
    await updateDoc(doc(db, "users", userId, "projects", projectId), { public: !project.public, updatedAt: serverTimestamp() });
  };

  const deleteProject = async () => {
    if (!window.confirm("Delete this project?")) return;
    await deleteDoc(doc(db, "users", userId, "projects", projectId));
    onBack();
  };

  const addItem = async (item, type) => {
    const exists = items.find(i => i.refId === item.id);
    if (exists) return;
    await addDoc(collection(db, "users", userId, "projects", projectId, "items"), {
      refId: item.id, type, title: item.title, author: item.author || "",
      notes: "", quotes: [], addedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "users", userId, "projects", projectId), { updatedAt: serverTimestamp() });
    setShowAddBook(false); setShowAddArticle(false); setAddSearch("");
  };

  const removeItem = async (itemId) => {
    await deleteDoc(doc(db, "users", userId, "projects", projectId, "items", itemId));
  };

  const saveItemNotes = async (itemId) => {
    await updateDoc(doc(db, "users", userId, "projects", projectId, "items", itemId), { notes: itemNotes[itemId] || "" });
    setEditingItemId(null);
  };

  const addQuoteToItem = async (itemId, quote) => {
    const item = items.find(i => i.id === itemId);
    const existing = item.quotes || [];
    if (existing.find(q => q.text === quote.text)) return;
    await updateDoc(doc(db, "users", userId, "projects", projectId, "items", itemId), {
      quotes: [...existing, quote]
    });
    setShowQuotePicker(null);
  };

  const removeQuoteFromItem = async (itemId, qIndex) => {
    const item = items.find(i => i.id === itemId);
    const updated = (item.quotes || []).filter((_, i) => i !== qIndex);
    await updateDoc(doc(db, "users", userId, "projects", projectId, "items", itemId), { quotes: updated });
  };

  if (!project) return <div style={{ padding: 40, color: "#aaa", fontSize: 14 }}>loading...</div>;

  const cardStyle = { background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden", marginBottom: 10 };
  const sectionHeading = { fontSize: 15, color: "#444", fontWeight: 500, borderBottom: "1px solid #e0e0e0", padding: "14px 16px 10px" };

  const filteredBooks = books.filter(b => b.title?.toLowerCase().includes(addSearch.toLowerCase()) || b.author?.toLowerCase().includes(addSearch.toLowerCase()));
  const filteredArticles = articles.filter(a => a.title?.toLowerCase().includes(addSearch.toLowerCase()) || a.author?.toLowerCase().includes(addSearch.toLowerCase()));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 0 16px" }}>
        <button onClick={onBack} style={ghostBtn}>← back</button>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <button onClick={togglePublic} style={{ ...ghostBtn, color: project.public ? "#e8318a" : "#aaa", border: `1px solid ${project.public ? "#e8318a" : "#ddd"}`, borderRadius: 6, padding: "4px 12px", fontSize: 12 }}>
            {project.public ? "public" : "private"}
          </button>
          <button onClick={deleteProject} style={{ ...ghostBtn, color: "#e8318a" }}>delete</button>
        </div>
      </div>

      {/* Header */}
      <div style={{ ...cardStyle, padding: "24px" }}>
        <div style={{ fontSize: 26, fontFamily: "Georgia, serif", color: "#1a1a1a", marginBottom: 8 }}>{project.title}</div>
        {project.description && <div style={{ fontSize: 14, color: "#888", marginBottom: 12 }}>{project.description}</div>}

        {/* Overall notes */}
        {editingNotes ? (
          <div>
            <textarea value={notesInput} onChange={e => setNotesInput(e.target.value)} rows={5} autoFocus
              style={{ width: "100%", fontSize: 14, border: "1px solid #e0e0e0", borderRadius: 6, padding: "10px", resize: "vertical", outline: "none", fontFamily: "inherit", lineHeight: 1.7, boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={saveNotes} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 13, cursor: "pointer" }}>Save</button>
              <button onClick={() => setEditingNotes(false)} style={{ background: "none", border: "none", color: "#aaa", fontSize: 13, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div onClick={() => { setNotesInput(project.notes || ""); setEditingNotes(true); }}
            style={{ fontSize: 14, color: project.notes ? "#333" : "#ccc", lineHeight: 1.7, cursor: "pointer", minHeight: 40 }}>
            {project.notes || "Add project notes..."}
          </div>
        )}
      </div>

      {/* Sources */}
      <div style={cardStyle}>
        <div style={{ ...sectionHeading, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Sources</span>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setShowAddBook(p => !p); setShowAddArticle(false); setAddSearch(""); }}
              style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 6, padding: "3px 10px", fontSize: 12, color: "#666", cursor: "pointer" }}>+ book</button>
            <button onClick={() => { setShowAddArticle(p => !p); setShowAddBook(false); setAddSearch(""); }}
              style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 6, padding: "3px 10px", fontSize: 12, color: "#666", cursor: "pointer" }}>+ article</button>
          </div>
        </div>

        {(showAddBook || showAddArticle) && (
          <div style={{ padding: "12px 16px", borderBottom: "0.5px solid #ebebeb" }}>
            <input value={addSearch} onChange={e => setAddSearch(e.target.value)} autoFocus
              placeholder={`Search your ${showAddBook ? "books" : "articles"}...`}
              style={{ width: "100%", padding: "8px 12px", fontSize: 14, border: "1px solid #e0e0e0", borderRadius: 8, outline: "none" }} />
            <div style={{ marginTop: 8, maxHeight: 200, overflowY: "auto" }}>
              {(showAddBook ? filteredBooks : filteredArticles).map(item => (
                <div key={item.id} onClick={() => addItem(item, showAddBook ? "book" : "article")}
                  style={{ padding: "8px 4px", fontSize: 14, cursor: "pointer", color: items.find(i => i.refId === item.id) ? "#ccc" : "#333", borderBottom: "0.5px solid #f5f5f5" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f9f9f9"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <span style={{ fontFamily: showAddBook ? "Georgia, serif" : "inherit" }}>{item.title}</span>
                  <span style={{ fontSize: 12, color: "#aaa", marginLeft: 8 }}>{item.author}</span>
                  {items.find(i => i.refId === item.id) && <span style={{ fontSize: 11, color: "#ccc", marginLeft: 8 }}>already added</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {items.length === 0 && !showAddBook && !showAddArticle && (
          <div style={{ padding: "16px", fontSize: 14, color: "#aaa" }}>No sources yet. Add books or articles from your log.</div>
        )}

        {items.map((item, i) => {
          const sourceRef = item.type === "book" ? books.find(b => b.id === item.refId) : articles.find(a => a.id === item.refId);
          const isExpanded = expandedItem === item.id;
          return (
            <div key={item.id} style={{ borderBottom: i === items.length - 1 ? "none" : "0.5px solid #ebebeb" }}>
              <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", gap: 12 }}>
                <div onClick={() => setExpandedItem(isExpanded ? null : item.id)} style={{ flex: 1, cursor: "pointer" }}>
                  <div style={{ fontSize: 15, color: "#1a1a1a", fontFamily: item.type === "book" ? "Georgia, serif" : "inherit" }}>{item.title}</div>
                  {item.author && <div style={{ fontSize: 13, color: "#888" }}>{item.author}</div>}
                </div>
                {item.type === "article" && <span style={{ fontSize: 11, color: "#e8318a", border: "1px solid #e8318a", borderRadius: 3, padding: "1px 6px", flexShrink: 0 }}>article</span>}
                <button onClick={() => onSelectBook && item.type === "book" ? onSelectBook(item.refId) : onSelectArticle?.(item.refId)}
                  style={ghostBtn}>view</button>
                <button onClick={() => removeItem(item.id)} style={{ ...ghostBtn, color: "#ccc" }}>×</button>
              </div>

              {isExpanded && (
                <div style={{ padding: "0 16px 16px", borderTop: "0.5px solid #f5f5f5" }}>
                  {/* Item notes */}
                  <div style={{ marginTop: 12, marginBottom: 12 }}>
                    {editingItemId === item.id ? (
                      <div>
                        <textarea value={itemNotes[item.id] ?? item.notes ?? ""} onChange={e => setItemNotes(n => ({ ...n, [item.id]: e.target.value }))}
                          rows={4} autoFocus
                          style={{ width: "100%", fontSize: 14, border: "1px solid #e0e0e0", borderRadius: 6, padding: "10px", resize: "vertical", outline: "none", fontFamily: "inherit", lineHeight: 1.7, boxSizing: "border-box" }} />
                        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                          <button onClick={() => saveItemNotes(item.id)} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>Save</button>
                          <button onClick={() => setEditingItemId(null)} style={{ background: "none", border: "none", color: "#aaa", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => { setEditingItemId(item.id); setItemNotes(n => ({ ...n, [item.id]: item.notes || "" })); }}
                        style={{ fontSize: 14, color: item.notes ? "#333" : "#ccc", lineHeight: 1.7, cursor: "pointer" }}>
                        {item.notes || "Add notes about this source..."}
                      </div>
                    )}
                  </div>

                  {/* Pulled quotes */}
                  {(item.quotes || []).length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      {item.quotes.map((q, qi) => (
                        <div key={qi} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "0.5px solid #f5f5f5", alignItems: "baseline" }}>
                          {q.page && <span style={{ fontSize: 12, color: "#e8318a", minWidth: 30, flexShrink: 0 }}>{q.page}</span>}
                          <span style={{ fontSize: 13, color: "#444", flex: 1, lineHeight: 1.5 }}>{q.text}</span>
                          <button onClick={() => removeQuoteFromItem(item.id, qi)} style={{ background: "none", border: "none", color: "#ddd", fontSize: 14, cursor: "pointer", flexShrink: 0 }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add quote */}
                  {sourceRef?.quotes?.length > 0 && (
                    <div>
                      <button onClick={() => setShowQuotePicker(showQuotePicker === item.id ? null : item.id)}
                        style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 6, padding: "4px 12px", fontSize: 12, color: "#888", cursor: "pointer" }}>
                        + pull a quote
                      </button>
                      {showQuotePicker === item.id && (
                        <div style={{ marginTop: 8, background: "#f9f9f9", borderRadius: 8, padding: "8px" }}>
                          {sourceRef.quotes.filter(q => !(item.quotes || []).find(pq => pq.text === q.text)).map((q, qi) => (
                            <div key={qi} onClick={() => addQuoteToItem(item.id, q)}
                              style={{ padding: "8px", fontSize: 13, color: "#444", cursor: "pointer", borderBottom: "0.5px solid #eee", lineHeight: 1.5 }}
                              onMouseEnter={e => e.currentTarget.style.background = "#f0f0f0"}
                              onMouseLeave={e => e.currentTarget.style.background = "none"}>
                              {q.page && <span style={{ color: "#e8318a", marginRight: 8 }}>{q.page}</span>}
                              {q.text}
                            </div>
                          ))}
                          {sourceRef.quotes.length > 0 && sourceRef.quotes.every(q => (item.quotes || []).find(pq => pq.text === q.text)) && (
                            <div style={{ fontSize: 13, color: "#aaa", padding: "8px" }}>All quotes already pulled.</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ghostBtn = { background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13, padding: "4px 0" };
