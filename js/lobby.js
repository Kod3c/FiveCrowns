// Five Crowns - Lobby Page JavaScript
// Handles real-time player management, game settings, and game start

console.log('🏠 LOBBY.JS LOADED - You are on lobby.html');

// Helper Functions
/**
 * Format phone number for display (last 10 digits only)
 * @param {string} phoneNumber - E.164 format phone number
 * @returns {string} Formatted phone number
 */
function formatPhoneNumberForDisplay(phoneNumber) {
    if (!phoneNumber) return 'Unknown';

    // Extract just the digits from the phone number
    const digits = phoneNumber.replace(/\D/g, '');

    // Get the last 10 digits
    if (digits.length >= 10) {
        const last10 = digits.slice(-10);
        return `(${last10.substring(0, 3)}) ${last10.substring(3, 6)}-${last10.substring(6)}`;
    }

    // Fallback if less than 10 digits
    return phoneNumber;
}

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

// CRITICAL DEBUG: Log auth state immediately
console.log('=== LOBBY LOADED ===');
console.log('Game Code:', gameCode);
console.log('Player ID:', playerId);
console.log('Auth object available:', typeof auth !== 'undefined');
console.log('Auth currentUser (immediate):', auth?.currentUser ? auth.currentUser.uid : 'NULL - Auth not ready yet');

// Wait a moment and check again
setTimeout(() => {
    console.log('Auth currentUser (after 100ms):', auth?.currentUser ? auth.currentUser.uid : 'NULL');
}, 100);

setTimeout(() => {
    console.log('Auth currentUser (after 500ms):', auth?.currentUser ? auth.currentUser.uid : 'NULL');
}, 500);

// DOM Elements
const backBtn = document.getElementById('backBtn');
const statusIndicator = document.getElementById('statusIndicator');
const codeValue = document.getElementById('codeValue');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const copyToast = document.getElementById('copyToast');
const joinLinkValue = document.getElementById('joinLinkValue');
const copyLinkBtn = document.getElementById('copyLinkBtn');
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
let disconnectHandlerSetup = false; // Flag to ensure we only set up disconnect handler once

// Initialize
init();

function init() {
    console.log('Initializing lobby for game:', gameCode, 'Player:', playerId);

    // Display game code
    codeValue.textContent = gameCode;

    // Generate and display join link
    const baseUrl = window.location.origin;
    const joinLink = `${baseUrl}?join=${gameCode}`;
    joinLinkValue.textContent = joinLink;

    // Set up event listeners
    setupEventListeners();

    // Listen for game data changes
    listenToGameChanges();

    // CRITICAL: Wait for auth to initialize before setting up disconnect handler
    // This ensures auth.currentUser is populated if user is logged in
    // NOTE: onAuthStateChanged fires TWICE - once with null, then with user
    // We need to wait for both callbacks before deciding
    let authCheckCount = 0;
    auth.onAuthStateChanged(async (user) => {
        authCheckCount++;
        console.log(`Auth state change #${authCheckCount} in lobby, user:`, user ? user.uid : 'none');

        // If user is authenticated, sync their name from Firestore
        if (user) {
            try {
                const firstName = await getUserFirstName(user.uid);
                const oldName = sessionStorage.getItem('playerName');

                console.log('Checking player name - Firestore:', firstName, 'Session:', oldName);

                if (firstName && firstName !== 'Player' && firstName !== oldName) {
                    console.log(`Updating player name from "${oldName}" to "${firstName}"`);

                    // Update sessionStorage
                    sessionStorage.setItem('playerName', firstName);

                    // Update player name in Firebase game
                    const gameCode = sessionStorage.getItem('gameCode');
                    const playerId = sessionStorage.getItem('playerId');

                    if (gameCode && playerId) {
                        const gameRef = database.ref(`games/${gameCode}`);
                        const snapshot = await gameRef.once('value');
                        const gameData = snapshot.val();

                        if (gameData && gameData.players && gameData.players[playerId]) {
                            // Update player name in lobby
                            await gameRef.child(`players/${playerId}/name`).set(firstName);
                            console.log('Player name updated in Firebase game');
                        }
                    }
                }
            } catch (error) {
                console.error('Error syncing player name:', error);
            }
        }

        // Only set up disconnect handler after second callback (or after 500ms timeout)
        // This gives auth time to restore the session
        if (!disconnectHandlerSetup) {
            setTimeout(() => {
                if (!disconnectHandlerSetup) {
                    disconnectHandlerSetup = true;
                    setupDisconnectHandler();
                }
            }, 500);
        }
    });
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    backBtn?.addEventListener('click', handleBack);
    copyCodeBtn?.addEventListener('click', copyGameCode);
    codeValue?.addEventListener('click', copyGameCode);
    copyLinkBtn?.addEventListener('click', copyJoinLink);
    joinLinkValue?.addEventListener('click', copyJoinLink);
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

        // Check and show invite button
        checkAndShowInviteButton();

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
                // Update active game status to 'playing'
                return saveActiveGame(gameCode, 'playing');
            }).then(() => {
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
        const statusBadge = document.createElement('span');

        if (player.isInvited) {
            // Invited player - not yet accepted
            statusBadge.className = 'badge invited';
            statusBadge.textContent = 'Invited';
        } else if (player.isReady) {
            // Ready player
            statusBadge.className = 'badge ready';
            statusBadge.textContent = 'Ready';
        } else {
            // Not ready player
            statusBadge.className = 'badge waiting';
            statusBadge.textContent = 'Not Ready';
        }

        badges.appendChild(statusBadge);
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
                showCopyToast('Code copied! 📋');
            })
            .catch((err) => {
                console.error('Failed to copy:', err);
                fallbackCopy(code, 'Code copied! 📋');
            });
    } else {
        fallbackCopy(code, 'Code copied! 📋');
    }
}

/**
 * Copy join link to clipboard
 */
function copyJoinLink() {
    const baseUrl = window.location.origin;
    const joinLink = `${baseUrl}?join=${gameCode}`;

    // Try using modern clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(joinLink)
            .then(() => {
                showCopyToast('Link copied! 🔗');
            })
            .catch((err) => {
                console.error('Failed to copy:', err);
                fallbackCopy(joinLink, 'Link copied! 🔗');
            });
    } else {
        fallbackCopy(joinLink, 'Link copied! 🔗');
    }
}

/**
 * Fallback copy method for older browsers
 */
function fallbackCopy(text, message) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
        document.execCommand('copy');
        showCopyToast(message);
    } catch (err) {
        console.error('Fallback copy failed:', err);
        showErrorModal('Could not copy. Value: ' + text);
    }

    document.body.removeChild(textArea);
}

/**
 * Show copy confirmation toast
 */
function showCopyToast(message = 'Copied! 📋') {
    copyToast.textContent = message;
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
 * Handle back button - return to main menu without leaving game
 */
async function handleBack() {
    // Save current game to active games list before returning
    await saveActiveGame(gameCode, currentGameData?.status || 'waiting');

    // Return to index.html
    // Game remains in active games list for easy rejoin
    window.location.href = 'index.html';
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
                // Note: Game will be cleaned up from activeGames list automatically
                // when user loads index.html (stale game cleanup)
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
                // Note: Game remains in activeGames list so player can rejoin later
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
    // Check if user is authenticated - if so, don't set up disconnect handlers
    // Authenticated users can rejoin their games, so we don't want to auto-delete
    const user = auth.currentUser;
    console.log('setupDisconnectHandler called, user:', user ? user.uid : 'NOT AUTHENTICATED');

    if (user) {
        console.log('✅ User is authenticated, SKIPPING disconnect handler (game will persist)');
        return;
    }

    console.log('⚠️ No user authenticated, setting up disconnect handler (game will be deleted on disconnect)');

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

// ======================
// Notification & Confirmation Modals
// ======================

const notificationModal = document.getElementById('notificationModal');
const notificationTitle = document.getElementById('notificationTitle');
const notificationMessage = document.getElementById('notificationMessage');
const notificationOkBtn = document.getElementById('notificationOkBtn');

const confirmModal = document.getElementById('confirmModal');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const confirmOkBtn = document.getElementById('confirmOkBtn');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');

let confirmResolve = null;

/**
 * Show notification modal (replaces alert)
 */
function showNotification(message, title = 'Success', icon = '✓') {
    notificationTitle.textContent = `${icon} ${title}`;
    notificationMessage.textContent = message;
    notificationModal.classList.add('active');
}

/**
 * Hide notification modal
 */
function hideNotification() {
    notificationModal.classList.remove('active');
}

/**
 * Show confirmation modal (replaces confirm)
 */
function showConfirm(message, title = 'Confirm Action') {
    return new Promise((resolve) => {
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        confirmModal.classList.add('active');
        confirmResolve = resolve;
    });
}

/**
 * Hide confirmation modal
 */
function hideConfirm() {
    confirmModal.classList.remove('active');
}

// Notification modal event listeners
if (notificationOkBtn) {
    notificationOkBtn.addEventListener('click', hideNotification);
}

if (notificationModal) {
    notificationModal.addEventListener('click', (e) => {
        if (e.target === notificationModal) {
            hideNotification();
        }
    });
}

// Confirmation modal event listeners
if (confirmOkBtn) {
    confirmOkBtn.addEventListener('click', () => {
        hideConfirm();
        if (confirmResolve) {
            confirmResolve(true);
            confirmResolve = null;
        }
    });
}

if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', () => {
        hideConfirm();
        if (confirmResolve) {
            confirmResolve(false);
            confirmResolve = null;
        }
    });
}

if (confirmModal) {
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            hideConfirm();
            if (confirmResolve) {
                confirmResolve(false);
                confirmResolve = null;
            }
        }
    });
}

// ======================
// Invite Friends System
// ======================

// Invite Friends DOM Elements
const inviteFriendsBtn = document.getElementById('inviteFriendsBtn');
const inviteFriendsModal = document.getElementById('inviteFriendsModal');
const closeInviteFriendsBtn = document.getElementById('closeInviteFriendsBtn');
const cancelInviteBtn = document.getElementById('cancelInviteBtn');
const sendInvitesBtn = document.getElementById('sendInvitesBtn');
const inviteFriendsList = document.getElementById('inviteFriendsList');
const noFriendsToInviteMessage = document.getElementById('noFriendsToInviteMessage');
const selectedFriendsCount = document.getElementById('selectedFriendsCount');
const inviteError = document.getElementById('inviteError');

// Track selected friends
let selectedFriendUids = [];

// Event Listeners
if (inviteFriendsBtn) {
    inviteFriendsBtn.addEventListener('click', openInviteFriendsModal);
}

if (closeInviteFriendsBtn) {
    closeInviteFriendsBtn.addEventListener('click', closeInviteFriendsModal);
}

if (cancelInviteBtn) {
    cancelInviteBtn.addEventListener('click', closeInviteFriendsModal);
}

if (sendInvitesBtn) {
    sendInvitesBtn.addEventListener('click', handleSendInvites);
}

if (inviteFriendsModal) {
    inviteFriendsModal.addEventListener('click', (e) => {
        if (e.target === inviteFriendsModal) {
            closeInviteFriendsModal();
        }
    });
}

/**
 * Open invite friends modal
 */
async function openInviteFriendsModal() {
    try {
        // Check if user is authenticated
        if (!auth.currentUser) {
            showErrorModal('You must be logged in to invite friends');
            return;
        }

        inviteFriendsModal.classList.add('active');
        selectedFriendUids = [];
        updateSelectedCount();
        inviteError.textContent = '';

        // Load friends list
        const friends = await getFriends();

        if (friends.length === 0) {
            inviteFriendsList.innerHTML = '';
            noFriendsToInviteMessage.style.display = 'block';
            sendInvitesBtn.disabled = true;
            return;
        }

        noFriendsToInviteMessage.style.display = 'none';

        // Create friend checkboxes
        inviteFriendsList.innerHTML = '';
        friends.forEach(friend => {
            const card = createInvitableFriendCard(friend);
            inviteFriendsList.appendChild(card);
        });
    } catch (error) {
        console.error('Error opening invite modal:', error);
        showErrorModal('Error loading friends list');
    }
}

/**
 * Close invite friends modal
 */
function closeInviteFriendsModal() {
    inviteFriendsModal.classList.remove('active');
    selectedFriendUids = [];
}

/**
 * Create invitable friend card with checkbox
 */
function createInvitableFriendCard(friend) {
    const card = document.createElement('div');
    card.className = 'friend-card';
    card.style.cursor = 'pointer';
    card.style.overflow = 'visible'; // Prevent border cutoff on hover

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `friend-${friend.uid}`;
    checkbox.className = 'friend-checkbox';
    checkbox.style.flexShrink = '0'; // Prevent checkbox from shrinking
    checkbox.addEventListener('change', (e) => {
        handleFriendSelection(friend.uid, e.target.checked);
    });

    const label = document.createElement('label');
    label.htmlFor = `friend-${friend.uid}`;
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '12px';
    label.style.cursor = 'pointer';
    label.style.width = '100%';

    const info = document.createElement('div');
    info.className = 'friend-info';
    info.style.flex = '1';
    info.style.minWidth = '0'; // Allow text to truncate properly

    const name = document.createElement('div');
    name.className = 'friend-name';
    name.textContent = friend.displayName || friend.firstName || 'Player';

    const phoneNumber = document.createElement('div');
    phoneNumber.className = 'friend-username';
    phoneNumber.textContent = formatPhoneNumberForDisplay(friend.phoneNumber || '');

    info.appendChild(name);
    info.appendChild(phoneNumber);

    label.appendChild(checkbox);
    label.appendChild(info);

    card.appendChild(label);

    return card;
}

/**
 * Handle friend selection
 */
function handleFriendSelection(friendUid, isSelected) {
    if (isSelected) {
        if (!selectedFriendUids.includes(friendUid)) {
            selectedFriendUids.push(friendUid);
        }
    } else {
        selectedFriendUids = selectedFriendUids.filter(uid => uid !== friendUid);
    }

    updateSelectedCount();
}

/**
 * Update selected friends count
 */
function updateSelectedCount() {
    // Enable/disable button based on selection
    sendInvitesBtn.disabled = selectedFriendUids.length === 0;
}

/**
 * Send game invites to selected friends
 */
async function handleSendInvites() {
    try {
        if (selectedFriendUids.length === 0) {
            inviteError.textContent = 'Please select at least one friend';
            return;
        }

        sendInvitesBtn.disabled = true;
        sendInvitesBtn.textContent = 'Sending...';
        inviteError.textContent = '';

        // Store count before clearing
        const inviteCount = selectedFriendUids.length;

        // Send invites
        await sendGameInvites(selectedFriendUids, gameCode);

        // Close modal
        closeInviteFriendsModal();

        // Show success message
        const friendWord = inviteCount === 1 ? 'friend' : 'friends';
        showNotification(
            `Invites sent to ${inviteCount} ${friendWord}!`,
            'Invites Sent'
        );

        // Reset button
        sendInvitesBtn.disabled = false;
        sendInvitesBtn.textContent = 'Send Invites';
    } catch (error) {
        console.error('Error sending invites:', error);
        inviteError.textContent = error.message || 'Error sending invites';
        sendInvitesBtn.disabled = false;
        sendInvitesBtn.textContent = 'Send Invites';
    }
}

/**
 * Show invite friends button for authenticated users with phone number
 */
async function checkAndShowInviteButton() {
    try {
        const user = auth.currentUser;
        const container = document.getElementById('inviteFriendsContainer');
        if (user && isHost) {
            // Check if user has a phone number (required for friends system)
            const hasPhone = await currentUserHasPhoneNumber();
            if (hasPhone && container) {
                container.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error checking invite button:', error);
    }
}

// Check and show invite button when host status is determined
// We'll call this in the game listener when we determine if user is host
console.log('Lobby initialized successfully!');
