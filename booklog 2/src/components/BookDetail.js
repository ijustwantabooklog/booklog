import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, deleteDoc, collection, query, orderBy, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { logActivity } from "../activityLogger";

function StarDisplay({ value, size = 14 }) {
  return (
    <span style={{ fontSize: size, color: "#555" }}>
      {[1,2,3,4,5].map(s => s <= value ? "★" : "☆").join("")}
    </span>
  );
}

export default function BookDetail({ bookId, userId, onBack, onEdit }) {
  const [book, setBook] = useState(null);
  const [showCitation, setShowCitation] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("log");
  const [ruminations, setRuminations] = useState([]);
  const [newRumination, setNewRumination] = useState("");
  const [editingRumIndex, setEditingRumIndex] = useState(null);
  const [editingRumText, setEditingRumText] = useState("");

  useEffect(() => {
    const unsubRum = onSnapshot(
      query(collection(db, "users", userId, "books", bookId, "ruminations"), orderBy("createdAt", "desc")),
      snap => setRuminations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubBook = onSnapshot(doc(db, "users", userId, "books", bookId), (d) => {
      if (d.exists()) setBook({ id: d.id, ...d.data() });
    });
    return () => { unsubRum(); unsubBook(); };
  }, [bookId, userId]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this book?")) return;
    await deleteDoc(doc(db, "users", userId, "books", bookId));
    onBack();
  };

  const addRumination = async () => {
    if (!newRumination.trim()) return;
    await addDoc(collection(db, "users", userId, "books", bookId, "ruminations"), {
      text: newRumination.trim(), createdAt: serverTimestamp(),
    });
    await logActivity(userId, "rumination", { text: "Added a rumination to", bookTitle: book?.title, bookId });
    setNewRumination("");
  };

  const saveEditRumination = async (id) => {
    if (!editingRumText.trim()) return;
    await updateDoc(doc(db, "users", userId, "books", bookId, "ruminations", id), { text: editingRumText.trim() });
    setEditingRumIndex(null);
    setEditingRumText("");
  };

  const deleteRumination = async (id) => {
    await deleteDoc(doc(db, "users", userId, "books", bookId, "ruminations", id));
  };

  if (!book) return <div style={{ padding: 40, color: "#aaa", fontSize: 14 }}>loading...</div>;

  const shelves = book.shelves || [];
  const tags = book.tags || [];
  const notes = book.notes || book.review || "";

  const generateMLA = () => {
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

  // Journal tab: merge quotes, reading notes, ruminations by date
  const buildJournal = () => {
    const quotes = (book.quotes || []).map(q => ({ ...q, _type: "quote", _ts: book.createdAt }));
    const readingNotes = (book.readingNotes || []).map(n => ({ ...n, _type: "note", _ts: book.createdAt }));
    const rums = ruminations.map(r => ({ text: r.text, id: r.id, _type: "rumination", _ts: r.createdAt }));
    return [...quotes, ...readingNotes, ...rums].sort((a, b) => {
      const ta = a._ts?.toDate ? a._ts.toDate() : new Date(0);
      const tb = b._ts?.toDate ? b._ts.toDate() : new Date(0);
      return ta - tb; // oldest first
    });
  };

  const cardStyle = { background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10 };

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
        <div style={{ ...cardStyle, padding: "24px", marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 16 }}>book</div>
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start", marginBottom: 16 }}>
            {book.coverUrl
              ? <img src={book.coverUrl} alt={book.title} style={{ width: 100, height: 140, objectFit: "cover", borderRadius: 3, flexShrink: 0 }} />
              : <div style={{ width: 100, height: 140, background: "#e0e0e0", borderRadius: 3, flexShrink: 0 }} />}
            <div style={{ flex: 1 }}>
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 400, margin: "0 0 6px", color: "#1a1a1a", lineHeight: 1.2 }}>{book.title}</h1>
              <div style={{ fontSize: 14, color: "#555", marginBottom: 12 }}>
                {book.author}{book.translator ? `, translation by ${book.translator}` : ""}. {book.year}.
              </div>
              {book.partialRead && (
                <div style={{ fontSize: 13, color: "#e8318a", marginBottom: 8, fontStyle: "italic" }}>
                  {book.section || "Partial read"}
                </div>
              )}
              {book.rating > 0 && <StarDisplay value={book.rating} size={20} />}
            </div>
          </div>

          {(shelves.length > 0 || tags.length > 0) && (
            <div style={{ marginBottom: 12, fontSize: 13, color: "#555", lineHeight: 1.8 }}>
              {shelves.length > 0 && <div><span style={{ color: "#aaa" }}>Shelves: </span>{shelves.join(", ")}</div>}
              {tags.length > 0 && <div><span style={{ color: "#aaa" }}>Tags: </span>{tags.map(t => `#${t}`).join(" ")}</div>}
            </div>
          )}

          {!book.currentlyReading && (
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>read on {book.dateRead}.</div>
          )}

          <div style={{ marginTop: 16 }}>
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

        {(notes || book.quotes?.length > 0) && (
          <div style={{ ...cardStyle, padding: "24px" }}>
            {notes && <p style={{ fontSize: 14, color: "#333", lineHeight: 1.7, margin: "0 0 16px" }}>{notes}</p>}
            {book.quotes?.length > 0 && (
              <div>
                {book.quotes.map((q, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: i === book.quotes.length - 1 ? "none" : "0.5px solid #f0f0f0" }}>
                    <div style={{ display: "flex", gap: 20, alignItems: "baseline" }}>
                      <span style={{ fontSize: 13, color: "#e8318a", minWidth: 36, flexShrink: 0 }}>{q.page}</span>
                      <span style={{ fontSize: 14, color: "#444", lineHeight: 1.5, flex: 1 }}>{q.text}</span>
                    </div>
                    {q.quoteNote && <div style={{ marginLeft: 56, marginTop: 5, fontSize: 13, color: "#888", fontStyle: "italic", lineHeight: 1.5 }}>{q.quoteNote}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </>}

      {/* ANNOTATIONS TAB */}
      {tab === "annotations" && (() => {
        const quotes = (book.quotes || []).map(q => ({ ...q, _type: "quote" }));
        const notes = (book.readingNotes || []).map(n => ({ ...n, _type: "note" }));
        const all = [...quotes, ...notes].sort((a, b) => (parseInt(a.page)||0) - (parseInt(b.page)||0));
        return (
          <div style={{ ...cardStyle, overflow: "hidden" }}>
            {all.length === 0 && <div style={{ padding: "16px", fontSize: 14, color: "#aaa" }}>No quotes or reading notes yet.</div>}
            {all.map((item, i) => (
              <div key={i} style={{ padding: "12px 20px", borderBottom: i === all.length - 1 ? "none" : "0.5px solid #f0f0f0" }}>
                <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                  <span style={{ fontSize: 13, color: "#e8318a", minWidth: 36, flexShrink: 0 }}>{item.page || "—"}</span>
                  <span style={{ fontSize: 14, color: item._type === "note" ? "#0000ee" : "#333", lineHeight: 1.6, flex: 1 }}>{item.text}</span>
                </div>
                {item.quoteNote && <div style={{ marginLeft: 52, marginTop: 4, fontSize: 13, color: "#888", fontStyle: "italic" }}>{item.quoteNote}</div>}
                <div style={{ marginLeft: 52, marginTop: 3, fontSize: 11, color: "#ccc" }}>{item._type === "note" ? "reading note" : "quote"}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* JOURNAL TAB */}
      {tab === "journal" && (() => {
        const entries = buildJournal();
        return (
          <div>
            {entries.length === 0 && (
              <div style={{ ...cardStyle, padding: "16px", fontSize: 14, color: "#aaa" }}>Nothing here yet.</div>
            )}
            <div style={{ ...cardStyle, overflow: "hidden", marginBottom: 10 }}>
              {entries.map((item, i) => (
                <div key={i} style={{ padding: "14px 20px", borderBottom: i === entries.length - 1 ? "none" : "0.5px solid #f0f0f0" }}>
                  {item._type === "quote" && (
                    <>
                      <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                        {item.page && <span style={{ fontSize: 12, color: "#e8318a", minWidth: 36, flexShrink: 0 }}>{item.page}</span>}
                        <span style={{ fontSize: 14, color: "#333", lineHeight: 1.6, flex: 1 }}>{item.text}</span>
                      </div>
                      {item.quoteNote && <div style={{ marginLeft: item.page ? 52 : 0, marginTop: 4, fontSize: 13, color: "#888", fontStyle: "italic" }}>{item.quoteNote}</div>}
                      <div style={{ marginLeft: item.page ? 52 : 0, marginTop: 3, fontSize: 11, color: "#ccc" }}>quote</div>
                    </>
                  )}
                  {item._type === "note" && (
                    <>
                      <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                        {item.page && <span style={{ fontSize: 12, color: "#e8318a", minWidth: 36, flexShrink: 0 }}>{item.page}</span>}
                        <span style={{ fontSize: 14, color: "#0000ee", lineHeight: 1.6, flex: 1 }}>{item.text}</span>
                      </div>
                      <div style={{ marginLeft: item.page ? 52 : 0, marginTop: 3, fontSize: 11, color: "#ccc" }}>reading note</div>
                    </>
                  )}
                  {item._type === "rumination" && (
                    <>
                      <p style={{ fontSize: 14, color: "#444", lineHeight: 1.7, margin: 0 }}>{item.text}</p>
                      <div style={{ marginTop: 4, fontSize: 11, color: "#ccc" }}>
                        rumination{item._ts?.toDate ? ` · ${item._ts.toDate().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : ""}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Add rumination in journal tab */}
            <div style={{ ...cardStyle, padding: "16px" }}>
              <textarea value={newRumination} onChange={e => setNewRumination(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addRumination(); } }}
                placeholder="Add a rumination... (Enter to save)"
                rows={3}
                style={{ width: "100%", fontSize: 14, border: "none", outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.6, padding: 0, boxSizing: "border-box" }} />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button onClick={addRumination} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 13, cursor: "pointer" }}>Add</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const ghostBtn = { background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13, padding: "4px 0" };
