# Five Crowns Mobile - Project Todo List

## Project Goals
Create a multiplayer mobile version of Five Crowns card game that can be played across multiple devices with a Jackbox-style lobby system.

### Core Features
- Host creates game and receives 4-digit join code
- Players join via code entry
- Real-time synchronization across all devices
- Mobile-first responsive design
- Game state management for Five Crowns rules

---

## Development Phases

### Phase 1: Project Setup & Architecture
- [x] ✅ **Decided**: XAMPP for local development, Firebase for database
- [ ] Set up Firebase project (create project in Firebase Console)
- [ ] Add Firebase config to project (get API keys and config object)
- [ ] Initialize project structure in XAMPP htdocs folder
- [ ] Choose frontend approach (vanilla JS vs framework)
- [ ] Set up version control (Git repository - optional but recommended)
- [ ] Create basic index.html with Firebase SDK included

### Phase 2: Database & Backend Design
- [ ] Design database schema for:
  - Game sessions (room codes, host info, game state)
  - Player data (connected players, hands, scores)
  - Game state (deck, discard pile, current round, turn order)
- [ ] Set up Firebase Realtime Database or Firestore
- [ ] Implement game room creation logic
- [ ] Implement 4-digit code generation system (ensure uniqueness)
- [ ] Set up real-time listeners for game state changes

### Phase 3: Lobby System
- [ ] Create "Create Game" landing page
- [ ] Build host lobby view (shows join code, connected players, start button)
- [ ] Create "Join Game" page (code entry interface)
- [ ] Build player lobby view (waiting room)
- [ ] Implement player connection/disconnection handling
- [ ] Add player ready status indicators
- [ ] Implement "Start Game" functionality (host only)

### Phase 4: Game Board UI
- [ ] Design and implement game table layout
  - Center area for deck and discard pile
  - Player hand area (bottom of screen)
  - Other players' info display
  - Current round indicator
  - Score display
- [ ] Create card component (visual representation)
- [ ] Implement responsive layout for various mobile screen sizes
- [ ] Add touch/gesture controls for card interaction
- [ ] Create animations for card dealing and movements

### Phase 5: Game Logic Implementation
- [ ] Implement Five Crowns game rules:
  - 11 rounds (3s through Kings as wild)
  - Deal cards per round (3 cards in round 1, up to 13 in round 11)
  - Draw from deck or discard pile
  - Discard after drawing
  - Go out when hand is organized into valid sets/runs
- [ ] Build card shuffling and dealing system
- [ ] Implement turn management system
- [ ] Create set/run validation logic
- [ ] Build scoring system
- [ ] Implement round progression logic
- [ ] Add game end detection and winner determination

### Phase 6: Real-time Synchronization
- [ ] Sync game state across all connected devices
- [ ] Implement turn notifications
- [ ] Handle player actions broadcasting
- [ ] Add latency compensation/optimistic updates
- [ ] Implement reconnection logic for dropped players
- [ ] Handle host migration (if host disconnects)

### Phase 7: User Experience Enhancements
- [ ] Add sound effects (optional, with mute toggle)
- [ ] Implement visual feedback for player actions
- [ ] Add chat/emote system (optional)
- [ ] Create tutorial/rules screen
- [ ] Add game history/stats tracking
- [ ] Implement leave game functionality
- [ ] Add confirm dialogs for critical actions

### Phase 8: Testing & Optimization
- [ ] Test with multiple devices simultaneously
- [ ] Test network failure scenarios
- [ ] Optimize database reads/writes for cost efficiency
- [ ] Test game logic edge cases
- [ ] Performance testing (load times, responsiveness)
- [ ] Cross-browser/device compatibility testing
- [ ] Security review (prevent cheating, code guessing)

### Phase 9: Deployment
- [ ] Set up production Firebase project (or Plesk hosting)
- [ ] Configure production environment variables
- [ ] Deploy frontend application
- [ ] Set up custom domain (if applicable)
- [ ] Configure SSL/HTTPS
- [ ] Set up database security rules
- [ ] Performance monitoring setup

### Phase 10: Post-Launch
- [ ] Monitor for bugs and crashes
- [ ] Gather user feedback
- [ ] Plan feature enhancements
- [ ] Document API/codebase for future development

---

## Technical Decisions

### ✅ Decided
1. **Development Hosting**: XAMPP local server (Apache)
2. **Database**: Firebase Realtime Database (via CDN)
3. **Production Hosting**: Firebase Hosting (migration planned for later)
4. **Frontend**: Vanilla HTML, CSS, and JavaScript (no build tools)
5. **Firebase SDK**: CDN-based (copy/paste script tags)
6. **Backend**: No PHP needed - Firebase handles everything client-side

### 🤔 Still To Decide
1. **Styling**: Tailwind CSS (via CDN), Bootstrap, or custom CSS?
2. **Card Graphics**: SVG, images, or CSS-based cards?

### Why This Stack?
- ✅ No build tools or npm - just copy/paste files
- ✅ Familiar HTML/CSS/JavaScript
- ✅ Firebase CDN scripts load instantly
- ✅ Easy to test in XAMPP (just open in browser)
- ✅ PHP not needed - Firebase does all backend work
- ✅ Easy migration to Firebase Hosting later

---

## Notes
- Keep mobile performance in mind (limited bandwidth, battery)
- Consider offline detection and graceful degradation
- Plan for scalability (concurrent games, database limits)
- Ensure Firebase security rules prevent unauthorized access
- Consider implementing session expiration for inactive games
