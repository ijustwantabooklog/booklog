import React, { useState, useEffect } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useParams } from "react-router-dom";
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

  if (loading) return <div style={{ padding: 20, fontFamily: "Arial, sans-serif", fontSize: 13 }}>loading...</div>;

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

  return (
    <BrowserRouter>
      <Layout username={username} userId={user.uid} />
    </BrowserRouter>
  );
}

function Layout({ username, userId }) {
  const navigate = useNavigate ? useNavigate() : null;

  return (
    <div>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #000", padding: "24px 20px 16px", textAlign: "center" }}>
        <div style={{ fontFamily: "Times New Roman, serif", fontSize: 32, fontWeight: "bold", letterSpacing: 1, marginBottom: 4 }}>
          Reading Archive
        </div>
        <div style={{ fontFamily: "Times New Roman, serif", fontStyle: "italic", fontSize: 16, color: "#333" }}>
          a personal research journal
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div style={{ display: "flex", minHeight: "calc(100vh - 100px)" }}>

        {/* Sidebar */}
        <div style={{ width: 160, borderRight: "1px solid #ccc", padding: "12px 10px", flexShrink: 0 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ background: "#99ccff", fontWeight: "bold", fontSize: 13, fontFamily: "Arial, sans-serif", padding: "2px 6px", marginBottom: 4, textAlign: "center" }}>
              Navigate
            </div>
            {[["journal","journal"],["/library","library"],["/projects","projects"]].map(([path, label]) => (
              <div key={path} style={{ padding: "2px 4px" }}>
                <NavLink to={path === "journal" ? "/" : path}
                  style={({ isActive }) => ({ fontSize: 15, color: isActive ? "#000" : "#00c", textDecoration: isActive ? "none" : "underline", fontWeight: isActive ? "bold" : "normal", fontFamily: "Times New Roman, serif" })}>
                  {label}
                </NavLink>
              </div>
            ))}
          </div>
          <div>
            <div style={{ background: "#99ccff", fontWeight: "bold", fontSize: 13, fontFamily: "Arial, sans-serif", padding: "2px 6px", marginBottom: 4, textAlign: "center" }}>
              Actions
            </div>
            <div style={{ padding: "2px 4px" }}>
              <NavLink to="/add" style={{ fontSize: 15, color: "#00c", textDecoration: "underline", fontFamily: "Times New Roman, serif" }}>
                + new entry
              </NavLink>
            </div>
            <div style={{ padding: "2px 4px" }}>
              <span onClick={() => signOut(auth)}
                style={{ fontSize: 15, color: "#00c", textDecoration: "underline", cursor: "pointer", fontFamily: "Times New Roman, serif" }}>
                sign out
              </span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflow: "auto" }}>
          <Routes>
            <Route path="/" element={
              <Journal userId={userId}
                onOpenSession={(id, type) => window.location.href = `/session/${type}/${id}`}
                onViewDetail={(id, type) => window.location.href = `/entry/${type}/${id}`} />
            } />
            <Route path="/library" element={
              <Library userId={userId}
                onOpenSession={(id, type) => window.location.href = `/session/${type}/${id}`}
                onViewDetail={(id, type) => window.location.href = `/entry/${type}/${id}`} />
            } />
            <Route path="/projects" element={
              <Projects userId={userId}
                onViewDetail={(id, type) => window.location.href = `/entry/${type}/${id}`} />
            } />
            <Route path="/add" element={
              <AddEntry userId={userId}
                onCancel={() => window.history.back()}
                onSave={(id, type) => window.location.href = `/session/${type}/${id}`} />
            } />
            <Route path="/session/:entryType/:entryId" element={
              <SessionPage userId={userId} />
            } />
            <Route path="/entry/:entryType/:entryId" element={
              <DetailPage userId={userId} />
            } />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function SessionPage({ userId }) {
  const { entryType, entryId } = useParams();
  return (
    <ReadingSession
      entryId={entryId}
      entryType={entryType}
      userId={userId}
      onBack={() => window.history.back()}
      onViewDetail={(id, type) => window.location.href = `/entry/${type}/${id}`}
    />
  );
}

function DetailPage({ userId }) {
  const { entryType, entryId } = useParams();
  return (
    <EntryDetail
      entryId={entryId}
      entryType={entryType}
      userId={userId}
      onBack={() => window.history.back()}
      onOpenSession={(id, type) => window.location.href = `/session/${type}/${id}`}
    />
  );
}
