import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function logActivity(userId, type, data) {
  try {
    await addDoc(collection(db, "users", userId, "activity"), {
      type,
      ...data,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("Activity log failed:", e);
  }
}
