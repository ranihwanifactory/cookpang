
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA9nFlpvct-o2F48Ow1WLozSsORrWd4YJI",
  authDomain: "dangchat.firebaseapp.com",
  projectId: "dangchat",
  storageBucket: "dangchat.firebasestorage.app",
  messagingSenderId: "260697349202",
  appId: "1:260697349202:web:fdeb3c7aba87b87d33138b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
