import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export default function AllArticles({ userId, onSelect }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date");

  useEffect(() => {
    const q = query(collection(db, "users", userId, "articles"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [userId]);

  const sorted = [...articles].sort((a, b) => {
    if (sort === "alpha") return (a.title || "").localeCompare(b.title || "");
    return 0;
  });

  const filtered = sorted.filter(a =>
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.author?.toLowerCase().includes(search.toLowerCase()) ||
    a.publication?.toLowerCase().includes(search.toLowerCase())
  );

  const cardStyle = { background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden" };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 60px" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, author or publication..."
          style={{ flex: 1, padding: "10px 14px", fontSize: 14, border: "1px solid #e2e2e2", borderRadius: 10, background: "#fff", outline: "none" }} />
        <div style={{ display: "flex", background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
          {[["date", "Date added"], ["alpha", "A–Z"]].map(([val, label]) => (
            <button key={val} onClick={() => setSort(val)} style={{
              padding: "10px 16px", fontSize: 13, border: "none", cursor: "pointer",
              background: sort === val ? "#e8318a" : "none",
              color: sort === val ? "#fff" : "#888",
              borderRight: val === "date" ? "1px solid #e2e2e2" : "none",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {loading && <p style={{ color: "#aaa", fontSize: 15, padding: "20px 0" }}>loading...</p>}
      {!loading && filtered.length === 0 && <p style={{ color: "#aaa", fontSize: 15, padding: "20px 0" }}>no articles logged yet</p>}

      {!loading && filtered.length > 0 && (
        <div style={cardStyle}>
          {filtered.map((article, i) => (
            <div key={article.id} onClick={() => onSelect(article.id)}
              style={{ padding: "12px 16px", borderBottom: i === filtered.length - 1 ? "none" : "0.5px solid #ebebeb", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <div style={{ fontSize: 15, color: "#0000ee", textDecoration: "underline", marginBottom: 3, fontFamily: "Georgia, serif" }}>{article.title}</div>
              <div style={{ fontSize: 13, color: "#444" }}>
                {article.author}{article.publication ? ` · ${article.publication}` : ""}
                {article.datePublished ? ` · ${article.datePublished}` : ""}
              </div>
              {article.url && (
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{article.url}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
