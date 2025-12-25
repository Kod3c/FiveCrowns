# Five Crowns Mobile App - Implementation Roadmap

## Project Overview

**Goal:** Convert Five Crowns web app to native iOS/Android mobile app with user accounts, friend system, and support for multiple concurrent games.

**Timeline:** 10-15 weeks (realistic for first mobile app)
**Technology:** React Native + Expo
**Backend:** Firebase (Authentication, Firestore, Realtime Database, Cloud Functions)

---

## Weekly Breakdown

### 🚀 Week 1: Foundation & Setup

#### Days 1-2: Environment Setup
- [ ] Install Node.js, npm, Expo CLI
- [ ] Create Firebase project
- [ ] Enable Firebase Authentication (Email, Google, Apple)
- [ ] Create Firestore and Realtime Database
- [ ] Set up Firebase security rules
- [ ] Get Firebase config credentials

#### Days 3-4: React Native Project
- [ ] Create Expo project with TypeScript
- [ ] Install core dependencies (navigation, Firebase, gestures)
- [ ] Set up project folder structure
- [ ] Configure Firebase in React Native
- [ ] Test Firebase connection

#### Days 5-7: Basic Navigation
- [ ] Install React Navigation
- [ ] Create navigation structure (AuthNavigator, MainNavigator)
- [ ] Create placeholder screens (Login, Register, Home, GameBoard)
- [ ] Implement basic routing
- [ ] Test navigation flows

**Deliverable:** Working app skeleton with Firebase connection

---

### 🔐 Week 2: Authentication & User Profiles

#### Days 1-3: Auth UI
- [ ] Create LoginScreen with email/password form
- [ ] Create RegisterScreen with validation
- [ ] Create ForgotPasswordScreen
- [ ] Implement error handling and loading states
- [ ] Add input validation (email format, password strength)

#### Days 4-5: Auth Logic
- [ ] Implement `registerUser()` function
- [ ] Implement `loginUser()` function
- [ ] Implement `resetPassword()` function
- [ ] Create AuthContext for state management
- [ ] Add persistent auth state (AsyncStorage)

#### Days 6-7: User Profiles
- [ ] Create Firestore user document on registration
- [ ] Implement profile screen
- [ ] Add profile editing (display name, photo)
- [ ] Implement user statistics display
- [ ] Create settings screen (notifications, theme)

**Deliverable:** Complete authentication system with user profiles

---

### 🏠 Week 3: Home Screen & Active Games

#### Days 1-3: Home Screen UI
- [ ] Design home screen layout
- [ ] Create active games list component
- [ ] Create game card component (shows status, players, round)
- [ ] Add "Your Turn" indicator
- [ ] Implement pull-to-refresh

#### Days 4-5: Active Games Logic
- [ ] Create Firestore query for user's active games
- [ ] Implement real-time sync for game list
- [ ] Create `useActiveGames` hook
- [ ] Add game filtering (waiting, playing, completed)
- [ ] Implement game card tap navigation

#### Days 6-7: Create/Join Game
- [ ] Create "Create Game" button and flow
- [ ] Create "Join Game" modal with code input
- [ ] Generate unique 4-digit join codes
- [ ] Implement game creation in Firestore
- [ ] Test join game by code

**Deliverable:** Home screen with active games list and create/join functionality

---

### 👥 Week 4: Friend System

#### Days 1-2: Friends List
- [ ] Create FriendsScreen layout
- [ ] Create friend card component
- [ ] Implement Firestore query for friendships
- [ ] Display accepted friends
- [ ] Add online/offline indicators (lastActive)

#### Days 3-4: Friend Requests
- [ ] Create "Add Friend" modal
- [ ] Implement search by username/email
- [ ] Create friend request sending
- [ ] Display pending requests (sent and received)
- [ ] Implement accept/decline buttons

#### Days 5-6: Friend Actions
- [ ] Implement accept friend request
- [ ] Implement decline friend request
- [ ] Implement unfriend action
- [ ] Add confirmation dialogs
- [ ] Update friend list in real-time

#### Day 7: Testing & Polish
- [ ] Test all friend scenarios
- [ ] Add loading states
- [ ] Implement error handling
- [ ] Polish UI/UX

**Deliverable:** Complete friend management system

---

### 🃏 Week 5: Game Lobby

#### Days 1-2: Lobby UI
- [ ] Create LobbyScreen layout
- [ ] Display game code prominently
- [ ] Create player list component
- [ ] Show host badge
- [ ] Add "Copy Code" button

#### Days 3-4: Lobby Logic
- [ ] Implement real-time player list sync
- [ ] Handle player join/leave
- [ ] Update player ready status
- [ ] Implement host controls (settings, start game)
- [ ] Add max player limit (6 players)

#### Days 5-6: Game Settings
- [ ] Create settings UI (highlight wilds, time limit)
- [ ] Implement settings sync for all players
- [ ] Add "Start Game" button (host only)
- [ ] Disable start until 2+ players
- [ ] Handle lobby disconnections

#### Day 7: Start Game Flow
- [ ] Port deck creation logic
- [ ] Port card dealing logic (Round 1 = 3 cards)
- [ ] Initialize game state in Realtime Database
- [ ] Transition all players to GameBoardScreen
- [ ] Test multiplayer game start

**Deliverable:** Functional lobby with real-time sync and game start

---

### 🎮 Week 6: Game Board - Part 1 (Layout & Cards)

#### Days 1-2: Card Components
- [ ] Create Card component with suit/rank display
- [ ] Implement card styling (colors for suits)
- [ ] Add wild card highlighting
- [ ] Create CardHand component
- [ ] Test card rendering

#### Days 3-4: Game Board Layout
- [ ] Design game board layout (deck, discard, hand)
- [ ] Create DeckPile component
- [ ] Create DiscardPile component
- [ ] Position components on screen
- [ ] Make layout responsive

#### Days 5-6: Touch Interactions
- [ ] Implement card selection (tap to select)
- [ ] Add visual feedback for selected cards
- [ ] Implement tap deck to draw
- [ ] Implement tap discard pile to draw
- [ ] Test touch responsiveness

#### Day 7: Testing
- [ ] Test on different screen sizes
- [ ] Test card visibility
- [ ] Adjust layout for landscape
- [ ] Polish animations

**Deliverable:** Game board layout with card display

---

### 🎮 Week 7: Game Board - Part 2 (Gameplay)

#### Days 1-2: Turn Management
- [ ] Port turn management logic
- [ ] Implement draw from deck
- [ ] Implement draw from discard
- [ ] Implement discard card
- [ ] Update turn phase state

#### Days 3-4: Real-time Sync
- [ ] Create `useGameState` hook
- [ ] Sync game state from Realtime Database
- [ ] Update UI on state changes
- [ ] Handle opponent's moves
- [ ] Test multiplayer sync

#### Days 5-6: Game Logic
- [ ] Port card validation logic (sets, runs)
- [ ] Implement wild card detection
- [ ] Port scoring logic
- [ ] Implement "Go Out" validation
- [ ] Test game rules

#### Day 7: Turn Indicators
- [ ] Show current player indicator
- [ ] Display round number
- [ ] Show player scores
- [ ] Add turn timer (optional)
- [ ] Test turn flow

**Deliverable:** Playable game with turn-based gameplay

---

### 🎮 Week 8: Game Board - Part 3 (Advanced Features)

#### Days 1-2: Drag and Drop
- [ ] Install gesture handler and reanimated
- [ ] Implement drag gesture for cards
- [ ] Add drop zones (discard pile)
- [ ] Implement drag-to-discard
- [ ] Add visual feedback

#### Days 3-4: Go Out Flow
- [ ] Create "Go Out" button
- [ ] Validate all cards are in melds
- [ ] Implement final turn logic
- [ ] Show remaining players indicator
- [ ] Handle round completion

#### Days 5-6: Round Transitions
- [ ] Calculate round scores
- [ ] Display round results modal
- [ ] Implement "Next Round" button
- [ ] Deal cards for new round
- [ ] Update wild card for new round

#### Day 7: Game Completion
- [ ] Detect game end (after Round 11)
- [ ] Calculate final scores
- [ ] Determine winner
- [ ] Display game results screen
- [ ] Update user statistics

**Deliverable:** Complete game flow from start to finish

---

### 📱 Week 9: Push Notifications & Polish

#### Days 1-2: Notification Setup
- [ ] Install Expo Notifications
- [ ] Configure app.json for notifications
- [ ] Request notification permissions
- [ ] Get Expo push token
- [ ] Save FCM token to Firestore

#### Days 3-4: Cloud Functions
- [ ] Set up Firebase Cloud Functions project
- [ ] Implement `onTurnChange` function
- [ ] Implement `onFriendRequest` function
- [ ] Deploy Cloud Functions
- [ ] Test notification delivery

#### Days 5-6: In-App Notifications
- [ ] Create NotificationContext
- [ ] Handle incoming notifications
- [ ] Implement notification tap handling
- [ ] Create notification badge
- [ ] Update badge count for active turns

#### Day 7: UI Polish
- [ ] Add loading animations
- [ ] Implement error boundaries
- [ ] Add haptic feedback
- [ ] Polish color scheme
- [ ] Improve typography

**Deliverable:** Push notifications and polished UI

---

### 🧪 Week 10: Testing & Bug Fixes

#### Days 1-2: Unit Testing
- [ ] Write tests for game logic
- [ ] Test card validation
- [ ] Test scoring calculations
- [ ] Test deck shuffling
- [ ] Run all tests

#### Days 3-4: Integration Testing
- [ ] Test auth flows
- [ ] Test game creation/joining
- [ ] Test friend requests
- [ ] Test Firestore queries
- [ ] Test real-time sync

#### Days 5-6: Device Testing
- [ ] Test on iPhone (multiple sizes)
- [ ] Test on Android (multiple sizes)
- [ ] Test on tablets
- [ ] Test offline scenarios
- [ ] Test with slow internet

#### Day 7: Bug Fixes
- [ ] Fix critical bugs
- [ ] Address UI issues
- [ ] Improve performance
- [ ] Handle edge cases
- [ ] Update error messages

**Deliverable:** Tested and debugged app

---

### 🎨 Week 11: Advanced Features & Optimization

#### Days 1-2: Game Invitations
- [ ] Create "Invite Friends" button in lobby
- [ ] Show friend selection modal
- [ ] Send game invitation notification
- [ ] Handle invitation acceptance
- [ ] Test invitation flow

#### Days 3-4: Game History
- [ ] Create game history screen
- [ ] Query completed games
- [ ] Display past game results
- [ ] Show statistics per game
- [ ] Implement "Play Again" feature

#### Days 5-6: Performance Optimization
- [ ] Optimize Firestore queries
- [ ] Implement pagination for game history
- [ ] Reduce re-renders
- [ ] Optimize images
- [ ] Test performance

#### Day 7: Accessibility
- [ ] Add screen reader support
- [ ] Implement proper ARIA labels
- [ ] Test with VoiceOver (iOS)
- [ ] Test with TalkBack (Android)
- [ ] Add high contrast mode

**Deliverable:** Feature-complete app with optimizations

---

### 📦 Week 12: Pre-Launch Preparation

#### Days 1-2: App Store Assets
- [ ] Create app icon (1024x1024)
- [ ] Design splash screen
- [ ] Take iPhone screenshots (all sizes)
- [ ] Take iPad screenshots
- [ ] Take Android screenshots (phone and tablet)

#### Days 3-4: App Store Listings
- [ ] Write app description
- [ ] Create promotional text
- [ ] List features
- [ ] Add keywords
- [ ] Prepare privacy policy

#### Days 5-6: Beta Testing
- [ ] Set up TestFlight (iOS)
- [ ] Set up Google Play Internal Testing
- [ ] Invite 10-20 beta testers
- [ ] Collect feedback
- [ ] Fix reported issues

#### Day 7: Final Checks
- [ ] Review Firebase security rules
- [ ] Check API rate limits
- [ ] Monitor Firebase usage
- [ ] Verify all features work
- [ ] Create release notes

**Deliverable:** App ready for submission

---

### 🚢 Weeks 13-14: Launch & Post-Launch

#### Week 13: App Submission
- [ ] Submit to Apple App Store
- [ ] Submit to Google Play Store
- [ ] Respond to review feedback
- [ ] Make required changes
- [ ] Resubmit if needed

#### Week 14: Post-Launch
- [ ] Monitor crash reports
- [ ] Track user feedback
- [ ] Fix critical bugs
- [ ] Release patch updates
- [ ] Plan feature updates

---

## Success Metrics

### Launch Goals (First Month)
- [ ] 100+ app installs
- [ ] 50+ registered users
- [ ] 25+ active weekly users
- [ ] 10+ completed games
- [ ] App store rating > 4.0 stars

### Technical Metrics
- [ ] Crash-free rate > 99%
- [ ] Average session length > 10 minutes
- [ ] Game completion rate > 80%
- [ ] Push notification delivery rate > 95%

---

## Resource Requirements

### Development Tools
- Mac computer (for iOS development)
- Xcode (for iOS testing)
- Android Studio (for Android testing)
- VS Code or preferred editor
- Physical iPhone and Android device

### Accounts Needed
- Apple Developer Program ($99/year)
- Google Play Console ($25 one-time)
- Firebase account (free to start)
- Expo account (free)

### Estimated Costs

**Development Phase:**
- Firebase (Spark Plan): $0
- Testing devices: Use personal phones

**Launch Phase:**
- Apple Developer: $99/year
- Google Play: $25 one-time
- Firebase (Blaze Plan): ~$10-25/month (100-500 users)

**Total First Year:** ~$200-400

---

## Risk Management

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Learning curve delays timeline | High | Medium | Add 50% buffer time, use tutorials |
| App store rejection | Medium | High | Follow guidelines, use TestFlight |
| Firebase costs exceed budget | Low | Medium | Monitor usage, implement rate limiting |
| Real-time sync bugs | Medium | High | Thorough testing, implement retry logic |
| Push notifications don't work | Medium | Medium | Test early, use Expo's managed service |
| User adoption is slow | High | Medium | Invite web app users, promote to friends |

---

## Alternative: Faster Path (PWA Enhancement)

If native app development feels too ambitious, consider enhancing the web app instead:

**2-3 Week Timeline:**
1. Add Firebase Authentication to web app
2. Implement friend system in Firestore
3. Support multiple concurrent games
4. Add service worker for offline support
5. Implement web push notifications (limited iOS support)

**Pros:** Faster, uses existing codebase, no app store approval
**Cons:** Limited iOS features, no native feel, less discoverability

---

## Next Steps

1. ✅ Review this roadmap
2. [ ] Decide: React Native or PWA enhancement?
3. [ ] Set up development environment
4. [ ] Create Firebase project
5. [ ] Start Week 1 tasks
6. [ ] Join React Native community for support

---

## Resources

- **React Native Docs:** https://reactnative.dev/
- **Expo Docs:** https://docs.expo.dev/
- **Firebase Docs:** https://firebase.google.com/docs
- **React Navigation:** https://reactnavigation.org/
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/

---

## Support & Community

- **Stack Overflow:** Tag questions with `react-native`, `expo`, `firebase`
- **Expo Forums:** https://forums.expo.dev/
- **React Native Community:** https://www.reactnative.dev/community/overview
- **Firebase Discord:** https://discord.gg/firebase

---

**Remember:** This is an ambitious project for a first mobile app. Don't be discouraged by challenges. Take it one week at a time, ask for help when stuck, and celebrate small wins! 🎉

Good luck! 👑
