import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBbpNAWs4ZdTkCYUDxs5-0H1ekLQ8jk4fc",
  authDomain: "teste-5e945.firebaseapp.com",
  projectId: "teste-5e945",
  storageBucket: "teste-5e945.appspot.com",
  messagingSenderId: "206244410562",
  appId: "1:206244410562:web:8a2dac7a67615f9764b75b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;