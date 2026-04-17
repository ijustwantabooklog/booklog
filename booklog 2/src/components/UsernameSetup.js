import React, { useState } from "react";
import { db } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export default function UsernameSetup({ userId, onComplete }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleSubmit = async () => {
    const trimmed = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (trimmed.length < 3) { setError("at least 3 characters (letters, numbers, underscores)"); return; }
    setChecking(true);
    const snap = await getDoc(doc(db, "usernames", trimmed));
    if (snap.exists()) { setError("username taken"); setChecking(false); return; }
    await setDoc(doc(db, "users", userId, "profile", "info"), { username: trimmed });
    await setDoc(doc(db, "usernames", trimmed), { userId });
    onComplete(trimmed);
  };

  return (
    <div style={{ padding: 40, maxWidth: 400, margin: "80px auto" }}>
      <h1 style={{ marginBottom: 12 }}>choose a username</h1>
      <input value={username} onChange={e => { setUsername(e.target.value); setError(""); }}
        onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
        placeholder="e.g. jenny" autoFocus style={{ marginBottom: 8, width: "100%" }} />
      {error && <p className="mono" style={{ color: "red", fontSize: 13, marginBottom: 8 }}>{error}</p>}
      <button className="primary" onClick={handleSubmit} disabled={checking}>
        {checking ? "checking..." : "set username"}
      </button>
    </div>
  );
}
