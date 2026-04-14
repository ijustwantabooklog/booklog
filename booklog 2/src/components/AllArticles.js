import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export default function AllArticles({ userId, onSelect }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date");

  useEffect(() => {
    return onSnapshot(query(collection(db, "users", userId, "articles"), orderBy("createdAt", "desc")), snap => {
      setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [userId]);

  const sorted = [...articles].sort((a, b) =>
    sort === "alpha" ? (a.title || "").localeCompare(b.title || "") : 0
  );
  const filtered = sorted.filter(a =>
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.author?.toLowerCase().includes(search.toLowerCase()) ||
    a.publication?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, author or publication..."
          style={{ flex: 1 }} />
        <div>
          {[["date","Date added"],["alpha","A–Z"]].map(([val, label]) => (
            <button key={val} onClick={() => setSort(val)}
              style={{ padding: "4px 12px", fontSize: 13, border: "1px solid #999", borderRight: val === "alpha" ? "1px solid #999" : "none", background: sort === val ? "#e8318a" : "#f0f0f0", color: sort === val ? "#fff" : "#333", cursor: "pointer", fontFamily: "Arial, sans-serif" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p style={{ color: "#666", fontStyle: "italic" }}>loading...</p>}
      {!loading && filtered.length === 0 && <p style={{ color: "#666", fontStyle: "italic" }}>no articles logged yet</p>}

      {!loading && filtered.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {filtered.map(article => (
              <tr key={article.id} onClick={() => onSelect(article.id)} style={{ cursor: "pointer", borderBottom: "1px solid #eee" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f9f9f9"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                <td style={{ padding: "6px 0", verticalAlign: "top" }}>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 15, color: "#00e", textDecoration: "underline" }}>{article.title}</div>
                  <div style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: "#555", marginTop: 2 }}>
                    {[article.author, article.publication, article.datePublished].filter(Boolean).join(" · ")}
                  </div>
                  {article.url && <div style={{ fontFamily: "Arial, sans-serif", fontSize: 11, color: "#999", marginTop: 1 }}>{article.url}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
