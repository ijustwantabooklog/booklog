import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export default function Library({ userId, onOpenSession, onViewDetail }) {
  const [books, setBooks] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  useEffect(() => {
    let b = false, a = false;
    const u1 = onSnapshot(query(collection(db, "users", userId, "books"), orderBy("title")),
      snap => { setBooks(snap.docs.map(d => ({ id: d.id, col: "books", ...d.data() }))); b = true; if (a) setLoading(false); });
    const u2 = onSnapshot(query(collection(db, "users", userId, "articles"), orderBy("title")),
      snap => { setArticles(snap.docs.map(d => ({ id: d.id, col: "articles", ...d.data() }))); a = true; if (b) setLoading(false); });
    return () => { u1(); u2(); };
  }, [userId]);

  // Separate standalone books, chapters, and articles
  const standaloneBooks = books.filter(b => !b.isChapter);
  const chapters = books.filter(b => b.isChapter);

  // Group chapters under their parent book title
  const chaptersByBook = {};
  chapters.forEach(ch => {
    const key = ch.title || "Unknown book";
    if (!chaptersByBook[key]) chaptersByBook[key] = [];
    chaptersByBook[key].push(ch);
  });

  // Books that only exist as chapters (no standalone entry)
  const standaloneBookTitles = new Set(standaloneBooks.map(b => b.title));
  const chapterOnlyBooks = Object.keys(chaptersByBook).filter(t => !standaloneBookTitles.has(t));

  const usefulLabel = (u) => {
    if (u === true) return <span className="mono" style={{ fontSize: 12, color: "green" }}> [useful]</span>;
    if (u === false) return <span className="mono" style={{ fontSize: 12, color: "#c00" }}> [not useful]</span>;
    return null;
  };

  const matchesSearch = (e) =>
    !search ||
    e.title?.toLowerCase().includes(search.toLowerCase()) ||
    e.author?.toLowerCase().includes(search.toLowerCase()) ||
    e.chapterTitle?.toLowerCase().includes(search.toLowerCase());

  const visibleBooks = standaloneBooks.filter(matchesSearch);
  const visibleArticles = articles.filter(matchesSearch);

  return (
    <div className="wrap">
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="search titles, authors..." style={{ width: 280 }} />
        <span className="mono" style={{ fontSize: 13 }}>
          {["all","books","articles"].map(t => (
            <span key={t} onClick={() => setTab(t)}
              style={{ cursor: "pointer", color: tab === t ? "#000" : "#00c", textDecoration: tab === t ? "none" : "underline", fontWeight: tab === t ? "bold" : "normal", marginRight: 10 }}>
              [{t}]
            </span>
          ))}
        </span>
      </div>

      {loading && <p className="mono">loading...</p>}

      {/* Books section */}
      {!loading && (tab === "all" || tab === "books") && (
        <div style={{ marginBottom: 20 }}>
          <div className="section-label">books</div>
          {visibleBooks.length === 0 && chapterOnlyBooks.length === 0 && (
            <p style={{ fontStyle: "italic", color: "#555" }}>no books found</p>
          )}
          <table className="bordered">
            <thead>
              <tr>
                <th>title</th>
                <th style={{ width: 180 }}>author</th>
                <th style={{ width: 80 }}>verdict</th>
                <th style={{ width: 70 }}></th>
              </tr>
            </thead>
            <tbody>
              {visibleBooks.map(book => (
                <React.Fragment key={book.id}>
                  {/* Standalone book row */}
                  <tr>
                    <td style={{ fontSize: 16 }}>
                      <a onClick={() => onViewDetail(book.id, book.col)} style={{ fontStyle: "italic" }}>{book.title}</a>
                      {book.currentlyReading && <span className="mono" style={{ fontSize: 12, color: "#888" }}> [reading]</span>}
                    </td>
                    <td className="mono" style={{ fontSize: 13, color: "#555" }}>{book.author}</td>
                    <td>{usefulLabel(book.useful)}</td>
                    <td style={{ textAlign: "right" }}>
                      <a className="mono" style={{ fontSize: 12 }} onClick={() => onOpenSession(book.id, book.col)}>[open →]</a>
                    </td>
                  </tr>
                  {/* Chapters of this book */}
                  {chaptersByBook[book.title] && chaptersByBook[book.title]
                    .filter(ch => !search || ch.chapterTitle?.toLowerCase().includes(search.toLowerCase()))
                    .sort((a, b) => (a.chapterNumber || "").localeCompare(b.chapterNumber || ""))
                    .map(ch => (
                      <tr key={ch.id} style={{ background: "#fafafa" }}>
                        <td style={{ fontSize: 15, paddingLeft: 28 }}>
                          <span className="mono" style={{ color: "#aaa", marginRight: 6 }}>↳</span>
                          <a onClick={() => onViewDetail(ch.id, ch.col)} style={{ fontStyle: "italic" }}>{ch.chapterTitle}</a>
                          {ch.chapterNumber && <span className="mono" style={{ fontSize: 12, color: "#888" }}> [{ch.chapterNumber}]</span>}
                        </td>
                        <td className="mono" style={{ fontSize: 13, color: "#aaa" }}></td>
                        <td>{usefulLabel(ch.useful)}</td>
                        <td style={{ textAlign: "right" }}>
                          <a className="mono" style={{ fontSize: 12 }} onClick={() => onOpenSession(ch.id, ch.col)}>[open →]</a>
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              ))}

              {/* Books that only exist as chapters (no standalone entry) */}
              {chapterOnlyBooks.filter(t => !search || t.toLowerCase().includes(search.toLowerCase())).map(bookTitle => (
                <React.Fragment key={bookTitle}>
                  <tr style={{ background: "#f5f5f5" }}>
                    <td style={{ fontSize: 16 }} colSpan={4}>
                      <span style={{ fontStyle: "italic", color: "#555" }}>{bookTitle}</span>
                      <span className="mono" style={{ fontSize: 12, color: "#aaa" }}> — chapters only</span>
                    </td>
                  </tr>
                  {chaptersByBook[bookTitle]
                    .sort((a, b) => (a.chapterNumber || "").localeCompare(b.chapterNumber || ""))
                    .map(ch => (
                      <tr key={ch.id} style={{ background: "#fafafa" }}>
                        <td style={{ fontSize: 15, paddingLeft: 28 }}>
                          <span className="mono" style={{ color: "#aaa", marginRight: 6 }}>↳</span>
                          <a onClick={() => onViewDetail(ch.id, ch.col)} style={{ fontStyle: "italic" }}>{ch.chapterTitle}</a>
                          {ch.chapterNumber && <span className="mono" style={{ fontSize: 12, color: "#888" }}> [{ch.chapterNumber}]</span>}
                        </td>
                        <td className="mono" style={{ fontSize: 13, color: "#555" }}>{ch.author}</td>
                        <td>{usefulLabel(ch.useful)}</td>
                        <td style={{ textAlign: "right" }}>
                          <a className="mono" style={{ fontSize: 12 }} onClick={() => onOpenSession(ch.id, ch.col)}>[open →]</a>
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Articles section */}
      {!loading && (tab === "all" || tab === "articles") && (
        <div>
          <div className="section-label">articles</div>
          {visibleArticles.length === 0 && (
            <p style={{ fontStyle: "italic", color: "#555" }}>no articles found</p>
          )}
          {visibleArticles.length > 0 && (
            <table className="bordered">
              <thead>
                <tr>
                  <th>title</th>
                  <th style={{ width: 180 }}>author</th>
                  <th style={{ width: 80 }}>verdict</th>
                  <th style={{ width: 70 }}></th>
                </tr>
              </thead>
              <tbody>
                {visibleArticles.map(article => (
                  <tr key={article.id}>
                    <td style={{ fontSize: 16 }}>
                      <a onClick={() => onViewDetail(article.id, article.col)} style={{ fontStyle: "normal" }}>"{article.title}"</a>
                      {article.publication && <span className="mono" style={{ fontSize: 12, color: "#888" }}> — {article.publication}</span>}
                    </td>
                    <td className="mono" style={{ fontSize: 13, color: "#555" }}>{article.author}</td>
                    <td>{usefulLabel(article.useful)}</td>
                    <td style={{ textAlign: "right" }}>
                      <a className="mono" style={{ fontSize: 12 }} onClick={() => onOpenSession(article.id, article.col)}>[open →]</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
