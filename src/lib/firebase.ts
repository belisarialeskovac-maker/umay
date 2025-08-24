
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDW0p16V6BiS4ZbaVkUfxCKajELamYaPOs",
  authDomain: "project-1a07d.firebaseapp.com",
  projectId: "project-1a07d",
  storageBucket: "project-1a07d.appspot.com",
  messagingSenderId: "69392006548",
  appId: "1:69392006548:web:3e705fd22098396f90a381",
  measurementId: "G-ZFPYDM2MCM"
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
