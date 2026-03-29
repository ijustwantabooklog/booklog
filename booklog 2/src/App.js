import React, { useState, useEffect } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import BookList from "./components/BookList";
import BookDetail from "./components/BookDetail";
import LogForm from "./components/LogForm";
import ArticleLogForm from "./components/ArticleLogForm";
import ArticleDetail from "./components/ArticleDetail";
import Diary from "./components/Diary";
import AllBooks from "./components/AllBooks";
import AllArticles from "./components/AllArticles";
import ShelfView from "./components/ShelfView";
import UsernameSetup from "./components/UsernameSetup";
import Following from "./components/Following";
import PublicProfile from "./components/PublicProfile";
import Profile from "./components/Profile";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingUsername, setLoadingUsername] = useState(false);
  const [view, setView] = useState("main");
  const [page, setPage] = useState("home");
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [logType, setLogType] = useState("book");
  const [shelfFilter, setShelfFilter] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [shelfFilterType, setShelfFilterType] = useState(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
      if (u) {
        setLoadingUsername(true);
        const unsub = onSnapshot(doc(db, "users", u.uid, "profile", "info"), (d) => {
          setUsername(d.exists() ? d.data().username : null);
          setLoadingUsername(false);
        });
        return unsub;
      } else {
        setUsername(null);
        setLoadingUsername(false);
      }
    });
  }, []);

  const signIn = () => signInWithPopup(auth, provider);
  const signOutUser = () => signOut(auth);

  if (loadingAuth || loadingUsername) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <span style={{ color: "#aaa", fontSize: 15 }}>loading...</span>
    </div>
  );

  if (!user) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16 }}>
      <span style={{ fontSize: 28, color: "#444" }}>Book Log</span>
      <p style={{ color: "#888", fontSize: 15, margin: 0 }}>your reading log</p>
      <button onClick={signIn} style={{ marginTop: 12, background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "10px 24px", fontSize: 15, cursor: "pointer" }}>
        Sign in with Google
      </button>
    </div>
  );

  if (!username) return <UsernameSetup userId={user.uid} onComplete={(u) => setUsername(u)} />;

  const goBack = () => setView("main");

  if (view === "log") {
    if (logType === "article") return (
      <ArticleLogForm article={editing} userId={user.uid}
        onCancel={() => { setView(editing?.id ? "article-detail" : "main"); setEditing(null); }}
        onSave={(a) => { setEditing(null); setSelected(a.id); setView("article-detail"); }} />
    );
    return (
      <LogForm book={editing} userId={user.uid}
        onCancel={() => { setView(editing?.id ? "detail" : "main"); setEditing(null); }}
        onSave={(book) => { setEditing(null); if (book?.id) { setSelected(book.id); setView("detail"); } else setView("main"); }} />
    );
  }

  if (view === "detail" && selected) return (
    <>
      <Nav username={username} page={page} setPage={(p) => { setPage(p); setView("main"); }}
        onNew={(type) => { setLogType(type); setEditing(null); setView("log"); }} onSignOut={signOutUser} />
      <BookDetail bookId={selected} userId={user.uid} onBack={goBack}
        onEdit={(book) => { setLogType("book"); setEditing(book); setView("log"); }} />
    </>
  );

  if (view === "article-detail" && selected) return (
    <>
      <Nav username={username} page={page} setPage={(p) => { setPage(p); setView("main"); }}
        onNew={(type) => { setLogType(type); setEditing(null); setView("log"); }} onSignOut={signOutUser} />
      <ArticleDetail articleId={selected} userId={user.uid} onBack={goBack}
        onEdit={(a) => { setLogType("article"); setEditing(a); setView("log"); }} />
    </>
  );

  if (view === "public-profile" && viewingUser) return (
    <>
      <Nav username={username} page={page} setPage={(p) => { setPage(p); setView("main"); }}
        onNew={(type) => { setLogType(type); setEditing(null); setView("log"); }} onSignOut={signOutUser} />
      <PublicProfile viewUserId={viewingUser.id} viewUsername={viewingUser.username}
        currentUserId={user.uid} onBack={() => setView("main")} />
    </>
  );

  if (view === "shelf-view") return (
    <>
      <Nav username={username} page={page} setPage={(p) => { setPage(p); setView("main"); }}
        onNew={(type) => { setLogType(type); setEditing(null); setView("log"); }} onSignOut={signOutUser} />
      <ShelfView userId={user.uid} filter={shelfFilter} filterType={shelfFilterType}
        onSelect={(id) => { setSelected(id); setView("detail"); }}
        onBack={goBack} />
    </>
  );

  return (
    <>
      <Nav username={username} page={page} setPage={setPage}
        onNew={(type) => { setLogType(type); setEditing(null); setView("log"); }} onSignOut={signOutUser} />
      {page === "home" && (
        <BookList userId={user.uid}
          onSelect={(id) => { setSelected(id); setView("detail"); }}
          onSelectArticle={(id) => { setSelected(id); setView("article-detail"); }}
          onShelfClick={(shelf) => { setShelfFilter(shelf); setShelfFilterType("shelf"); setView("shelf-view"); }}
          onTagClick={(tag) => { setShelfFilter(tag); setShelfFilterType("tag"); setView("shelf-view"); }} />
      )}
      {page === "diary" && <Diary userId={user.uid} onSelectBook={(id) => { setSelected(id); setView("detail"); }} />}
      {page === "books" && <AllBooks userId={user.uid} onSelect={(id) => { setSelected(id); setView("detail"); }} />}
      {page === "articles" && <AllArticles userId={user.uid} onSelect={(id) => { setSelected(id); setView("article-detail"); }} />}
      {page === "following" && <Following userId={user.uid} onViewProfile={(id, uname) => { setViewingUser({ id, username: uname }); setView("public-profile"); }} />}
      {page === "profile" && <Profile userId={user.uid} username={username} onSelectBook={(id) => { setSelected(id); setView("detail"); }} onSelectArticle={(id) => { setSelected(id); setView("article-detail"); }} />}
    </>
  );
}

function Nav({ username, page, setPage, onNew, onSignOut }) {
  const [showDropdown, setShowDropdown] = useState(false);
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0 10px" }}>
        <span style={{ fontSize: 22, color: "#444" }}>Book Log / <span onClick={() => setPage("profile")} style={{ cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.color = "#e8318a"} onMouseLeave={e => e.currentTarget.style.color = "#444"}>{username}</span></span>
        <div style={{ display: "flex", alignItems: "center", gap: 20, position: "relative" }}>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowDropdown(p => !p)}
              style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "7px 18px", fontSize: 14, cursor: "pointer" }}>
              Log it ▾
            </button>
            {showDropdown && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#fff", border: "1px solid #e2e2e2", borderRadius: 8, overflow: "hidden", zIndex: 100, minWidth: 130, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                <div onClick={() => { onNew("book"); setShowDropdown(false); }}
                  style={{ padding: "10px 16px", fontSize: 14, cursor: "pointer", color: "#444" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>Book</div>
                <div onClick={() => { onNew("article"); setShowDropdown(false); }}
                  style={{ padding: "10px 16px", fontSize: 14, cursor: "pointer", color: "#444", borderTop: "0.5px solid #ebebeb" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>Article</div>
              </div>
            )}
          </div>
          <span onClick={onSignOut} style={{ fontSize: 13, color: "#aaa", cursor: "pointer" }}>sign out</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 20, padding: "12px 0 20px" }}>
        {[["home","Home"],["diary","Diary"],["books","Books"],["articles","Articles"],["following","Following"]].map(([p, label]) => (
          <span key={p} onClick={() => setPage(p)}
            style={{ fontSize: 15, color: page === p ? "#1a1a1a" : "#aaa", fontWeight: page === p ? 500 : 400, cursor: "pointer" }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
