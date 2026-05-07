import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export default function Journal({ userId, onOpenSession, onViewDetail, onSelectEntry, selectedEntryId }) {
  const [books, setBooks] = useState([]);
  const [articles, setArticles] = useState([]);
  const [noteCounts, setNoteCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    let b = false, a = false;
    const u1 = onSnapshot(query(collection(db, "users", userId, "books"), orderBy("updatedAt", "desc")),
      snap => { setBooks(snap.docs.map(d => ({ id: d.id, col: "books", ...d.data() }))); b = true; if (a) setLoading(false); });
    const u2 = onSnapshot(query(collection(db, "users", userId, "articles"), orderBy("updatedAt", "desc")),
      snap => { setArticles(snap.docs.map(d => ({ id: d.id, col: "articles", ...d.data() }))); a = true; if (b) setLoading(false); });
    return () => { u1(); u2(); };
  }, [userId]);

  useEffect(() => {
    const allEntries = [...books, ...articles];
    if (allEntries.length === 0) return;
    const unsubs = allEntries.map(entry => {
      return onSnapshot(
        query(collection(db, "users", userId, entry.col, entry.id, "notes"), orderBy("createdAt", "asc")),
        snap => setNoteCounts(prev => ({ ...prev, [entry.id]: snap.size }))
      );
    });
    return () => unsubs.forEach(u => u());
  }, [books.length, articles.length, userId]);

  const all = [...books, ...articles].sort((a, b) => {
    const ta = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(0);
    const tb = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(0);
    return tb - ta;
  });

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const getLabel = (ts) => {
    if (!ts?.toDate) return null;
    const d = ts.toDate();
    const ds = d.toDateString();
    if (ds === today) return "Today — " + d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    if (ds === yesterday) return "Yesterday — " + d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  const groups = [];
  const seen = {};
  all.forEach(entry => {
    const label = getLabel(entry.updatedAt);
    if (!label) return;
    if (!seen[label]) { seen[label] = true; groups.push({ label, entries: [] }); }
    groups[groups.length - 1].entries.push(entry);
  });

  const getTitle = (e) => e.isChapter && e.chapterTitle ? `${e.chapterTitle} [ch. of ${e.title}]` : e.title;

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const monthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const monthEntries = all.filter(e => {
    const d = e.updatedAt?.toDate ? e.updatedAt.toDate() : null;
    return d && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const monthBooks = monthEntries.filter(e => e.col === "books").length;
  const monthArticles = monthEntries.filter(e => e.col === "articles").length;
  const monthNotes = monthEntries.reduce((sum, e) => sum + (noteCounts[e.id] || 0), 0);

  return (
    <div className="wrap">

      {!loading && (monthBooks > 0 || monthArticles > 0) && (
        <div style={{ border: "1px solid #ccc", padding: "8px 12px", marginBottom: 20, background: "#fafafa", fontFamily: "Arial, Helvetica, sans-serif", fontSize: 13 }}>
          <span style={{ fontWeight: "bold", marginRight: 12 }}>{monthName}</span>
          {monthBooks > 0 && <span style={{ marginRight: 12 }}>{monthBooks} {monthBooks === 1 ? "book" : "books"}</span>}
          {monthArticles > 0 && <span style={{ marginRight: 12 }}>{monthArticles} {monthArticles === 1 ? "article" : "articles"}</span>}
          {monthNotes > 0 && <span style={{ color: "#555" }}>{monthNotes} {monthNotes === 1 ? "note" : "notes"} taken</span>}
        </div>
      )}

      {loading && <p className="mono">loading...</p>}
      {!loading && groups.length === 0 && (
        <p style={{ fontStyle: "italic", color: "#555" }}>Nothing logged yet. Add an entry above to start.</p>
      )}

      {groups.map(({ label, entries }) => {
        const isToday = label.startsWith("Today");
        const bCount = entries.filter(e
