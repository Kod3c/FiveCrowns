# Five Crowns Mobile App Migration Guide

## Overview

This document outlines the complete migration strategy from the current web-based PWA to native iOS and Android mobile apps with user accounts, friend system, and multiple concurrent games.

## Technology Stack Decision

### Chosen: React Native with Expo

**Rationale:**
- **JavaScript continuity**: Leverage existing JS codebase and team knowledge
- **Expo managed workflow**: Simplifies development without native build tools initially
- **Cross-platform**: Single codebase for iOS and Android
- **Strong ecosystem**: Excellent Firebase support, push notifications, navigation libraries
- **Faster time to market**: Easier learning curve from web development background

### Alternative Considered: Flutter
- ❌ Requires learning Dart (new language)
- ❌ Different paradigm (widget-based vs component-based)
- ✅ Better performance (minor difference for card game)
- ❌ Steeper learning curve for web developers

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile App (React Native)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Screens │  │  Home/Games  │  │  Game Board  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │        Firebase SDK (React Native)               │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Firebase Backend                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth         │  │ Firestore    │  │ Realtime DB  │      │
│  │ (Users)      │  │ (Profiles,   │  │ (Game State) │      │
│  │              │  │  Friends)    │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │        Cloud Functions                            │       │
│  │  - Send push notifications                        │       │
│  │  - Handle friend requests                         │       │
│  │  - Game invitation logic                          │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │        Cloud Messaging (FCM)                      │       │
│  │  - Turn notifications                             │       │
│  │  - Friend requests                                │       │
│  │  - Game invitations                               │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema Design

### Firebase Authentication
- Handles user authentication (email/password, Google, Apple Sign-In)
- Provides unique `userId` for each user

### Firestore Collections

#### `/users/{userId}`
```json
{
  "userId": "string",
  "email": "string",
  "displayName": "string",
  "photoURL": "string (optional)",
  "createdAt": "timestamp",
  "lastActive": "timestamp",
  "stats": {
    "gamesPlayed": 0,
    "gamesWon": 0,
    "totalScore": 0,
    "averageScore": 0
  },
  "settings": {
    "highlightWilds": true,
    "pushNotifications": true,
    "soundEffects": true
  },
  "fcmTokens": ["token1", "token2"] // Multiple devices
}
```

#### `/friendships/{friendshipId}`
```json
{
  "friendshipId": "string (auto-generated)",
  "users": ["userId1", "userId2"], // Sorted array for querying
  "status": "pending | accepted | blocked",
  "requestedBy": "userId1",
  "requestedAt": "timestamp",
  "acceptedAt": "timestamp (optional)"
}
```

#### `/gameMetadata/{gameId}`
```json
{
  "gameId": "string",
  "joinCode": "string (4 digits)",
  "status": "waiting | playing | completed",
  "createdAt": "timestamp",
  "startedAt": "timestamp (optional)",
  "completedAt": "timestamp (optional)",
  "hostId": "userId",
  "players": {
    "userId1": {
      "userId": "userId1",
      "displayName": "Player 1",
      "photoURL": "...",
      "isHost": true,
      "joinedAt": "timestamp",
      "isReady": true,
      "totalScore": 42,
      "isActive": true // Still in game vs left
    },
    "userId2": { /* ... */ }
  },
  "settings": {
    "highlightWilds": true,
    "maxPlayers": 6
  },
  "currentRound": 1,
  "currentTurn": "userId1",
  "winner": "userId (optional)"
}
```

#### `/userGames/{userId}/games/{gameId}`
```json
{
  "gameId": "string",
  "status": "active | completed",
  "isMyTurn": false,
  "lastActivity": "timestamp",
  "unreadTurns": 0,
  "playerCount": 3,
  "currentRound": 5,
  "myScore": 42,
  "opponentNames": ["Player2", "Player3"]
}
```

#### `/notifications/{notificationId}`
```json
{
  "notificationId": "string",
  "userId": "string", // Recipient
  "type": "turn | friend_request | game_invitation",
  "data": {
    "gameId": "...",
    "fromUserId": "...",
    "fromDisplayName": "..."
  },
  "read": false,
  "createdAt": "timestamp"
}
```

### Firebase Realtime Database (Game State)

Keep existing structure at `/games/{gameCode}` for real-time game state:
```json
{
  "gameCode": "1234",
  "gameState": {
    "currentRound": 1,
    "currentPlayer": "userId1",
    "deck": [...],
    "discardPile": [...],
    "playerHands": { "userId1": [...], "userId2": [...] },
    "turnPhase": "WAITING_FOR_DRAW"
  }
}
```

**Why keep Realtime DB for game state?**
- Already optimized for real-time updates during active gameplay
- Lower latency than Firestore for rapid card moves
- Existing logic can be reused with minimal changes

## Project Structure

```
FiveCrownsMobile/
├── App.tsx                          # Root component
├── app.json                         # Expo configuration
├── package.json
├── tsconfig.json
│
├── src/
│   ├── navigation/
│   │   ├── AppNavigator.tsx        # Main navigation container
│   │   ├── AuthNavigator.tsx       # Auth flow (login/register)
│   │   └── MainNavigator.tsx       # Authenticated user flow
│   │
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── ForgotPasswordScreen.tsx
│   │   │
│   │   ├── home/
│   │   │   ├── HomeScreen.tsx      # Active games + friends
│   │   │   ├── FriendsScreen.tsx
│   │   │   └── ProfileScreen.tsx
│   │   │
│   │   ├── game/
│   │   │   ├── CreateGameScreen.tsx
│   │   │   ├── JoinGameScreen.tsx
│   │   │   ├── LobbyScreen.tsx
│   │   │   └── GameBoardScreen.tsx
│   │   │
│   │   └── settings/
│   │       └── SettingsScreen.tsx
│   │
│   ├── components/
│   │   ├── cards/
│   │   │   ├── Card.tsx            # Individual card component
│   │   │   ├── CardHand.tsx        # Player's hand
│   │   │   ├── DeckPile.tsx
│   │   │   └── DiscardPile.tsx
│   │   │
│   │   ├── game/
│   │   │   ├── GameBoard.tsx
│   │   │   ├── PlayerList.tsx
│   │   │   ├── ScoreBoard.tsx
│   │   │   └── TurnIndicator.tsx
│   │   │
│   │   ├── friends/
│   │   │   ├── FriendCard.tsx
│   │   │   ├── FriendRequest.tsx
│   │   │   └── AddFriendModal.tsx
│   │   │
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       └── LoadingSpinner.tsx
│   │
│   ├── services/
│   │   ├── firebase/
│   │   │   ├── config.ts           # Firebase initialization
│   │   │   ├── auth.ts             # Auth methods
│   │   │   ├── firestore.ts        # Firestore methods
│   │   │   ├── realtimeDb.ts       # Game state methods
│   │   │   └── notifications.ts    # Push notification setup
│   │   │
│   │   └── game/
│   │       ├── gameLogic.ts        # Core game rules (ported)
│   │       ├── cardLogic.ts        # Card validation (ported)
│   │       ├── deckManager.ts      # Deck operations (ported)
│   │       └── scoreCalculator.ts  # Scoring logic (ported)
│   │
│   ├── hooks/
│   │   ├── useAuth.ts              # Authentication hook
│   │   ├── useGameState.ts         # Real-time game state
│   │   ├── useFriends.ts           # Friends management
│   │   └── useNotifications.ts     # Push notifications
│   │
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   ├── GameContext.tsx
│   │   └── NotificationContext.tsx
│   │
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── colors.ts               # Theme colors
│   │   └── validators.ts           # Input validation
│   │
│   └── types/
│       ├── game.ts                 # Game-related types
│       ├── user.ts                 # User types
│       └── index.ts
│
└── functions/                      # Firebase Cloud Functions
    ├── package.json
    └── src/
        ├── index.ts
        ├── notifications.ts        # Send turn notifications
        ├── friends.ts              # Friend request logic
        └── games.ts                # Game cleanup, invitations
```

## Migration Phases

### Phase 1: Backend Enhancement (2-3 weeks)

**Week 1: Firebase Setup**
- [ ] Enable Firebase Authentication in console
- [ ] Create Firestore database
- [ ] Set up Firestore security rules
- [ ] Design and document collections structure
- [ ] Create Firebase Cloud Functions project

**Week 2: Cloud Functions**
- [ ] Implement turn notification function
- [ ] Implement friend request notification
- [ ] Implement game invitation logic
- [ ] Set up FCM (Firebase Cloud Messaging)
- [ ] Test functions locally with emulator

**Week 3: Security & Testing**
- [ ] Implement comprehensive security rules
- [ ] Test Firestore queries and indexes
- [ ] Deploy Cloud Functions
- [ ] Set up monitoring and error tracking

### Phase 2: React Native Setup (1 week)

**Days 1-2: Project Initialization**
```bash
# Install Expo CLI
npm install -g expo-cli

# Create new project
npx create-expo-app FiveCrownsMobile --template expo-template-blank-typescript

# Navigate to project
cd FiveCrownsMobile

# Install dependencies
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install firebase
npm install expo-notifications
npm install react-native-gesture-handler react-native-reanimated
npm install @react-native-async-storage/async-storage
```

**Days 3-4: Navigation Setup**
- [ ] Set up React Navigation structure
- [ ] Create basic screen components (placeholders)
- [ ] Implement tab navigation for main app
- [ ] Implement stack navigation for auth flow

**Days 5-7: Firebase Integration**
- [ ] Initialize Firebase in React Native
- [ ] Set up Firebase Authentication
- [ ] Connect to Firestore
- [ ] Connect to Realtime Database
- [ ] Test basic auth flows

### Phase 3: Core Game Logic Port (3-4 weeks)

**Week 1: Game Logic Services**
- [ ] Port deck creation logic from `lobby.js`
- [ ] Port card validation from `game.js`
- [ ] Port scoring logic
- [ ] Create TypeScript interfaces for all game entities
- [ ] Write unit tests for game logic

**Week 2: Card Components**
- [ ] Create Card component with proper styling
- [ ] Implement CardHand component with gestures
- [ ] Create DeckPile and DiscardPile components
- [ ] Implement drag-and-drop interactions
- [ ] Test touch interactions on devices

**Week 3: Game Board & State Management**
- [ ] Create GameBoardScreen layout
- [ ] Implement real-time game state sync
- [ ] Port turn management logic
- [ ] Implement "Go Out" validation
- [ ] Add round transition logic

**Week 4: Game Flow & Polish**
- [ ] Create/Join game flows
- [ ] Lobby screen with real-time player list
- [ ] Game completion and scoring screen
- [ ] Handle disconnections gracefully
- [ ] Add animations and transitions

### Phase 4: Social Features (2-3 weeks)

**Week 1: User Profiles**
- [ ] Create user profile screens
- [ ] Implement profile editing
- [ ] Add avatar selection/upload
- [ ] Display user statistics
- [ ] Settings screen

**Week 2: Friend System**
- [ ] Friends list screen
- [ ] Add friend by username/email
- [ ] Friend request notifications
- [ ] Accept/decline friend requests
- [ ] Unfriend functionality

**Week 3: Multi-Game Management**
- [ ] Active games list on home screen
- [ ] Show "your turn" indicators
- [ ] Implement game invitations to friends
- [ ] Game history view
- [ ] Push notifications integration

### Phase 5: Testing & Deployment (2 weeks)

**Week 1: Testing**
- [ ] Test on iOS devices (iPhone SE, iPhone 14 Pro)
- [ ] Test on Android devices (various sizes)
- [ ] Test offline scenarios
- [ ] Test push notifications
- [ ] Beta testing with 5-10 users
- [ ] Fix critical bugs

**Week 2: App Store Submission**
- [ ] Create app icons (iOS and Android)
- [ ] Create splash screens
- [ ] Write app descriptions
- [ ] Take screenshots for stores
- [ ] Submit to TestFlight (iOS beta)
- [ ] Submit to Google Play Internal Testing
- [ ] Prepare for production release

## Key Dependencies

```json
{
  "dependencies": {
    "expo": "~49.0.0",
    "expo-notifications": "~0.20.0",
    "firebase": "^10.0.0",
    "react": "18.2.0",
    "react-native": "0.72.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/stack": "^6.3.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "react-native-gesture-handler": "~2.12.0",
    "react-native-reanimated": "~3.3.0",
    "react-native-screens": "~3.22.0",
    "@react-native-async-storage/async-storage": "1.18.2"
  },
  "devDependencies": {
    "@types/react": "~18.2.0",
    "@types/react-native": "~0.72.0",
    "typescript": "^5.1.0"
  }
}
```

## Migration Checklist

### Pre-Migration
- [ ] Review current web app functionality
- [ ] Document all game rules and edge cases
- [ ] Export existing game assets
- [ ] Plan data migration strategy (if needed)

### During Migration
- [ ] Set up version control for new project
- [ ] Regular testing on physical devices
- [ ] Keep web app running during development
- [ ] Document API changes and new patterns

### Post-Migration
- [ ] Monitor Firebase usage and costs
- [ ] Collect user feedback
- [ ] Plan feature updates
- [ ] Consider web app deprecation timeline

## Cost Considerations

**Firebase Free Tier (Spark Plan):**
- ✅ 10GB Realtime Database storage
- ✅ 1GB Firestore storage
- ✅ 50K reads/day, 20K writes/day (Firestore)
- ⚠️ Cloud Functions: 125K invocations/month (may need upgrade)

**Apple Developer Program:** $99/year
**Google Play Console:** $25 one-time fee

**Estimated monthly cost (100-500 active users):**
- Firebase Blaze Plan: $10-50/month
- Push notifications: Free (FCM)
- Total: ~$10-50/month + $99/year (Apple)

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Learning curve for React Native | Delays | Follow official Expo tutorials, start simple |
| Push notification complexity | User experience | Use Expo's managed notifications initially |
| Real-time sync issues | Gameplay bugs | Thorough testing, implement reconnection logic |
| App store rejection | Launch delays | Follow guidelines strictly, use TestFlight early |
| Firebase costs exceed budget | Financial | Monitor usage, implement rate limiting |

## Success Metrics

- [ ] App installs: 100+ in first month
- [ ] Active users: 50+ weekly
- [ ] Game completion rate: >80%
- [ ] App store rating: >4.0 stars
- [ ] Crash-free rate: >99%
- [ ] Average session length: >10 minutes

## Next Steps

1. Review this migration plan
2. Set up Firebase project (if not already done)
3. Initialize React Native project
4. Create detailed sprint plan for Phase 1
5. Set up development environment

---

**Note:** This is an aggressive timeline. First mobile app projects often take 50-100% longer. Budget 15-20 weeks for realistic timeline.
