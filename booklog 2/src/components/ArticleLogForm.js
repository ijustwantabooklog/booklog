import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";

async function fetchMetadata(input) {
  try {
    // Extract DOI from URL or raw DOI string
    const doiMatch = input.match(/10\.\d{4,}[^\s]*/);
    if (!doiMatch) return null;
    const doi = doiMatch[0];
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
    const data = await res.json();
    const work = data.message;
    const authors = (work.author || []).map(a => [a.given, a.family].filter(Boolean).join(" ")).join(", ");
    const date = work["published-print"]?.["date-parts"]?.[0] || work["published-online"]?.["date-parts"]?.[0];
    const dateStr = date ? new Date(date[0], (date[1] || 1) - 1, date[2] || 1).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "";
    return {
      title: (work.title && work.title[0]) || "",
      author: authors,
      publication: (work["container-title"] && work["container-title"][0]) || "",
      datePublished: dateStr,
    };
  } catch(e) {}
  return null;
}

export default function ArticleLogForm({ article, userId, onCancel, onSave }) {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const [form, setForm] = useState({
    title: article?.title || "",
    author: article?.author || "",
    publication: article?.publication || "",
    datePublished: article?.datePublished || "",
    url: article?.url || "",
    notes: article?.notes || "",
    quotes: article?.quotes || [],
    dateRead: article?.dateRead || dateStr,
  });

  const [urlInput, setUrlInput] = useState(article?.url || "");
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [newQuotePage, setNewQuotePage] = useState("");
  const [newQuoteText, setNewQuoteText] = useState("");
  const [newQuoteNote, setNewQuoteNote] = useState("");
  const [showQuoteInput, setShowQuoteInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(today);
  const pageInputRef = useRef(null);

  useEffect(() => {
    if (showQuoteInput && pageInputRef.current) pageInputRef.current.focus();
  }, [showQuoteInput]);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleUrlEnter = async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!urlInput.trim()) return;
    setFetchingUrl(true);
    update("url", urlInput.trim());
    const meta = await fetchMetadata(urlInput.trim());
    if (meta) {
      if (meta.title) update("title", meta.title);
      if (meta.author) update("author", meta.author);
      if (meta.publication) update("publication", meta.publication);
      if (meta.datePublished) update("datePublished", meta.datePublished);
    }
    setFetchingUrl(false);
  };

  const addQuote = () => {
    if (!newQuoteText.trim()) return;
    update("quotes", [...form.quotes, { page: newQuotePage, text: newQuoteText.trim(), quoteNote: newQuoteNote.trim() }]);
    setNewQuotePage(""); setNewQuoteText(""); setNewQuoteNote(""); setShowQuoteInput(false);
  };

  const removeQuote = (i) => update("quotes", form.quotes.filter((_, idx) => idx !== i));

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y, m) => new Date(y, m, 1).getDay();
  const yr = calendarDate.getFullYear();
  const mo = calendarDate.getMonth();

  const selectDate = (day) => {
    const d = new Date(yr, mo, day);
    update("dateRead", d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
    setShowCalendar(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const data = { ...form, updatedAt: serverTimestamp() };
    try {
      if (article?.id) {
        await updateDoc(doc(db, "users", userId, "articles", article.id), data);
        onSave({ id: article.id, ...data });
      } else {
        data.createdAt = serverTimestamp();
        const ref = await addDoc(collection(db, "users", userId, "articles"), data);
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

        {/* URL search bar */}
        <div style={{ position: "relative", marginBottom: 20 }}>
          <input
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={handleUrlEnter}
            placeholder="Paste a DOI or URL containing a DOI, press Enter to autofill..."
            style={{ width: "100%", padding: "10px 14px", fontSize: 14, border: "1px solid #e0e0e0", borderRadius: 8, background: "#fff", outline: "none" }}
          />
          {fetchingUrl && <span style={{ position: "absolute", right: 12, top: 10, fontSize: 12, color: "#aaa" }}>fetching...</span>}
        </div>

        {/* article info */}
        <div style={{ marginBottom: 20 }}>
          <input value={form.title} onChange={e => update("title", e.target.value)} placeholder="Title"
            style={{ ...bareInput, fontSize: 22, color: "#1a1a1a", display: "block", width: "100%", marginBottom: 8, fontFamily: "Georgia, serif" }} />
          <input value={form.author} onChange={e => update("author", e.target.value)} placeholder="Author"
            style={{ ...bareInput, fontSize: 15, color: "#555", display: "block", width: "100%", marginBottom: 4 }} />
          <input value={form.publication} onChange={e => update("publication", e.target.value)} placeholder="Publication (e.g. The New Yorker)"
            style={{ ...bareInput, fontSize: 15, color: "#555", display: "block", width: "100%", marginBottom: 4 }} />
          <input value={form.datePublished} onChange={e => update("datePublished", e.target.value)} placeholder="Date published"
            style={{ ...bareInput, fontSize: 15, color: "#555", display: "block", width: "100%", marginBottom: 4 }} />
          <input value={form.url} onChange={e => update("url", e.target.value)} placeholder="URL"
            style={{ ...bareInput, fontSize: 14, color: "#0000ee", display: "block", width: "100%" }} />
        </div>

        {/* date */}
        <div style={{ ...card, marginBottom: 10, position: "relative" }}>
          <div style={{ ...cardRow, cursor: "pointer" }} onClick={() => setShowCalendar(p => !p)}>
            <span style={cardLabel}>Date read</span>
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
                {Array.from({ length: getFirstDay(yr, mo) }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: getDaysInMonth(yr, mo) }).map((_, i) => {
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

        {/* notes */}
        <div style={{ ...card, marginBottom: 10 }}>
          <div style={{ ...cardRow, alignItems: "flex-start" }}>
            <span style={{ ...cardLabel, paddingTop: 2 }}>Notes</span>
            <textarea value={form.notes} onChange={e => update("notes", e.target.value)}
              placeholder="Write notes..." rows={3}
              style={{ ...bareInput, flex: 1, fontSize: 14, resize: "vertical", lineHeight: 1.5 }} />
          </div>
        </div>

        {/* quotes */}
        <div style={card}>
          {form.quotes.map((q, i) => (
            <div key={i} style={{ padding: "10px 16px", borderBottom: "0.5px solid #e8e8e8", background: "#f7f7f7" }}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <span style={{ fontSize: 14, color: "#e8318a", minWidth: 40, paddingTop: 2 }}>{q.page || "—"}</span>
                <span style={{ fontSize: 14, color: "#333", flex: 1, lineHeight: 1.5 }}>{q.text}</span>
                <button onClick={() => removeQuote(i)} style={{ background: "none", border: "none", color: "#ccc", fontSize: 16, padding: 0, cursor: "pointer" }}>×</button>
              </div>
              {q.quoteNote && <div style={{ marginLeft: 56, marginTop: 4, fontSize: 13, color: "#888", fontStyle: "italic" }}>{q.quoteNote}</div>}
            </div>
          ))}
          {showQuoteInput && (
            <div style={{ padding: "12px 16px 4px", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <input ref={pageInputRef} value={newQuotePage} onChange={e => setNewQuotePage(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); document.getElementById("art-quote-text")?.focus(); } }}
                placeholder="pg" style={{ ...bareInput, width: 48, flexShrink: 0, color: "#e8318a", fontSize: 14 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <textarea id="art-quote-text" value={newQuoteText} onChange={e => setNewQuoteText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addQuote(); }
                    if (e.key === "Tab") { e.preventDefault(); document.getElementById("art-quote-note")?.focus(); }
                  }}
                  placeholder="Quote" rows={2}
                  style={{ ...bareInput, resize: "none", lineHeight: 1.5, fontSize: 14 }} />
                <input id="art-quote-note" value={newQuoteNote} onChange={e => setNewQuoteNote(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addQuote(); } }}
                  placeholder="Note (optional)"
                  style={{ ...bareInput, fontSize: 13, color: "#888", borderTop: "0.5px solid #eee", paddingTop: 6 }} />
              </div>
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
