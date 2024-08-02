import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyBmimbhfQZdp2d_0R63LyIt83PUgtRUGtc",
  authDomain: "willhsproject-b5d96.firebaseapp.com",
  projectId: "willhsproject-b5d96",
  storageBucket: "willhsproject-b5d96.appspot.com",
  messagingSenderId: "615895346737",
  appId: "1:615895346737:web:953b1e9e59ae116c692f10"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export { app }