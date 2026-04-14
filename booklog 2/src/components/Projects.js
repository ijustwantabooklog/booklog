import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";

export default function Projects({ userId, onViewProject }) {
  const [projects, setProjects] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    return onSnapshot(query(collection(db, "users", userId, "projects"), orderBy("createdAt", "desc")), snap => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [userId]);

  const createProject = async () => {
    if (!newTitle.trim()) return;
    const ref = await addDoc(collection(db, "users", userId, "projects"), {
      title: newTitle.trim(), description: newDesc.trim(), public: false,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    setNewTitle(""); setNewDesc(""); setCreating(false);
    onViewProject(ref.id);
  };

  const sectionHead = { fontFamily: "Arial, sans-serif", fontSize: 12, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", color: "#555", borderBottom: "1px solid #ccc", paddingBottom: 3, marginBottom: 8 };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={() => setCreating(true)}
          style={{ background: "#e8318a", color: "#fff", border: "none", padding: "4px 14px", fontSize: 14, cursor: "pointer" }}>
          New project
        </button>
      </div>

      {creating && (
        <div style={{ border: "1px solid #999", padding: "12px", marginBottom: 12 }}>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Project title" autoFocus
            style={{ width: "100%", fontSize: 16, marginBottom: 6, fontFamily: "Georgia, serif" }} />
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)"
            style={{ width: "100%", fontSize: 14, marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={createProject} style={{ background: "#e8318a", color: "#fff", border: "none", padding: "4px 14px", fontSize: 13, cursor: "pointer" }}>Create</button>
            <button onClick={() => { setCreating(false); setNewTitle(""); setNewDesc(""); }}
              style={{ background: "#f0f0f0", border: "1px solid #999", padding: "4px 14px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {projects.length === 0 && !creating && (
        <p style={{ color: "#666", fontStyle: "italic" }}>No projects yet.</p>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {projects.map(project => (
            <tr key={project.id} onClick={() => onViewProject(project.id)}
              style={{ cursor: "pointer", borderBottom: "1px solid #eee" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f9f9f9"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <td style={{ padding: "8px 0", verticalAlign: "top" }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 15, color: "#00e", textDecoration: "underline" }}>{project.title}</div>
                {project.description && <div style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: "#555", marginTop: 2 }}>{project.description}</div>}
                <div style={{ fontFamily: "Arial, sans-serif", fontSize: 11, color: "#999", marginTop: 2 }}>
                  {project.updatedAt?.toDate ? project.updatedAt.toDate().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}
                </div>
              </td>
              <td style={{ textAlign: "right", verticalAlign: "top", padding: "8px 0" }}>
                <span style={{ fontFamily: "Arial, sans-serif", fontSize: 11, color: project.public ? "#e8318a" : "#999", border: `1px solid ${project.public ? "#e8318a" : "#ccc"}`, padding: "1px 6px" }}>
                  {project.public ? "public" : "private"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
