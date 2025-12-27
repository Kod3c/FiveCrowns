# 👑 Wandering Wilds - Multiplayer Card Game

A mobile-first, multiplayer implementation of the classic Wandering Wilds card game with real-time synchronization. Play with friends across multiple devices using a simple join code system, similar to Jackbox games.

![Wandering Wilds](https://img.shields.io/badge/Status-Active-success)
![Platform](https://img.shields.io/badge/Platform-Web-blue)
![Firebase](https://img.shields.io/badge/Firebase-Realtime%20Database-orange)

## 🎮 Features

- **Real-time Multiplayer**: Play with 2-6 players across different devices
- **Simple Join System**: Host creates a game, players join with a 4-digit code
- **Mobile-First Design**: Optimized for phones and tablets
- **Responsive UI**: Beautiful purple and gold themed interface
- **Auto-validation**: Automatic detection of valid sets and runs
- **Smart Scoring**: Intelligent grouping to minimize penalty points

## 🃏 About Wandering Wilds

Wandering Wilds is a rummy-style card game that uses a special 5-suited deck (including the unique ⭐ Stars suit!). The game features 11 rounds where the wild card changes each round, starting with 3s and ending with Kings.

### Game Rules

- **Rounds**: 11 rounds total (Round 1: deal 3 cards, Round 11: deal 13 cards)
- **Wild Cards**: Change each round (Round 1: 3s, Round 2: 4s, ... Round 11: Kings)
- **Objective**: Form all your cards into valid sets or runs
- **Sets**: 3+ cards of the same rank (different suits)
- **Runs**: 3+ consecutive cards of the same suit
- **Scoring**: Lowest total score wins (ungrouped cards count as penalty points)

## 🚀 Quick Start

### For Players

1. **Visit the game**: Navigate to the hosted URL
2. **Create or Join**:
   - **Host**: Click "Create Game" to get a join code
   - **Player**: Click "Join Game" and enter the 4-digit code
3. **Play**: Wait for the host to start, then enjoy the game!

### For Developers

#### Prerequisites

- Web server (Live Server extension for VS Code, Python's http.server, or any HTTP server)
- Firebase account (for database)
- Modern web browser

#### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd FiveCrowns
   ```

2. **Set up Firebase**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Realtime Database
   - Copy your Firebase configuration credentials
   - The project is configured to use CDN-loaded Firebase libraries (no npm required)
   - Update the `firebaseConfig` object in [js/firebase-config.js](js/firebase-config.js) with your credentials:
     ```javascript
     const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_PROJECT.firebaseapp.com",
       databaseURL: "https://YOUR_PROJECT.firebaseio.com",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT.firebasestorage.app",
       messagingSenderId: "YOUR_SENDER_ID",
       appId: "YOUR_APP_ID",
       measurementId: "YOUR_MEASUREMENT_ID"
     };
     ```

3. **Configure Firebase Database Rules**

   Set your Realtime Database rules to:
   ```json
   {
     "rules": {
       "games": {
         "$gameId": {
           ".read": true,
           ".write": true,
           ".indexOn": ["joinCode", "createdAt"]
         }
       },
       "activeCodes": {
         ".read": true,
         ".write": true
       }
     }
   }
   ```

4. **Run locally**
   - **With VS Code Live Server**: Open folder in VS Code, right-click [index.html](index.html), select "Open with Live Server"
   - **With Python**: `python -m http.server 8000` then visit `http://localhost:8000`
   - **With Node.js**: `npx http-server` or `npx serve`

5. **Deploy to Firebase Hosting** (Optional)
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   firebase deploy
   ```

## 📁 Project Structure

```
.
├── index.html              # Landing page (Create/Join game)
├── lobby.html              # Lobby/waiting room
├── game.html               # Main game board
├── css/
│   ├── style.css          # Global styles
│   ├── lobby.css          # Lobby-specific styles
│   ├── game.css           # Game board styles
│   └── card-designs.css   # Card styling and suit designs
├── js/
│   ├── firebase-config.js # Firebase configuration & initialization
│   ├── app.js             # Landing page logic
│   ├── lobby.js           # Lobby logic
│   ├── game.js            # Main game logic & state management
│   ├── cardHand.js        # Hand management & card interactions
│   ├── deckDiscard.js     # Deck and discard pile logic
│   └── settings.js        # Game settings management
├── assets/                # Images and other assets
├── docs/
│   └── design-guide.md    # Design specifications and guidelines
├── tests/                 # Test files
├── firebase.json          # Firebase hosting configuration
├── LICENSE                # MIT License
└── README.md              # This file
```

## 🛠️ Technology Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks or build tools)
- **Database**: Firebase Realtime Database
- **Firebase SDK**: Loaded via CDN (no npm required)
- **Hosting**: Firebase Hosting (or any static file host)
- **Fonts**: Google Fonts (Poppins)

## 🎨 Design

The game features a beautiful purple and gold color scheme inspired by the Wandering Wilds brand:

- **Primary Purple**: `#7B3FF2` - Main brand color
- **Royal Gold**: `#FFD700` - Accents and highlights
- **Deep Purple**: `#2D1950` - Dark backgrounds
- Mobile-first responsive design
- Touch-optimized card interactions

For detailed design specifications and card suit designs, see [docs/design-guide.md](docs/design-guide.md).

## 🔒 Security Notes

⚠️ **Important**: This project currently uses client-side Firebase configuration with publicly visible API keys. This is acceptable for Firebase web apps as Firebase security is controlled through Database Rules, not by hiding API keys.

**However**, you should:
1. Set proper Firebase Database Rules to restrict access
2. Enable Firebase App Check for production
3. Monitor usage in Firebase Console
4. Consider rate limiting for production deployments

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Test on multiple devices/browsers
- Update documentation as needed
- Keep commits focused and descriptive

## 📝 Known Issues

- Game state may desync if player loses connection during critical moments
- No spectator mode yet
- No player limit enforcement (recommended: 2-4 players for optimal experience)

## 🗺️ Roadmap

- [ ] Add sound effects and animations
- [ ] Implement player avatars
- [ ] Add chat/emoji system
- [ ] Game history and statistics
- [ ] Reconnection handling improvements
- [ ] Dark mode support
- [ ] Progressive Web App (PWA) features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Wandering Wilds is a card game by Set Enterprises, Inc.
- Inspired by Jackbox Games' lobby system
- Built with Firebase for real-time multiplayer

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation in `/docs`

---

**Enjoy playing Wandering Wilds!** 👑

Made with 💜 and ⭐
