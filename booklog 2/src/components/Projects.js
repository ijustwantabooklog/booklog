import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDocs } from "firebase/firestore";

export default function Projects({ userId, onViewDetail }) {
  const [projects, setProjects] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [projectNotes, setProjectNotes] = useState({});

  useEffect(() => {
    return onSnapshot(query(collection(db, "users", userId, "projects"), orderBy("createdAt", "desc")), snap => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [userId]);

  useEffect(() => {
    if (expanded) {
      const unsub = onSnapshot(
        query(collection(db, "users", userId, "projects", expanded, "items"), orderBy("addedAt", "asc")),
        snap => setProjectNotes(prev => ({ ...prev, [expanded]: snap.docs.map(d => ({ id: d.id, ...d.data() })) }))
      );
      return unsub;
    }
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
    if (expanded === id) setExpanded(null);
  };

  const removeItem = async (projectId, itemId) => {
    await deleteDoc(doc(db, "users", userId, "projects", projectId, "items", itemId));
  };

  return (
    <div className="page-wrap">
      <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
        {creating ? (
          <>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Project title" autoFocus
              onKeyDown={e => { if (e.key === "Enter") create(); if (e.key === "Escape") { setCreating(false); setNewTitle(""); } }}
              style={{ maxWidth: 300 }} />
            <button onClick={create} style={{ width: "auto", padding: "3px 12px" }}>Create</button>
            <button onClick={() => { setCreating(false); setNewTitle(""); }} style={{ width: "auto", padding: "3px 12px" }}>Cancel</button>
          </>
        ) : (
          <button className="primary" onClick={() => setCreating(true)} style={{ width: "auto", padding: "3px 14px" }}>+ New project</button>
        )}
      </div>

      {projects.length === 0 && !creating && (
        <p style={{ color: "#666", fontStyle: "italic" }}>No projects yet.</p>
      )}

      <table>
        <tbody>
          {projects.map(project => (
            <React.Fragment key={project.id}>
              <tr style={{ cursor: "pointer" }}
                onClick={() => setExpanded(expanded === project.id ? null : project.id)}
                onMouseEnter={e => e.currentTarget.style.background = "#f9f9f9"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                <td style={{ width: 16, fontFamily: "Arial, sans-serif", fontSize: 11, color: "#999" }}>
                  {expanded === project.id ? "▼" : "▶"}
                </td>
                <td>
                  <span style={{ fontFamily: "Georgia, serif", fontSize: 15 }}>{project.title}</span>
                  <span style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: "#999", marginLeft: 8 }}>
                    {project.createdAt?.toDate ? project.createdAt.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                  </span>
                </td>
                <td style={{ textAlign: "right", width: 60 }}>
                  <span style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: "#cc0000", cursor: "pointer" }}
                    onClick={e => { e.stopPropagation(); deleteProject(project.id); }}>delete</span>
                </td>
              </tr>
              {expanded === project.id && (
                <tr>
                  <td></td>
                  <td colSpan={2} style={{ paddingBottom: 12, paddingTop: 4 }}>
                    {(!projectNotes[project.id] || projectNotes[project.id].length === 0) ? (
                      <p style={{ color: "#666", fontStyle: "italic", fontSize: 13 }}>No items in this project yet. Mark notes as useful while reading to add them here.</p>
                    ) : (
                      <table style={{ marginTop: 4 }}>
                        <thead>
                          <tr>
                            <th>Source</th>
                            <th>Pg</th>
                            <th>Note</th>
                            <th style={{ width: 40 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {projectNotes[project.id].map(item => (
                            <tr key={item.id}>
                              <td style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: "#555" }}>
                                <span className="link" onClick={() => onViewDetail(item.entryId, item.entryType)}>{item.entryTitle}</span>
                              </td>
                              <td style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: "#e8318a" }}>{item.page || "—"}</td>
                              <td style={{ fontFamily: item.noteType === "quote" ? "Georgia, serif" : "Arial, sans-serif", fontSize: 13 }}>{item.text}</td>
                              <td>
                                <span style={{ color: "#cc0000", cursor: "pointer", fontSize: 14 }} onClick={() => removeItem(project.id, item.id)}>×</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
