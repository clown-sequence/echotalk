import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";
import { Firestore, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDa1fYYiRjVmqQGl35SVazRgGnanMB4sF8",
  authDomain: "echotalkdemo.firebaseapp.com",
  projectId: "echotalkdemo",
  storageBucket: "echotalkdemo.firebasestorage.app",
  messagingSenderId: "565528588342",
  appId: "1:565528588342:web:0d913afd1275b80fc56897",
  measurementId: "G-E3ZVCEV1D9"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const rtdb: Database = getDatabase(app)