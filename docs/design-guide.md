# Wandering Wilds Mobile - Design Guide

## Design Philosophy
Create an intuitive, visually appealing mobile card game experience that feels modern and accessible while maintaining the classic Wandering Wilds gameplay. The design should prioritize clarity, ease of use, and seamless multiplayer interaction.

---

## Core Design Goals

### 1. Mobile-First Approach
- **Primary Target**: Mobile devices (phones and tablets)
- **Orientation**: Portrait mode primary, landscape support secondary
- **Touch-Friendly**: All interactive elements minimum 44x44px tap targets
- **One-Handed Play**: Important actions accessible with thumb reach
- **Responsive**: Graceful scaling across device sizes (320px to 768px+ width)

### 2. Visual Clarity
- **Card Legibility**: Cards must be easily readable at mobile sizes
- **High Contrast**: Ensure text and important elements stand out
- **Color Accessibility**: Support for color-blind users (not relying solely on color)
- **Clear Hierarchy**: Important information prominent, secondary info subtle
- **Minimal Clutter**: Clean interface with breathing room

### 3. User Experience
- **Instant Feedback**: Immediate visual response to all user actions
- **Smooth Animations**: Polished card movements and transitions (60fps target)
- **Loading States**: Clear indicators when waiting for network/other players
- **Error Handling**: Friendly, helpful error messages
- **Progressive Disclosure**: Show complexity only when needed

### 4. Multiplayer Social Experience
- **Player Presence**: Clear indication of who's in the game and whose turn it is
- **Real-Time Updates**: Instant reflection of other players' actions
- **Turn Indicators**: Unmistakable whose turn it is currently
- **Connection Status**: Visible indicators for player connectivity
- **Waiting Feedback**: Keep players engaged during downtime

---

## Visual Design Specifications

### Color Palette
**Wandering Wilds Brand Colors:**
- **Primary Purple**: #7B3FF2 (Wandering Wilds signature brand color - logo, headers, primary buttons)
- **Deep Purple**: #5B2FB2 (darker shade for hover states, shadows)
- **Royal Gold**: #FFD700 (crown elements, stars suit, accents, winner highlights)
- **Light Purple**: #9D6FFF (backgrounds, secondary elements)

**Game Table Colors:**
- **Game Background**: Deep purple gradient (#4A2976 to #2D1950) or rich purple felt texture
- **Card Background**: Clean white (#FFFFFF)
- **Card Border**: Light gray (#E5E7EB) or subtle gold (#F3E5AB)

**UI Colors:**
- **Primary Action**: Royal Purple (#7B3FF2) - Create/Join/Start buttons
- **Secondary Action**: Gold (#FFD700) - highlighting, "Go Out" button
- **Danger/Leave**: Red (#DC2626)
- **Success**: Gold shimmer (#FFD700) for valid sets/runs
- **Error/Invalid**: Red (#EF4444) for invalid plays
- **Wild Card Highlight**: Bright gold border/glow (#FFD700)

**Suit Colors (Wandering Wilds specific):**
- **Spades**: Black (#000000)
- **Clubs**: Black (#000000)
- **Hearts**: Red (#DC2626)
- **Diamonds**: Red (#DC2626)
- **Stars** ⭐: Gold (#FFD700) - the signature 5th suit!

**Text Colors:**
- **Primary Text**: Dark purple (#2D1950) on light backgrounds, white (#FFFFFF) on purple
- **Secondary Text**: Medium purple (#7B3FF2) or gray (#6B7280)
- **Disabled Text**: Light gray (#9CA3AF)
- **Gold Accent Text**: #F59E0B (for scores, special callouts)

### Typography
- **Primary Font**: Clean, rounded sans-serif (e.g., 'Nunito', 'Quicksand', 'Poppins', or system UI)
  - Use a friendly, slightly rounded font to match the fun game aesthetic
- **Logo Font**: Bold, decorative (consider serif or display font for "Wandering Wilds" title)
- **Font Sizes**:
  - H1 (Game Title/Logo): 36-48px, bold
  - H2 (Section Headers): 24-28px, semi-bold
  - Body Text: 16-18px, regular
  - Small Text (labels): 14px, regular
  - Join Code Display: 56-64px (large, bold, monospace for readability)
- **Font Weight**: Use weight variation for hierarchy (regular 400, medium 500, semi-bold 600, bold 700)
- **Crown Icon**: Use alongside "Wandering Wilds" text (👑 or custom SVG crown in gold)

### Card Design
- **Dimensions**: Maintain standard playing card ratio (2.5:3.5 or 5:7)
- **Suits**: Five-suited deck with clear symbols:
  - ♠️ Spades (black)
  - ♥️ Hearts (red)
  - ♦️ Diamonds (red)
  - ♣️ Clubs (black)
  - ⭐ Stars (GOLD - the signature 5th suit!)
- **Numbers/Ranks**: 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K (no 2s or Aces in Wandering Wilds)
- **Wild Cards**: Special gold border/glow treatment for current round's wild card
  - Round 1: 3s are wild
  - Round 2: 4s are wild
  - ... up to Round 11: Kings are wild
- **Card Back**: Purple background with gold crown pattern or Wandering Wilds logo
- **Selected State**: Lift up with gold glow/shadow or purple border highlight

### Layout Components

#### Landing/Home Screen
```
┌─────────────────────────┐
│    Wandering Wilds Logo     │
│                         │
│  ┌───────────────────┐  │
│  │   Create Game     │  │ (Large primary button)
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │    Join Game      │  │ (Large secondary button)
│  └───────────────────┘  │
│                         │
│      How to Play        │ (Link)
└─────────────────────────┘
```

#### Lobby Screen (Host View)
```
┌─────────────────────────┐
│  ← Back        Waiting   │ (Header)
│                         │
│    Join Code: XXXX      │ (Large, prominent)
│     (tap to copy)       │
│                         │
│  Players (2/4):         │
│  ┌─────────────────┐    │
│  │ 👤 Player 1     │    │ (Host indicator)
│  │ 👤 Player 2     │    │
│  └─────────────────┘    │
│                         │
│  ┌───────────────────┐  │
│  │   Start Game      │  │ (Enabled when 2+ players)
│  └───────────────────┘  │
└─────────────────────────┘
```

#### Game Board Screen
```
┌─────────────────────────┐
│ Round 5 | Your Turn ⭐   │ (Game status bar)
│  [P1:10] [P2:15] [You]  │ (Score summary)
├─────────────────────────┤
│                         │
│  Other Players' Info    │ (Compact display)
│  👤 P1: 7 cards         │
│                         │
│    ┌─────┐  ┌─────┐     │
│    │ 🂠  │  │  9♥ │     │ (Deck & Discard)
│    │Deck │  │     │     │
│    └─────┘  └─────┘     │
│                         │
│                         │
├─────────────────────────┤
│   Your Hand (9 cards)   │
│ ┌──┬──┬──┬──┬──┬──┐     │
│ │4♠││7♥││7♦││9♣││Q││... │ (Scrollable)
│ └──┴──┴──┴──┴──┴──┘     │
│ [Draw] [Discard] [Out]  │ (Action buttons)
└─────────────────────────┘
```

### Animation & Transitions
- **Card Dealing**: Smooth slide-in from deck position (~300ms)
- **Card Selection**: Slight lift/scale (transform: translateY(-10px))
- **Turn Changes**: Gentle pulse or color shift on turn indicator
- **Player Join/Leave**: Fade in/out (~200ms)
- **Page Transitions**: Slide or fade (~250ms)
- **Button Press**: Quick scale down (transform: scale(0.95), ~100ms)

### Spacing & Grid
- **Base Unit**: 4px or 8px (use multiples for consistency)
- **Padding**: 16px (mobile), 24px (tablet)
- **Margins**: 8px (tight), 16px (normal), 24px (loose)
- **Card Spacing**: 4-8px overlap for hand display (to save space)
- **Button Heights**: 48-56px (comfortable tap target)

---

## Interaction Patterns

### Card Interactions
1. **Selecting Cards**: Tap to select, tap again to deselect (visual feedback)
2. **Drawing Cards**: Tap deck or discard pile
3. **Discarding**: Select card, then tap "Discard" button OR drag to discard area
4. **Going Out**: "Go Out" button appears when you have valid sets/runs
5. **Organizing Hand**: Optional drag-and-drop to reorder cards

### Lobby Interactions
1. **Copy Join Code**: Tap code to copy to clipboard (with confirmation toast)
2. **Join Game**: Input field with numeric keyboard for 4-digit code
3. **Start Game**: Large button (disabled/enabled states)
4. **Leave Lobby**: Confirmation dialog before leaving

### Game Flow
1. **Turn Start**: Clear indicator when it's your turn (notification/vibration optional)
2. **Draw Phase**: Player draws from deck or discard
3. **Discard Phase**: Player selects and discards a card
4. **Going Out**: Player declares sets/runs and goes out
5. **Round End**: Score display, continue to next round
6. **Game End**: Final scores, winner celebration

---

## Accessibility Considerations
- **Screen Reader Support**: Semantic HTML, ARIA labels where needed
- **Keyboard Navigation**: Support for external keyboards (tab navigation)
- **Focus Indicators**: Clear focus states for all interactive elements
- **Motion Preferences**: Respect `prefers-reduced-motion` for animations
- **Text Scaling**: Support system font size preferences
- **High Contrast Mode**: Ensure compatibility with system high contrast settings

---

## Performance Goals
- **Initial Load**: < 3 seconds on 3G connection
- **Time to Interactive**: < 5 seconds
- **Smooth Animations**: 60fps (or graceful degradation)
- **Bundle Size**: < 500KB initial JavaScript (with code splitting)
- **Database Latency**: < 500ms for game actions to reflect across devices

---

## Platform-Specific Considerations

### iOS
- Safe area insets for notched devices
- Native-feeling scroll behavior
- Haptic feedback for key actions (optional)

### Android
- Material Design principles where applicable
- Back button handling
- Various screen sizes and aspect ratios

### Progressive Web App (PWA)
- Add to Home Screen prompt
- Offline fallback screen
- Service worker for caching assets
- App manifest for icon and theme color

---

## Future Design Enhancements
- Dark mode support
- Custom themes or table felt colors
- Avatar selection for players
- Animated card shuffle
- Confetti or celebration animations for winning
- Sound effects toggle (with mute option)
- Chat or quick emotes between players
- Game statistics and history visualization

---

## Design Tools & Assets Needed
- **Card Graphics**: SVG or high-res PNG card faces
- **Icons**: UI icons (menu, close, copy, etc.)
- **Logo**: Wandering Wilds game logo/branding
- **Background Textures**: Card table felt texture
- **Sound Effects** (optional): Card flip, shuffle, win/lose sounds

---

## Reference & Inspiration
- **Jackbox Games**: Lobby system, join code UX
- **Traditional Card Games**: Familiar card game aesthetics
- **Modern Mobile Games**: Smooth animations, touch interactions
- **Card Game Apps**: Solitaire, poker apps for card layout ideas
