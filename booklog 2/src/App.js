import React, { useState, useEffect } from "react";
import { auth, provider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import BookList from "./components/BookList";
import BookDetail from "./components/BookDetail";
import LogForm from "./components/LogForm";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
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

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <span style={{ color: "#aaa", fontSize: 14 }}>loading...</span>
    </div>
  );

  if (!user) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16 }}>
      <span style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 400 }}>jenny/</span>
      <p style={{ color: "#888", fontSize: 14, margin: 0 }}>your book log</p>
      <button onClick={signIn} style={{
        marginTop: 12,
        background: "#e8318a",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "10px 24px",
        fontSize: 14,
        cursor: "pointer",
        fontWeight: 500,
      }}>
        Sign in with Google
      </button>
    </div>
  );

  if (view === "log") return (
    <LogForm
      book={editing}
      userId={user.uid}
      onCancel={() => { setView(editing?.id ? "detail" : "list"); setEditing(null); }}
      onSave={(book) => {
        setEditing(null);
        if (book?.id) { setSelected(book); setView("detail"); }
        else setView("list");
      }}
    />
  );

  if (view === "detail" && selected) return (
    <BookDetail
      bookId={selected}
      userId={user.uid}
      onBack={() => setView("list")}
      onEdit={(book) => { setEditing(book); setView("log"); }}
    />
  );

  return (
    <BookList
      userId={user.uid}
      userName={user.displayName}
      onSelect={(id) => { setSelected(id); setView("detail"); }}
      onNew={() => { setEditing(null); setView("log"); }}
      onSignOut={signOutUser}
    />
  );
}
