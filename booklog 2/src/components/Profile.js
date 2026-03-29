import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, updateDoc, collection, query, orderBy, setDoc, deleteDoc, getDoc } from "firebase/firestore";

function formatActivityDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Profile({ userId, username, currentUserId, onBack, onSelectBook, onSelectArticle, onNavigate, onShelfClick }) {
  const isOwnProfile = userId === currentUserId;

  const [profile, setProfile] = useState({ bio: "" });
  const [books, setBooks] = useState([]);
  const [articles, setArticles] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [allActivity, setAllActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let booksLoaded = false, articlesLoaded = false;
    const unsub1 = onSnapshot(doc(db, "users", userId, "profile", "info"), d => {
      if (d.exists()) setProfile(d.data());
    });
    const unsub2 = onSnapshot(
      query(collection(db, "users", userId, "books"), orderBy("createdAt", "desc")),
      snap => { setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() }))); booksLoaded = true; if (articlesLoaded) setLoading(false); }
    );
    const unsub3 = onSnapshot(
      query(collection(db, "users", userId, "articles"), orderBy("createdAt", "desc")),
      snap => { setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() }))); articlesLoaded = true; if (booksLoaded) setLoading(false); }
    );
    const unsub4 = onSnapshot(collection(db, "users", userId, "followers"), async snap => {
      setIsFollowing(snap.docs.some(d => d.id === currentUserId));
      const names = await Promise.all(snap.docs.map(async d => {
        const p = await getDoc(doc(db, "users", d.id, "profile", "info"));
        return p.exists() ? p.data().username || d.id : d.id;
      }));
      setFollowersList(names);
    });
    const unsub5 = onSnapshot(collection(db, "users", userId, "following"), async snap => {
      const list = await Promise.all(snap.docs.map(async d => {
        const p = await getDoc(doc(db, "users", d.id, "profile", "info"));
        return { id: d.id, username: p.exists() ? p.data().username || d.id : d.id };
      }));
      setFollowingList(list);
    });
    const unsub6 = onSnapshot(
      query(collection(db, "users", userId, "activity"), orderBy("createdAt", "desc")),
      snap => setAllActivity(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 15))
    );
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); };
  }, [userId, currentUserId]);

  const saveBio = async () => {
    await updateDoc(doc(db, "users", userId, "profile", "info"), { bio: bioInput.trim() });
    setEditingBio(false);
  };

  const handleFollow = async () => {
    await setDoc(doc(db, "users", currentUserId, "following", userId), { followedAt: new Date() });
    await setDoc(doc(db, "users", userId, "followers", currentUserId), { followedAt: new Date() });
  };

  const handleUnfollow = async () => {
    await deleteDoc(doc(db, "users", currentUserId, "following", userId));
    await deleteDoc(doc(db, "users", userId, "followers", currentUserId));
  };

  const thisYear = new Date().getFullYear();
  const currentlyReading = books.filter(b => b.currentlyReading);
  const shelves = [...new Set(books.flatMap(b => b.shelves || []).filter(Boolean))].sort();

  const recentlyLogged = [...books.filter(b => !b.currentlyReading).map(b => ({ ...b, _type: "book" })),
    ...articles.map(a => ({ ...a, _type: "article" }))]
    .sort((a, b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return tb - ta;
    }).slice(0, 5);

  const cardStyle = { background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden", marginBottom: 10 };
  const sectionHeading = { fontSize: 15, color: "#444", fontWeight: 500, borderBottom: "1px solid #e0e0e0", padding: "14px 16px 10px" };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 60px" }}>

      {!isOwnProfile && onBack && (
        <div style={{ padding: "24px 0 16px" }}>
          <button onClick={onBack} style={ghostBtn}>← back</button>
        </div>
      )}

      {/* Header card */}
      <div style={{ ...cardStyle, padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 24, color: "#444", marginBottom: 8 }}>{username}</div>
            {isOwnProfile ? (
              editingBio ? (
                <div>
                  <textarea value={bioInput} onChange={e => setBioInput(e.target.value)} rows={2} autoFocus
                    style={{ width: "100%", fontSize: 14, color: "#444", border: "1px solid #e0e0e0", borderRadius: 6, padding: "8px 10px", resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box" }} />
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <button onClick={saveBio} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 13, cursor: "pointer" }}>Save</button>
                    <button onClick={() => setEditingBio(false)} style={{ background: "none", border: "none", color: "#aaa", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => { setBioInput(profile.bio || ""); setEditingBio(true); }}
                  style={{ fontSize: 14, color: profile.bio ? "#555" : "#ccc", lineHeight: 1.6, cursor: "pointer" }}>
                  {profile.bio || "Add a bio..."}
                </div>
              )
            ) : (
              profile.bio && <div style={{ fontSize: 14, color: "#555", lineHeight: 1.6 }}>{profile.bio}</div>
            )}
          </div>
          {!isOwnProfile && (
            <button onClick={isFollowing ? handleUnfollow : handleFollow}
              style={{ background: isFollowing ? "none" : "#e8318a", color: isFollowing ? "#aaa" : "#fff", border: isFollowing ? "1px solid #ddd" : "none", borderRadius: 6, padding: "6px 16px", fontSize: 13, cursor: "pointer", marginLeft: 20, flexShrink: 0 }}>
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}
        </div>

        {/* Stats */}
        <div style={{ borderTop: "0.5px solid #f0f0f0", marginTop: 16, paddingTop: 14, display: "flex", gap: 20 }}>
          <span onClick={() => isOwnProfile && onNavigate?.("books")}
            style={{ fontSize: 13, color: "#888", cursor: isOwnProfile ? "pointer" : "default" }}
            onMouseEnter={e => { if (isOwnProfile) e.currentTarget.style.color = "#e8318a"; }}
            onMouseLeave={e => e.currentTarget.style.color = "#888"}>
            <strong style={{ fontSize: 14, color: "#444", fontWeight: 500, marginRight: 3 }}>{books.length}</strong>books
          </span>
          <span onClick={() => isOwnProfile && onNavigate?.("articles")}
            style={{ fontSize: 13, color: "#888", cursor: isOwnProfile ? "pointer" : "default" }}
            onMouseEnter={e => { if (isOwnProfile) e.currentTarget.style.color = "#e8318a"; }}
            onMouseLeave={e => e.currentTarget.style.color = "#888"}>
            <strong style={{ fontSize: 14, color: "#444", fontWeight: 500, marginRight: 3 }}>{articles.length}</strong>articles
          </span>
          {isOwnProfile && (
            <span style={{ fontSize: 13, color: "#888" }}>
              <strong style={{ fontSize: 14, color: "#444", fontWeight: 500, marginRight: 3 }}>
                {books.filter(b => { const d = new Date(b.dateRead); return !isNaN(d) && d.getFullYear() === thisYear; }).length +
                 articles.filter(a => { const d = new Date(a.dateRead); return !isNaN(d) && d.getFullYear() === thisYear; }).length}
              </strong>logged in {thisYear}
            </span>
          )}
        </div>
      </div>

      {/* Followers card */}
      {followersList.length > 0 && (
        <div style={cardStyle}>
          <div style={{ ...sectionHeading, cursor: "pointer" }} onClick={() => setShowFollowers(p => !p)}>
            Followers <span style={{ fontSize: 13, color: "#aaa", fontWeight: 400 }}>{followersList.length}</span>
          </div>
          {showFollowers && followersList.map((u, i) => (
            <div key={i} style={{ padding: "10px 16px", borderBottom: i === followersList.length - 1 ? "none" : "0.5px solid #ebebeb", fontSize: 14, color: "#444" }}>{u}</div>
          ))}
        </div>
      )}

      {/* Two column layout */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        {/* Left column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {currentlyReading.length > 0 && (
            <div style={cardStyle}>
              <div style={sectionHeading}>Currently Reading</div>
              {currentlyReading.map((book, i) => (
                <div key={book.id}
                  onClick={() => isOwnProfile && onSelectBook?.(book.id)}
                  style={{ display: "flex", gap: 12, padding: "12px 16px", borderBottom: i === currentlyReading.length - 1 ? "none" : "0.5px solid #ebebeb", cursor: isOwnProfile ? "pointer" : "default" }}
                  onMouseEnter={e => { if (isOwnProfile) e.currentTarget.style.background = "#fafafa"; }}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  {book.coverUrl
                    ? <img src={book.coverUrl} alt={book.title} style={{ width: 36, height: 52, objectFit: "cover", border: "1px solid #ddd", borderRadius: 2, flexShrink: 0 }} />
                    : <div style={{ width: 36, height: 52, background: "#e8e8e8", border: "1px solid #ddd", borderRadius: 2, flexShrink: 0 }} />}
                  <div>
                    <div style={{ fontSize: 15, fontFamily: "Georgia, serif", color: isOwnProfile ? "#0000ee" : "#1a1a1a", textDecoration: isOwnProfile ? "underline" : "none", marginBottom: 2 }}>{book.title}</div>
                    <div style={{ fontSize: 13, color: "#444" }}>{book.author}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && recentlyLogged.length > 0 && (
            <div style={cardStyle}>
              <div style={sectionHeading}>Recently Logged</div>
              {recentlyLogged.map((entry, i) => (
                <div key={entry.id}
                  onClick={() => isOwnProfile && (entry._type === "book" ? onSelectBook?.(entry.id) : onSelectArticle?.(entry.id))}
                  style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 16px", borderBottom: i === recentlyLogged.length - 1 ? "none" : "0.5px solid #ebebeb", cursor: isOwnProfile ? "pointer" : "default" }}
                  onMouseEnter={e => { if (isOwnProfile) e.currentTarget.style.background = "#fafafa"; }}
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
                    <div style={{ fontSize: 14, color: isOwnProfile ? "#0000ee" : "#1a1a1a", textDecoration: isOwnProfile ? "underline" : "none", marginBottom: 2, fontFamily: entry._type === "book" ? "Georgia, serif" : "inherit" }}>{entry.title}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>{entry._type === "book" ? entry.author : [entry.author, entry.publication].filter(Boolean).join(" · ")}</div>
                  </div>
                  {entry._type === "article" && <span style={{ fontSize: 11, color: "#e8318a", border: "1px solid #e8318a", borderRadius: 3, padding: "1px 6px", flexShrink: 0, marginTop: 2 }}>article</span>}
                </div>
              ))}
            </div>
          )}

          {isOwnProfile && shelves.length > 0 && (
            <div style={cardStyle}>
              <div style={sectionHeading}>Shelves</div>
              {shelves.map((shelf, i) => (
                <div key={shelf} onClick={() => onShelfClick?.(shelf)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: i === shelves.length - 1 ? "none" : "0.5px solid #ebebeb", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <span style={{ fontSize: 14, color: "#0000ee", textDecoration: "underline" }}>{shelf}</span>
                  <span style={{ fontSize: 12, color: "#aaa" }}>{books.filter(b => (b.shelves || []).includes(shelf)).length}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column - Activity */}
        {allActivity.length > 0 && (
          <div style={{ width: 280, flexShrink: 0 }}>
            <div style={cardStyle}>
              <div style={sectionHeading}>Recent Activity</div>
              {allActivity.map((entry, i) => {
                const title = entry.bookTitle || entry.articleTitle || "";
                const id = entry.bookId || entry.articleId;
                const isArticle = !!entry.articleId;
                const date = entry.createdAt?.toDate ? formatActivityDate(entry.createdAt) : "";
                return (
                  <div key={entry.id}
                    onClick={() => { if (isOwnProfile && id) isArticle ? onSelectArticle?.(id) : onSelectBook?.(id); }}
                    style={{ padding: "10px 16px", borderBottom: i === allActivity.length - 1 ? "none" : "0.5px solid #ebebeb", fontSize: 13, color: "#444", cursor: (isOwnProfile && id) ? "pointer" : "default", lineHeight: 1.5 }}
                    onMouseEnter={e => { if (isOwnProfile && id) e.currentTarget.style.background = "#fafafa"; }}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    {entry.text} <strong style={{ color: "#333", fontWeight: 500 }}>{title}</strong>{entry.shelf ? ` "${entry.shelf}"` : ""}{entry.tag ? ` #${entry.tag}` : ""}{date ? <span style={{ color: "#bbb" }}> · {date}</span> : ""}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ghostBtn = { background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13, padding: "4px 0" };
