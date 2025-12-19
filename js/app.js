// Five Crowns - Landing Page JavaScript
// Handles Create Game, Join Game, and navigation

console.log('Five Crowns app loaded!');

// Modal Helper Functions
function showErrorModal(message) {
    const errorModal = document.getElementById('errorModal');
    const errorMessage = document.getElementById('errorMessage');
    const errorOkBtn = document.getElementById('errorOkBtn');
    const closeErrorBtn = document.getElementById('closeErrorBtn');

    errorMessage.textContent = message;
    errorModal.classList.add('active');

    const closeModal = () => {
        errorModal.classList.remove('active');
    };

    errorOkBtn.onclick = closeModal;
    closeErrorBtn.onclick = closeModal;
    errorModal.onclick = (e) => {
        if (e.target === errorModal) closeModal();
    };
}

function showRulesModal() {
    const rulesModal = document.getElementById('rulesModal');
    const closeRulesBtn = document.getElementById('closeRulesBtn');

    rulesModal.classList.add('active');

    const closeModal = () => {
        rulesModal.classList.remove('active');
    };

    closeRulesBtn.onclick = closeModal;
    rulesModal.onclick = (e) => {
        if (e.target === rulesModal) closeModal();
    };
}

// Check if Firebase is loaded
if (typeof firebase === 'undefined') {
    console.error('Firebase not loaded! Check your internet connection and Firebase CDN links.');
    showErrorModal('Error: Firebase failed to load. Please check your internet connection and refresh the page.');
}

// Check if database is initialized
if (typeof database === 'undefined') {
    console.error('Firebase database not initialized!');
    showErrorModal('Error: Database not initialized. Please refresh the page.');
}

// DOM Elements
const createGameBtn = document.getElementById('createGameBtn');
const joinGameBtn = document.getElementById('joinGameBtn');
const howToPlayBtn = document.getElementById('howToPlayBtn');

// Name Modal Elements
const nameModal = document.getElementById('nameModal');
const playerNameInput = document.getElementById('playerNameInput');
const nameSubmitBtn = document.getElementById('nameSubmitBtn');
const nameError = document.getElementById('nameError');

// Join Modal Elements
const joinModal = document.getElementById('joinModal');
const closeJoinModalBtn = document.getElementById('closeJoinModalBtn');
const joinNameInput = document.getElementById('joinNameInput');
const gameCodeInput = document.getElementById('gameCodeInput');
const joinSubmitBtn = document.getElementById('joinSubmitBtn');
const joinError = document.getElementById('joinError');

// State
let currentAction = null; // 'create' or 'join'

// Check for join parameter in URL
const urlParams = new URLSearchParams(window.location.search);
const joinCode = urlParams.get('join');

// Verify DOM elements loaded
console.log('DOM elements:', {
    createGameBtn: !!createGameBtn,
    joinGameBtn: !!joinGameBtn,
    howToPlayBtn: !!howToPlayBtn
});

// If join code is in URL, auto-open join modal with prefilled code
if (joinCode && joinCode.length === 4) {
    console.log('Join code detected in URL:', joinCode);
    // Wait for DOM to be fully ready
    setTimeout(() => {
        openJoinModal();
        gameCodeInput.value = joinCode;
        joinNameInput.focus();
    }, 100);
}

// Event Listeners
if (createGameBtn) {
    createGameBtn.addEventListener('click', openNameModalForCreate);
    console.log('Create game button listener added');
} else {
    console.error('Create game button not found!');
}

if (joinGameBtn) {
    joinGameBtn.addEventListener('click', openJoinModal);
}

if (nameSubmitBtn) {
    nameSubmitBtn.addEventListener('click', handleNameSubmit);
}

if (closeJoinModalBtn) {
    closeJoinModalBtn.addEventListener('click', closeJoinModal);
}

if (joinSubmitBtn) {
    joinSubmitBtn.addEventListener('click', handleJoinGame);
}

if (howToPlayBtn) {
    howToPlayBtn.addEventListener('click', showHowToPlay);
}

// Close modals when clicking outside
nameModal.addEventListener('click', (e) => {
    if (e.target === nameModal) {
        closeNameModal();
    }
});

joinModal.addEventListener('click', (e) => {
    if (e.target === joinModal) {
        closeJoinModal();
    }
});

// Auto-format game code input (numbers only)
gameCodeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
    joinError.textContent = ''; // Clear error on input
});

// Submit on Enter key
playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleNameSubmit();
    }
});

joinNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        gameCodeInput.focus();
    }
});

gameCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && gameCodeInput.value.length === 4) {
        handleJoinGame();
    }
});

/**
 * Open name modal for creating game
 */
function openNameModalForCreate() {
    console.log('Opening name modal for create game');
    currentAction = 'create';
    nameModal.classList.add('active');
    playerNameInput.value = '';
    playerNameInput.focus();
    nameError.textContent = '';
}

/**
 * Handle name submission
 */
function handleNameSubmit() {
    const playerName = playerNameInput.value.trim();

    // Validate name
    if (playerName.length === 0) {
        nameError.textContent = 'Please enter your name';
        return;
    }

    if (playerName.length < 2) {
        nameError.textContent = 'Name must be at least 2 characters';
        return;
    }

    console.log('Player name submitted:', playerName);

    // Store name in session storage
    sessionStorage.setItem('playerName', playerName);

    // Close modal and proceed to create game
    closeNameModal();
    handleCreateGame(playerName);
}

/**
 * Close name modal
 */
function closeNameModal() {
    nameModal.classList.remove('active');
    playerNameInput.value = '';
    nameError.textContent = '';
}

/**
 * Create a new game
 * Generates a unique 4-digit code and redirects to lobby
 */
function handleCreateGame(playerName) {
    console.log('=== CREATE GAME CLICKED ===');

    try {
        // Check Firebase is available
        if (typeof firebase === 'undefined' || typeof database === 'undefined') {
            throw new Error('Firebase not available');
        }

        // Generate unique 4-digit code
        const gameCode = generateGameCode();
        console.log('Generated game code:', gameCode);

        // Store player as host
        const playerId = generatePlayerId();
        console.log('Generated player ID:', playerId);

        // Create game session in Firebase
        createGameSession(gameCode, playerId, playerName);
    } catch (error) {
        console.error('Error in handleCreateGame:', error);
        showErrorModal('Error creating game: ' + error.message);
    }
}

/**
 * Open the Join Game modal
 */
function openJoinModal() {
    joinModal.classList.add('active');
    joinNameInput.value = '';
    gameCodeInput.value = '';
    joinNameInput.focus();
    joinError.textContent = '';
}

/**
 * Close the Join Game modal
 */
function closeJoinModal() {
    joinModal.classList.remove('active');
    joinNameInput.value = '';
    gameCodeInput.value = '';
    joinError.textContent = '';
}

/**
 * Join an existing game
 */
function handleJoinGame() {
    const playerName = joinNameInput.value.trim();
    const code = gameCodeInput.value.trim();

    // Validate name
    if (playerName.length === 0) {
        showJoinError('Please enter your name');
        return;
    }

    if (playerName.length < 2) {
        showJoinError('Name must be at least 2 characters');
        return;
    }

    // Validate code
    if (code.length !== 4) {
        showJoinError('Please enter a 4-digit code');
        return;
    }

    console.log('Attempting to join game:', code, 'as', playerName);

    // Store name in session storage
    sessionStorage.setItem('playerName', playerName);

    // Check if game exists in Firebase
    checkGameExists(code, playerName);
}

/**
 * Show How to Play information
 */
function showHowToPlay(e) {
    e.preventDefault();
    showRulesModal();
}

/**
 * Generate a unique 4-digit game code
 */
function generateGameCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Generate a unique player ID
 */
function generatePlayerId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Create a new game session in Firebase
 */
function createGameSession(gameCode, playerId, playerName) {
    console.log('Creating game session in Firebase...');
    console.log('Game code:', gameCode);
    console.log('Player ID:', playerId);
    console.log('Player Name:', playerName);

    try {
        const gameRef = database.ref('games/' + gameCode);
        console.log('Database reference created');

        // Create game object
        const gameData = {
            code: gameCode,
            host: playerId,
            status: 'waiting', // waiting, playing, finished
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            maxPlayers: 6,
            players: {
                [playerId]: {
                    id: playerId,
                    name: playerName,
                    isHost: true,
                    isReady: true,
                    joinedAt: firebase.database.ServerValue.TIMESTAMP
                }
            }
        };

        console.log('Game data prepared:', gameData);

        // Save to Firebase
        console.log('Saving to Firebase...');
        console.log('Game path: games/' + gameCode);
        gameRef.set(gameData)
            .then(() => {
                console.log('✅ Game created successfully in Firebase!');
                console.log('Verifying data was written...');

                // Verify the write by reading it back
                return gameRef.once('value');
            })
            .then((snapshot) => {
                if (snapshot.exists()) {
                    console.log('✅ Verified: Game data exists in Firebase');
                    console.log('Game data:', snapshot.val());
                } else {
                    console.error('❌ WARNING: Game was written but cannot be read back!');
                    throw new Error('Game data verification failed');
                }

                // Store player info in session
                sessionStorage.setItem('playerId', playerId);
                sessionStorage.setItem('gameCode', gameCode);
                sessionStorage.setItem('playerName', playerName);
                console.log('Session storage updated:', {
                    playerId: playerId,
                    gameCode: gameCode,
                    playerName: playerName
                });

                // Wait a moment to ensure Firebase has propagated the data
                // before redirecting. This prevents race condition where lobby
                // loads before the game data is readable.
                return new Promise(resolve => setTimeout(resolve, 100));
            })
            .then(() => {
                // Redirect to lobby
                console.log('Redirecting to lobby...');
                window.location.href = 'lobby.html?code=' + gameCode;
            })
            .catch((error) => {
                console.error('❌ Firebase error:', error);
                console.error('Error code:', error.code);
                console.error('Error message:', error.message);
                showErrorModal('Error creating game: ' + error.message + '\n\nPlease check:\n1. Firebase Realtime Database is enabled\n2. Database rules allow writes\n3. Internet connection is working');
            });
    } catch (error) {
        console.error('❌ Exception in createGameSession:', error);
        showErrorModal('Error: ' + error.message);
    }
}

/**
 * Check if game exists and join it
 */
function checkGameExists(gameCode, playerName) {
    const gameRef = database.ref('games/' + gameCode);

    gameRef.once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const gameData = snapshot.val();

                console.log('Game data:', gameData);
                console.log('Looking for player name:', playerName);
                console.log('Players in game:', gameData.players);

                // For active games, check gameState.playerNames
                // For waiting games, check players object
                let existingPlayerId = null;
                let playersList = null;

                if (gameData.status === 'playing' && gameData.gameState && gameData.gameState.playerNames) {
                    // Game is active - look in gameState
                    console.log('Game is active, checking gameState.playerNames:', gameData.gameState.playerNames);
                    existingPlayerId = findPlayerByNameInGameState(gameData.gameState.playerNames, playerName);
                    playersList = Object.values(gameData.gameState.playerNames).join(', ');
                } else {
                    // Game is in lobby - look in players object
                    existingPlayerId = findPlayerByName(gameData.players, playerName);
                    playersList = gameData.players ?
                        Object.values(gameData.players).map(p => p.name).join(', ') :
                        'No players';
                }

                if (existingPlayerId) {
                    // Player exists - allow rejoin
                    console.log('Found existing player, rejoining:', existingPlayerId);
                    rejoinExistingGame(gameCode, existingPlayerId, playerName);
                    return;
                }

                console.log('No existing player found with name:', playerName);

                // New player - check if game is still in waiting state
                if (gameData.status !== 'waiting') {
                    console.log('Available player names:', playersList);
                    showJoinError('Game has already started. Use your original name to rejoin.\nAvailable names: ' + playersList);
                    return;
                }

                // Check player count
                const maxPlayers = gameData.maxPlayers || 6;
                const playerCount = Object.keys(gameData.players || {}).length;
                if (playerCount >= maxPlayers) {
                    showJoinError('Game is full');
                    return;
                }

                // Join the game
                joinExistingGame(gameCode, playerName);
            } else {
                showJoinError('Game not found. Check the code.');
            }
        })
        .catch((error) => {
            console.error('Error checking game:', error);
            showJoinError('Error connecting. Please try again.');
        });
}

/**
 * Find a player by their name in the players object (lobby state)
 */
function findPlayerByName(players, name) {
    if (!players) {
        console.log('No players object provided');
        return null;
    }

    const normalizedName = name.trim().toLowerCase();
    console.log('Searching for normalized name:', normalizedName);

    for (const [playerId, playerData] of Object.entries(players)) {
        const playerNormalizedName = playerData.name ? playerData.name.trim().toLowerCase() : '';
        console.log(`Comparing with player ${playerId}: "${playerNormalizedName}" === "${normalizedName}"?`, playerNormalizedName === normalizedName);

        if (playerData.name && playerNormalizedName === normalizedName) {
            console.log('Match found! Player ID:', playerId);
            return playerId;
        }
    }

    console.log('No match found');
    return null;
}

/**
 * Find a player by their name in gameState.playerNames (active game)
 */
function findPlayerByNameInGameState(playerNames, name) {
    if (!playerNames) {
        console.log('No playerNames object provided');
        return null;
    }

    const normalizedName = name.trim().toLowerCase();
    console.log('Searching in gameState for normalized name:', normalizedName);

    for (const [playerId, playerName] of Object.entries(playerNames)) {
        const playerNormalizedName = playerName ? playerName.trim().toLowerCase() : '';
        console.log(`Comparing with player ${playerId}: "${playerNormalizedName}" === "${normalizedName}"?`, playerNormalizedName === normalizedName);

        if (playerName && playerNormalizedName === normalizedName) {
            console.log('Match found in gameState! Player ID:', playerId);
            return playerId;
        }
    }

    console.log('No match found in gameState');
    return null;
}

/**
 * Rejoin an existing game with existing player ID
 */
function rejoinExistingGame(gameCode, playerId, playerName) {
    console.log('Rejoining game:', gameCode, 'as player:', playerId);

    // Store player info in session
    sessionStorage.setItem('playerId', playerId);
    sessionStorage.setItem('gameCode', gameCode);
    sessionStorage.setItem('playerName', playerName);

    // Check game status and redirect accordingly
    const gameRef = database.ref('games/' + gameCode);
    gameRef.once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const gameData = snapshot.val();

                if (gameData.status === 'playing') {
                    // Game is in progress, go to game page
                    console.log('Rejoining game in progress');
                    window.location.href = 'game.html?code=' + gameCode;
                } else {
                    // Game is in lobby, go to lobby
                    console.log('Rejoining game lobby');
                    window.location.href = 'lobby.html?code=' + gameCode;
                }
            } else {
                showJoinError('Game no longer exists.');
            }
        })
        .catch((error) => {
            console.error('Error rejoining game:', error);
            showJoinError('Error rejoining game. Please try again.');
        });
}

/**
 * Join an existing game
 */
function joinExistingGame(gameCode, playerName) {
    const playerId = generatePlayerId();
    const gameRef = database.ref('games/' + gameCode);

    // Add player to game
    const playerData = {
        id: playerId,
        name: playerName,
        isHost: false,
        isReady: true,
        joinedAt: firebase.database.ServerValue.TIMESTAMP
    };

    gameRef.child('players/' + playerId).set(playerData)
        .then(() => {
            console.log('Joined game successfully:', gameCode);
            // Store player info in session
            sessionStorage.setItem('playerId', playerId);
            sessionStorage.setItem('gameCode', gameCode);
            sessionStorage.setItem('playerName', playerName);
            // Redirect to lobby
            window.location.href = 'lobby.html?code=' + gameCode;
        })
        .catch((error) => {
            console.error('Error joining game:', error);
            showJoinError('Error joining game. Please try again.');
        });
}

/**
 * Show error message in join modal
 */
function showJoinError(message) {
    joinError.textContent = message;
}

// Initialize
console.log('Landing page ready!');
