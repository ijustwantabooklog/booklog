import { db } from "./firebase";
import { collection, addDoc, serverTimestamp, getDocs, writeBatch, doc } from "firebase/firestore";
import { logActivity } from "./activityLogger";

export async function addAnnotation(userId, itemId, itemType, annotation) {
  // itemType: "books" or "articles"
  const ref = await addDoc(
    collection(db, "users", userId, itemType, itemId, "annotations"),
    {
      ...annotation,
      createdAt: serverTimestamp(),
    }
  );

  const title = annotation.bookTitle || annotation.articleTitle || "";
  const activityData = itemType === "books"
    ? { bookTitle: title, bookId: itemId }
    : { articleTitle: title, articleId: itemId };

  const typeLabels = { quote: "Added a quote to", note: "Added a reading note to", rumination: "Added a rumination to" };
  await logActivity(userId, annotation.type, { text: typeLabels[annotation.type] || "Annotated", ...activityData });

  return ref;
}

// Migrate existing quotes/readingNotes arrays into the annotations subcollection
export async function migrateBookAnnotations(userId, book) {
  const existingSnap = await getDocs(collection(db, "users", userId, "books", book.id, "annotations"));
  if (existingSnap.size > 0) return; // already migrated

  const batch = writeBatch(db);
  const colRef = collection(db, "users", userId, "books", book.id, "annotations");

  (book.quotes || []).forEach(q => {
    const ref = doc(colRef);
    batch.set(ref, {
      type: "quote",
      text: q.text,
      page: q.page || "",
      quoteNote: q.quoteNote || "",
      createdAt: q.savedAt ? new Date(q.savedAt) : new Date(0),
    });
  });

  (book.readingNotes || []).forEach(n => {
    const ref = doc(colRef);
    batch.set(ref, {
      type: "note",
      text: n.text,
      page: n.page || "",
      createdAt: n.savedAt ? new Date(n.savedAt) : new Date(0),
    });
  });

  await batch.commit();
}
