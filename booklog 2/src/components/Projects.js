import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc } from "firebase/firestore";

export default function Projects({ userId, onViewDetail }) {
  const [projects, setProjects] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [projectItems, setProjectItems] = useState({});
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    return onSnapshot(query(collection(db, "users", userId, "projects"), orderBy("createdAt", "desc")),
      snap => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [userId]);

  useEffect(() => {
    const unsubs = [];
    Object.keys(expanded).forEach(pid => {
      if (expanded[pid]) {
        const unsub = onSnapshot(
          query(collection(db, "users", userId, "projects", pid, "items"), orderBy("addedAt", "asc")),
          snap => setProjectItems(prev => ({ ...prev, [pid]: snap.docs.map(d => ({ id: d.id, ...d.data() })) }))
        );
        unsubs.push(unsub);
      }
    });
    return () => unsubs.forEach(u => u());
  }, [expanded, userId]);

  const create = async () => {
    if (!newTitle.trim()) return;
    await addDoc(collection(db, "users", userId, "projects"), {
      title: newTitle.trim(), createdAt: serverTimestamp(),
    });
    setNewTitle(""); setCreating(false);
  };

  const deleteProject = async (id) => {
    if (!window.confirm("Delete this project?")) return;
    await deleteDoc(doc(db, "users", userId, "projects", id));
  };

  const removeItem = async (projectId, itemId) => {
    await deleteDoc(doc(db, "users", userId, "projects", projectId, "items", itemId));
  };

  return (
    <div className="wrap">
      <div style={{ marginBottom: 10 }}>
        {creating ? (
          <span className="mono" style={{ fontSize: 13 }}>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder="project title" autoFocus style={{ width: 240, marginRight: 8 }}
              onKeyDown={e => { if (e.key === "Enter") create(); if (e.key === "Escape") { setCreating(false); setNewTitle(""); } }} />
            <button onClick={create} className="primary" style={{ marginRight: 6 }}>create</button>
            <button onClick={() => { setCreating(false); setNewTitle(""); }}>cancel</button>
          </span>
        ) : (
          <a className="mono" style={{ fontSize: 13 }} onClick={() => setCreating(true)}>[+ new project]</a>
        )}
      </div>

      {projects.length === 0 && !creating && (
        <p style={{ fontStyle: "italic", color: "#555" }}>No projects yet.</p>
      )}

      {projects.map(project => (
        <div key={project.id} style={{ marginBottom: 4 }}>
          <div style={{ borderBottom: "1px solid #f0f0f0", padding: "4px 0", display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="mono" style={{ cursor: "pointer" }}
              onClick={() => setExpanded(p => ({ ...p, [project.id]: !p[project.id] }))}>
              {expanded[project.id] ? "▼" : "▶"}
            </span>
            <span style={{ fontSize: 17, fontStyle: "italic" }}>{project.title}</span>
            <span className="mono" style={{ color: "#999", fontSize: 12 }}>
              {project.createdAt?.toDate ? project.createdAt.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
            </span>
            <span className="mono" style={{ marginLeft: "auto", fontSize: 12, color: "#c00", cursor: "pointer", textDecoration: "underline" }}
              onClick={() => deleteProject(project.id)}>[delete]</span>
          </div>

          {expanded[project.id] && (
            <div style={{ paddingLeft: 20, borderLeft: "2px solid #eee", marginLeft: 6, marginBottom: 6 }}>
              {!projectItems[project.id] || projectItems[project.id].length === 0 ? (
                <p className="mono" style={{ fontSize: 12, color: "#888", padding: "4px 0" }}>
                  no items yet — mark entries as [useful] to add them here
                </p>
              ) : (
                <table className="bordered" style={{ marginTop: 6 }}>
                  <thead>
                    <tr>
                      <th>source</th>
                      <th style={{ width: 42 }}>pg</th>
                      <th>note</th>
                      <th style={{ width: 30 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectItems[project.id].map(item => (
                      <tr key={item.id}>
                        <td className="mono" style={{ fontSize: 12 }}>
                          <a onClick={() => onViewDetail(item.entryId, item.entryType)}>{item.entryTitle}</a>
                        </td>
                        <td className="pg-col">{item.page || "—"}</td>
                        <td style={{ fontStyle: item.noteType === "quote" ? "italic" : "normal", fontSize: 15 }}>{item.text}</td>
                        <td>
                          <span style={{ cursor: "pointer", color: "#999", fontSize: 14 }}
                            onClick={() => removeItem(project.id, item.id)}>×</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
