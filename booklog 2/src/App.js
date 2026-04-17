import React, { useState, useEffect } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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

  if (loading) return <div className="mono" style={{ padding: 20 }}>loading...</div>;

  if (!user) return (
    <div style={{ padding: 40, maxWidth: 400, margin: "80px auto", textAlign: "center" }}>
      <h1 style={{ marginBottom: 6 }}>reading archive</h1>
      <p style={{ fontStyle: "italic", color: "#555", marginBottom: 20, fontSize: 15 }}>a personal research journal</p>
      <button className="primary" onClick={() => signInWithPopup(auth, provider)}>
        sign in with google
      </button>
    </div>
  );

  if (!username) return <UsernameSetup userId={user.uid} onComplete={setUsername} />;

  const tabs = [["journal","journal"],["library","library"],["projects","projects"]];
  const page = tabs.map(t => t[0]).includes(screen.type) ? screen.type : "";

  if (screen.type === "session") return (
    <ReadingSession
      entryId={screen.id}
      entryType={screen.entryType}
      userId={user.uid}
      onBack={() => go(screen.from || { type: "journal" })}
      onViewDetail={(id, type) => go({ type: "detail", id, entryType: type, from: { type: "session", id: screen.id, entryType: screen.entryType, from: screen.from } })}
    />
  );

  if (screen.type === "add") return (
    <AddEntry
      userId={user.uid}
      onCancel={() => go(screen.from || { type: "journal" })}
      onSave={(id, type) => go({ type: "session", id, entryType: type, from: screen.from || { type: "journal" } })}
    />
  );

  return (
    <div>
      <div className="site-header">
        <span style={{ fontSize: 15 }}>reading archive / <span style={{ fontWeight: "bold" }}>{username}</span></span>
        <span>
          <a onClick={() => go({ type: "add", from: screen })} style={{ marginRight: 14 }}>[+ new entry]</a>
          <a onClick={() => signOut(auth)}>[sign out]</a>
        </span>
      </div>

      <div className="nav-bar">
        {tabs.map(([type, label]) => (
          <a key={type} onClick={() => go({ type })}
            className={page === type ? "active" : ""}
            style={{ cursor: "pointer" }}>
            {page === type ? `[${label}]` : label}
          </a>
        ))}
      </div>

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
    </div>
  );
}
