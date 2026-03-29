import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, deleteDoc, collection, query, orderBy, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export default function ArticleDetail({ articleId, userId, onBack, onEdit }) {
  const [article, setArticle] = useState(null);
  const [showCitation, setShowCitation] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("log");
  const [ruminations, setRuminations] = useState([]);
  const [newRumination, setNewRumination] = useState("");
  const [editingRumIndex, setEditingRumIndex] = useState(null);
  const [editingRumText, setEditingRumText] = useState("");

  useEffect(() => {
    const unsubRum = onSnapshot(
      query(collection(db, "users", userId, "articles", articleId, "ruminations"), orderBy("createdAt", "desc")),
      snap => setRuminations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubArticle = onSnapshot(doc(db, "users", userId, "articles", articleId), (d) => {
      if (d.exists()) setArticle({ id: d.id, ...d.data() });
    });
    return () => { unsubRum(); unsubArticle(); };
  }, [articleId, userId]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this article?")) return;
    await deleteDoc(doc(db, "users", userId, "articles", articleId));
    onBack();
  };

  const addRumination = async () => {
    if (!newRumination.trim()) return;
    await addDoc(collection(db, "users", userId, "articles", articleId, "ruminations"), {
      text: newRumination.trim(),
      createdAt: serverTimestamp(),
    });
    setNewRumination("");
  };

  const saveEditRumination = async (id) => {
    if (!editingRumText.trim()) return;
    await updateDoc(doc(db, "users", userId, "articles", articleId, "ruminations", id), { text: editingRumText.trim() });
    setEditingRumIndex(null);
    setEditingRumText("");
  };

  const deleteRumination = async (id) => {
    await deleteDoc(doc(db, "users", userId, "articles", articleId, "ruminations", id));
  };

  const generateMLA = () => {
    const author = article.author || "";
    const parts = author.split(", ");
    const authorMLA = parts.length > 1 ? author : (() => {
      const ws = author.split(" ");
      return ws.length > 1 ? `${ws[ws.length-1]}, ${ws.slice(0,-1).join(" ")}` : author;
    })();
    const publication = article.publication ? ` *${article.publication}*,` : "";
    const date = article.datePublished ? ` ${article.datePublished},` : "";
    const doi = article.url ? ` ${article.url}.` : ".";
    return `${authorMLA}. "${article.title}."${publication}${date}${doi}`;
  };

  const copyCitation = () => {
    navigator.clipboard.writeText(generateMLA().replace(/\*/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!article) return <div style={{ padding: 40, color: "#aaa", fontSize: 14 }}>loading...</div>;

  return (
    <div style={{ maxWidth: 660, margin: "0 auto", padding: "0 20px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 0 20px" }}>
        <button onClick={onBack} style={ghostBtn}>← back</button>
        <div style={{ display: "flex", gap: 16 }}>
          <button onClick={handleDelete} style={{ ...ghostBtn, color: "#e8318a" }}>delete</button>
          <button onClick={() => onEdit(article)} style={ghostBtn}>edit</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
        {["log", "ruminations"].map(t => (
          <span key={t} onClick={() => setTab(t)}
            style={{ fontSize: 15, color: tab === t ? "#1a1a1a" : "#aaa", fontWeight: tab === t ? 500 : 400, cursor: "pointer", textTransform: "capitalize" }}>
            {t}
          </span>
        ))}
      </div>

      {tab === "log" && <>
        <div style={{ background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, padding: "24px" }}>
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 6 }}>article</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 400, margin: "0 0 6px", color: "#1a1a1a", lineHeight: 1.2 }}>{article.title}</h1>
          <div style={{ fontSize: 14, color: "#555", marginBottom: 12 }}>
            {[article.author, article.publication, article.datePublished].filter(Boolean).join(" / ")}
          </div>
          {article.url && (
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 4, wordBreak: "break-all" }}>
              <a href={article.url.startsWith("http") ? article.url : `https://doi.org/${article.url}`}
                target="_blank" rel="noopener noreferrer" style={{ color: "#aaa" }}>
                {article.url}
              </a>
            </div>
          )}
          <div style={{ fontSize: 12, color: "#aaa", marginTop: 12 }}>logged {article.dateRead}.</div>

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

        {(article.notes || article.quotes?.length > 0) && (
          <div style={{ background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, padding: "24px", marginTop: 10 }}>
            {article.notes && <p style={{ fontSize: 14, color: "#333", lineHeight: 1.7, margin: "0 0 16px" }}>{article.notes}</p>}
            {article.quotes?.length > 0 && (
              <div>
                {article.quotes.map((q, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: i === article.quotes.length - 1 ? "none" : "0.5px solid #f0f0f0" }}>
                    <div style={{ display: "flex", gap: 20, alignItems: "baseline" }}>
                      <span style={{ fontSize: 13, color: "#e8318a", minWidth: 36, flexShrink: 0 }}>{q.page}</span>
                      <span style={{ fontSize: 14, color: "#444", lineHeight: 1.5, flex: 1 }}>{q.text}</span>
                    </div>
                    {q.quoteNote && (
                      <div style={{ marginLeft: 56, marginTop: 5, fontSize: 13, color: "#888", fontStyle: "italic", lineHeight: 1.5 }}>{q.quoteNote}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </>}

      {tab === "ruminations" && (
        <div>
          <div style={{ background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
            {ruminations.length === 0 && (
              <div style={{ padding: "16px", fontSize: 14, color: "#aaa" }}>No ruminations yet.</div>
            )}
            {ruminations.map((rum, i) => (
              <div key={rum.id} style={{ padding: "14px 16px", borderBottom: i === ruminations.length - 1 ? "none" : "0.5px solid #f0f0f0", background: "#f7f7f7" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  {editingRumIndex === i ? (
                    <div style={{ flex: 1 }}>
                      <textarea value={editingRumText} onChange={e => setEditingRumText(e.target.value)}
                        rows={3} autoFocus
                        style={{ width: "100%", fontSize: 14, border: "1px solid #e0e0e0", borderRadius: 6, padding: "8px 10px", resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box" }} />
                      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                        <button onClick={() => saveEditRumination(rum.id)} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>Save</button>
                        <button onClick={() => setEditingRumIndex(null)} style={{ background: "none", border: "none", color: "#aaa", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: 14, color: "#333", lineHeight: 1.7, margin: 0, flex: 1 }}>{rum.text}</p>
                  )}
                  {editingRumIndex !== i && (
                    <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                      <button onClick={() => { setEditingRumIndex(i); setEditingRumText(rum.text); }} style={{ background: "none", border: "none", color: "#aaa", fontSize: 12, cursor: "pointer", padding: 0 }}>edit</button>
                      <button onClick={() => deleteRumination(rum.id)} style={{ background: "none", border: "none", color: "#ccc", fontSize: 14, cursor: "pointer", padding: 0 }}>×</button>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#bbb", marginTop: 6 }}>
                  {rum.createdAt?.toDate ? rum.createdAt.toDate().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, padding: "16px" }}>
            <textarea value={newRumination} onChange={e => setNewRumination(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addRumination(); } }}
              placeholder="Add a rumination... (Enter to save, Shift+Enter for new line)"
              rows={3}
              style={{ width: "100%", fontSize: 14, border: "none", outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.6, padding: 0, boxSizing: "border-box" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button onClick={addRumination} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 13, cursor: "pointer" }}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ghostBtn = { background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13, padding: "4px 0" };
