import React, { useState } from "react";
import { db } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export default function UsernameSetup({ userId, onComplete }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleSubmit = async () => {
    const trimmed = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!trimmed || trimmed.length < 3) {
      setError("Username must be at least 3 characters (letters, numbers, underscores only).");
      return;
    }
    setChecking(true);
    setError("");

    // Check uniqueness by document ID
    const usernameDoc = await getDoc(doc(db, "usernames", trimmed));
    if (usernameDoc.exists()) {
      setError("That username is already taken, try another.");
      setChecking(false);
      return;
    }

    // Save username
    await setDoc(doc(db, "users", userId, "profile", "info"), { username: trimmed });
    await setDoc(doc(db, "usernames", trimmed), { userId });
    onComplete(trimmed);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16, padding: "0 24px" }}>
      <span style={{ fontSize: 26, color: "#444" }}>Book Log</span>
      <p style={{ color: "#888", fontSize: 15, margin: 0 }}>choose a username</p>
      <div style={{ width: "100%", maxWidth: 320, marginTop: 8 }}>
        <input
          value={username}
          onChange={e => { setUsername(e.target.value); setError(""); }}
          onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
          placeholder="e.g. jenny"
          autoFocus
          style={{
            width: "100%", padding: "10px 14px", fontSize: 16,
            border: "1px solid #e0e0e0", borderRadius: 8, outline: "none",
            background: "#fff", marginBottom: 8,
          }}
        />
        {error && <p style={{ fontSize: 13, color: "#e8318a", margin: "0 0 8px" }}>{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={checking}
          style={{
            width: "100%", background: "#e8318a", color: "#fff", border: "none",
            borderRadius: 8, padding: "10px", fontSize: 15, cursor: "pointer",
            opacity: checking ? 0.7 : 1,
          }}>
          {checking ? "checking..." : "Set username"}
        </button>
      </div>
      <p style={{ fontSize: 12, color: "#ccc", maxWidth: 280, textAlign: "center" }}>
        Letters, numbers, and underscores only. You can't change this later.
      </p>
    </div>
  );
}
