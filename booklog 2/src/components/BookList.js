import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc, limit } from "firebase/firestore";

function StarDisplay({ value, size = 13 }) {
  return (
    <span style={{ fontSize: size, color: "#555" }}>
      {[1,2,3,4,5].map(s => s <= value ? "★" : "☆").join("")}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatActivityDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function BookList({ userId, onSelect, onSelectArticle, onShelfClick, onTagClick, onViewProject }) {
  const [books, setBooks] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityTab, setActivityTab] = useState("mine");
  const [followingActivity, setFollowingActivity] = useState([]);
  const [allActivity, setAllActivity] = useState([]);
  const [latestProject, setLatestProject] = useState(null);

  useEffect(() => {
    const q1 = query(collection(db, "users", userId, "books"), orderBy("createdAt", "desc"));
    const q2 = query(collection(db, "users", userId, "articles"), orderBy("createdAt", "desc"));
    let booksLoaded = false, articlesLoaded = false;
    const unsub1 = onSnapshot(q1, (snap) => {
      setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      booksLoaded = true;
      if (articlesLoaded) setLoading(false);
    });
    const unsub2 = onSnapshot(q2, (snap) => {
      setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      articlesLoaded = true;
      if (booksLoaded) setLoading(false);
    });
    // Load following activity
    const followingUnsub = onSnapshot(collection(db, "users", userId, "following"), async snap => {
      const followingIds = snap.docs.map(d => d.id);
      if (followingIds.length === 0) { setFollowingActivity([]); return; }
      const allActivity = [];
      await Promise.all(followingIds.map(async fid => {
        const profileDoc = await getDoc(doc(db, "users", fid, "profile", "info"));
        const username = profileDoc.exists() ? profileDoc.data().username : fid;
        const booksSnap = await new Promise(resolve => {
          const q = query(collection(db, "users", fid, "books"), orderBy("updatedAt", "desc"));
          const unsub = onSnapshot(q, snap => { resolve(snap); unsub(); });
        });
        const articlesSnap = await new Promise(resolve => {
          const q = query(collection(db, "users", fid, "articles"), orderBy("updatedAt", "desc"));
          const unsub = onSnapshot(q, snap => { resolve(snap); unsub(); });
        });
        booksSnap.docs.slice(0, 5).forEach(d => {
          const book = d.data();
          let text = "logged";
          if (book.currentlyReading) text = "marked as currently reading";
          else if (book.rating > 0 && book.notes) text = "read and reviewed";
          else if (book.rating > 0) text = "read and rated";
          allActivity.push({ username, text, title: book.title, type: "book", ts: book.updatedAt || book.createdAt });
        });
        articlesSnap.docs.slice(0, 5).forEach(d => {
          const article = d.data();
          allActivity.push({ username, text: "logged article", title: article.title, type: "article", ts: article.updatedAt || article.createdAt });
        });
      }));
      allActivity.sort((a, b) => {
        const ta = a.ts?.toDate ? a.ts.toDate() : new Date(0);
        const tb = b.ts?.toDate ? b.ts.toDate() : new Date(0);
        return tb - ta;
      });
      setFollowingActivity(allActivity.slice(0, 20));
    });

    const unsubProject = onSnapshot(
      query(collection(db, "users", userId, "projects"), orderBy("updatedAt", "desc")),
      snap => setLatestProject(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() })
    );
    const unsubActivity = onSnapshot(
      query(collection(db, "users", userId, "activity"), orderBy("createdAt", "desc")),
      snap => setAllActivity(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 20))
    );
    return () => { unsub1(); unsub2(); followingUnsub(); unsubActivity(); unsubProject(); };
  }, [userId]);

  const shelves = [...new Set(books.flatMap(b => b.shelves || []).filter(Boolean))].sort();
  const tags = [...new Set(books.flatMap(b => b.tags || []).filter(Boolean))].sort();
  const currentlyReading = books.filter(b => b.currentlyReading);
  const finished = books.filter(b => !b.currentlyReading);

  // allActivity comes from Firebase activity collection via state

  // Stats
  const thisYear = new Date().getFullYear();
  const totalBooks = books.length;
  const booksThisYear = books.filter(b => {
    const d = new Date(b.dateRead); return !isNaN(d) && d.getFullYear() === thisYear;
  }).length;
  const totalArticles = articles.length;
  const articlesThisYear = articles.filter(a => {
    const d = new Date(a.dateRead); return !isNaN(d) && d.getFullYear() === thisYear;
  }).length;

  const cardStyle = { background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden" };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 60px" }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>

          {latestProject && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 15, color: "#444", fontWeight: 500, marginBottom: 10 }}>Current Project</div>
              <div onClick={() => onViewProject?.(latestProject.id)}
                style={{ background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, padding: "16px 20px", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                <div style={{ fontSize: 16, fontFamily: "Georgia, serif", color: "#1a1a1a", marginBottom: 4 }}>{latestProject.title}</div>
                {latestProject.description && <div style={{ fontSize: 13, color: "#888" }}>{latestProject.description}</div>}
              </div>
            </div>
          )}

          {currentlyReading.length > 0 && (
            <div>
              <div style={{ fontSize: 15, color: "#444", fontWeight: 500, marginBottom: 10 }}>Currently Reading</div>
              <div style={cardStyle}>
                {currentlyReading.map((book, i) => (
                  <div key={book.id}
                    style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", borderBottom: i === currentlyReading.length - 1 ? "none" : "0.5px solid #ebebeb" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    <div onClick={() => onSelect(book.id)} style={{ display: "flex", gap: 12, alignItems: "center", flex: 1, cursor: "pointer", minWidth: 0 }}>
                      {book.coverUrl
                        ? <img src={book.coverUrl} alt={book.title} style={{ width: 36, height: 52, objectFit: "cover", border: "1px solid #ddd", borderRadius: 2, flexShrink: 0 }} />
                        : <div style={{ width: 36, height: 52, background: "#e8e8e8", border: "1px solid #ddd", borderRadius: 2, flexShrink: 0 }} />}
                      <div>
                        <div style={{ fontSize: 15, color: "#0000ee", textDecoration: "underline", marginBottom: 2, fontFamily: "Georgia, serif" }}>{book.title}</div>
                        <div style={{ fontSize: 13, color: "#444" }}>{book.author}</div>
                      </div>
                    </div>
                    <button onClick={async (e) => {
                      e.stopPropagation();
                      const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
                      await updateDoc(doc(db, "users", userId, "books", book.id), { currentlyReading: false, dateRead: today });
                    }} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 6, padding: "4px 12px", fontSize: 12, color: "#888", cursor: "pointer", flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#e8318a"; e.currentTarget.style.color = "#e8318a"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#e0e0e0"; e.currentTarget.style.color = "#888"; }}>
                      Mark as read
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && (books.filter(b => !b.currentlyReading).length > 0 || articles.length > 0) && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 15, color: "#444", fontWeight: 500, marginBottom: 10 }}>Recently Logged</div>
              <div style={cardStyle}>
                {[...books.filter(b => !b.currentlyReading).map(b => ({ ...b, _type: "book" })),
                  ...articles.map(a => ({ ...a, _type: "article" }))]
                  .sort((a, b) => {
                    const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                    const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                    return tb - ta;
                  })
                  .slice(0, 5)
                  .map((entry, i, arr) => (
                    <div key={entry.id} onClick={() => entry._type === "book" ? onSelect(entry.id) : onSelectArticle(entry.id)}
                      style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 16px", borderBottom: i === arr.length - 1 ? "none" : "0.5px solid #ebebeb", cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}>
                      {entry._type === "book" ? (
                        entry.coverUrl
                          ? <img src={entry.coverUrl} alt={entry.title} style={{ width: 36, height: 52, objectFit: "cover", border: "1px solid #ddd", borderRadius: 2, flexShrink: 0 }} />
                          : <div style={{ width: 36, height: 52, background: "#e8e8e8", border: "1px solid #ddd", borderRadius: 2, flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 36, height: 52, background: "#f0e8ff", border: "1px solid #ddd", borderRadius: 2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 9, color: "#888", textAlign: "center", lineHeight: 1.3 }}>art-<br/>icle</span>
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, color: "#0000ee", textDecoration: "underline", marginBottom: 2, fontFamily: entry._type === "book" ? "Georgia, serif" : "inherit" }}>{entry.title}</div>
                        <div style={{ fontSize: 13, color: "#444" }}>
                          {entry._type === "book"
                            ? `${entry.author}${entry.translator ? `, trans. ${entry.translator}` : ""}`
                            : [entry.author, entry.publication].filter(Boolean).join(" · ")}
                        </div>
                        {entry._type === "book" && entry.rating > 0 && <StarDisplay value={entry.rating} size={13} />}
                      </div>
                      {entry._type === "article" && <span style={{ fontSize: 11, color: "#e8318a", border: "1px solid #e8318a", borderRadius: 3, padding: "1px 6px", flexShrink: 0, marginTop: 2 }}>article</span>}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {!loading && (allActivity.length > 0 || followingActivity.length > 0) && (
            <div>
              <div style={{ display: "flex", gap: 0, marginBottom: 10 }}>
                {["mine", "following"].map(tab => (
                  <span key={tab} onClick={() => setActivityTab(tab)}
                    style={{ fontSize: 15, color: activityTab === tab ? "#1a1a1a" : "#aaa", fontWeight: activityTab === tab ? 500 : 400, cursor: "pointer", marginRight: 16 }}>
                    {tab === "mine" ? "My Activity" : "Following"}
                  </span>
                ))}
              </div>
              <div style={cardStyle}>
                {activityTab === "mine" && allActivity.map((entry, i) => {
                  const title = entry.bookTitle || entry.articleTitle || "";
                  const id = entry.bookId || entry.articleId;
                  const isArticle = !!entry.articleId;
                  const date = entry.createdAt?.toDate ? entry.createdAt.toDate().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "";
                  return (
                    <div key={entry.id}
                      onClick={() => id && (isArticle ? onSelectArticle(id) : onSelect(id))}
                      style={{ padding: "12px 16px", borderBottom: i === allActivity.length - 1 ? "none" : "0.5px solid #ebebeb", fontSize: 14, color: "#444", cursor: id ? "pointer" : "default", lineHeight: 1.5 }}
                      onMouseEnter={e => { if (id) e.currentTarget.style.background = "#fafafa"; }}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}>
                      {entry.text} <strong style={{ color: "#333" }}>{title}</strong>{date ? ` on ${date}` : ""}.
                      {isArticle && <span style={{ fontSize: 11, color: "#e8318a", border: "1px solid #e8318a", borderRadius: 3, padding: "1px 6px", marginLeft: 8 }}>article</span>}
                      {entry.shelf && <span style={{ fontSize: 11, color: "#555", marginLeft: 4 }}>"{entry.shelf}"</span>}
                      {entry.tag && <span style={{ fontSize: 11, color: "#555", marginLeft: 4 }}>#{entry.tag}</span>}
                    </div>
                  );
                })}
                {activityTab === "following" && followingActivity.length === 0 && (
                  <div style={{ padding: "16px", fontSize: 14, color: "#aaa" }}>No activity from people you follow yet.</div>
                )}
                {activityTab === "following" && followingActivity.map((entry, i) => (
                  <div key={i} style={{ padding: "12px 16px", borderBottom: i === followingActivity.length - 1 ? "none" : "0.5px solid #ebebeb", fontSize: 14, color: "#444", lineHeight: 1.5 }}>
                    <strong style={{ color: "#333", fontWeight: 500 }}>{entry.username}</strong> {entry.text} <strong style={{ color: "#333", fontWeight: 500 }}>{entry.title}</strong> on {formatActivityDate(entry.ts)}.
                    {entry.type === "article" && <span style={{ fontSize: 11, color: "#e8318a", border: "1px solid #e8318a", borderRadius: 3, padding: "1px 6px", marginLeft: 8 }}>article</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && <p style={{ color: "#aaa", fontSize: 15, padding: "20px 0" }}>loading...</p>}
          {!loading && books.length === 0 && articles.length === 0 && <p style={{ fontSize: 15, color: "#aaa", padding: "20px 0" }}>no books yet — tap "Log it" to add your first</p>}
        </div>

        {/* Sidebar */}
        <div style={{ width: 190, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, paddingTop: 26 }}>
          {/* Stats */}
          <div style={cardStyle}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#444", borderBottom: "1px solid #e0e0e0", padding: "14px 16px 10px" }}>Stats</div>
            <div style={{ padding: "10px 16px", borderBottom: "0.5px solid #ebebeb" }}>
              <div style={{ fontSize: 12, color: "#aaa", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Books</div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#444" }}>Total</span>
                <span style={{ fontSize: 13, color: "#888" }}>{totalBooks}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                <span style={{ fontSize: 13, color: "#444" }}>{thisYear}</span>
                <span style={{ fontSize: 13, color: "#888" }}>{booksThisYear}</span>
              </div>
            </div>
            <div style={{ padding: "10px 16px" }}>
              <div style={{ fontSize: 12, color: "#aaa", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Articles</div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#444" }}>Total</span>
                <span style={{ fontSize: 13, color: "#888" }}>{totalArticles}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                <span style={{ fontSize: 13, color: "#444" }}>{thisYear}</span>
                <span style={{ fontSize: 13, color: "#888" }}>{articlesThisYear}</span>
              </div>
            </div>
          </div>

          {/* Shelves */}
          {shelves.length > 0 && (
            <div style={cardStyle}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#444", borderBottom: "1px solid #e0e0e0", padding: "14px 16px 10px" }}>Shelves</div>
              {shelves.map((shelf, i) => (
                <div key={shelf} onClick={() => onShelfClick(shelf)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: i === shelves.length - 1 ? "none" : "0.5px solid #ebebeb", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <span style={{ fontSize: 14, color: "#0000ee", textDecoration: "underline" }}>{shelf}</span>
                  <span style={{ fontSize: 12, color: "#aaa" }}>{books.filter(b => (b.shelves || []).some(s => (typeof s === 'string' ? s : s.name) === shelf)).length}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div style={cardStyle}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#444", borderBottom: "1px solid #e0e0e0", padding: "14px 16px 10px" }}>Tags</div>
              {tags.map((tag, i) => (
                <div key={tag} onClick={() => onTagClick(tag)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: i === tags.length - 1 ? "none" : "0.5px solid #ebebeb", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <span style={{ fontSize: 14, color: "#0000ee", textDecoration: "underline" }}>#{tag}</span>
                  <span style={{ fontSize: 12, color: "#aaa" }}>{books.filter(b => (b.tags || []).includes(tag)).length}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
