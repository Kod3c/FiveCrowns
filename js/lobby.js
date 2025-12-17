// Five Crowns - Lobby Page JavaScript
// Handles real-time player management, game settings, and game start

console.log('Lobby page loaded!');

// Get game code from URL
const urlParams = new URLSearchParams(window.location.search);
const gameCode = urlParams.get('code');
const playerId = sessionStorage.getItem('playerId');

// Check if we have valid game info
if (!gameCode || !playerId) {
    console.error('Missing game code or player ID');
    alert('Invalid game session. Returning to home.');
    window.location.href = 'index.html';
}

// DOM Elements
const backBtn = document.getElementById('backBtn');
const statusIndicator = document.getElementById('statusIndicator');
const codeValue = document.getElementById('codeValue');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const copyToast = document.getElementById('copyToast');
const joinUrl = document.getElementById('joinUrl');
const playerCount = document.getElementById('playerCount');
const playersList = document.getElementById('playersList');
const settingsSection = document.getElementById('settingsSection');
const maxPlayersSelect = document.getElementById('maxPlayers');
const highlightWildsSelect = document.getElementById('highlightWilds');
const startGameBtn = document.getElementById('startGameBtn');
const leaveBtn = document.getElementById('leaveBtn');
const waitingMessage = document.getElementById('waitingMessage');

// Leave Modal Elements
const leaveModal = document.getElementById('leaveModal');
const hostWarning = document.getElementById('hostWarning');
const cancelLeaveBtn = document.getElementById('cancelLeaveBtn');
const confirmLeaveBtn = document.getElementById('confirmLeaveBtn');

// Firebase References
const gameRef = database.ref('games/' + gameCode);
const playersRef = gameRef.child('players');
const playerRef = playersRef.child(playerId);

// Local State
let currentGameData = null;
let isHost = false;
let maxPlayers = 6;

// Initialize
init();

function init() {
    console.log('Initializing lobby for game:', gameCode, 'Player:', playerId);

    // Display game code
    codeValue.textContent = gameCode;
    joinUrl.textContent = window.location.origin + window.location.pathname.replace('lobby.html', '');

    // Set up event listeners
    setupEventListeners();

    // Listen for game data changes
    listenToGameChanges();

    // Handle player disconnect on page close
    setupDisconnectHandler();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    backBtn.addEventListener('click', handleBack);
    copyCodeBtn.addEventListener('click', copyGameCode);
    codeValue.addEventListener('click', copyGameCode);
    maxPlayersSelect.addEventListener('change', handleMaxPlayersChange);
    highlightWildsSelect.addEventListener('change', handleHighlightWildsChange);
    startGameBtn.addEventListener('click', handleStartGame);
    leaveBtn.addEventListener('click', showLeaveModal);
    cancelLeaveBtn.addEventListener('click', hideLeaveModal);
    confirmLeaveBtn.addEventListener('click', handleLeaveGame);

    // Close modal when clicking outside
    leaveModal.addEventListener('click', (e) => {
        if (e.target === leaveModal) {
            hideLeaveModal();
        }
    });
}

/**
 * Listen to real-time game data changes
 */
function listenToGameChanges() {
    gameRef.on('value', (snapshot) => {
        if (!snapshot.exists()) {
            console.error('Game not found');
            alert('Game no longer exists. Returning to home.');
            window.location.href = 'index.html';
            return;
        }

        currentGameData = snapshot.val();
        console.log('Game data updated:', currentGameData);

        // Check if we're the host
        isHost = (currentGameData.host === playerId);

        // Update UI based on game data
        updateUI();

        // Check if game has started
        if (currentGameData.status === 'playing') {
            console.log('Game is starting!');
            // Redirect to game page
            window.location.href = 'game.html?code=' + gameCode;
        }
    });
}

/**
 * Update UI based on game data
 */
function updateUI() {
    const players = currentGameData.players || {};
    const playerArray = Object.values(players);
    const playerCountNum = playerArray.length;

    // Update player count
    playerCount.textContent = `(${playerCountNum}/${maxPlayers})`;

    // Update players list
    updatePlayersList(playerArray);

    // Show/hide elements based on whether user is host
    if (isHost) {
        settingsSection.style.display = 'block';
        startGameBtn.style.display = 'flex';
        waitingMessage.style.display = 'none';

        // Enable start button if at least 2 players
        startGameBtn.disabled = playerCountNum < 2;

        // Update max players from game data
        if (currentGameData.maxPlayers) {
            maxPlayers = currentGameData.maxPlayers;
            maxPlayersSelect.value = maxPlayers;
        }

        // Update highlight wilds from game data
        if (currentGameData.highlightWilds !== undefined) {
            highlightWildsSelect.value = currentGameData.highlightWilds.toString();
        }
    } else {
        settingsSection.style.display = 'none';
        startGameBtn.style.display = 'none';
        waitingMessage.style.display = 'block';
    }
}

/**
 * Update the players list display
 */
function updatePlayersList(players) {
    // Clear current list
    playersList.innerHTML = '';

    // Sort players: host first, then by join time
    players.sort((a, b) => {
        if (a.isHost) return -1;
        if (b.isHost) return 1;
        return (a.joinedAt || 0) - (b.joinedAt || 0);
    });

    // Create player cards
    players.forEach((player) => {
        const playerCard = createPlayerCard(player);
        playersList.appendChild(playerCard);
    });
}

/**
 * Create a player card element
 */
function createPlayerCard(player) {
    const card = document.createElement('div');
    card.className = 'player-card';

    // Add special classes
    if (player.isHost) {
        card.classList.add('host');
    }
    if (player.isReady) {
        card.classList.add('ready');
    }

    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'player-avatar';
    avatar.textContent = player.isHost ? '👑' : '👤';

    // Info container
    const info = document.createElement('div');
    info.className = 'player-info';

    // Name
    const name = document.createElement('span');
    name.className = 'player-name';
    name.textContent = player.name || 'Player';

    // Badges
    const badges = document.createElement('div');
    badges.className = 'player-badges';

    if (player.isHost) {
        const hostBadge = document.createElement('span');
        hostBadge.className = 'badge host';
        hostBadge.textContent = 'Host';
        badges.appendChild(hostBadge);
    }

    if (!player.isHost) {
        const readyBadge = document.createElement('span');
        readyBadge.className = player.isReady ? 'badge ready' : 'badge waiting';
        readyBadge.textContent = player.isReady ? 'Ready' : 'Not Ready';
        badges.appendChild(readyBadge);
    }

    // Assemble card
    info.appendChild(name);
    info.appendChild(badges);
    card.appendChild(avatar);
    card.appendChild(info);

    return card;
}

/**
 * Copy game code to clipboard
 */
function copyGameCode() {
    const code = gameCode;

    // Try using modern clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code)
            .then(() => {
                showCopyToast();
            })
            .catch((err) => {
                console.error('Failed to copy:', err);
                fallbackCopy(code);
            });
    } else {
        fallbackCopy(code);
    }
}

/**
 * Fallback copy method for older browsers
 */
function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
        document.execCommand('copy');
        showCopyToast();
    } catch (err) {
        console.error('Fallback copy failed:', err);
        alert('Code: ' + text);
    }

    document.body.removeChild(textArea);
}

/**
 * Show copy confirmation toast
 */
function showCopyToast() {
    copyToast.classList.add('show');
    setTimeout(() => {
        copyToast.classList.remove('show');
    }, 2000);
}

/**
 * Handle max players change (host only)
 */
function handleMaxPlayersChange(e) {
    const newMax = parseInt(e.target.value);
    maxPlayers = newMax;

    // Update in Firebase
    gameRef.update({
        maxPlayers: newMax
    });

    console.log('Max players updated to:', newMax);
}

/**
 * Handle highlight wilds change (host only)
 */
function handleHighlightWildsChange(e) {
    const highlightWilds = e.target.value === 'true';

    // Update in Firebase
    gameRef.update({
        highlightWilds: highlightWilds
    });

    console.log('Highlight wilds updated to:', highlightWilds);
}

/**
 * Handle start game (host only)
 */
function handleStartGame() {
    console.log('Starting game...');

    const players = currentGameData.players || {};
    const playerCountNum = Object.values(players).length;

    if (playerCountNum < 2) {
        alert('Need at least 2 players to start the game!');
        return;
    }

    // Create and shuffle deck
    console.log('Creating Five Crowns deck...');
    const deck = createFiveCrownsDeck();
    let shuffledDeck = shuffleDeck(deck);
    console.log('Deck created and shuffled:', shuffledDeck.length, 'cards');

    // Initialize game state
    const gameState = {
        currentRound: 1,
        currentPlayer: null, // Will be set after dealing
        deck: shuffledDeck,
        discardPile: [],
        playerHands: {},
        playerScores: {},
        roundScores: {}
    };

    // Initialize player scores
    const playerIds = Object.keys(players);
    playerIds.forEach(playerId => {
        gameState.playerScores[playerId] = 0;
    });

    // Deal cards for Round 1 (3 cards per player)
    console.log('Dealing 3 cards to each player...');
    const cardsPerPlayer = 3; // Round 1 = 3 cards

    playerIds.forEach(playerId => {
        const hand = [];
        for (let i = 0; i < cardsPerPlayer; i++) {
            if (shuffledDeck.length > 0) {
                hand.push(shuffledDeck.pop());
            }
        }
        gameState.playerHands[playerId] = hand;
        console.log(`Dealt ${hand.length} cards to player ${playerId}`);
    });

    // Flip one card to start the discard pile
    if (shuffledDeck.length > 0) {
        gameState.discardPile.push(shuffledDeck.pop());
        console.log('Starting discard pile with:', gameState.discardPile[0]);
    }

    // Update deck in game state
    gameState.deck = shuffledDeck;
    console.log('Cards remaining in deck:', gameState.deck.length);

    // Set first player (host goes first)
    gameState.currentPlayer = currentGameData.host;
    console.log('First player:', gameState.currentPlayer);

    // Update game status and game state
    gameRef.update({
        status: 'playing',
        startedAt: firebase.database.ServerValue.TIMESTAMP,
        gameState: gameState
    })
    .then(() => {
        console.log('Game started successfully with dealt cards!');
        // The listener will automatically redirect all players
    })
    .catch((error) => {
        console.error('Error starting game:', error);
        alert('Failed to start game. Please try again.');
    });
}

/**
 * Create a Five Crowns deck
 * Five Crowns has 116 cards:
 * - 5 suits: Spades, Hearts, Diamonds, Clubs, Stars
 * - Ranks: 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K (no 2s or Aces)
 * - 2 copies of each card (58 unique cards x 2 = 116 total)
 */
function createFiveCrownsDeck() {
    const suits = ['spades', 'hearts', 'diamonds', 'clubs', 'stars'];
    const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck = [];

    // Create 2 copies of each card
    for (let copy = 0; copy < 2; copy++) {
        for (const suit of suits) {
            for (const rank of ranks) {
                deck.push({
                    rank: rank,
                    suit: suit,
                    id: `${rank}-${suit}-${copy}`
                });
            }
        }
    }

    console.log('Created Five Crowns deck with', deck.length, 'cards');
    return deck;
}

/**
 * Shuffle a deck using Fisher-Yates algorithm
 */
function shuffleDeck(deck) {
    const shuffled = [...deck]; // Create a copy

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

/**
 * Handle back button
 */
function handleBack() {
    showLeaveModal();
}

/**
 * Show leave confirmation modal
 */
function showLeaveModal() {
    if (isHost) {
        hostWarning.style.display = 'block';
    } else {
        hostWarning.style.display = 'none';
    }
    leaveModal.classList.add('active');
}

/**
 * Hide leave modal
 */
function hideLeaveModal() {
    leaveModal.classList.remove('active');
}

/**
 * Handle leave game
 */
function handleLeaveGame() {
    console.log('Leaving game...');

    if (isHost) {
        // Host leaving - delete entire game
        gameRef.remove()
            .then(() => {
                console.log('Game deleted');
                cleanup();
                window.location.href = 'index.html';
            })
            .catch((error) => {
                console.error('Error deleting game:', error);
                alert('Error leaving game. Please try again.');
            });
    } else {
        // Player leaving - remove from players list
        playerRef.remove()
            .then(() => {
                console.log('Player removed from game');
                cleanup();
                window.location.href = 'index.html';
            })
            .catch((error) => {
                console.error('Error leaving game:', error);
                alert('Error leaving game. Please try again.');
            });
    }
}

/**
 * Set up disconnect handler
 */
function setupDisconnectHandler() {
    // When player disconnects (closes browser/tab), remove them from game
    playerRef.onDisconnect().remove();

    // If host disconnects, delete the entire game
    if (isHost) {
        gameRef.onDisconnect().remove();
    }
}

/**
 * Cleanup function
 */
function cleanup() {
    // Remove Firebase listeners
    gameRef.off();
    playersRef.off();
    playerRef.off();

    // Clear session storage
    sessionStorage.removeItem('playerId');
    sessionStorage.removeItem('gameCode');
}

console.log('Lobby initialized successfully!');
