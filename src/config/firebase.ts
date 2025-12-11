import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app)

