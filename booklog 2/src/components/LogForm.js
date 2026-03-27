import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp, onSnapshot, query, orderBy } from "firebase/firestore";

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1,2,3,4,5].map((star) => (
        <span key={star} onClick={() => onChange(star)}
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
    shelves: book?.shelves || (book?.shelf ? [book.shelf] : []),
    tags: book?.tags || [],
    notes: book?.notes || book?.review || "",
    quotes: book?.quotes || [],
    dateRead: book?.dateRead || dateStr,
    coverUrl: book?.coverUrl || "",
    currentlyReading: book?.currentlyReading || false,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [shelfInput, setShelfInput] = useState("");
  const [shelfSuggestions, setShelfSuggestions] = useState([]);
  const [existingShelves, setExistingShelves] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [newQuotePage, setNewQuotePage] = useState("");
  const [newQuoteText, setNewQuoteText] = useState("");
  const [showQuoteInput, setShowQuoteInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(today);
  const pageInputRef = useRef(null);
  const searchTimeout = useRef(null);

  useEffect(() => {
    const q = query(collection(db, "users", userId, "books"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      const allShelves = snap.docs.flatMap(d => d.data().shelves || (d.data().shelf ? [d.data().shelf] : []));
      setExistingShelves([...new Set(allShelves)]);
    });
  }, [userId]);

  useEffect(() => {
    if (!shelfInput.trim()) { setShelfSuggestions([]); return; }
    const matches = existingShelves.filter(s =>
      s.toLowerCase().startsWith(shelfInput.toLowerCase()) && !form.shelves.includes(s)
    );
    setShelfSuggestions(matches);
  }, [shelfInput, existingShelves, form.shelves]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setShowResults(false); return; }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchGoogleBooks(searchQuery);
      setSearchResults(results);
      setShowResults(true);
      setSearching(false);
    }, 500);
  }, [searchQuery]);

  // Focus page input when quote row opens
  useEffect(() => {
    if (showQuoteInput && pageInputRef.current) pageInputRef.current.focus();
  }, [showQuoteInput]);

  const pickBook = (result) => {
    setForm(f => ({ ...f, title: result.title, author: result.author, year: result.year, coverUrl: result.coverUrl || "" }));
    setShowResults(false);
    setSearchQuery("");
  };

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

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

  const addQuote = () => {
    if (!newQuoteText.trim()) return;
    update("quotes", [...form.quotes, { page: newQuotePage, text: newQuoteText.trim() }]);
    setNewQuotePage(""); setNewQuoteText(""); setShowQuoteInput(false);
  };

  const removeQuote = (i) => update("quotes", form.quotes.filter((_, idx) => idx !== i));

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y, m) => new Date(y, m, 1).getDay();

  const selectDate = (day) => {
    const d = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
    update("dateRead", d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
    setShowCalendar(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const data = { ...form, shelf: form.shelves[0] || "", updatedAt: serverTimestamp() };
    try {
      if (book?.id) {
        await updateDoc(doc(db, "users", userId, "books", book.id), data);
        onSave({ id: book.id, ...data });
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, "users", userId, "books"), data);
        onSave(null);
      }
    } catch (e) { console.error(e); setSaving(false); }
  };

  const yr = calendarDate.getFullYear();
  const mo = calendarDate.getMonth();
  const daysInMonth = getDaysInMonth(yr, mo);
  const firstDay = getFirstDay(yr, mo);

  return (
    <div style={{ background: "#f4f4f4", minHeight: "100vh" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 16px 60px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0 16px" }}>
          <button onClick={onCancel} style={ghostBtn}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ background: "#e8318a", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Log it"}
          </button>
        </div>

        {/* book search */}
        <div style={{ position: "relative", marginBottom: 20 }}>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search for a book by title or author..."
            style={{ width: "100%", padding: "10px 14px", fontSize: 14, border: "1px solid #e0e0e0", borderRadius: 8, background: "#fff", outline: "none" }} />
          {searching && <span style={{ position: "absolute", right: 12, top: 10, fontSize: 12, color: "#aaa" }}>searching...</span>}
          {showResults && searchResults.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8, marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", overflow: "hidden" }}>
              {searchResults.map((r, i) => (
                <div key={i} onClick={() => pickBook(r)}
                  style={{ display: "flex", gap: 12, padding: "10px 14px", cursor: "pointer", borderTop: i > 0 ? "1px solid #f5f5f5" : "none" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f9f9f9"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                  {r.coverUrl ? <img src={r.coverUrl} alt={r.title} style={{ width: 32, height: 46, objectFit: "cover", borderRadius: 2, flexShrink: 0 }} />
                    : <div style={{ width: 32, height: 46, background: "#e8e8e8", borderRadius: 2, flexShrink: 0 }} />}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1a1a" }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>{r.author} {r.year && `· ${r.year}`}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* book info */}
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", margin: "8px 0 24px" }}>
          {form.coverUrl ? <img src={form.coverUrl} alt={form.title} style={{ width: 90, height: 128, objectFit: "cover", borderRadius: 3, flexShrink: 0 }} />
            : <div style={{ width: 90, height: 128, background: "#e0e0e0", borderRadius: 3, flexShrink: 0 }} />}
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

        {/* currently reading toggle */}
        <div style={{ ...card, marginBottom: 10 }}>
          <div style={{ ...cardRow, cursor: "pointer" }} onClick={() => update("currentlyReading", !form.currentlyReading)}>
            <span style={cardLabel}>Currently reading</span>
            <div style={{
              width: 36, height: 20, borderRadius: 10, background: form.currentlyReading ? "#e8318a" : "#ddd",
              position: "relative", transition: "background 0.2s", flexShrink: 0,
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 2, left: form.currentlyReading ? 18 : 2,
                transition: "left 0.2s",
              }} />
            </div>
          </div>
        </div>

        {/* date — hidden if currently reading */}
        {!form.currentlyReading && (
          <div style={{ ...card, position: "relative", marginBottom: 10 }}>
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
                        style={{ fontSize: 13, padding: "5px 2px", borderRadius: 4, cursor: "pointer", background: isToday ? "#e8318a" : "none", color: isToday ? "#fff" : "#333", fontWeight: isToday ? 500 : 400 }}
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

        {/* rate / shelves / tags / notes */}
        <div style={{ ...card, marginTop: 0 }}>
          <div style={cardRow}>
            <span style={cardLabel}>Rate</span>
            {form.rating === 0 ? (
              <span style={{ fontSize: 13, color: "#bbb", cursor: "pointer" }} onClick={() => update("rating", 1)}>tap to rate</span>
            ) : (
              <StarRating value={form.rating} onChange={v => update("rating", v === form.rating ? 0 : v)} />
            )}
          </div>

          {/* Shelves */}
          <div style={{ borderTop: "1px solid #e8e8e8", padding: "12px 16px", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <span style={{ ...cardLabel, paddingTop: form.shelves.length > 0 ? 6 : 0 }}>Shelves</span>
              <div style={{ flex: 1 }}>
                {form.shelves.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {form.shelves.map(s => (
                      <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#1a1a1a", color: "#fff", borderRadius: 20, padding: "3px 10px", fontSize: 12 }}>
                        {s}
                        <span onClick={() => removeShelf(s)} style={{ cursor: "pointer", opacity: 0.6, fontSize: 14, lineHeight: 1 }}>×</span>
                      </span>
                    ))}
                  </div>
                )}
                <input value={shelfInput} onChange={e => setShelfInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addShelf(); } }}
                  placeholder=""
                  style={{ ...bareInput, fontSize: 14, width: "100%" }} />
                {shelfSuggestions.length > 0 && (
                  <div style={{ position: "absolute", left: 88, right: 16, zIndex: 50, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 6, marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", overflow: "hidden" }}>
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

          {/* Tags */}
          <div style={{ borderTop: "1px solid #e8e8e8", padding: "12px 16px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <span style={{ ...cardLabel, paddingTop: form.tags.length > 0 ? 6 : 0 }}>Tags</span>
              <div style={{ flex: 1 }}>
                {form.tags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {form.tags.map(t => (
                      <span key={t} style={{ fontSize: 13, color: "#555", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                        #{t}<span onClick={() => removeTag(t)} style={{ marginLeft: 4, cursor: "pointer", color: "#ccc", fontStyle: "normal", fontFamily: "inherit" }}>×</span>
                      </span>
                    ))}
                  </div>
                )}
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag}
                  placeholder=""
                  style={{ ...bareInput, fontSize: 14, width: "100%" }} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div style={{ ...cardRow, borderTop: "1px solid #e8e8e8", alignItems: "flex-start" }}>
            <span style={{ ...cardLabel, paddingTop: 2 }}>Notes</span>
            <textarea value={form.notes} onChange={e => update("notes", e.target.value)}
              placeholder="Write notes..." rows={3}
              style={{ ...bareInput, flex: 1, fontSize: 14, resize: "vertical", lineHeight: 1.5 }} />
          </div>
        </div>

        {/* quotes */}
        <div style={{ ...card, marginTop: 10 }}>
          {form.quotes.map((q, i) => (
            <div key={i} style={{ ...cardRow, borderTop: i === 0 ? "none" : "1px solid #e8e8e8", alignItems: "flex-start", gap: 16 }}>
              <span style={{ fontSize: 14, color: "#e8318a", minWidth: 40, paddingTop: 2 }}>{q.page || "—"}</span>
              <span style={{ fontSize: 14, color: "#333", flex: 1, lineHeight: 1.5 }}>{q.text}</span>
              <button onClick={() => removeQuote(i)} style={{ background: "none", border: "none", color: "#ccc", fontSize: 16, padding: 0, cursor: "pointer" }}>×</button>
            </div>
          ))}
          {showQuoteInput && (
            <div style={{ borderTop: form.quotes.length > 0 ? "1px solid #e8e8e8" : "none", padding: "12px 16px 4px", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <input
                ref={pageInputRef}
                value={newQuotePage}
                onChange={e => setNewQuotePage(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); document.getElementById("quote-text-input")?.focus(); } }}
                placeholder="pg"
                style={{ ...bareInput, width: 48, flexShrink: 0, color: "#e8318a", fontSize: 14 }}
              />
              <textarea
                id="quote-text-input"
                value={newQuoteText}
                onChange={e => setNewQuoteText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addQuote(); } }}
                placeholder="Quote text... (Enter to save)"
                rows={2}
                style={{ ...bareInput, flex: 1, resize: "none", lineHeight: 1.5, fontSize: 14 }}
              />
            </div>
          )}
          <button onClick={() => setShowQuoteInput(true)} style={{ background: "none", border: "none", color: "#aaa", fontSize: 13, padding: "10px 16px", display: "block", width: "100%", textAlign: "left", cursor: "pointer" }}>
            + add quote
          </button>
        </div>

      </div>
    </div>
  );
}

const ghostBtn = { background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13 };
const card = { background: "#fff", borderRadius: 10, border: "1px solid #e2e2e2", overflow: "visible" };
const cardRow = { display: "flex", alignItems: "center", gap: 16, padding: "12px 16px" };
const cardLabel = { fontSize: 14, color: "#555", minWidth: 72, flexShrink: 0 };
const bareInput = { background: "none", border: "none", outline: "none", fontFamily: "inherit", padding: 0 };
