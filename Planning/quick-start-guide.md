# Five Crowns Mobile App - Quick Start Guide

## Prerequisites

Before you begin, ensure you have:

- **Node.js** (v16 or higher): [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager (comes with Node.js)
- **Expo CLI**: Will be installed in setup
- **Firebase account**: [Sign up here](https://firebase.google.com/)
- **Code editor**: VS Code recommended
- **iOS Simulator** (Mac only) or **Android Studio** (for Android emulator)
- **Physical device** (recommended for testing): iPhone or Android phone

## Step 1: Set Up Firebase Project

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project name: `FiveCrownsMobile`
4. Disable Google Analytics (optional)
5. Click "Create Project"

### 1.2 Enable Firebase Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable the following providers:
   - ✅ **Email/Password**
   - ✅ **Google** (Click → Enable → Save)
   - ✅ **Apple** (required for iOS App Store submission)
     - Note: Apple Sign-In requires developer account setup

### 1.3 Create Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click "Create database"
3. Select **Start in production mode**
4. Choose a location (e.g., `us-central1`)
5. Click "Enable"

### 1.4 Set Up Realtime Database

1. In Firebase Console, go to **Realtime Database**
2. Click "Create Database"
3. Choose same location as Firestore
4. Start in **locked mode** (we'll add rules later)
5. Click "Enable"

### 1.5 Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to "Your apps"
3. Click **iOS** icon (</>) to add iOS app:
   - iOS bundle ID: `com.yourcompany.fivecrowns`
   - App nickname: `Five Crowns iOS`
   - Download `GoogleService-Info.plist` (save for later)

4. Click "Add app" again for Android:
   - Android package name: `com.yourcompany.fivecrowns`
   - App nickname: `Five Crowns Android`
   - Download `google-services.json` (save for later)

5. **Copy Web SDK Config:**
   - Scroll to "SDK setup and configuration"
   - Copy the `firebaseConfig` object:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "fivecrowns-xxxxx.firebaseapp.com",
  databaseURL: "https://fivecrowns-xxxxx.firebaseio.com",
  projectId: "fivecrowns-xxxxx",
  storageBucket: "fivecrowns-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
  measurementId: "G-XXXXXXXXX"
};
```

---

## Step 2: Create React Native Project

### 2.1 Install Expo CLI

```bash
npm install -g expo-cli
```

### 2.2 Create New Expo Project

```bash
# Navigate to your projects directory
cd ~/Projects

# Create new Expo app with TypeScript template
npx create-expo-app FiveCrownsMobile --template expo-template-blank-typescript

# Navigate into project
cd FiveCrownsMobile
```

### 2.3 Install Core Dependencies

```bash
# Install navigation libraries
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs

# Install React Navigation dependencies
npx expo install react-native-screens react-native-safe-area-context

# Install Firebase
npm install firebase

# Install gesture handler and reanimated (for card interactions)
npx expo install react-native-gesture-handler react-native-reanimated

# Install async storage (for local data)
npx expo install @react-native-async-storage/async-storage

# Install Expo notifications
npx expo install expo-notifications

# Install additional utilities
npm install react-native-uuid
```

### 2.4 Project Structure

Create the following folder structure:

```bash
# Create directories
mkdir -p src/{navigation,screens/{auth,home,game,settings},components/{cards,game,friends,common},services/{firebase,game},hooks,context,utils,types}

# Create subdirectories
mkdir -p src/screens/auth
mkdir -p src/screens/home
mkdir -p src/screens/game
mkdir -p src/screens/settings
mkdir -p src/components/cards
mkdir -p src/components/game
mkdir -p src/components/friends
mkdir -p src/components/common
mkdir -p src/services/firebase
mkdir -p src/services/game
```

Your structure should look like:
```
FiveCrownsMobile/
├── App.tsx
├── app.json
├── package.json
├── tsconfig.json
└── src/
    ├── navigation/
    ├── screens/
    │   ├── auth/
    │   ├── home/
    │   ├── game/
    │   └── settings/
    ├── components/
    │   ├── cards/
    │   ├── game/
    │   ├── friends/
    │   └── common/
    ├── services/
    │   ├── firebase/
    │   └── game/
    ├── hooks/
    ├── context/
    ├── utils/
    └── types/
```

---

## Step 3: Configure Firebase

### 3.1 Create Firebase Config File

Create `src/services/firebase/config.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

// Your Firebase configuration (from Step 1.5)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const realtimeDb = getDatabase(app);

export default app;
```

### 3.2 Create Firebase Service Files

Create `src/services/firebase/auth.ts`:

```typescript
import { auth } from './config';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User
} from 'firebase/auth';
import { firestore } from './config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const registerUser = async (email: string, password: string, displayName: string) => {
  // Create auth user
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Update profile
  await updateProfile(user, { displayName });

  // Create user document in Firestore
  await setDoc(doc(firestore, 'users', user.uid), {
    userId: user.uid,
    email: user.email,
    displayName,
    createdAt: serverTimestamp(),
    lastActive: serverTimestamp(),
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      totalScore: 0,
      averageScore: 0,
      bestScore: 999,
      currentStreak: 0,
      longestStreak: 0
    },
    settings: {
      highlightWilds: true,
      pushNotifications: true,
      soundEffects: true,
      vibration: true,
      theme: 'auto'
    },
    fcmTokens: []
  });

  return user;
};

export const loginUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};
```

---

## Step 4: Set Up Firebase Security Rules

### 4.1 Firestore Security Rules

In Firebase Console, go to **Firestore Database** → **Rules** and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId);
      allow delete: if isOwner(userId);

      match /activeGames/{gameId} {
        allow read: if isOwner(userId);
        allow write: if isOwner(userId);
      }
    }

    match /friendships/{friendshipId} {
      allow read: if isAuthenticated() &&
                     request.auth.uid in resource.data.users;
      allow create: if isAuthenticated() &&
                       request.auth.uid in request.resource.data.users;
      allow update: if isAuthenticated() &&
                       request.auth.uid in resource.data.users;
    }

    match /games/{gameId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated();
    }

    match /notifications/{notificationId} {
      allow read: if isOwner(resource.data.userId);
      allow create: if isAuthenticated();
      allow update: if isOwner(resource.data.userId);
      allow delete: if isOwner(resource.data.userId);
    }
  }
}
```

Click **Publish**.

### 4.2 Realtime Database Security Rules

In Firebase Console, go to **Realtime Database** → **Rules** and paste:

```json
{
  "rules": {
    "games": {
      "$gameCode": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

Click **Publish**.

---

## Step 5: Create Basic App Shell

### 5.1 Update App.tsx

Replace `App.tsx` with:

```typescript
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './src/services/firebase/config';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👑 Five Crowns 👑</Text>
      <Text>Firebase Connected!</Text>
      {user ? (
        <Text>Logged in as: {user.email}</Text>
      ) : (
        <Text>Not logged in</Text>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D1950',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 20,
  }
});
```

---

## Step 6: Run Your App

### 6.1 Start Development Server

```bash
npx expo start
```

This will open the Expo Dev Tools in your browser.

### 6.2 Run on Physical Device

**iOS:**
1. Install **Expo Go** app from App Store
2. Scan QR code with Camera app
3. App will open in Expo Go

**Android:**
1. Install **Expo Go** app from Google Play
2. Scan QR code with Expo Go app
3. App will launch

### 6.3 Run on Simulator/Emulator

**iOS Simulator (Mac only):**
```bash
# Press 'i' in the terminal after starting expo
# Or click "Run on iOS simulator" in browser
```

**Android Emulator:**
1. Install Android Studio
2. Set up Android Virtual Device (AVD)
3. Start emulator
4. Press 'a' in terminal or click "Run on Android device/emulator"

---

## Step 7: Verify Firebase Connection

If you see "Firebase Connected!" on the screen, you're all set! 🎉

### Troubleshooting:

**Error: "Firebase not initialized"**
- Check that `firebaseConfig` in `src/services/firebase/config.ts` has correct values
- Ensure all Firebase services are enabled in Firebase Console

**Error: "Module not found"**
- Run `npm install` again
- Clear cache: `npx expo start -c`

**iOS build errors:**
- Run `npx pod-install` (Mac only)
- Clean build folder

---

## Step 8: Next Development Steps

Now that your project is set up, here's what to build next:

### Phase 1: Authentication UI (Week 1)
1. Create `LoginScreen.tsx`
2. Create `RegisterScreen.tsx`
3. Implement navigation between auth screens
4. Test registration and login flows

### Phase 2: Home Screen (Week 2)
1. Create `HomeScreen.tsx` with active games list
2. Create `FriendsScreen.tsx`
3. Implement bottom tab navigation
4. Add "Create Game" and "Join Game" buttons

### Phase 3: Game Lobby (Week 3)
1. Port lobby logic from web app
2. Create `LobbyScreen.tsx`
3. Implement real-time player list
4. Add game settings

### Phase 4: Game Board (Weeks 4-6)
1. Create card components
2. Implement drag-and-drop
3. Port game state management
4. Add turn indicators and scoring

### Phase 5: Social Features (Weeks 7-8)
1. Implement friend requests
2. Add game invitations
3. Set up push notifications
4. Add notification badges

---

## Useful Commands

```bash
# Start development server
npx expo start

# Clear cache and restart
npx expo start -c

# Install new package
npm install <package-name>
npx expo install <expo-package>

# Build for iOS (requires Expo account)
eas build --platform ios

# Build for Android
eas build --platform android

# Publish update
expo publish
```

---

## Resources

- **Expo Documentation:** https://docs.expo.dev/
- **React Native Docs:** https://reactnative.dev/docs/getting-started
- **Firebase Docs:** https://firebase.google.com/docs
- **React Navigation:** https://reactnavigation.org/docs/getting-started

---

## Getting Help

If you encounter issues:

1. Check the [Expo Forums](https://forums.expo.dev/)
2. Search [Stack Overflow](https://stackoverflow.com/questions/tagged/expo)
3. Review Firebase documentation
4. Check the existing web app code in `../js/` for reference

---

**You're now ready to start building! 🚀**

Refer to `mobile-app-migration.md` for detailed architecture and `firebase-schema.md` for database structure.
