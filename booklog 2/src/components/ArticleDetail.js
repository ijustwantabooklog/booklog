import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, deleteDoc } from "firebase/firestore";

export default function ArticleDetail({ articleId, userId, onBack, onEdit }) {
  const [article, setArticle] = useState(null);

  useEffect(() => {
    return onSnapshot(doc(db, "users", userId, "articles", articleId), (d) => {
      if (d.exists()) setArticle({ id: d.id, ...d.data() });
    });
  }, [articleId, userId]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this article?")) return;
    await deleteDoc(doc(db, "users", userId, "articles", articleId));
    onBack();
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

      <div style={{ background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, padding: "24px" }}>
        <div style={{ fontSize: 11, color: "#aaa", marginBottom: 6 }}>article</div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 400, margin: "0 0 8px", color: "#1a1a1a", lineHeight: 1.3 }}>{article.title}</h1>
        <div style={{ fontSize: 14, color: "#555", marginBottom: 4 }}>
          {article.author}{article.publication ? ` · ${article.publication}` : ""}
        </div>
        {article.datePublished && <div style={{ fontSize: 13, color: "#aaa", marginBottom: 12 }}>{article.datePublished}</div>}
        {article.url && (
          <a href={article.url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 13, color: "#0000ee", display: "block", marginBottom: 16, wordBreak: "break-all" }}>
            {article.url}
          </a>
        )}

        {article.notes && <p style={{ fontSize: 14, color: "#333", lineHeight: 1.7, margin: "0 0 16px" }}>{article.notes}</p>}

        {article.quotes?.length > 0 && (
          <div style={{ margin: "0 0 20px" }}>
            {article.quotes.map((q, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: "0.5px solid #f0f0f0" }}>
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

        <div style={{ fontSize: 12, color: "#aaa", marginTop: 12 }}>logged {article.dateRead}.</div>
      </div>
    </div>
  );
}

const ghostBtn = { background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13, padding: "4px 0" };
