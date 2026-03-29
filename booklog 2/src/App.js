import React, { useState, useEffect } from "react";
import { auth, provider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import BookList from "./components/BookList";
import BookDetail from "./components/BookDetail";
import LogForm from "./components/LogForm";
import Diary from "./components/Diary";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("main");
  const [page, setPage] = useState("home");
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const signIn = () => signInWithPopup(auth, provider);
  const signOutUser = () => signOut(auth);
  const firstName = user?.displayName?.split(" ")[0]?.toLowerCase() || "jenny";

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <span style={{ color: "#aaa", fontSize: 15 }}>loading...</span>
    </div>
  );

  if (!user) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16 }}>
      <span style={{ fontSize: 28, color: "#444" }}>jenny/</span>
      <p style={{ color: "#888", fontSize: 15, margin: 0 }}>your book log</p>
      <button onClick={signIn} style={{ marginTop: 12, background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "10px 24px", fontSize: 15, cursor: "pointer" }}>
        Sign in with Google
      </button>
    </div>
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
      <Nav firstName={firstName} page={page} setPage={(p) => { setPage(p); setView("main"); }}
        onNew={() => { setEditing(null); setView("log"); }} onSignOut={signOutUser} />
      <BookDetail bookId={selected} userId={user.uid}
        onBack={() => setView("main")}
        onEdit={(book) => { setEditing(book); setView("log"); }} />
    </>
  );

  return (
    <>
      <Nav firstName={firstName} page={page} setPage={setPage}
        onNew={() => { setEditing(null); setView("log"); }} onSignOut={signOutUser} />
      {page === "home" && <BookList userId={user.uid} onSelect={(id) => { setSelected(id); setView("detail"); }} />}
      {page === "diary" && <Diary userId={user.uid} onSelectBook={(id) => { setSelected(id); setView("detail"); }} />}
    </>
  );
}

function Nav({ firstName, page, setPage, onNew, onSignOut }) {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0 10px" }}>
        <span style={{ fontSize: 22, color: "#444" }}>{firstName}/</span>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <button onClick={onNew} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "7px 18px", fontSize: 14, cursor: "pointer" }}>Log it</button>
          <span onClick={onSignOut} style={{ fontSize: 13, color: "#aaa", cursor: "pointer" }}>sign out</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 0, borderBottom: "1.5px solid #e0e0e0", marginTop: 4 }}>
        {["home", "diary"].map(p => (
          <span key={p} onClick={() => setPage(p)} style={{
            fontSize: 15, cursor: "pointer", padding: "14px 24px 14px 0",
            color: page === p ? "#1a1a1a" : "#aaa",
            borderBottom: page === p ? "2.5px solid #e8318a" : "2.5px solid transparent",
            marginBottom: "-1.5px", display: "inline-block",
          }}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </span>
        ))}
      </div>
    </div>
  );
}
