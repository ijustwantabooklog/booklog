import React, { useState, useEffect } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import BookList from "./components/BookList";
import BookDetail from "./components/BookDetail";
import LogForm from "./components/LogForm";
import Diary from "./components/Diary";
import AllBooks from "./components/AllBooks";
import UsernameSetup from "./components/UsernameSetup";
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
      <p style={{ color: "#888", fontSize: 15, margin: 0 }}>your book log</p>
      <button onClick={signIn} style={{ marginTop: 12, background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "10px 24px", fontSize: 15, cursor: "pointer" }}>
        Sign in with Google
      </button>
    </div>
  );

  if (!username) return (
    <UsernameSetup userId={user.uid} onComplete={(u) => setUsername(u)} />
  );

  if (view === "log") return (
    <LogForm
      book={editing}
      userId={user.uid}
      onCancel={() => { setView(editing?.id ? "detail" : "main"); setEditing(null); }}
      onSave={(book) => {
        setEditing(null);
        if (book?.id) { setSelected(book.id); setView("detail"); }
        else setView("main");
      }}
    />
  );

  if (view === "detail" && selected) return (
    <>
      <Nav username={username} page={page} setPage={(p) => { setPage(p); setView("main"); }}
        onNew={() => { setEditing(null); setView("log"); }} onSignOut={signOutUser} />
      <BookDetail bookId={selected} userId={user.uid}
        onBack={() => setView("main")}
        onEdit={(book) => { setEditing(book); setView("log"); }} />
    </>
  );

  return (
    <>
      <Nav username={username} page={page} setPage={setPage}
        onNew={() => { setEditing(null); setView("log"); }} onSignOut={signOutUser} />
      {page === "home" && <BookList userId={user.uid} onSelect={(id) => { setSelected(id); setView("detail"); }} />}
      {page === "diary" && <Diary userId={user.uid} onSelectBook={(id) => { setSelected(id); setView("detail"); }} />}
      {page === "books" && <AllBooks userId={user.uid} onSelect={(id) => { setSelected(id); setView("detail"); }} />}
    </>
  );
}

function Nav({ username, page, setPage, onNew, onSignOut }) {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0 10px" }}>
        <span style={{ fontSize: 22, color: "#444" }}>Book Log / {username}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <button onClick={onNew} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "7px 18px", fontSize: 14, cursor: "pointer" }}>Log it</button>
          <span onClick={onSignOut} style={{ fontSize: 13, color: "#aaa", cursor: "pointer" }}>sign out</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 20, padding: "12px 0 20px" }}>
        {[["home", "Home"], ["diary", "Diary"], ["books", "Books"]].map(([p, label]) => (
          <span key={p} onClick={() => setPage(p)} style={{ fontSize: 15, color: page === p ? "#1a1a1a" : "#aaa", fontWeight: page === p ? 500 : 400, cursor: "pointer" }}>{label}</span>
        ))}
      </div>
    </div>
  );
}
