import React, { useState, useEffect } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, getDoc, setDoc } from "firebase/firestore";
import "./index.css";
import Journal from "./components/Journal";
import Library from "./components/Library";
import Projects from "./components/Projects";
import ReadingSession from "./components/ReadingSession";
import EntryDetail from "./components/EntryDetail";
import AddEntry from "./components/AddEntry";
import UsernameSetup from "./components/UsernameSetup";

export default function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState({ type: "journal" });

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid, "profile", "info"));
        setUsername(snap.exists() ? snap.data().username : null);
      } else {
        setUsername(null);
      }
      setLoading(false);
    });
  }, []);

  const go = (s) => setScreen(s);

  if (loading) return <div style={{ padding: 20, color: "#666" }}>loading...</div>;

  if (!user) return (
    <div style={{ padding: 40, maxWidth: 400, margin: "80px auto", textAlign: "center" }}>
      <h1 style={{ marginBottom: 8 }}>Reading Archive</h1>
      <p style={{ color: "#666", marginBottom: 20, fontStyle: "italic" }}>your personal research journal</p>
      <button className="primary" onClick={() => signInWithPopup(auth, provider)} style={{ padding: "6px 20px", fontSize: 15 }}>
        Sign in with Google
      </button>
    </div>
  );

  if (!username) return (
    <UsernameSetup userId={user.uid} onComplete={setUsername} />
  );

  const tabs = [["journal","Journal"],["library","Library"],["projects","Projects"]];
  const page = tabs.map(t => t[0]).includes(screen.type) ? screen.type : "";

  // Full-screen reading session — no nav
  if (screen.type === "session") return (
    <ReadingSession
      entryId={screen.id}
      entryType={screen.entryType}
      userId={user.uid}
      onBack={() => go(screen.from || { type: "journal" })}
      onViewDetail={(id, type) => go({ type: "detail", id, entryType: type, from: screen })}
    />
  );

  return (
    <div>
      {/* Nav */}
      <div style={{ borderBottom: "1px solid #ccc" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 17, fontWeight: "bold" }}>
            Reading Archive / <span onClick={() => go({ type: "journal" })} className="link" style={{ fontWeight: "normal" }}>{username}</span>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button className="primary" onClick={() => go({ type: "add", from: screen })} style={{ padding: "3px 12px" }}>+ Log</button>
            <span className="link" style={{ fontSize: 13 }} onClick={() => signOut(auth)}>sign out</span>
          </div>
        </div>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 16px", display: "flex", gap: 2 }}>
          {tabs.map(([type, label]) => (
            <div key={type} onClick={() => go({ type })}
              style={{ fontFamily: "Arial, sans-serif", fontSize: 13, padding: "4px 12px", border: "1px solid #ccc", borderBottom: page === type ? "1px solid #fff" : "1px solid #ccc", marginBottom: page === type ? -1 : 0, marginTop: 4, cursor: "pointer", background: page === type ? "#fff" : "#f5f5f5", fontWeight: page === type ? "bold" : "normal" }}>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Pages */}
      {screen.type === "journal" && (
        <Journal userId={user.uid}
          onOpenSession={(id, type) => go({ type: "session", id, entryType: type, from: screen })}
          onViewDetail={(id, type) => go({ type: "detail", id, entryType: type, from: screen })} />
      )}
      {screen.type === "library" && (
        <Library userId={user.uid}
          onOpenSession={(id, type) => go({ type: "session", id, entryType: type, from: screen })}
          onViewDetail={(id, type) => go({ type: "detail", id, entryType: type, from: screen })} />
      )}
      {screen.type === "projects" && (
        <Projects userId={user.uid}
          onViewDetail={(id, type) => go({ type: "detail", id, entryType: type, from: screen })} />
      )}
      {screen.type === "detail" && (
        <EntryDetail
          entryId={screen.id}
          entryType={screen.entryType}
          userId={user.uid}
          onBack={() => go(screen.from || { type: "journal" })}
          onOpenSession={(id, type) => go({ type: "session", id, entryType: type, from: screen })} />
      )}
      {screen.type === "add" && (
        <AddEntry
          userId={user.uid}
          onCancel={() => go(screen.from || { type: "journal" })}
          onSave={(id, type) => go({ type: "session", id, entryType: type, from: screen.from || { type: "journal" } })} />
      )}
    </div>
  );
}
