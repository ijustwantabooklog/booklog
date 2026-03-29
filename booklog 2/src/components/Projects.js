import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";

export default function Projects({ userId, onViewProject }) {
  const [projects, setProjects] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "users", userId, "projects"), orderBy("createdAt", "desc")),
      snap => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, [userId]);

  const createProject = async () => {
    if (!newTitle.trim()) return;
    const ref = await addDoc(collection(db, "users", userId, "projects"), {
      title: newTitle.trim(),
      description: newDesc.trim(),
      public: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setNewTitle(""); setNewDesc(""); setCreating(false);
    onViewProject(ref.id);
  };

  const cardStyle = { background: "#fff", border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden", marginBottom: 10 };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div />
        <button onClick={() => setCreating(true)}
          style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "7px 18px", fontSize: 14, cursor: "pointer" }}>
          New project
        </button>
      </div>

      {creating && (
        <div style={{ ...cardStyle, padding: "20px" }}>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Project title"
            autoFocus
            style={{ width: "100%", fontSize: 18, border: "none", outline: "none", marginBottom: 10, fontFamily: "Georgia, serif", color: "#1a1a1a" }} />
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" rows={2}
            style={{ width: "100%", fontSize: 14, border: "none", outline: "none", resize: "none", color: "#555", fontFamily: "inherit", lineHeight: 1.6 }} />
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button onClick={createProject} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 13, cursor: "pointer" }}>Create</button>
            <button onClick={() => { setCreating(false); setNewTitle(""); setNewDesc(""); }} style={{ background: "none", border: "none", color: "#aaa", fontSize: 13, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {projects.length === 0 && !creating && (
        <p style={{ color: "#aaa", fontSize: 14 }}>No projects yet. Create one to start organizing your research.</p>
      )}

      {projects.map(project => (
        <div key={project.id} onClick={() => onViewProject(project.id)}
          style={{ ...cardStyle, padding: "20px", cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
          onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 18, color: "#1a1a1a", fontFamily: "Georgia, serif", marginBottom: 4 }}>{project.title}</div>
              {project.description && <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>{project.description}</div>}
            </div>
            <span style={{ fontSize: 11, color: project.public ? "#e8318a" : "#ccc", border: `1px solid ${project.public ? "#e8318a" : "#ddd"}`, borderRadius: 4, padding: "2px 8px", flexShrink: 0, marginLeft: 12 }}>
              {project.public ? "public" : "private"}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#bbb", marginTop: 10 }}>
            {project.updatedAt?.toDate ? project.updatedAt.toDate().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}
          </div>
        </div>
      ))}
    </div>
  );
}
