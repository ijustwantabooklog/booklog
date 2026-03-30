import React, { useState, useEffect } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import BookList from "./components/BookList";
import Home from "./components/Home";
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
import Profile from "./components/Profile";
import Projects from "./components/Projects";
import ProjectDetail from "./components/ProjectDetail";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingUsername, setLoadingUsername] = useState(false);

  // Single source of truth for navigation
  const [screen, setScreen] = useState({ type: "reading" });
  const [logType, setLogType] = useState("book");
  const [editing, setEditing] = useState(null);

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
  const go = (s) => setScreen(s);

  if (loadingAuth || loadingUsername) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <span style={{ color: "#aaa", fontSize: 15 }}>loading...</span>
    </div>
  );

  if (!user) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16 }}>
      <span style={{ fontSize: 28, color: "#444" }}>Reading Archive</span>
      <p style={{ color: "#888", fontSize: 15, margin: 0 }}>your reading log</p>
      <button onClick={signIn} style={{ marginTop: 12, background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "10px 24px", fontSize: 15, cursor: "pointer" }}>
        Sign in with Google
      </button>
    </div>
  );

  if (!username) return <UsernameSetup userId={user.uid} onComplete={(u) => setUsername(u)} />;

  if (screen.type === "log") {
    if (logType === "article") return (
      <ArticleLogForm article={editing} userId={user.uid}
        onCancel={() => { go(editing?.id ? { type: "article-detail", id: editing.id } : { type: "home" }); setEditing(null); }}
        onSave={(a) => { setEditing(null); go({ type: "article-detail", id: a.id }); }} />
    );
    return (
      <LogForm book={editing} userId={user.uid}
        onCancel={() => { go(editing?.id ? { type: "book-detail", id: editing.id } : { type: "home" }); setEditing(null); }}
        onSave={(book) => { setEditing(null); go(book?.id ? { type: "book-detail", id: book.id } : { type: "home" }); }} />
    );
  }

  if (screen.type === "book-detail") return (
    <>
      <Nav username={username} screen={screen} go={go}
        onNew={(type) => { setLogType(type); setEditing(null); go({ type: "log" }); }} onSignOut={signOutUser} />
      <BookDetail bookId={screen.id} userId={user.uid}
        onBack={() => go({ type: "home" })}
        onEdit={(book) => { setLogType("book"); setEditing(book); go({ type: "log" }); }} />
    </>
  );

  if (screen.type === "article-detail") return (
    <>
      <Nav username={username} screen={screen} go={go}
        onNew={(type) => { setLogType(type); setEditing(null); go({ type: "log" }); }} onSignOut={signOutUser} />
      <ArticleDetail articleId={screen.id} userId={user.uid}
        onBack={() => go({ type: "home" })}
        onEdit={(a) => { setLogType("article"); setEditing(a); go({ type: "log" }); }} />
    </>
  );

  if (screen.type === "project-detail") return (
    <>
      <Nav username={username} screen={screen} go={go}
        onNew={(type) => { setLogType(type); setEditing(null); go({ type: "log" }); }} onSignOut={signOutUser} />
      <ProjectDetail projectId={screen.id} userId={user.uid}
        onBack={() => go({ type: "projects" })}
        onSelectBook={(id) => go({ type: "book-detail", id })}
        onSelectArticle={(id) => go({ type: "article-detail", id })} />
    </>
  );

  if (screen.type === "public-profile") return (
    <>
      <Nav username={username} screen={screen} go={go}
        onNew={(type) => { setLogType(type); setEditing(null); go({ type: "log" }); }} onSignOut={signOutUser} />
      <Profile userId={screen.id} username={screen.username}
        currentUserId={user.uid} onBack={() => go({ type: "following" })} />
    </>
  );

  if (screen.type === "shelf-view") return (
    <>
      <Nav username={username} screen={screen} go={go}
        onNew={(type) => { setLogType(type); setEditing(null); go({ type: "log" }); }} onSignOut={signOutUser} />
      <ShelfView userId={user.uid} filter={screen.filter} filterType={screen.filterType}
        onSelect={(id) => go({ type: "book-detail", id })}
        onBack={() => go({ type: "home" })} />
    </>
  );

  // Main tabbed pages
  const page = screen.type;
  return (
    <>
      <Nav username={username} screen={screen} go={go}
        onNew={(type) => { setLogType(type); setEditing(null); go({ type: "log" }); }} onSignOut={signOutUser} />
      {page === "reading" && <Home userId={user.uid} onSelect={(id) => go({ type: "book-detail", id })} onSelectArticle={(id) => go({ type: "article-detail", id })} />}
      {page === "home" && (
        <BookList userId={user.uid}
          onSelect={(id) => go({ type: "book-detail", id })}
          onSelectArticle={(id) => go({ type: "article-detail", id })}
          onShelfClick={(filter) => go({ type: "shelf-view", filter, filterType: "shelf" })}
          onTagClick={(filter) => go({ type: "shelf-view", filter, filterType: "tag" })}
          onViewProject={(id) => go({ type: "project-detail", id })} />
      )}
      {page === "diary" && <Diary userId={user.uid}
        onSelectBook={(id) => go({ type: "book-detail", id })}
        onSelectArticle={(id) => go({ type: "article-detail", id })} />}
      {page === "books" && <AllBooks userId={user.uid} onSelect={(id) => go({ type: "book-detail", id })} />}
      {page === "articles" && <AllArticles userId={user.uid} onSelect={(id) => go({ type: "article-detail", id })} />}
      {page === "following" && <Following userId={user.uid}
        onViewProfile={(id, uname) => go({ type: "public-profile", id, username: uname })} />}
      {page === "projects" && <Projects userId={user.uid}
        onViewProject={(id) => go({ type: "project-detail", id })} />}
      {page === "profile" && <Profile userId={user.uid} username={username} currentUserId={user.uid}
        onSelectBook={(id) => go({ type: "book-detail", id })}
        onSelectArticle={(id) => go({ type: "article-detail", id })}
        onNavigate={(type) => go({ type })}
        onShelfClick={(filter) => go({ type: "shelf-view", filter, filterType: "shelf" })} />}
    </>
  );
}

function Nav({ username, screen, go, onNew, onSignOut }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const tabs = [["reading","Reading"],["home","Dashboard"],["diary","Diary"],["books","Books"],["articles","Articles"],["following","Following"],["projects","Projects"]];
  const page = ["reading","home","diary","books","articles","following","projects","profile"].includes(screen.type) ? screen.type : "";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0 10px" }}>
        <span style={{ fontSize: 22, color: "#444" }}>
          Reading Archive / <span
            onClick={() => go({ type: "profile" })}
            style={{ cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.color = "#e8318a"}
            onMouseLeave={e => e.currentTarget.style.color = "#444"}>
            {username}
          </span>
        </span>
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
        {tabs.map(([type, label]) => (
          <span key={type} onClick={() => go({ type })}
            style={{ fontSize: 15, color: page === type ? "#1a1a1a" : "#aaa", fontWeight: page === type ? 500 : 400, cursor: "pointer" }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
