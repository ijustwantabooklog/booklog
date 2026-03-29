import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, onSnapshot, getDoc } from "firebase/firestore";

export default function Following({ userId, onViewProfile }) {
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [following, setFollowing] = useState([]);
  const [followingProfiles, setFollowingProfiles] = useState([]);

  // Load who I'm following
  useEffect(() => {
    return onSnapshot(collection(db, "users", userId, "following"), (snap) => {
      const ids = snap.docs.map(d => d.id);
      setFollowing(ids);
      // Load their profiles
      Promise.all(ids.map(async id => {
        const profileDoc = await getDoc(doc(db, "users", id, "profile", "info"));
        return profileDoc.exists() ? { id, ...profileDoc.data() } : { id, username: id };
      })).then(setFollowingProfiles);
    });
  }, [userId]);

  const handleSearch = async () => {
    const trimmed = search.trim().toLowerCase();
    if (!trimmed) return;
    setSearching(true);
    setSearchResult(null);
    setSearchError("");
    const q = query(collection(db, "usernames"), where("__name__", "==", trimmed));
    const snap = await getDocs(q);
    if (snap.empty) {
      setSearchError("No user found with that username.");
    } else {
      const foundUserId = snap.docs[0].data().userId;
      if (foundUserId === userId) {
        setSearchError("That's you!");
      } else {
        const profileDoc = await getDoc(doc(db, "users", foundUserId, "profile", "info"));
        setSearchResult({ id: foundUserId, username: trimmed, ...(profileDoc.exists() ? profileDoc.data() : {}) });
      }
    }
    setSearching(false);
  };

  const handleFollow = async (targetId) => {
    await setDoc(doc(db, "users", userId, "following", targetId), { followedAt: new Date() });
    await setDoc(doc(db, "users", targetId, "followers", userId), { followedAt: new Date() });
  };

  const handleUnfollow = async (targetId) => {
    await deleteDoc(doc(db, "users", userId, "following", targetId));
    await deleteDoc(doc(db, "users", targetId, "followers", userId));
  };

  const isFollowing = (id) => following.includes(id);

  const cardStyle = { background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden", marginBottom: 10 };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 20px 60px" }}>

      {/* Search */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
          placeholder="Search by username..."
          style={{ flex: 1, padding: "10px 14px", fontSize: 14, border: "1px solid #e2e2e2", borderRadius: 10, background: "#fff", outline: "none" }} />
        <button onClick={handleSearch} disabled={searching}
          style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 14, cursor: "pointer", opacity: searching ? 0.7 : 1 }}>
          {searching ? "..." : "Find"}
        </button>
      </div>

      {/* Search result */}
      {searchError && <p style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>{searchError}</p>}
      {searchResult && (
        <div style={{ ...cardStyle, padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div onClick={() => onViewProfile(searchResult.id, searchResult.username)}
                style={{ fontSize: 16, color: "#0000ee", textDecoration: "underline", cursor: "pointer", marginBottom: 3 }}>
                {searchResult.username}
              </div>
              {searchResult.bio && <div style={{ fontSize: 13, color: "#888" }}>{searchResult.bio}</div>}
            </div>
            <button onClick={() => isFollowing(searchResult.id) ? handleUnfollow(searchResult.id) : handleFollow(searchResult.id)}
              style={{ background: isFollowing(searchResult.id) ? "none" : "#e8318a", color: isFollowing(searchResult.id) ? "#aaa" : "#fff", border: isFollowing(searchResult.id) ? "1px solid #ddd" : "none", borderRadius: 6, padding: "6px 14px", fontSize: 13, cursor: "pointer" }}>
              {isFollowing(searchResult.id) ? "Unfollow" : "Follow"}
            </button>
          </div>
        </div>
      )}

      {/* Following list */}
      {followingProfiles.length > 0 && (
        <div style={cardStyle}>
          <div style={{ fontSize: 15, fontWeight: 500, color: "#444", borderBottom: "1px solid #e0e0e0", padding: "14px 16px 10px" }}>
            Following <span style={{ fontSize: 13, color: "#aaa", fontWeight: 400 }}>{followingProfiles.length}</span>
          </div>
          {followingProfiles.map((user, i) => (
            <div key={user.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i === followingProfiles.length - 1 ? "none" : "0.5px solid #ebebeb" }}>
              <div>
                <div onClick={() => onViewProfile(user.id, user.username)}
                  style={{ fontSize: 15, color: "#0000ee", textDecoration: "underline", cursor: "pointer", marginBottom: 2 }}>
                  {user.username}
                </div>
                {user.bio && <div style={{ fontSize: 13, color: "#888" }}>{user.bio}</div>}
              </div>
              <button onClick={() => handleUnfollow(user.id)}
                style={{ background: "none", border: "1px solid #ddd", borderRadius: 6, padding: "5px 12px", fontSize: 12, color: "#aaa", cursor: "pointer" }}>
                Unfollow
              </button>
            </div>
          ))}
        </div>
      )}

      {followingProfiles.length === 0 && !searchResult && (
        <p style={{ fontSize: 14, color: "#aaa" }}>Search for a username to find people to follow.</p>
      )}
    </div>
  );
}
