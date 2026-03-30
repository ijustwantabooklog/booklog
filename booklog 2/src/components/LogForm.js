import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp, onSnapshot, query, orderBy } from "firebase/firestore";
import { logActivity } from "../activityLogger";

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1,2,3,4,5].map((star) => (
        <span key={star} onClick={() => onChange(star === value ? 0 : star)}
          onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)}
          style={{ fontSize: 22, cursor: "pointer", color: star <= (hovered || value) ? "#1a1a1a" : "#ccc", userSelect: "none" }}>
          {star <= (hovered || value) ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}

async function searchGoogleBooks(q) {
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5&key=AIzaSyAGIJE0s9K-wBC4lErKJgIhZ-cl5QRd0Rk`);
  const data = await res.json();
  return (data.items || []).map(item => {
    const info = item.volumeInfo;
    const cover = info.imageLinks?.thumbnail?.replace("http://", "https://") || null;
    return { title: info.title || "", author: (info.authors || [])[0] || "", year: info.publishedDate?.slice(0, 4) || "", coverUrl: cover };
  });
}

export default function LogForm({ book, userId, onCancel, onSave }) {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const [form, setForm] = useState({
    title: book?.title || "",
    author: book?.author || "",
    translator: book?.translator || "",
    year: book?.year || "",
    rating: book?.rating || 0,
    shelves: (book?.shelves || []).map(s => typeof s === 'string' ? s : s.name),
    tags: (book?.tags || []).map(t => typeof t === 'string' ? t : t.name),
    notes: book?.notes || book?.review || "",
    dateRead: book?.dateRead || dateStr,
    coverUrl: book?.coverUrl || "",
    currentlyReading: book?.currentlyReading || false,
    partialRead: book?.partialRead || false,
    section: book?.section || "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [shelfInput, setShelfInput] = useState("");
  const [shelfSuggestions, setShelfSuggestions] = useState([]);
  const [existingShelves, setExistingShelves] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(today);

  useEffect(() => {
    const q = query(collection(db, "users", userId, "books"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => {
      const allShelves = snap.docs.flatMap(d => d.data().shelves || []);
      setExistingShelves([...new Set(allShelves)]);
    });
  }, [userId]);

  useEffect(() => {
    if (!shelfInput.trim()) { setShelfSuggestions([]); return; }
    const matches = existingShelves.filter(s =>
      s.toLowerCase().startsWith(shelfInput.toLowerCase()) && !form.shelves.includes(s)
    );
    setShelfSuggestions(matches.slice(0, 5));
  }, [shelfInput, existingShelves, form.shelves]);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const doSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await searchGoogleBooks(searchQuery);
    setSearchResults(results);
    setSearching(false);
  };

  const selectBook = (b) => {
    update("title", b.title);
    update("author", b.author);
    update("year", b.year);
    update("coverUrl", b.coverUrl || "");
    setSearchResults([]);
    setSearchQuery("");
  };

  const addShelf = (name) => {
    const trimmed = (name || shelfInput).trim();
    if (!trimmed || form.shelves.includes(trimmed)) { setShelfInput(""); setShelfSuggestions([]); return; }
    update("shelves", [...form.shelves, trimmed]);
    setShelfInput(""); setShelfSuggestions([]);
  };

  const removeShelf = (s) => update("shelves", form.shelves.filter(x => x !== s));

  const addTag = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      const cleaned = tagInput.trim().replace(/^#/, "");
      if (!form.tags.includes(cleaned)) update("tags", [...form.tags, cleaned]);
      setTagInput("");
    }
  };

  const removeTag = (t) => update("tags", form.tags.filter(x => x !== t));

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const yr = calendarDate.getFullYear();
  const mo = calendarDate.getMonth();
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const firstDay = new Date(yr, mo, 1).getDay();

  const selectDate = (day) => {
    const d = new Date(yr, mo, day);
    update("dateRead", d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
    setShowCalendar(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const pendingShelves = shelfInput.trim() && !form.shelves.includes(shelfInput.trim()) ? [...form.shelves, shelfInput.trim()] : form.shelves;
    const pendingTags = tagInput.trim() && !form.tags.includes(tagInput.trim().replace(/^#/, "")) ? [...form.tags, tagInput.trim().replace(/^#/, "")] : form.tags;
    const data = { ...form, shelves: pendingShelves, tags: pendingTags, updatedAt: serverTimestamp() };

    try {
      if (book?.id) {
        const prev = book;
        await updateDoc(doc(db, "users", userId, "books", book.id), data);
        const newShelves = (data.shelves || []).filter(s => !(prev.shelves || []).includes(s));
        const newTags = (data.tags || []).filter(t => !(prev.tags || []).includes(t));
        for (const s of newShelves) await logActivity(userId, "shelf", { text: "Added to shelf", shelf: s, bookTitle: data.title, bookId: book.id });
        for (const t of newTags) await logActivity(userId, "tag", { text: "Added tag", tag: t, bookTitle: data.title, bookId: book.id });
        if (!prev.currentlyReading && data.currentlyReading) await logActivity(userId, "currently_reading", { text: "Marked as currently reading", bookTitle: data.title, bookId: book.id });
        if (prev.currentlyReading && !data.currentlyReading) await logActivity(userId, "finished", { text: "Finished reading", bookTitle: data.title, bookId: book.id });
        onSave({ id: book.id, ...data });
      } else {
        data.createdAt = serverTimestamp();
        const ref = await addDoc(collection(db, "users", userId, "books"), data);
        await logActivity(userId, "logged_book", { text: "Logged", bookTitle: data.title, bookId: ref.id });
        if (data.currentlyReading) await logActivity(userId, "currently_reading", { text: "Marked as currently reading", bookTitle: data.title, bookId: ref.id });
        onSave({ id: ref.id, ...data });
      }
    } catch (e) { console.error(e); setSaving(false); }
  };

  return (
    <div style={{ background: "#f4f4f4", minHeight: "100vh" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 16px 60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0 16px" }}>
          <button onClick={onCancel} style={ghostBtn}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Log it"}
          </button>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") doSearch(); }}
              placeholder="Search for a book by title or author..."
              style={{ flex: 1, padding: "10px 14px", fontSize: 14, border: "1px solid #e0e0e0", borderRadius: 8, background: "#fff", outline: "none" }} />
          </div>
          {searching && <p style={{ fontSize: 13, color: "#aaa", marginTop: 6 }}>searching...</p>}
          {searchResults.length > 0 && (
            <div style={{ position: "absolute", left: 0, right: 0, zIndex: 50, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8, marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", overflow: "hidden" }}>
              {searchResults.map((b, i) => (
                <div key={i} onClick={() => selectBook(b)}
                  style={{ display: "flex", gap: 12, padding: "10px 14px", cursor: "pointer", borderBottom: i === searchResults.length - 1 ? "none" : "0.5px solid #f0f0f0" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                  {b.coverUrl && <img src={b.coverUrl} alt={b.title} style={{ width: 32, height: 46, objectFit: "cover", borderRadius: 2, flexShrink: 0 }} />}
                  <div>
                    <div style={{ fontSize: 14, color: "#1a1a1a", fontFamily: "Georgia, serif" }}>{b.title}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>{b.author} {b.year && `· ${b.year}`}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Book info */}
        <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "flex-start" }}>
          <div style={{ width: 100, height: 140, background: form.coverUrl ? "none" : "#e0e0e0", borderRadius: 3, flexShrink: 0, overflow: "hidden", border: "1px solid #ddd" }}>
            {form.coverUrl && <img src={form.coverUrl} alt="cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          </div>
          <div style={{ flex: 1 }}>
            <input value={form.title} onChange={e => update("title", e.target.value)} placeholder="Title"
              style={{ ...bareInput, fontFamily: "Georgia, serif", fontSize: 24, color: "#1a1a1a", display: "block", width: "100%", marginBottom: 6 }} />
            <input value={form.author} onChange={e => update("author", e.target.value)} placeholder="Author"
              style={{ ...bareInput, fontSize: 14, color: "#555", display: "block", width: "100%", marginBottom: 2 }} />
            <input value={form.translator} onChange={e => update("translator", e.target.value)} placeholder="trans. by (optional)"
              style={{ ...bareInput, fontSize: 14, color: "#555", display: "block", width: "100%", marginBottom: 2 }} />
            <input value={form.year} onChange={e => update("year", e.target.value)} placeholder="Year"
              style={{ ...bareInput, fontSize: 14, color: "#555", display: "block", width: "100%" }} />
          </div>
        </div>

        {/* Currently reading + Partial read */}
        <div style={{ ...card, marginBottom: 10 }}>
          <div style={{ display: "flex", padding: "12px 16px", gap: 0 }}>
            <div onClick={() => update("currentlyReading", !form.currentlyReading)}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", paddingRight: 16, borderRight: "1px solid #f0f0f0" }}>
              <span style={{ fontSize: 12, color: "#aaa" }}>Currently reading</span>
              <div style={{ width: 18, height: 18, borderRadius: 4, border: "1.5px solid", borderColor: form.currentlyReading ? "#e8318a" : "#ccc", background: form.currentlyReading ? "#e8318a" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {form.currentlyReading && <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>✓</span>}
              </div>
            </div>
            <div onClick={() => update("partialRead", !form.partialRead)}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", paddingLeft: 16 }}>
              <span style={{ fontSize: 12, color: "#aaa" }}>Partial read</span>
              <div style={{ width: 18, height: 18, borderRadius: 4, border: "1.5px solid", borderColor: form.partialRead ? "#e8318a" : "#ccc", background: form.partialRead ? "#e8318a" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {form.partialRead && <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>✓</span>}
              </div>
            </div>
          </div>
          {form.partialRead && (
            <div style={{ ...cardRow, borderTop: "1px solid #e8e8e8" }}>
              <span style={cardLabel}>Section</span>
              <input value={form.section} onChange={e => update("section", e.target.value)}
                placeholder="e.g. Chapter 3, Introduction, pp. 45-78"
                style={{ ...bareInput, flex: 1, fontSize: 14 }} />
            </div>
          )}
        </div>

        {/* Date */}
        {!form.currentlyReading && (
          <div style={{ ...card, marginBottom: 10, position: "relative" }}>
            <div style={{ ...cardRow, cursor: "pointer" }} onClick={() => setShowCalendar(p => !p)}>
              <span style={cardLabel}>Date</span>
              <span style={{ fontSize: 14 }}>
                <strong style={{ fontWeight: 500 }}>{form.dateRead === dateStr ? "Today" : form.dateRead}</strong>
                {form.dateRead === dateStr && <span style={{ color: "#888", marginLeft: 6 }}>{dateStr}</span>}
              </span>
            </div>
            {showCalendar && (
              <div style={{ padding: "0 16px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <button onClick={() => setCalendarDate(new Date(yr, mo - 1, 1))} style={ghostBtn}>←</button>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{MONTHS[mo]} {yr}</span>
                  <button onClick={() => setCalendarDate(new Date(yr, mo + 1, 1))} style={ghostBtn}>→</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center" }}>
                  {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} style={{ fontSize: 10, color: "#aaa", padding: "4px 0" }}>{d}</div>)}
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const isToday = day === today.getDate() && mo === today.getMonth() && yr === today.getFullYear();
                    return (
                      <div key={day} onClick={() => selectDate(day)}
                        style={{ fontSize: 13, padding: "5px 2px", borderRadius: 4, cursor: "pointer", background: isToday ? "#e8318a" : "none", color: isToday ? "#fff" : "#333" }}
                        onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = "#f0f0f0"; }}
                        onMouseLeave={e => { if (!isToday) e.currentTarget.style.background = "none"; }}>
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rate / Shelves / Tags / Review */}
        <div style={{ ...card }}>
          <div style={cardRow}>
            <span style={cardLabel}>Rate</span>
            <StarRating value={form.rating} onChange={v => update("rating", v)} />
          </div>

          <div style={{ borderTop: "1px solid #e8e8e8", padding: "12px 16px", position: "relative", display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ flex: 1, borderRight: "1px solid #f0f0f0", paddingRight: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{ ...cardLabel, paddingTop: 2 }}>Shelves</span>
                <div style={{ flex: 1 }}>
                  {form.shelves.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                      {form.shelves.map(s => (
                        <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#1a1a1a", color: "#fff", borderRadius: 20, padding: "3px 10px", fontSize: 12 }}>
                          {s}<span onClick={() => removeShelf(s)} style={{ cursor: "pointer", opacity: 0.6, fontSize: 14, lineHeight: 1 }}>×</span>
                        </span>
                      ))}
                    </div>
                  )}
                  <input value={shelfInput} onChange={e => setShelfInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addShelf(); } }} onBlur={() => { if (shelfInput.trim()) addShelf(); }}
                    placeholder="Favourites"
                    style={{ ...bareInput, fontSize: 14, width: "100%" }} />
                  {shelfSuggestions.length > 0 && (
                    <div style={{ position: "absolute", left: 16, width: "45%", zIndex: 50, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 6, marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", overflow: "hidden" }}>
                      {shelfSuggestions.map(s => (
                        <div key={s} onClick={() => addShelf(s)}
                          style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", color: "#333" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#f9f9f9"}
                          onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{ ...cardLabel, paddingTop: 2 }}>Tags</span>
                <div style={{ flex: 1 }}>
                  {form.tags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                      {form.tags.map(t => (
                        <span key={t} style={{ fontSize: 13, color: "#555", fontStyle: "italic" }}>
                          #{t}<span onClick={() => removeTag(t)} style={{ marginLeft: 4, cursor: "pointer", color: "#ccc", fontStyle: "normal" }}>×</span>
                        </span>
                      ))}
                    </div>
                  )}
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag}
                    placeholder="Literary Fiction"
                    style={{ ...bareInput, fontSize: 14, width: "100%" }} />
                </div>
              </div>
            </div>
          </div>

          {!form.currentlyReading && (
            <div style={{ ...cardRow, borderTop: "1px solid #e8e8e8", alignItems: "flex-start" }}>
              <span style={{ ...cardLabel, paddingTop: 2 }}>Review</span>
              <textarea value={form.notes} onChange={e => update("notes", e.target.value)}
                placeholder="Write a review..." rows={3}
                style={{ ...bareInput, flex: 1, fontSize: 14, resize: "vertical", lineHeight: 1.5 }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ghostBtn = { background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13 };
const card = { background: "#fff", borderRadius: 10, border: "1px solid #e2e2e2", overflow: "visible", marginBottom: 10 };
const cardRow = { display: "flex", alignItems: "center", gap: 16, padding: "12px 16px" };
const cardLabel = { fontSize: 14, color: "#555", minWidth: 72, flexShrink: 0 };
const bareInput = { background: "none", border: "none", outline: "none", fontFamily: "inherit", padding: 0 };
