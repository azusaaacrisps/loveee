import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBWQDrsKJBpQDS1dEWni5TsJsQLFZl5Hos",
  authDomain: "loveee-8a2ad.firebaseapp.com",
  projectId: "loveee-8a2ad",
  storageBucket: "loveee-8a2ad.firebasestorage.app",
  messagingSenderId: "840174022809",
  appId: "1:840174022809:web:ceb38ac40ab8161dba4808",
  measurementId: "G-DWGY7W1FLD"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
