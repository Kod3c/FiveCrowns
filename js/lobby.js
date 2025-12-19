// Five Crowns - Lobby Page JavaScript
// Handles real-time player management, game settings, and game start

console.log('🏠 LOBBY.JS LOADED - You are on lobby.html');

// Modal Helper Function
function showErrorModal(message, details = null) {
    const errorModal = document.getElementById('errorModal');
    const errorMessage = document.getElementById('errorMessage');
    const errorDetails = document.getElementById('errorDetails');
    const errorOkBtn = document.getElementById('errorOkBtn');

    errorMessage.textContent = message;

    if (details) {
        errorDetails.textContent = details;
        errorDetails.style.display = 'block';
    } else {
        errorDetails.style.display = 'none';
    }

    errorModal.classList.add('active');

    const closeModal = () => {
        errorModal.classList.remove('active');
    };

    errorOkBtn.onclick = closeModal;
}

// Get game code from URL
const urlParams = new URLSearchParams(window.location.search);
const gameCode = urlParams.get('code');
const playerId = sessionStorage.getItem('playerId');

// Check if we have valid game info
if (!gameCode || !playerId) {
    console.error('Missing game code or player ID');
    showErrorModal('Invalid game session. Returning to home.');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 2000);
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
const highlightWildsSelect = document.getElementById('highlightWilds');
const startGameBtn = document.getElementById('startGameBtn');
const leaveBtn = document.getElementById('leaveBtn');
const waitingMessage = document.getElementById('waitingMessage');

// Leave Modal Elements
const leaveModal = document.getElementById('leaveModal');
const hostWarning = document.getElementById('hostWarning');
const cancelLeaveBtn = document.getElementById('cancelLeaveBtn');
const confirmLeaveBtn = document.getElementById('confirmLeaveBtn');

// Error Modal Elements
const errorModal = document.getElementById('errorModal');
const errorMessage = document.getElementById('errorMessage');
const errorDetails = document.getElementById('errorDetails');
const errorOkBtn = document.getElementById('errorOkBtn');

// Firebase References
const gameRef = database.ref('games/' + gameCode);
const playersRef = gameRef.child('players');
const playerRef = playersRef.child(playerId);

// Local State
let currentGameData = null;
let isHost = false;
let maxPlayers = 6;
let isGameStarting = false; // Flag to prevent disconnect handlers from being re-registered during game start

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
    backBtn?.addEventListener('click', handleBack);
    copyCodeBtn?.addEventListener('click', copyGameCode);
    codeValue?.addEventListener('click', copyGameCode);
    highlightWildsSelect?.addEventListener('change', handleHighlightWildsChange);
    startGameBtn?.addEventListener('click', handleStartGame);
    leaveBtn?.addEventListener('click', showLeaveModal);
    cancelLeaveBtn?.addEventListener('click', hideLeaveModal);
    confirmLeaveBtn?.addEventListener('click', handleLeaveGame);
    errorOkBtn?.addEventListener('click', hideErrorModal);

    // Close modal when clicking outside
    leaveModal?.addEventListener('click', (e) => {
        if (e.target === leaveModal) {
            hideLeaveModal();
        }
    });

    errorModal?.addEventListener('click', (e) => {
        if (e.target === errorModal) {
            hideErrorModal();
        }
    });
}

/**
 * Listen to real-time game data changes
 */
function listenToGameChanges() {
    console.log('Setting up listener for game:', gameCode);
    console.log('Full game path:', 'games/' + gameCode);

    gameRef.on('value', (snapshot) => {
        console.log('Game snapshot received, exists?', snapshot.exists());

        if (!snapshot.exists()) {
            console.error('❌ Game not found in Firebase');
            console.error('Checking path: games/' + gameCode);
            console.error('Session playerId:', sessionStorage.getItem('playerId'));
            console.error('Session gameCode:', sessionStorage.getItem('gameCode'));
            console.error('URL gameCode:', gameCode);

            // Double-check by trying to read directly
            database.ref('games').once('value').then(allGames => {
                const allGameCodes = Object.keys(allGames.val() || {});
                console.error('All games in database:', allGameCodes);
                console.error('Looking for game code:', gameCode);

                // Show error modal with details
                const details = {
                    'Game Code': gameCode,
                    'Session Game Code': sessionStorage.getItem('gameCode'),
                    'Player ID': sessionStorage.getItem('playerId'),
                    'All Games': allGameCodes.join(', ') || 'None'
                };
                showErrorModal('Game no longer exists', details);
            });
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
            // CRITICAL: Set flag to prevent setupDisconnectHandler from re-registering handlers
            isGameStarting = true;

            // CRITICAL: Cancel disconnect handlers to prevent game deletion on redirect
            Promise.all([
                gameRef.onDisconnect().cancel(),
                playerRef.onDisconnect().cancel()
            ]).then(() => {
                // Wait a moment for game state to be fully written
                return new Promise(resolve => setTimeout(resolve, 300));
            }).then(() => {
                window.location.href = 'game.html?code=' + gameCode;
            }).catch((error) => {
                console.error('Error cancelling disconnect handlers:', error);
                window.location.href = 'game.html?code=' + gameCode;
            });
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
        showErrorModal('Code: ' + text);
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

    // CRITICAL: Set flag to prevent setupDisconnectHandler from re-registering handlers
    isGameStarting = true;

    const players = currentGameData.players || {};
    const playerCountNum = Object.values(players).length;

    if (playerCountNum < 2) {
        showErrorModal('Need at least 2 players to start the game!');
        isGameStarting = false; // Reset flag
        return;
    }

    // Create and shuffle deck
    console.log('Creating Five Crowns deck...');
    const deck = createFiveCrownsDeck();
    let shuffledDeck = shuffleDeck(deck);
    console.log('Deck created and shuffled:', shuffledDeck.length, 'cards');

    // Get player IDs
    const playerIds = Object.keys(players);

    // Initialize game state
    const gameState = {
        currentRound: 1,
        currentPlayer: null, // Will be set after dealing
        deck: shuffledDeck,
        discardPile: [],
        playerHands: {},
        playerScores: {},
        roundScores: {},
        firstPlayerOut: null, // Track who went out first
        playersRemaining: [], // Track players who still need their final turn after someone goes out
        playerIds: playerIds, // Store player IDs in gameState for reference
        playerNames: {} // Store player names for easy access during gameplay
    };

    // Initialize player scores and names
    playerIds.forEach(playerId => {
        gameState.playerScores[playerId] = 0;
        gameState.playerNames[playerId] = players[playerId]?.name || `Player ${playerId.substring(0, 4)}`;
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

    // Set first player (random for round 1)
    const randomIndex = Math.floor(Math.random() * playerIds.length);
    gameState.currentPlayer = playerIds[randomIndex];
    gameState.firstPlayerThisRound = playerIds[randomIndex]; // Track for rotation
    console.log('First player (randomly selected):', gameState.currentPlayer);

    // Set initial turn phase
    gameState.turnPhase = 'WAITING_FOR_DRAW';
    console.log('Initial turn phase:', gameState.turnPhase);

    // CRITICAL: Cancel disconnect handlers BEFORE changing status
    // Otherwise, when we redirect to game.html, Firebase will delete the game!
    Promise.all([
        gameRef.onDisconnect().cancel(),
        playerRef.onDisconnect().cancel()
    ]).then(() => {
        // Update game status and game state (keep players object intact)
        const updateData = {
            status: 'playing',
            startedAt: firebase.database.ServerValue.TIMESTAMP,
            gameState: gameState
            // Note: players object is NOT modified here, so it persists from lobby
        };

        return gameRef.update(updateData);
    })
    .then(() => {
        console.log('Game started successfully!');
        // The listener will automatically redirect all players
    })
    .catch((error) => {
        console.error('Error starting game:', error);
        showErrorModal('Failed to start game: ' + error.message);
    });
}

/**
 * Create a Five Crowns deck
 * Five Crowns has 116 cards total:
 * - 5 suits (spades, hearts, diamonds, clubs, stars) × 11 ranks (3-K) × 2 copies = 110 cards
 * - 6 Jokers (always wild, worth 50 points each)
 * Total: 116 cards
 */
function createFiveCrownsDeck() {
    const suits = ['spades', 'hearts', 'diamonds', 'clubs', 'stars'];
    const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck = [];

    // Add regular cards (2 copies of each)
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

    // Add 6 Jokers (always wild, worth 50 points)
    for (let i = 0; i < 6; i++) {
        deck.push({
            rank: 'Joker',
            suit: 'joker',  // Special suit for jokers
            id: `joker-${i}`
        });
    }

    console.log('Created Five Crowns deck with', deck.length, 'cards (110 regular + 6 jokers)');
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
 * Show error modal
 */
function showErrorModal(message, details = null) {
    errorMessage.textContent = message;

    if (details) {
        let detailsHtml = '';
        for (const [key, value] of Object.entries(details)) {
            detailsHtml += `<strong>${key}:</strong> ${value}<br>`;
        }
        errorDetails.innerHTML = detailsHtml;
        errorDetails.style.display = 'block';
    } else {
        errorDetails.style.display = 'none';
    }

    errorModal.classList.add('active');
}

/**
 * Hide error modal
 */
function hideErrorModal() {
    errorModal.classList.remove('active');
    // Redirect to home after closing
    window.location.href = 'index.html';
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
                showErrorModal('Error leaving game. Please try again.');
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
                showErrorModal('Error leaving game. Please try again.');
            });
    }
}

/**
 * Set up disconnect handler
 */
function setupDisconnectHandler() {
    // Only remove players on disconnect if the game is still in waiting state
    // This allows players to rejoin if they disconnect during an active game
    gameRef.once('value').then((snapshot) => {
        // CRITICAL: Check if game is starting - if so, don't register disconnect handlers
        // This prevents a race condition where handlers are registered after being cancelled
        if (isGameStarting) {
            return;
        }

        if (snapshot.exists()) {
            const gameData = snapshot.val();

            // Only set up auto-removal if game is still in waiting state
            if (gameData.status === 'waiting') {
                playerRef.onDisconnect().remove();

                // If host disconnects, delete the entire game
                if (isHost) {
                    gameRef.onDisconnect().remove();
                }
            }
            // If game has started, don't auto-remove players on disconnect
            // They can rejoin using their original name and game code
        }
    });
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
