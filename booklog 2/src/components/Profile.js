import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, updateDoc, collection, query, orderBy, setDoc, deleteDoc } from "firebase/firestore";

function formatActivityDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function Profile({ userId, username, currentUserId, onBack, onSelectBook, onSelectArticle }) {
  const isOwnProfile = userId === currentUserId;

  const [profile, setProfile] = useState({ bio: "" });
  const [books, setBooks] = useState([]);
  const [articles, setArticles] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState("");

  useEffect(() => {
    const unsub1 = onSnapshot(doc(db, "users", userId, "profile", "info"), d => {
      if (d.exists()) setProfile(d.data());
    });
    const unsub2 = onSnapshot(
      query(collection(db, "users", userId, "books"), orderBy("createdAt", "desc")),
      snap => setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsub3 = onSnapshot(
      query(collection(db, "users", userId, "articles"), orderBy("createdAt", "desc")),
      snap => setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsub4 = onSnapshot(collection(db, "users", userId, "followers"), snap => {
      setFollowerCount(snap.size);
      setIsFollowing(snap.docs.some(d => d.id === currentUserId));
    });
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
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

  const allActivity = [
    ...books.map(book => {
      let text = "Logged";
      if (book.currentlyReading) text = "Marked as currently reading";
      else if (book.rating > 0 && book.notes) text = "Read and reviewed";
      else if (book.rating > 0) text = "Read and rated";
      return { id: book.id, type: "book", text, title: book.title, ts: book.updatedAt || book.createdAt };
    }),
    ...articles.map(a => ({
      id: a.id, type: "article", text: "Logged article", title: a.title, ts: a.updatedAt || a.createdAt,
    })),
  ].sort((a, b) => {
    const ta = a.ts?.toDate ? a.ts.toDate() : new Date(0);
    const tb = b.ts?.toDate ? b.ts.toDate() : new Date(0);
    return tb - ta;
  }).slice(0, 10);

  const cardStyle = { background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden", marginBottom: 10 };
  const sectionHeading = { fontSize: 15, color: "#444", fontWeight: 500, borderBottom: "1px solid #e0e0e0", padding: "14px 16px 10px" };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 20px 60px" }}>

      {!isOwnProfile && onBack && (
        <div style={{ padding: "24px 0 16px" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13 }}>← back</button>
        </div>
      )}

      {/* Header card */}
      <div style={{ ...cardStyle, padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontSize: 20, color: "#444" }}>{username}</div>
          {!isOwnProfile && (
            <button onClick={isFollowing ? handleUnfollow : handleFollow}
              style={{ background: isFollowing ? "none" : "#e8318a", color: isFollowing ? "#aaa" : "#fff", border: isFollowing ? "1px solid #ddd" : "none", borderRadius: 6, padding: "6px 16px", fontSize: 13, cursor: "pointer" }}>
              {isFollowing ? "Unfollow" : "Follow"}
            </button>
          )}
        </div>

        {/* Bio */}
        {isOwnProfile ? (
          editingBio ? (
            <div style={{ marginTop: 10 }}>
              <textarea value={bioInput} onChange={e => setBioInput(e.target.value)}
                rows={3} autoFocus
                style={{ width: "100%", fontSize: 14, color: "#444", border: "1px solid #e0e0e0", borderRadius: 6, padding: "8px 10px", resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={saveBio} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 13, cursor: "pointer" }}>Save</button>
                <button onClick={() => setEditingBio(false)} style={{ background: "none", border: "none", color: "#aaa", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div onClick={() => { setBioInput(profile.bio || ""); setEditingBio(true); }}
              style={{ fontSize: 14, color: profile.bio ? "#555" : "#ccc", lineHeight: 1.6, cursor: "pointer", marginTop: 8 }}>
              {profile.bio || "Add a bio..."}
            </div>
          )
        ) : (
          profile.bio && <div style={{ fontSize: 14, color: "#555", lineHeight: 1.6, marginTop: 8 }}>{profile.bio}</div>
        )}

        {/* Stats */}
        <div style={{ display: "flex", gap: 24, marginTop: 16, paddingTop: 14, borderTop: "0.5px solid #f0f0f0" }}>
          <div style={{ fontSize: 13, color: "#888" }}><span style={{ fontSize: 18, color: "#444", marginRight: 4 }}>{books.length}</span>books</div>
          <div style={{ fontSize: 13, color: "#888" }}><span style={{ fontSize: 18, color: "#444", marginRight: 4 }}>{articles.length}</span>articles</div>
          {!isOwnProfile && <div style={{ fontSize: 13, color: "#888" }}><span style={{ fontSize: 18, color: "#444", marginRight: 4 }}>{followerCount}</span>followers</div>}
          {isOwnProfile && (
            <div style={{ fontSize: 13, color: "#888" }}>
              <span style={{ fontSize: 18, color: "#444", marginRight: 4 }}>
                {books.filter(b => { const d = new Date(b.dateRead); return !isNaN(d) && d.getFullYear() === thisYear; }).length +
                 articles.filter(a => { const d = new Date(a.dateRead); return !isNaN(d) && d.getFullYear() === thisYear; }).length}
              </span>logged in {thisYear}
            </div>
          )}
        </div>
      </div>

      {/* Currently Reading */}
      {currentlyReading.length > 0 && (
        <div style={cardStyle}>
          <div style={sectionHeading}>Currently Reading</div>
          {currentlyReading.map((book, i) => (
            <div key={book.id}
              onClick={() => isOwnProfile && onSelectBook && onSelectBook(book.id)}
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

      {/* Shelves — only on own profile */}
      {isOwnProfile && shelves.length > 0 && (
        <div style={cardStyle}>
          <div style={sectionHeading}>Shelves</div>
          {shelves.map((shelf, i) => (
            <div key={shelf} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: i === shelves.length - 1 ? "none" : "0.5px solid #ebebeb" }}>
              <span style={{ fontSize: 14, color: "#444" }}>{shelf}</span>
              <span style={{ fontSize: 12, color: "#aaa" }}>{books.filter(b => (b.shelves || []).includes(shelf)).length}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent Activity */}
      {allActivity.length > 0 && (
        <div style={cardStyle}>
          <div style={sectionHeading}>Recent Activity</div>
          {allActivity.map((entry, i) => (
            <div key={`${entry.type}-${entry.id}`}
              onClick={() => { if (isOwnProfile) { entry.type === "book" ? onSelectBook?.(entry.id) : onSelectArticle?.(entry.id); } }}
              style={{ padding: "12px 16px", borderBottom: i === allActivity.length - 1 ? "none" : "0.5px solid #ebebeb", fontSize: 14, color: "#444", cursor: isOwnProfile ? "pointer" : "default", lineHeight: 1.5 }}
              onMouseEnter={e => { if (isOwnProfile) e.currentTarget.style.background = "#fafafa"; }}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              {entry.text} <strong style={{ color: "#333", fontWeight: 500 }}>{entry.title}</strong> on {formatActivityDate(entry.ts)}.
              {entry.type === "article" && <span style={{ fontSize: 11, color: "#e8318a", border: "1px solid #e8318a", borderRadius: 3, padding: "1px 6px", marginLeft: 8 }}>article</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
