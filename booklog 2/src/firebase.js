import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBbivACNBewoy5fa7YaqNHRn3VOis49wCY",
  authDomain: "booklog-b84d0.firebaseapp.com",
  projectId: "booklog-b84d0",
  storageBucket: "booklog-b84d0.firebasestorage.app",
  messagingSenderId: "50866962623",
  appId: "1:50866962623:web:a262a1adbd63257382c60a",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
