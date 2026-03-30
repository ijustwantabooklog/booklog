import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, deleteDoc, collection, query, orderBy, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { addAnnotation, migrateBookAnnotations } from "../annotationHelpers";

export default function BookDetail({ bookId, userId, onBack, onEdit }) {
  const [book, setBook] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [tab, setTab] = useState("log");
  const [showCitation, setShowCitation] = useState(false);
  const [copied, setCopied] = useState(false);
  const [migrated, setMigrated] = useState(false);

  // New annotation inputs
  const [newType, setNewType] = useState("quote");
  const [newText, setNewText] = useState("");
  const [newPage, setNewPage] = useState("");
  const [newQuoteNote, setNewQuoteNote] = useState("");
  const [showQuoteNote, setShowQuoteNote] = useState(false);
  const [saving, setSaving] = useState(false);

  // Ruminations
  const [ruminations, setRuminations] = useState([]);
  const [newRumination, setNewRumination] = useState("");
  const [editingRumId, setEditingRumId] = useState(null);
  const [editingRumText, setEditingRumText] = useState("");

  // Editing annotations
  const [editingAnnotId, setEditingAnnotId] = useState(null);
  const [editingAnnotText, setEditingAnnotText] = useState("");

  const textRef = useRef(null);

  useEffect(() => {
    const unsubBook = onSnapshot(doc(db, "users", userId, "books", bookId), async d => {
      if (d.exists()) {
        const bookData = { id: d.id, ...d.data() };
        setBook(bookData);
        if (!migrated) {
          await migrateBookAnnotations(userId, bookData);
          setMigrated(true);
        }
      }
    });
    const unsubAnnot = onSnapshot(
      query(collection(db, "users", userId, "books", bookId, "annotations"), orderBy("createdAt", "asc")),
      snap => setAnnotations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubRum = onSnapshot(
      query(collection(db, "users", userId, "books", bookId, "ruminations"), orderBy("createdAt", "desc")),
      snap => setRuminations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { unsubBook(); unsubAnnot(); unsubRum(); };
  }, [bookId, userId]);

  useEffect(() => {
    if (tab === "annotations") setTimeout(() => textRef.current?.focus(), 100);
  }, [tab]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this book?")) return;
    await deleteDoc(doc(db, "users", userId, "books", bookId));
    onBack();
  };

  const saveAnnotation = async () => {
    if (!newText.trim()) return;
    setSaving(true);
    await addAnnotation(userId, bookId, "books", {
      type: newType,
      text: newText.trim(),
      page: newPage.trim(),
      quoteNote: newType === "quote" ? newQuoteNote.trim() : "",
      bookTitle: book?.title,
    });
    setNewText(""); setNewPage(""); setNewQuoteNote(""); setShowQuoteNote(false);
    setSaving(false);
    textRef.current?.focus();
  };

  const deleteAnnotation = async (id) => {
    await deleteDoc(doc(db, "users", userId, "books", bookId, "annotations", id));
  };

  const saveEditAnnotation = async (id) => {
    await updateDoc(doc(db, "users", userId, "books", bookId, "annotations", id), { text: editingAnnotText });
    setEditingAnnotId(null);
  };

  const addRumination = async () => {
    if (!newRumination.trim()) return;
    await addDoc(collection(db, "users", userId, "books", bookId, "ruminations"), {
      text: newRumination.trim(), createdAt: serverTimestamp(),
    });
    setNewRumination("");
  };

  const saveEditRum = async (id) => {
    await updateDoc(doc(db, "users", userId, "books", bookId, "ruminations", id), { text: editingRumText });
    setEditingRumId(null);
  };

  const generateMLA = () => {
    if (!book) return "";
    const author = book.author || "";
    const parts = author.split(" ");
    const lastName = parts.length > 1 ? parts[parts.length - 1] : author;
    const firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";
    const authorMLA = lastName && firstName ? `${lastName}, ${firstName}` : author;
    const translator = book.translator ? `. Translated by ${book.translator}` : "";
    const year = book.year ? `, ${book.year}` : "";
    return `${authorMLA}. *${book.title}*${translator}${year}.`;
  };

  const copyCitation = () => {
    navigator.clipboard.writeText(generateMLA().replace(/\*/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!book) return <div style={{ padding: 40, color: "#aaa", fontSize: 14 }}>loading...</div>;

  const typeColor = { quote: "#333", note: "#0000ee", rumination: "#444" };
  const typeLabel = { quote: "quote", note: "note", rumination: "rumination" };

  return (
    <div style={{ maxWidth: 660, margin: "0 auto", padding: "0 20px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 0 20px" }}>
        <button onClick={onBack} style={ghostBtn}>← back</button>
        <div style={{ display: "flex", gap: 16 }}>
          <button onClick={handleDelete} style={{ ...ghostBtn, color: "#e8318a" }}>delete</button>
          <button onClick={() => onEdit(book)} style={ghostBtn}>edit</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
        {["log", "annotations", "journal"].map(t => (
          <span key={t} onClick={() => setTab(t)}
            style={{ fontSize: 15, color: tab === t ? "#1a1a1a" : "#aaa", fontWeight: tab === t ? 500 : 400, cursor: "pointer", textTransform: "capitalize" }}>
            {t}
          </span>
        ))}
      </div>

      {/* LOG TAB */}
      {tab === "log" && <>
        <div style={{ background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, padding: "24px" }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 16 }}>book</div>
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start", marginBottom: 16 }}>
            {book.coverUrl
              ? <img src={book.coverUrl} alt={book.title} style={{ width: 100, height: 140, objectFit: "cover", borderRadius: 3, flexShrink: 0 }} />
              : <div style={{ width: 100, height: 140, background: "#e0e0e0", borderRadius: 3, flexShrink: 0 }} />}
            <div style={{ flex: 1 }}>
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 400, margin: "0 0 6px", color: "#1a1a1a", lineHeight: 1.2 }}>{book.title}</h1>
              <div style={{ fontSize: 14, color: "#555", marginBottom: 8 }}>
                {book.author}{book.translator ? `, trans. ${book.translator}` : ""}. {book.year}.
              </div>
              {book.partialRead && book.section && <div style={{ fontSize: 13, color: "#e8318a", fontStyle: "italic", marginBottom: 6 }}>{book.section}</div>}
              {book.rating > 0 && (
                <div style={{ fontSize: 20, color: "#555" }}>
                  {[1,2,3,4,5].map(s => s <= book.rating ? "★" : "☆").join("")}
                </div>
              )}
            </div>
          </div>

          {(book.shelves?.length > 0 || book.tags?.length > 0) && (
            <div style={{ fontSize: 13, color: "#555", lineHeight: 1.8, marginBottom: 12 }}>
              {book.shelves?.length > 0 && <div><span style={{ color: "#aaa" }}>Shelves: </span>{book.shelves.join(", ")}</div>}
              {book.tags?.length > 0 && <div><span style={{ color: "#aaa" }}>Tags: </span>{book.tags.map(t => `#${t}`).join(" ")}</div>}
            </div>
          )}

          {!book.currentlyReading && <div style={{ fontSize: 12, color: "#aaa", marginBottom: 12 }}>read on {book.dateRead}.</div>}

          <div style={{ marginTop: 8 }}>
            <button onClick={() => setShowCitation(p => !p)}
              style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 6, padding: "5px 12px", fontSize: 12, color: "#888", cursor: "pointer" }}>
              {showCitation ? "hide citation" : "MLA citation"}
            </button>
            {showCitation && (
              <div style={{ marginTop: 10, background: "#f7f7f7", borderRadius: 6, padding: "12px 14px" }}>
                <p style={{ fontSize: 13, color: "#444", lineHeight: 1.6, fontStyle: "italic", margin: "0 0 8px" }}>{generateMLA()}</p>
                <button onClick={copyCitation} style={{ background: "none", border: "none", fontSize: 12, color: copied ? "#e8318a" : "#aaa", cursor: "pointer", padding: 0 }}>
                  {copied ? "copied!" : "copy"}
                </button>
              </div>
            )}
          </div>
        </div>

        {book.notes && (
          <div style={{ background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, padding: "24px", marginTop: 10 }}>
            <p style={{ fontSize: 14, color: "#333", lineHeight: 1.7, margin: 0 }}>{book.notes}</p>
          </div>
        )}
      </>}

      {/* ANNOTATIONS TAB */}
      {tab === "annotations" && (
        <div>
          {/* Input */}
          <div style={{ background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, padding: "16px 20px", marginBottom: 10 }}>
            {/* Type toggle */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {["quote", "note"].map(t => (
                <button key={t} onClick={() => setNewType(t)}
                  style={{ background: newType === t ? "#e8318a" : "none", color: newType === t ? "#fff" : "#aaa", border: "1px solid", borderColor: newType === t ? "#e8318a" : "#e0e0e0", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer", textTransform: "capitalize" }}>
                  {t}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              <input value={newPage} onChange={e => setNewPage(e.target.value)} placeholder="pg"
                style={{ width: 44, fontSize: 14, border: "none", outline: "none", color: "#e8318a", background: "none", flexShrink: 0 }}
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
                placeholder="Note about this quote (optional)"
                style={{ width: "100%", fontSize: 13, border: "none", outline: "none", color: "#888", borderTop: "0.5px solid #f0f0f0", paddingTop: 8, background: "none", boxSizing: "border-box" }}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); saveAnnotation(); } }} />
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              {newType === "quote" && !showQuoteNote && (
                <button onClick={() => setShowQuoteNote(true)} style={{ background: "none", border: "none", color: "#ccc", fontSize: 12, cursor: "pointer", padding: 0 }}>+ add note</button>
              )}
              <button onClick={saveAnnotation} disabled={saving}
                style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 13, cursor: "pointer", marginLeft: "auto" }}>
                Save
              </button>
            </div>
          </div>

          {/* Existing annotations */}
          {annotations.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden" }}>
              {annotations.map((annot, i) => (
                <div key={annot.id} style={{ padding: "12px 20px", borderBottom: i === annotations.length - 1 ? "none" : "0.5px solid #f0f0f0", background: "#f9f9f9" }}>
                  {editingAnnotId === annot.id ? (
                    <div>
                      <textarea value={editingAnnotText} onChange={e => setEditingAnnotText(e.target.value)} rows={3} autoFocus
                        style={{ width: "100%", fontSize: 14, border: "1px solid #e0e0e0", borderRadius: 6, padding: "8px", resize: "none", outline: "none", fontFamily: "inherit", color: annot.type === "note" ? "#0000ee" : "#333", boxSizing: "border-box" }} />
                      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                        <button onClick={() => saveEditAnnotation(annot.id)} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>Save</button>
                        <button onClick={() => setEditingAnnotId(null)} style={{ background: "none", border: "none", color: "#aaa", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                        {annot.page && <span style={{ fontSize: 12, color: "#e8318a", minWidth: 36, flexShrink: 0 }}>{annot.page}</span>}
                        <span style={{ fontSize: 14, color: typeColor[annot.type] || "#333", lineHeight: 1.6, flex: 1 }}>{annot.text}</span>
                        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                          <button onClick={() => { setEditingAnnotId(annot.id); setEditingAnnotText(annot.text); }} style={{ background: "none", border: "none", color: "#ccc", fontSize: 12, cursor: "pointer", padding: 0 }}>edit</button>
                          <button onClick={() => deleteAnnotation(annot.id)} style={{ background: "none", border: "none", color: "#e0e0e0", fontSize: 14, cursor: "pointer", padding: 0 }}>×</button>
                        </div>
                      </div>
                      {annot.quoteNote && <div style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginTop: 4, marginLeft: annot.page ? 52 : 0 }}>{annot.quoteNote}</div>}
                      <div style={{ fontSize: 11, color: "#ccc", marginTop: 4, marginLeft: annot.page ? 52 : 0 }}>{typeLabel[annot.type]}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {annotations.length === 0 && (
            <div style={{ fontSize: 14, color: "#aaa", textAlign: "center", padding: "20px 0" }}>No annotations yet.</div>
          )}
        </div>
      )}

      {/* JOURNAL TAB — chronological timeline */}
      {tab === "journal" && (() => {
        const tsToDate = (ts) => {
          if (!ts) return new Date(0);
          if (ts.toDate) return ts.toDate();
          if (ts.seconds) return new Date(ts.seconds * 1000);
          if (typeof ts === "string") return new Date(ts);
          return new Date(0);
        };
        const allEntries = [
          ...annotations.map(a => ({ ...a, _ts: a.createdAt, _src: "annotation" })),
          ...ruminations.map(r => ({ ...r, type: "rumination", _ts: r.createdAt, _src: "rumination" })),
        ].sort((a, b) => tsToDate(b._ts) - tsToDate(a._ts));

        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const getDateLabel = (ts) => {
          const d = tsToDate(ts);
          if (d.getTime() === 0) return null;
          const ds = d.toDateString();
          if (ds === today) return "Earlier today";
          if (ds === yesterday) return "Yesterday";
          return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        };

        const groups = [];
        const seen = {};
        allEntries.forEach(entry => {
          const label = getDateLabel(entry._ts) || "Unknown date";
          if (!seen[label]) { seen[label] = true; groups.push({ label, entries: [] }); }
          groups[groups.length - 1].entries.push(entry);
        });

        return (
          <div>
            {allEntries.length === 0 && (
              <div style={{ fontSize: 14, color: "#aaa", textAlign: "center", padding: "20px 0" }}>Nothing here yet — add annotations or ruminations.</div>
            )}

            {/* Add rumination */}
            <div style={{ background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
              <textarea value={newRumination} onChange={e => setNewRumination(e.target.value)} rows={3}
                placeholder="Add a rumination... (Enter to save)"
                style={{ width: "100%", fontSize: 14, border: "none", outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.7, boxSizing: "border-box" }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addRumination(); } }} />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button onClick={addRumination} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 13, cursor: "pointer" }}>Add</button>
              </div>
            </div>

            {groups.map(({ label, entries }) => (
              <div key={label} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: "#aaa", fontWeight: 500, marginBottom: 8 }}>{label}</div>
                <div style={{ background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden" }}>
                  {entries.map((item, i) => (
                    <div key={item.id || i} style={{ padding: "12px 20px", borderBottom: i === entries.length - 1 ? "none" : "0.5px solid #f0f0f0" }}>
                      {editingRumId === item.id && item._src === "rumination" ? (
                        <div>
                          <textarea value={editingRumText} onChange={e => setEditingRumText(e.target.value)} rows={3} autoFocus
                            style={{ width: "100%", fontSize: 14, border: "1px solid #e0e0e0", borderRadius: 6, padding: "8px", resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.7, boxSizing: "border-box" }} />
                          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                            <button onClick={() => saveEditRum(item.id)} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>Save</button>
                            <button onClick={() => setEditingRumId(null)} style={{ background: "none", border: "none", color: "#aaa", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {item._src === "annotation" && (
                            <div>
                              <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                                {item.page && <span style={{ fontSize: 12, color: "#e8318a", minWidth: 36, flexShrink: 0 }}>{item.page}</span>}
                                <span style={{ fontSize: 14, color: typeColor[item.type] || "#333", lineHeight: 1.6, flex: 1 }}>{item.text}</span>
                              </div>
                              {item.quoteNote && <div style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginTop: 4 }}>{item.quoteNote}</div>}
                            </div>
                          )}
                          {item._src === "rumination" && (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <p style={{ fontSize: 14, color: "#444", lineHeight: 1.7, margin: 0, flex: 1 }}>{item.text}</p>
                              <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                                <button onClick={() => { setEditingRumId(item.id); setEditingRumText(item.text); }} style={{ background: "none", border: "none", color: "#ccc", fontSize: 12, cursor: "pointer", padding: 0 }}>edit</button>
                                <button onClick={() => deleteDoc(doc(db, "users", userId, "books", bookId, "ruminations", item.id))} style={{ background: "none", border: "none", color: "#e0e0e0", fontSize: 14, cursor: "pointer", padding: 0 }}>×</button>
                              </div>
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: "#ccc", marginTop: 4 }}>{typeLabel[item.type] || "rumination"}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

const ghostBtn = { background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13, padding: "4px 0" };
