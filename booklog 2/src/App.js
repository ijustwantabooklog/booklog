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
  const [view, setView] = useState("list");
  const [page, setPage] = useState("home"); // "home" | "diary"
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
      <span style={{ color: "#aaa", fontSize: 14 }}>loading...</span>
    </div>
  );

  if (!user) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16 }}>
      <span style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 400 }}>jenny/</span>
      <p style={{ color: "#888", fontSize: 14, margin: 0 }}>your book log</p>
      <button onClick={signIn} style={{ marginTop: 12, background: "#e8318a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, cursor: "pointer", fontWeight: 500 }}>
        Sign in with Google
      </button>
    </div>
  );

  if (view === "log") return (
    <>
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
    </>
  );

  if (view === "detail" && selected) return (
    <>
      <Nav page={page} setPage={(p) => { setPage(p); setView("main"); }} firstName={firstName} />
      <BookDetail
        bookId={selected}
        userId={user.uid}
        onBack={() => setView("main")}
        onEdit={(book) => { setEditing(book); setView("log"); }}
      />
    </>
  );

  return (
    <>
      <Nav page={page} setPage={setPage} firstName={firstName} onNew={() => { setEditing(null); setView("log"); }} onSignOut={signOutUser} />
      {page === "home" && (
        <BookList
          userId={user.uid}
          userName={user.displayName}
          onSelect={(id) => { setSelected(id); setView("detail"); }}
          onNew={() => { setEditing(null); setView("log"); }}
          onSignOut={signOutUser}
          hideHeader
        />
      )}
      {page === "diary" && (
        <Diary
          userId={user.uid}
          onSelectBook={(id) => { setSelected(id); setView("detail"); }}
        />
      )}
    </>
  );
}

function Nav({ page, setPage, firstName, onNew, onSignOut }) {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "28px 0 0" }}>
        <span style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 400 }}>{firstName}/</span>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <button onClick={() => setPage("home")} style={{ ...navBtn, color: page === "home" ? "#1a1a1a" : "#aaa", fontWeight: page === "home" ? 500 : 400 }}>Home</button>
          <button onClick={() => setPage("diary")} style={{ ...navBtn, color: page === "diary" ? "#1a1a1a" : "#aaa", fontWeight: page === "diary" ? 500 : 400 }}>Diary</button>
          {onNew && <button onClick={onNew} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", marginLeft: 8 }}>Log it</button>}
          {onSignOut && <button onClick={onSignOut} style={{ ...navBtn, color: "#ccc", fontSize: 12 }}>sign out</button>}
        </div>
      </div>
      <div style={{ borderBottom: "1px solid #e8e8e8", marginTop: 16 }} />
    </div>
  );
}

const navBtn = { background: "none", border: "none", fontSize: 14, cursor: "pointer", padding: "4px 0" };
