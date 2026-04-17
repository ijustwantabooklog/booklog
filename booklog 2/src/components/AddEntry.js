import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

async function searchBooks(q) {
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5&key=AIzaSyAGIJE0s9K-wBC4lErKJgIhZ-cl5QRd0Rk`);
  const data = await res.json();
  return (data.items || []).map(item => {
    const info = item.volumeInfo;
    return {
      title: info.title || "",
      author: (info.authors || [])[0] || "",
      year: info.publishedDate?.slice(0, 4) || "",
      coverUrl: info.imageLinks?.thumbnail?.replace("http://", "https://") || "",
    };
  });
}

async function lookupDOI(input) {
  const match = input.match(/10\.\d{4,}[^\s]*/);
  if (!match) return null;
  const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(match[0])}`);
  const data = await res.json();
  const w = data.message;
  const authors = (w.author || []).map(a => [a.given, a.family].filter(Boolean).join(" ")).join(", ");
  const date = w["published-print"]?.["date-parts"]?.[0] || w["published-online"]?.["date-parts"]?.[0];
  return {
    title: (w.title && w.title[0]) || "",
    author: authors,
    publication: (w["container-title"] && w["container-title"][0]) || "",
    datePublished: date ? `${date[0]}` : "",
    url: match[0],
  };
}

export default function AddEntry({ userId, onCancel, onSave }) {
  const [type, setType] = useState("book");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [form, setForm] = useState({ title: "", author: "", year: "", coverUrl: "", publication: "", datePublished: "", url: "", chapterTitle: "", chapterNumber: "" });
  const [saving, setSaving] = useState(false);
  const [isChapter, setIsChapter] = useState(false);

  const u = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const doSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    if (type === "book") {
      const r = await searchBooks(search);
      setResults(r);
    } else {
      setFetching(true);
      const r = await lookupDOI(search);
      if (r) { setForm(f => ({ ...f, ...r })); setResults([]); }
      else { setResults([]); }
      setFetching(false);
    }
    setSearching(false);
  };

  const pick = (r) => { setForm(f => ({ ...f, ...r })); setResults([]); setSearch(""); };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const col = type === "book" ? "books" : "articles";
    const data = {
      ...form,
      type,
      isChapter,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      currentlyReading: false,
    };
    const ref = await addDoc(collection(db, "users", userId, col), data);
    onSave(ref.id, col);
  };

  return (
    <div className="page-wrap" style={{ maxWidth: 680 }}>
      <h1>Log a new entry</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[["book","Book / Chapter"],["article","Article"]].map(([val, label]) => (
          <button key={val} onClick={() => setType(val)}
            style={{ background: type === val ? "#e8318a" : "#f0f0f0", color: type === val ? "#fff" : "#000", border: "1px solid #999", padding: "3px 14px" }}>
            {label}
          </button>
        ))}
      </div>

      {type === "book" && (
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontFamily: "Arial, sans-serif", fontSize: 13 }}>
            <input type="checkbox" checked={isChapter} onChange={e => setIsChapter(e.target.checked)} style={{ width: "auto" }} />
            This is a chapter / section of a book
          </label>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") doSearch(); }}
          placeholder={type === "book" ? "Search by title or author..." : "Paste DOI or URL to autofill..."} />
        <button onClick={doSearch} style={{ whiteSpace: "nowrap", width: "auto" }}>{searching || fetching ? "..." : "Search"}</button>
      </div>

      {results.length > 0 && (
        <table style={{ marginBottom: 12, border: "1px solid #ccc" }}>
          <tbody>
            {results.map((r, i) => (
              <tr key={i} onClick={() => pick(r)} style={{ cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f9f9f9"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                <td style={{ width: 40 }}>
                  {r.coverUrl && <img src={r.coverUrl} alt="" style={{ width: 32, height: 46, border: "1px solid #ccc", objectFit: "cover" }} />}
                </td>
                <td>
                  <div style={{ fontFamily: "Georgia, serif" }}>{r.title}</div>
                  <div style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: "#555" }}>{r.author} {r.year && `(${r.year})`}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <table style={{ marginBottom: 12 }}>
        <tbody>
          {type === "book" && isChapter && <>
            <tr><td style={{ width: 120, fontFamily: "Arial, sans-serif", fontSize: 13 }}>Book title</td><td><input value={form.title} onChange={e => u("title", e.target.value)} placeholder="Book title" /></td></tr>
            <tr><td style={{ fontFamily: "Arial, sans-serif", fontSize: 13 }}>Chapter title</td><td><input value={form.chapterTitle} onChange={e => u("chapterTitle", e.target.value)} placeholder="Chapter / section title" /></td></tr>
            <tr><td style={{ fontFamily: "Arial, sans-serif", fontSize: 13 }}>Chapter no.</td><td><input value={form.chapterNumber} onChange={e => u("chapterNumber", e.target.value)} placeholder="e.g. Chapter 3" /></td></tr>
          </>}
          {type === "book" && !isChapter && (
            <tr><td style={{ width: 120, fontFamily: "Arial, sans-serif", fontSize: 13 }}>Title</td><td><input value={form.title} onChange={e => u("title", e.target.value)} placeholder="Title" /></td></tr>
          )}
          {type === "article" && (
            <tr><td style={{ width: 120, fontFamily: "Arial, sans-serif", fontSize: 13 }}>Title</td><td><input value={form.title} onChange={e => u("title", e.target.value)} placeholder="Title" /></td></tr>
          )}
          <tr><td style={{ fontFamily: "Arial, sans-serif", fontSize: 13 }}>Author</td><td><input value={form.author} onChange={e => u("author", e.target.value)} placeholder="Author" /></td></tr>
          {type === "book" && <tr><td style={{ fontFamily: "Arial, sans-serif", fontSize: 13 }}>Year</td><td><input value={form.year} onChange={e => u("year", e.target.value)} placeholder="Year" /></td></tr>}
          {type === "article" && <>
            <tr><td style={{ fontFamily: "Arial, sans-serif", fontSize: 13 }}>Publication</td><td><input value={form.publication} onChange={e => u("publication", e.target.value)} placeholder="Journal / publication" /></td></tr>
            <tr><td style={{ fontFamily: "Arial, sans-serif", fontSize: 13 }}>Year</td><td><input value={form.datePublished} onChange={e => u("datePublished", e.target.value)} placeholder="Year" /></td></tr>
            <tr><td style={{ fontFamily: "Arial, sans-serif", fontSize: 13 }}>DOI / URL</td><td><input value={form.url} onChange={e => u("url", e.target.value)} placeholder="DOI or URL" /></td></tr>
          </>}
        </tbody>
      </table>

      <div style={{ display: "flex", gap: 8 }}>
        <button className="primary" onClick={save} disabled={saving} style={{ padding: "4px 16px" }}>
          {saving ? "saving..." : "Save and start reading"}
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
