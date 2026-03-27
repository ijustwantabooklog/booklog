import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1,2,3,4,5].map((star) => (
        <span
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          style={{ fontSize: 22, cursor: "pointer", color: star <= (hovered || value) ? "#1a1a1a" : "#ccc", userSelect: "none" }}
        >
          {star <= (hovered || value) ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}

async function searchGoogleBooks(query) {
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5&key=AIzaSyAGIJE0s9K-wBC4lErKJgIhZ-cl5QRd0Rk`);
  const data = await res.json();
  return (data.items || []).map(item => {
    const info = item.volumeInfo;
    const cover = info.imageLinks?.thumbnail?.replace("http://", "https://") || null;
    const authors = info.authors || [];
    return {
      title: info.title || "",
      author: authors[0] || "",
      year: info.publishedDate?.slice(0, 4) || "",
      coverUrl: cover,
      googleId: item.id,
    };
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
    shelf: book?.shelf || "",
    tags: book?.tags?.join(", ") || "",
    review: book?.review || "",
    quotes: book?.quotes || [],
    dateRead: book?.dateRead || dateStr,
    coverUrl: book?.coverUrl || "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [newQuotePage, setNewQuotePage] = useState("");
  const [newQuoteText, setNewQuoteText] = useState("");
  const [showQuoteInput, setShowQuoteInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const searchTimeout = useRef(null);

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

  const pickBook = (result) => {
    setForm(f => ({ ...f, title: result.title, author: result.author, year: result.year, coverUrl: result.coverUrl || "" }));
    setShowResults(false);
    setSearchQuery("");
  };

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const addQuote = () => {
    if (!newQuoteText.trim()) return;
    update("quotes", [...form.quotes, { page: newQuotePage, text: newQuoteText.trim() }]);
    setNewQuotePage(""); setNewQuoteText(""); setShowQuoteInput(false);
  };

  const removeQuote = (i) => update("quotes", form.quotes.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const data = {
      ...form,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      updatedAt: serverTimestamp(),
    };
    try {
      if (book?.id) {
        await updateDoc(doc(db, "users", userId, "books", book.id), data);
        onSave({ id: book.id, ...data });
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, "users", userId, "books"), data);
        onSave(null);
      }
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  return (
    <div style={{ background: "#f4f4f4", minHeight: "100vh" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 16px 60px" }}>

        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0 16px" }}>
          <button onClick={onCancel} style={ghostBtn}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            background: "#e8318a", color: "#fff", border: "none", borderRadius: 6,
            padding: "8px 20px", fontSize: 13, fontWeight: 500, opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "Saving..." : "Log it"}
          </button>
        </div>

        {/* book search */}
        <div style={{ position: "relative", marginBottom: 20 }}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search for a book by title or author..."
            style={{
              width: "100%", padding: "10px 14px", fontSize: 14, border: "1px solid #e0e0e0",
              borderRadius: 8, background: "#fff", outline: "none",
            }}
          />
          {searching && <span style={{ position: "absolute", right: 12, top: 10, fontSize: 12, color: "#aaa" }}>searching...</span>}
          {showResults && searchResults.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
              background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8,
              marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", overflow: "hidden",
            }}>
              {searchResults.map((r, i) => (
                <div
                  key={i}
                  onClick={() => pickBook(r)}
                  style={{ display: "flex", gap: 12, padding: "10px 14px", cursor: "pointer", borderTop: i > 0 ? "1px solid #f5f5f5" : "none" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f9f9f9"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                >
                  {r.coverUrl ? (
                    <img src={r.coverUrl} alt={r.title} style={{ width: 32, height: 46, objectFit: "cover", borderRadius: 2, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 32, height: 46, background: "#e8e8e8", borderRadius: 2, flexShrink: 0 }} />
                  )}
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
          {form.coverUrl ? (
            <img src={form.coverUrl} alt={form.title} style={{ width: 90, height: 128, objectFit: "cover", borderRadius: 3, flexShrink: 0 }} />
          ) : (
            <div style={{ width: 90, height: 128, background: "#e0e0e0", borderRadius: 3, flexShrink: 0 }} />
          )}
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

        {/* date */}
        <div style={card}>
          <div style={cardRow}>
            <span style={cardLabel}>Date</span>
            <span style={{ fontSize: 14 }}>
              <strong style={{ fontWeight: 500 }}>Today</strong>
              <span style={{ color: "#888", marginLeft: 6 }}>{dateStr}</span>
            </span>
          </div>
        </div>

        {/* rate / shelf / tags / review */}
        <div style={{ ...card, marginTop: 10 }}>
          <div style={cardRow}>
            <span style={cardLabel}>Rate</span>
            <StarRating value={form.rating} onChange={v => update("rating", v)} />
          </div>
          <div style={{ ...cardRow, borderTop: "1px solid #e8e8e8" }}>
            <span style={cardLabel}>Shelves</span>
            <input value={form.shelf} onChange={e => update("shelf", e.target.value)}
              placeholder="e.g. Dissertation" style={{ ...bareInput, flex: 1, fontSize: 14 }} />
          </div>
          <div style={{ ...cardRow, borderTop: "1px solid #e8e8e8" }}>
            <span style={cardLabel}>Tags</span>
            <input value={form.tags} onChange={e => update("tags", e.target.value)}
              placeholder="#FeministLiterature, #Theory..." style={{ ...bareInput, flex: 1, fontSize: 14 }} />
          </div>
          <div style={{ ...cardRow, borderTop: "1px solid #e8e8e8", alignItems: "flex-start" }}>
            <span style={{ ...cardLabel, paddingTop: 2 }}>Review</span>
            <textarea value={form.review} onChange={e => update("review", e.target.value)}
              placeholder="Write a review..." rows={3}
              style={{ ...bareInput, flex: 1, fontSize: 14, resize: "vertical", lineHeight: 1.5 }} />
          </div>
        </div>

        {/* quotes */}
        <div style={{ ...card, marginTop: 10 }}>
          {form.quotes.map((q, i) => (
            <div key={i} style={{ ...cardRow, borderTop: i === 0 ? "none" : "1px solid #e8e8e8", alignItems: "flex-start", gap: 16 }}>
              <span style={{ fontSize: 14, color: "#e8318a", minWidth: 40, paddingTop: 2 }}>{q.page || "—"}</span>
              <span style={{ fontSize: 14, color: "#333", flex: 1, lineHeight: 1.5 }}>{q.text}</span>
              <button onClick={() => removeQuote(i)} style={{ background: "none", border: "none", color: "#ccc", fontSize: 16, padding: 0 }}>×</button>
            </div>
          ))}

          {showQuoteInput && (
            <div style={{ borderTop: form.quotes.length > 0 ? "1px solid #e8e8e8" : "none", padding: "12px 16px 4px", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <input value={newQuotePage} onChange={e => setNewQuotePage(e.target.value)}
                placeholder="pg" style={{ ...bareInput, width: 48, flexShrink: 0, color: "#e8318a", fontSize: 14 }} />
              <textarea value={newQuoteText} onChange={e => setNewQuoteText(e.target.value)}
                placeholder="Quote text..." rows={2} autoFocus
                style={{ ...bareInput, flex: 1, resize: "none", lineHeight: 1.5, fontSize: 14 }} />
              <button onClick={addQuote} style={{
                background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 5,
                padding: "6px 12px", fontSize: 12, marginTop: 2,
              }}>add</button>
            </div>
          )}

          <button onClick={() => setShowQuoteInput(true)} style={{
            background: "none", border: "none", color: "#aaa", fontSize: 13,
            padding: "10px 16px 10px", display: "block", width: "100%", textAlign: "left",
          }}>
            + add quote
          </button>
        </div>

      </div>
    </div>
  );
}

const ghostBtn = { background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13 };
const card = { background: "#fff", borderRadius: 10, border: "1px solid #e2e2e2", overflow: "hidden" };
const cardRow = { display: "flex", alignItems: "center", gap: 16, padding: "12px 16px" };
const cardLabel = { fontSize: 14, color: "#555", minWidth: 72, flexShrink: 0 };
const bareInput = { background: "none", border: "none", outline: "none", fontFamily: "inherit", padding: 0 };
