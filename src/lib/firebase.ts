
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDGmRmjCghKbxngOHPV1IHQdT7xzXhhxp4",
  authDomain: "collaboard-466cm.firebaseapp.com",
  projectId: "collaboard-466cm",
  storageBucket: "collaboard-466cm.firebasestorage.app",
  messagingSenderId: "390446656857",
  appId: "1:390446656857:web:cfef159220da57daee3048"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

let analytics;
if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
        if (supported) {
            analytics = getAnalytics(app);
        }
    });
}

export { app, db, auth };
