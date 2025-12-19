// Firebase Configuration for Five Crowns Game
// Note: Since we're using vanilla JS without modules, we'll use the CDN version
// The Firebase initialization will happen in HTML files using script tags

// ⚠️ SECURITY NOTE:
// These API keys are intentionally public for Firebase web apps.
// Firebase security is controlled through Database Rules, not by hiding API keys.
// Before deploying to production:
// 1. Set proper Firebase Realtime Database Rules
// 2. Enable Firebase App Check
// 3. Monitor usage in Firebase Console
// 4. Consider rate limiting
//
// For your own deployment, replace these values with your Firebase project credentials.

// Your Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyDHaM09y6IL2nPnPIf2YuDK3Y17n-TtVWI",
  authDomain: "fivecrowns-9be7c.firebaseapp.com",
  databaseURL: "https://fivecrowns-9be7c-default-rtdb.firebaseio.com", // Added for Realtime Database
  projectId: "fivecrowns-9be7c",
  storageBucket: "fivecrowns-9be7c.firebasestorage.app",
  messagingSenderId: "621405515096",
  appId: "1:621405515096:web:e7546fcb4d967d0c87092d",
  measurementId: "G-GKD2R7KYB1"
};

// Initialize Firebase (using CDN globals)
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Optional: Initialize Analytics
// const analytics = firebase.analytics();

console.log('Firebase initialized successfully!');
