import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAmNw0OZxcNDGg7YR7GujqJMZKrKkR7iPE",
  authDomain: "houl-poc.firebaseapp.com",
  projectId: "houl-poc",
  storageBucket: "houl-poc.appspot.com",
  messagingSenderId: "647406721955",
  appId: "1:647406721955:web:4feaf9513e9a68a5d51816",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
