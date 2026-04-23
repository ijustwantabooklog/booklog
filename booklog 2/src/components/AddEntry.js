import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

async function searchBooks(q) {
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=6&key=AIzaSyAGIJE0s9K-wBC4lErKJgIhZ-cl5QRd0Rk`);
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
  try {
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
  } catch(e) { return null; }
}

export default function AddEntry({ userId, onCancel, onSave }) {
  const [type, setType] = useState("book");
  const [isChapter, setIsChapter] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [form, setForm] = useState({ title: "", author: "", year: "", coverUrl: "", publication: "", datePublished: "", url: "", chapterTitle: "", chapterNumber: "", translator: "" });
  const [saving, setSaving] = useState(false);

  const u = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const doSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    if (type === "book") {
      const r = await searchBooks(search);
      setResults(r);
    } else {
      const r = await lookupDOI(search);
      if (r) { setForm(f => ({ ...f, ...r })); setResults([]); }
    }
    setSearching(false);
  };

  const pick = (r) => { setForm(f => ({ ...f, ...r })); setResults([]); setSearch(""); };

  const navigate = useNavigate();

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const col = type === "book" ? "books" : "articles";

    // Check if already exists
    const existing = await getDocs(query(collection(db, "users", userId, col), where("title", "==", form.title.trim())));
    if (!existing.empty) {
      const existingId = existing.docs[0].id;
      const existingData = existing.docs[0].data();
      // If it's a chapter search, still allow creating new chapter
      if (!isChapter) {
        if (window.confirm(`"${form.title}" is already in your library. Open the existing log?`)) {
          navigate(`/entry/${col}/${existingId}`);
          return;
        }
      }
    }

    const ref = await addDoc(collection(db, "users", userId, col), {
      ...form, type, isChapter,
      currentlyReading: false,
      useful: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    onSave(ref.id, col);
  };

  return (
    <div className="wrap" style={{ maxWidth: 680 }}>
      <h1 style={{ marginBottom: 10 }}>log a new entry</h1>

      <div className="mono" style={{ marginBottom: 10, fontSize: 13 }}>
        type:{" "}
        {[["book","book / chapter"],["article","article"]].map(([val, label]) => (
          <span key={val}>
            <span onClick={() => setType(val)}
              style={{ cursor: "pointer", marginRight: 12, color: type === val ? "#000" : "#00c", textDecoration: type === val ? "none" : "underline", fontWeight: type === val ? "bold" : "normal" }}>
              [{label}]
            </span>
          </span>
        ))}
      </div>

      {type === "book" && (
        <div className="mono" style={{ marginBottom: 10, fontSize: 13 }}>
          <label style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={isChapter} onChange={e => setIsChapter(e.target.checked)}
              style={{ width: "auto", marginRight: 6 }} />
            this is a chapter / section of a larger book
          </label>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") doSearch(); }}
          placeholder={type === "book" ? "search by title or author..." : "paste DOI or URL to autofill..."}
          style={{ flex: 1 }} />
        <button onClick={doSearch} style={{ whiteSpace: "nowrap" }}>{searching ? "..." : "search"}</button>
      </div>

      {results.length > 0 && (
        <table className="bordered" style={{ marginBottom: 10 }}>
          <tbody>
            {results.map((r, i) => (
              <tr key={i} onClick={() => pick(r)} style={{ cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f9f9f9"}
                onMouseLeave={e => e.currentTarget.style.background = ""}>
                <td style={{ width: 44 }}>
                  {r.coverUrl && <img src={r.coverUrl} alt="" style={{ width: 34, height: 48, objectFit: "cover", border: "1px solid #ccc" }} />}
                </td>
                <td style={{ fontSize: 15, fontStyle: "italic" }}>{r.title}</td>
                <td className="mono" style={{ fontSize: 12, color: "#555" }}>{r.author} {r.year && `(${r.year})`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <table style={{ marginBottom: 12, width: "100%" }}>
        <tbody>
          {type === "book" && isChapter && <>
            <tr><td className="mono" style={{ fontSize: 13, width: 130, paddingRight: 8 }}>book title</td><td><input value={form.title} onChange={e => u("title", e.target.value)} /></td></tr>
            <tr><td className="mono" style={{ fontSize: 13 }}>chapter title</td><td><input value={form.chapterTitle} onChange={e => u("chapterTitle", e.target.value)} placeholder="chapter / section title" /></td></tr>
            <tr><td className="mono" style={{ fontSize: 13 }}>chapter no.</td><td><input value={form.chapterNumber} onChange={e => u("chapterNumber", e.target.value)} placeholder="e.g. Chapter 3" /></td></tr>
          </>}
          {!(type === "book" && isChapter) && (
            <tr><td className="mono" style={{ fontSize: 13, width: 130, paddingRight: 8 }}>title</td><td><input value={form.title} onChange={e => u("title", e.target.value)} /></td></tr>
          )}
          <tr><td className="mono" style={{ fontSize: 13 }}>author</td><td><input value={form.author} onChange={e => u("author", e.target.value)} /></td></tr>
          {type === "book" && <>
            <tr><td className="mono" style={{ fontSize: 13 }}>translator</td><td><input value={form.translator} onChange={e => u("translator", e.target.value)} placeholder="optional" /></td></tr>
            <tr><td className="mono" style={{ fontSize: 13 }}>year</td><td><input value={form.year} onChange={e => u("year", e.target.value)} /></td></tr>
          </>}
          {type === "article" && <>
            <tr><td className="mono" style={{ fontSize: 13 }}>publication</td><td><input value={form.publication} onChange={e => u("publication", e.target.value)} /></td></tr>
            <tr><td className="mono" style={{ fontSize: 13 }}>year</td><td><input value={form.datePublished} onChange={e => u("datePublished", e.target.value)} /></td></tr>
            <tr><td className="mono" style={{ fontSize: 13 }}>doi / url</td><td><input value={form.url} onChange={e => u("url", e.target.value)} /></td></tr>
          </>}
        </tbody>
      </table>

      <div style={{ display: "flex", gap: 8 }}>
        <button className="primary" onClick={save} disabled={saving}>
          {saving ? "saving..." : "save and start reading session →"}
        </button>
        <button onClick={onCancel}>cancel</button>
      </div>
    </div>
  );
}
