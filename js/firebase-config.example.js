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
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase (using CDN globals)
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Optional: Initialize Analytics
// const analytics = firebase.analytics();

console.log('Firebase initialized successfully!');
