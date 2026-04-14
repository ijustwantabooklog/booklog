import React, { useState, useEffect } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
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
        onShelfClick={(filter) => go({ type: "shelf-view", filter, filterType: "shelf" })}
        onTagClick={(filter) => go({ type: "shelf-view", filter, filterType: "tag" })} />}
    </>
  );
}

function Nav({ username, screen, go, onNew, onSignOut }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const tabs = [["reading","Current"],["diary","Diary"],["books","Books"],["articles","Articles"],["following","Following"],["projects","Projects"]];
  const page = ["reading","diary","books","articles","following","projects","profile"].includes(screen.type) ? screen.type : "";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 18, fontWeight: "bold", fontFamily: "Georgia, serif" }}>
          Reading Archive / <span
            onClick={() => go({ type: "profile" })}
            style={{ fontWeight: "normal", color: "#00e", textDecoration: "underline", cursor: "pointer" }}>
            {username}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowDropdown(p => !p)}
              style={{ fontFamily: "Georgia, serif", fontSize: 14, background: "#e8318a", color: "#fff", border: "none", padding: "4px 12px", cursor: "pointer" }}>
              Log it ▾
            </button>
            {showDropdown && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 2px)", background: "#fff", border: "1px solid #000", zIndex: 100, minWidth: 120 }}>
                <div onClick={() => { onNew("book"); setShowDropdown(false); }}
                  style={{ padding: "6px 12px", fontSize: 14, cursor: "pointer", borderBottom: "1px solid #eee" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f0f0f0"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}>Book</div>
                <div onClick={() => { onNew("article"); setShowDropdown(false); }}
                  style={{ padding: "6px 12px", fontSize: 14, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f0f0f0"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}>Article</div>
              </div>
            )}
          </div>
          <span onClick={onSignOut} style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: "#00e", textDecoration: "underline", cursor: "pointer" }}>sign out</span>
        </div>
      </div>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px", display: "flex", gap: 2 }}>
        {tabs.map(([type, label]) => (
          <div key={type} onClick={() => go({ type })}
            style={{ fontFamily: "Arial, sans-serif", fontSize: 13, padding: "5px 14px", border: "1px solid #000", borderBottom: page === type ? "1px solid #fff" : "1px solid #000", marginBottom: page === type ? -1 : 0, cursor: "pointer", background: page === type ? "#fff" : "#f0f0f0", fontWeight: page === type ? "bold" : "normal", color: page === type ? "#000" : "#333", marginTop: 4 }}>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
