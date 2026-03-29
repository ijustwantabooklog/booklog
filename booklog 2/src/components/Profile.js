import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, updateDoc, collection, query, orderBy, setDoc, deleteDoc, getDoc } from "firebase/firestore";

function formatActivityDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function Profile({ userId, username, currentUserId, onSelectBook, onSelectArticle, onNavigate, onShelfClick }) {
  const isOwnProfile = userId === currentUserId;

  const [profile, setProfile] = useState({ bio: "" });
  const [books, setBooks] = useState([]);
  const [articles, setArticles] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
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
    const unsub4 = onSnapshot(collection(db, "users", userId, "followers"), async snap => {
      setFollowerCount(snap.size);
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
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
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
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 60px" }}>

      {/* Header card */}
      <div style={{ ...cardStyle, padding: "24px", marginTop: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 24, color: "#444", marginBottom: 6 }}>{username}</div>
            {isOwnProfile ? (
              editingBio ? (
                <div>
                  <textarea value={bioInput} onChange={e => setBioInput(e.target.value)}
                    rows={2} autoFocus
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

        <div style={{ borderTop: "0.5px solid #f0f0f0", marginTop: 16, paddingTop: 14 }}>
          {/* Reading stats */}
          <div style={{ display: "flex", gap: 20, marginBottom: 8 }}>
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
          {/* Social stats */}
          <div style={{ display: "flex", gap: 16 }}>
            <span onClick={() => setShowFollowers(p => !p)}
              style={{ fontSize: 13, color: "#0000ee", textDecoration: "underline", cursor: "pointer" }}>
              {followerCount} followers
            </span>
            <span onClick={() => setShowFollowing(p => !p)}
              style={{ fontSize: 13, color: "#0000ee", textDecoration: "underline", cursor: "pointer" }}>
              {followingList.length} following
            </span>
          </div>
        </div>
      </div>

      {/* Followers/Following dropdowns */}
      {showFollowers && (
        <div style={cardStyle}>
          <div style={sectionHeading}>Followers</div>
          {followersList.length === 0
            ? <div style={{ padding: "12px 16px", fontSize: 14, color: "#aaa" }}>No followers yet.</div>
            : followersList.map((u, i) => (
              <div key={i} style={{ padding: "10px 16px", borderBottom: i === followersList.length - 1 ? "none" : "0.5px solid #ebebeb", fontSize: 14, color: "#444" }}>{u}</div>
            ))}
        </div>
      )}
      {showFollowing && (
        <div style={cardStyle}>
          <div style={sectionHeading}>Following</div>
          {followingList.length === 0
            ? <div style={{ padding: "12px 16px", fontSize: 14, color: "#aaa" }}>Not following anyone yet.</div>
            : followingList.map((u, i) => (
              <div key={i} style={{ padding: "10px 16px", borderBottom: i === followingList.length - 1 ? "none" : "0.5px solid #ebebeb", fontSize: 14, color: "#444" }}>{u.username}</div>
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
          <div style={{ width: 340, flexShrink: 0 }}>
            <div style={cardStyle}>
              <div style={sectionHeading}>Recent Activity</div>
              {allActivity.map((entry, i) => (
                <div key={`${entry.type}-${entry.id}`}
                  onClick={() => { if (isOwnProfile) { entry.type === "book" ? onSelectBook?.(entry.id) : onSelectArticle?.(entry.id); } }}
                  style={{ padding: "12px 16px", borderBottom: i === allActivity.length - 1 ? "none" : "0.5px solid #ebebeb", fontSize: 13, color: "#444", cursor: isOwnProfile ? "pointer" : "default", lineHeight: 1.5 }}
                  onMouseEnter={e => { if (isOwnProfile) e.currentTarget.style.background = "#fafafa"; }}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  {entry.text} <strong style={{ color: "#333", fontWeight: 500 }}>{entry.title}</strong> on {formatActivityDate(entry.ts)}.
                  {entry.type === "article" && <span style={{ fontSize: 11, color: "#e8318a", border: "1px solid #e8318a", borderRadius: 3, padding: "1px 6px", marginLeft: 6 }}>article</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
