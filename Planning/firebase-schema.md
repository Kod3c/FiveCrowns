# Firebase Backend Schema & Setup

## Overview

This document details the complete Firebase backend architecture for the Five Crowns mobile app, including Firestore collections, Realtime Database structure, security rules, and Cloud Functions.

## Architecture Decision: Hybrid Database Approach

We use **both** Firestore and Realtime Database:

### Firestore
- **Use for:** User profiles, friends, game metadata, notifications
- **Why:** Complex queries, better for relational data, automatic indexing
- **Best for:** Infrequent updates, structured data, offline support

### Realtime Database
- **Use for:** Active game state (during gameplay)
- **Why:** Ultra-low latency, real-time synchronization, existing codebase
- **Best for:** Rapid card moves, turn-by-turn gameplay

## Firestore Database Structure

### Collection: `/users/{userId}`

Stores user profiles and settings.

```typescript
interface User {
  userId: string;                    // Same as Firebase Auth UID
  email: string;
  displayName: string;
  photoURL?: string;                 // Optional profile picture
  createdAt: FirebaseTimestamp;
  lastActive: FirebaseTimestamp;

  stats: {
    gamesPlayed: number;
    gamesWon: number;
    totalScore: number;               // Cumulative score across all games
    averageScore: number;             // Total / games played
    bestScore: number;                // Lowest score in a completed game
    currentStreak: number;            // Current winning streak
    longestStreak: number;            // Longest winning streak
  };

  settings: {
    highlightWilds: boolean;          // Highlight wild cards in hand
    pushNotifications: boolean;       // Allow push notifications
    soundEffects: boolean;            // Play sound effects
    vibration: boolean;               // Haptic feedback
    theme: 'light' | 'dark' | 'auto';
  };

  fcmTokens: string[];                // Multiple device tokens for push notifications
}
```

**Example:**
```json
{
  "userId": "abc123",
  "email": "player@example.com",
  "displayName": "CardMaster99",
  "photoURL": "https://...",
  "createdAt": {"_seconds": 1234567890},
  "lastActive": {"_seconds": 1234567890},
  "stats": {
    "gamesPlayed": 42,
    "gamesWon": 15,
    "totalScore": 1680,
    "averageScore": 40,
    "bestScore": 12,
    "currentStreak": 3,
    "longestStreak": 5
  },
  "settings": {
    "highlightWilds": true,
    "pushNotifications": true,
    "soundEffects": true,
    "vibration": true,
    "theme": "auto"
  },
  "fcmTokens": ["fcm_token_1", "fcm_token_2"]
}
```

**Indexes:**
- `displayName` (for searching users)
- `stats.gamesWon` (for leaderboards)

---

### Collection: `/friendships/{friendshipId}`

Stores friend relationships between users.

```typescript
interface Friendship {
  friendshipId: string;               // Auto-generated
  users: [string, string];            // [userId1, userId2] - sorted alphabetically
  status: 'pending' | 'accepted' | 'blocked';
  requestedBy: string;                // userId who sent the request
  requestedAt: FirebaseTimestamp;
  acceptedAt?: FirebaseTimestamp;     // When request was accepted
  blockedAt?: FirebaseTimestamp;      // When user was blocked
}
```

**Example:**
```json
{
  "friendshipId": "friend_xyz",
  "users": ["abc123", "def456"],
  "status": "accepted",
  "requestedBy": "abc123",
  "requestedAt": {"_seconds": 1234567890},
  "acceptedAt": {"_seconds": 1234567900}
}
```

**Indexes:**
- Composite index: `users` array + `status`

**Querying:**
```typescript
// Get all friends for a user
const friendsQuery = firestore
  .collection('friendships')
  .where('users', 'array-contains', currentUserId)
  .where('status', '==', 'accepted');

// Get pending requests sent to me
const requestsQuery = firestore
  .collection('friendships')
  .where('users', 'array-contains', currentUserId)
  .where('status', '==', 'pending')
  .where('requestedBy', '!=', currentUserId);
```

---

### Collection: `/games/{gameId}`

Stores game metadata and player information. The actual game state (deck, hands, etc.) is stored in Realtime Database for performance.

```typescript
interface GameMetadata {
  gameId: string;                     // Auto-generated or custom
  joinCode: string;                   // 4-digit code for joining
  status: 'waiting' | 'playing' | 'completed' | 'abandoned';
  createdAt: FirebaseTimestamp;
  startedAt?: FirebaseTimestamp;
  completedAt?: FirebaseTimestamp;

  hostId: string;                     // User who created the game

  players: {
    [userId: string]: {
      userId: string;
      displayName: string;
      photoURL?: string;
      isHost: boolean;
      joinedAt: FirebaseTimestamp;
      isReady: boolean;               // For lobby phase
      totalScore: number;             // Running total across rounds
      currentRoundScore: number;      // Score for current round
      isActive: boolean;              // Still in game vs left/disconnected
      lastActivity: FirebaseTimestamp;
    }
  };

  settings: {
    highlightWilds: boolean;
    maxPlayers: number;               // 2-6
    roundTimeLimit?: number;          // Optional time limit per round (seconds)
  };

  currentRound: number;               // 1-11
  currentTurn: string;                // userId of current player
  winner?: string;                    // userId of winner (when completed)

  // Track players who still need their final turn after someone goes out
  playersRemaining: string[];         // userIds
  firstPlayerOut?: string;            // userId who went out first this round
}
```

**Example:**
```json
{
  "gameId": "game_12345",
  "joinCode": "1234",
  "status": "playing",
  "createdAt": {"_seconds": 1234567890},
  "startedAt": {"_seconds": 1234567900},
  "hostId": "abc123",
  "players": {
    "abc123": {
      "userId": "abc123",
      "displayName": "CardMaster99",
      "photoURL": "https://...",
      "isHost": true,
      "joinedAt": {"_seconds": 1234567890},
      "isReady": true,
      "totalScore": 42,
      "currentRoundScore": 15,
      "isActive": true,
      "lastActivity": {"_seconds": 1234567999}
    },
    "def456": {
      "userId": "def456",
      "displayName": "Player2",
      "isHost": false,
      "joinedAt": {"_seconds": 1234567895},
      "isReady": true,
      "totalScore": 38,
      "currentRoundScore": 12,
      "isActive": true,
      "lastActivity": {"_seconds": 1234567998}
    }
  },
  "settings": {
    "highlightWilds": true,
    "maxPlayers": 6
  },
  "currentRound": 5,
  "currentTurn": "abc123",
  "playersRemaining": ["def456"]
}
```

**Indexes:**
- `status` + `createdAt` (for listing active games)
- `joinCode` (for joining by code)

---

### Subcollection: `/users/{userId}/activeGames/{gameId}`

Stores lightweight references to games a user is currently in. This enables quick queries for "my active games" without loading full game data.

```typescript
interface UserActiveGame {
  gameId: string;
  status: 'waiting' | 'playing';      // Excludes completed
  isMyTurn: boolean;
  lastActivity: FirebaseTimestamp;
  unreadTurns: number;                // How many turns since user last viewed

  // Cached data for quick display
  playerCount: number;
  currentRound: number;
  myScore: number;
  opponentNames: string[];            // Max 5 other players
  gamePreview: {
    hostName: string;
    createdAt: FirebaseTimestamp;
  };
}
```

**Example:**
```json
{
  "gameId": "game_12345",
  "status": "playing",
  "isMyTurn": true,
  "lastActivity": {"_seconds": 1234567999},
  "unreadTurns": 0,
  "playerCount": 3,
  "currentRound": 5,
  "myScore": 42,
  "opponentNames": ["Player2", "Player3"],
  "gamePreview": {
    "hostName": "CardMaster99",
    "createdAt": {"_seconds": 1234567890}
  }
}
```

**Querying:**
```typescript
// Get all active games for current user
const activeGamesQuery = firestore
  .collection('users')
  .doc(currentUserId)
  .collection('activeGames')
  .where('status', 'in', ['waiting', 'playing'])
  .orderBy('lastActivity', 'desc');

// Get games where it's my turn
const myTurnGamesQuery = firestore
  .collection('users')
  .doc(currentUserId)
  .collection('activeGames')
  .where('isMyTurn', '==', true);
```

---

### Collection: `/notifications/{notificationId}`

Stores in-app notifications for users.

```typescript
interface Notification {
  notificationId: string;
  userId: string;                     // Recipient
  type: 'turn' | 'friend_request' | 'game_invitation' | 'game_completed';
  read: boolean;
  createdAt: FirebaseTimestamp;

  // Type-specific data
  data: TurnNotification | FriendRequestNotification | GameInvitationNotification | GameCompletedNotification;
}

interface TurnNotification {
  gameId: string;
  gameName: string;                   // e.g., "Game with Player2, Player3"
  currentRound: number;
  opponentWhoMoved: string;           // Display name
}

interface FriendRequestNotification {
  fromUserId: string;
  fromDisplayName: string;
  fromPhotoURL?: string;
}

interface GameInvitationNotification {
  gameId: string;
  fromUserId: string;
  fromDisplayName: string;
  playerCount: number;
}

interface GameCompletedNotification {
  gameId: string;
  gameName: string;
  myScore: number;
  myRank: number;                     // 1st, 2nd, 3rd, etc.
  winnerName: string;
}
```

**Example:**
```json
{
  "notificationId": "notif_xyz",
  "userId": "abc123",
  "type": "turn",
  "read": false,
  "createdAt": {"_seconds": 1234567999},
  "data": {
    "gameId": "game_12345",
    "gameName": "Game with Player2, Player3",
    "currentRound": 5,
    "opponentWhoMoved": "Player2"
  }
}
```

**Indexes:**
- Composite: `userId` + `read` + `createdAt`

---

### Collection: `/joinCodes/{joinCode}`

Temporary mapping from 4-digit join codes to game IDs. This prevents code collisions.

```typescript
interface JoinCode {
  joinCode: string;                   // 4-digit code
  gameId: string;
  createdAt: FirebaseTimestamp;
  expiresAt: FirebaseTimestamp;       // Auto-delete after game completes
}
```

**Example:**
```json
{
  "joinCode": "1234",
  "gameId": "game_12345",
  "createdAt": {"_seconds": 1234567890},
  "expiresAt": {"_seconds": 1234657890}
}
```

**TTL (Time To Live):**
- Set Firestore TTL policy to auto-delete documents 24 hours after `expiresAt`

---

## Realtime Database Structure

Used for active game state during gameplay.

### `/games/{gameCode}`

```typescript
interface RealtimeGameState {
  gameCode: string;                   // Same as joinCode
  gameId: string;                     // Link to Firestore game metadata
  status: 'waiting' | 'playing';

  gameState: {
    currentRound: number;             // 1-11
    currentPlayer: string;            // userId
    turnPhase: 'WAITING_FOR_DRAW' | 'WAITING_FOR_DISCARD' | 'ROUND_COMPLETE';

    deck: Card[];                     // Remaining cards in deck
    discardPile: Card[];              // Discard pile (top card visible)

    playerHands: {
      [userId: string]: Card[];
    };

    playerScores: {
      [userId: string]: number;       // Total score across all rounds
    };

    roundScores: {
      [userId: string]: number;       // Score for current round (if round ended)
    };

    firstPlayerOut?: string;          // Who went out first this round
    playersRemaining: string[];       // Players who still need final turn

    firstPlayerThisRound: string;     // For turn rotation

    // Metadata for sync
    lastUpdated: number;              // Timestamp
    updatedBy: string;                // userId who made last update
  };
}

interface Card {
  rank: '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'Joker';
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'stars' | 'joker';
  id: string;                         // Unique identifier
}
```

**Example:**
```json
{
  "gameCode": "1234",
  "gameId": "game_12345",
  "status": "playing",
  "gameState": {
    "currentRound": 5,
    "currentPlayer": "abc123",
    "turnPhase": "WAITING_FOR_DRAW",
    "deck": [
      {"rank": "7", "suit": "hearts", "id": "7-hearts-0"},
      {"rank": "Q", "suit": "stars", "id": "Q-stars-1"}
    ],
    "discardPile": [
      {"rank": "5", "suit": "clubs", "id": "5-clubs-0"}
    ],
    "playerHands": {
      "abc123": [
        {"rank": "3", "suit": "spades", "id": "3-spades-0"},
        {"rank": "4", "suit": "spades", "id": "4-spades-0"}
      ],
      "def456": [
        {"rank": "8", "suit": "hearts", "id": "8-hearts-1"}
      ]
    },
    "playerScores": {
      "abc123": 42,
      "def456": 38
    },
    "roundScores": {},
    "playersRemaining": [],
    "firstPlayerThisRound": "def456",
    "lastUpdated": 1234567999000,
    "updatedBy": "abc123"
  }
}
```

---

## Firebase Security Rules

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isGamePlayer(gameId) {
      return isAuthenticated() &&
             exists(/databases/$(database)/documents/games/$(gameId)) &&
             get(/databases/$(database)/documents/games/$(gameId)).data.players[request.auth.uid] != null;
    }

    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId);
      allow delete: if isOwner(userId);

      // User's active games subcollection
      match /activeGames/{gameId} {
        allow read: if isOwner(userId);
        allow write: if isOwner(userId);
      }
    }

    // Friendships collection
    match /friendships/{friendshipId} {
      allow read: if isAuthenticated() &&
                     request.auth.uid in resource.data.users;
      allow create: if isAuthenticated() &&
                       request.auth.uid in request.resource.data.users;
      allow update: if isAuthenticated() &&
                       request.auth.uid in resource.data.users;
      allow delete: if isAuthenticated() &&
                       request.auth.uid in resource.data.users;
    }

    // Games collection
    match /games/{gameId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isGamePlayer(gameId);
      allow delete: if isAuthenticated() &&
                       resource.data.hostId == request.auth.uid;
    }

    // Notifications collection
    match /notifications/{notificationId} {
      allow read: if isOwner(resource.data.userId);
      allow create: if isAuthenticated();
      allow update: if isOwner(resource.data.userId);
      allow delete: if isOwner(resource.data.userId);
    }

    // Join codes collection
    match /joinCodes/{joinCode} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
  }
}
```

### Realtime Database Rules

```json
{
  "rules": {
    "games": {
      "$gameCode": {
        ".read": "auth != null",
        ".write": "auth != null && (
          !data.exists() ||
          data.child('gameState/playerHands').hasChild(auth.uid)
        )",
        ".indexOn": ["status", "gameId"]
      }
    }
  }
}
```

---

## Cloud Functions

### Function: `onTurnChange`

Triggered when a player completes their turn. Sends push notification to next player.

```typescript
// functions/src/notifications.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const onTurnChange = functions.database
  .ref('/games/{gameCode}/gameState/currentPlayer')
  .onUpdate(async (change, context) => {
    const newCurrentPlayer = change.after.val();
    const gameCode = context.params.gameCode;

    // Get game metadata from Firestore
    const gameSnapshot = await admin.firestore()
      .collection('games')
      .where('joinCode', '==', gameCode)
      .limit(1)
      .get();

    if (gameSnapshot.empty) return;

    const gameData = gameSnapshot.docs[0].data();
    const currentPlayerData = gameData.players[newCurrentPlayer];

    // Get user's FCM tokens
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(newCurrentPlayer)
      .get();

    const userData = userDoc.data();
    if (!userData || !userData.fcmTokens || userData.fcmTokens.length === 0) {
      return;
    }

    // Send push notification
    const message = {
      notification: {
        title: "Your turn!",
        body: `It's your turn in ${gameData.hostDisplayName}'s game (Round ${gameData.currentRound})`,
      },
      data: {
        type: 'turn',
        gameId: gameSnapshot.docs[0].id,
        gameCode: gameCode,
      },
      tokens: userData.fcmTokens,
    };

    try {
      await admin.messaging().sendMulticast(message);

      // Create in-app notification
      await admin.firestore().collection('notifications').add({
        userId: newCurrentPlayer,
        type: 'turn',
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        data: {
          gameId: gameSnapshot.docs[0].id,
          gameName: `Game with ${Object.values(gameData.players)
            .filter((p: any) => p.userId !== newCurrentPlayer)
            .map((p: any) => p.displayName)
            .join(', ')}`,
          currentRound: gameData.currentRound,
        }
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  });
```

---

### Function: `onFriendRequest`

Triggered when a friend request is created. Sends notification to recipient.

```typescript
// functions/src/friends.ts
export const onFriendRequest = functions.firestore
  .document('friendships/{friendshipId}')
  .onCreate(async (snapshot, context) => {
    const friendship = snapshot.data();

    if (friendship.status !== 'pending') return;

    const recipientId = friendship.users.find((id: string) => id !== friendship.requestedBy);
    const senderId = friendship.requestedBy;

    // Get sender info
    const senderDoc = await admin.firestore()
      .collection('users')
      .doc(senderId)
      .get();

    const senderData = senderDoc.data();

    // Get recipient's FCM tokens
    const recipientDoc = await admin.firestore()
      .collection('users')
      .doc(recipientId)
      .get();

    const recipientData = recipientDoc.data();
    if (!recipientData || !recipientData.fcmTokens) return;

    // Send notification
    const message = {
      notification: {
        title: "New friend request",
        body: `${senderData?.displayName} wants to be your friend`,
      },
      data: {
        type: 'friend_request',
        fromUserId: senderId,
      },
      tokens: recipientData.fcmTokens,
    };

    await admin.messaging().sendMulticast(message);

    // Create in-app notification
    await admin.firestore().collection('notifications').add({
      userId: recipientId,
      type: 'friend_request',
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      data: {
        fromUserId: senderId,
        fromDisplayName: senderData?.displayName,
        fromPhotoURL: senderData?.photoURL,
      }
    });
  });
```

---

### Function: `cleanupCompletedGames`

Scheduled function to clean up old completed games.

```typescript
// functions/src/games.ts
export const cleanupCompletedGames = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const oneWeekAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const completedGamesQuery = admin.firestore()
      .collection('games')
      .where('status', '==', 'completed')
      .where('completedAt', '<', oneWeekAgo);

    const snapshot = await completedGamesQuery.get();

    const batch = admin.firestore().batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);

      // Also delete from Realtime Database
      const gameData = doc.data();
      admin.database().ref(`games/${gameData.joinCode}`).remove();
    });

    await batch.commit();
    console.log(`Cleaned up ${snapshot.size} completed games`);
  });
```

---

## Firestore Indexes

Required composite indexes (create in Firebase Console):

```json
{
  "indexes": [
    {
      "collectionGroup": "friendships",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "users", "arrayConfig": "CONTAINS"},
        {"fieldPath": "status", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "activeGames",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "lastActivity", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "userId", "order": "ASCENDING"},
        {"fieldPath": "read", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "games",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    }
  ]
}
```

---

## Setup Instructions

### 1. Firebase Console Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize Firebase in your project
firebase init

# Select:
# - Firestore
# - Realtime Database
# - Functions
# - Hosting
```

### 2. Enable Firebase Authentication

1. Go to Firebase Console → Authentication
2. Enable sign-in methods:
   - Email/Password
   - Google
   - Apple (for iOS requirement)

### 3. Create Firestore Database

1. Go to Firebase Console → Firestore Database
2. Create database in production mode
3. Deploy security rules: `firebase deploy --only firestore:rules`

### 4. Deploy Cloud Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

### 5. Set up Indexes

Firebase will prompt you to create indexes when queries fail. Alternatively, deploy from config:

```bash
firebase deploy --only firestore:indexes
```

---

## Migration from Current Structure

### Current Web App Structure:
```
/games/{gameCode}
  - status
  - players
  - gameState
```

### New Structure:
```
Firestore: /games/{gameId}         (metadata, players, scores)
Realtime DB: /games/{gameCode}     (active game state)
Firestore: /users/{userId}/activeGames/{gameId}  (user's game list)
```

### Migration Steps:

1. **Keep current Realtime DB structure** for active games
2. **Add Firestore** for new features (users, friends)
3. **Sync game metadata** to both databases during gameplay
4. **Phase out old structure** once mobile app is stable

---

## Cost Estimates

### Firestore (100 active users, 10 games/day):
- Reads: ~50K/day → Free tier
- Writes: ~20K/day → Free tier
- Storage: <1GB → Free tier

### Realtime Database:
- Current usage → Free tier
- Connections: ~100 concurrent → Free tier

### Cloud Functions:
- Turn notifications: ~500/day × 30 = 15K/month → Free tier
- Friend requests: ~100/month → Free tier

### Cloud Messaging (FCM):
- Free unlimited

**Total Monthly Cost (estimated):** $0 for <500 users

---

## Next Steps

1. Review this schema
2. Set up Firebase project
3. Create test data
4. Test security rules
5. Deploy Cloud Functions
6. Begin React Native integration

