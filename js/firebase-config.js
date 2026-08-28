// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDTo2m1Hib2II0DeVvX4Q5eDXApoMqt5xw",
  authDomain: "flashcard-f2998.firebaseapp.com",
  projectId: "flashcard-f2998",
  storageBucket: "flashcard-f2998.firebasestorage.app",
  messagingSenderId: "319650668178",
  appId: "1:319650668178:web:a6266132b5d84a507dd04b",
  measurementId: "G-755346WJEL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
