// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBkl9G-pyUYGh98JYyth2NbuN9SUUKgR0g",
  authDomain: "my-todolist-38c20.firebaseapp.com",
  projectId: "my-todolist-38c20",
  storageBucket: "my-todolist-38c20.firebasestorage.app",
  messagingSenderId: "602725677493",
  appId: "1:602725677493:web:0ef968852d72761453c1fc",
  measurementId: "G-V2QB44L03F",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export { app };
