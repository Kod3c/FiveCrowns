// Five Crowns - Landing Page JavaScript
// Handles Create Game, Join Game, and navigation

console.log('Five Crowns app loaded!');

// Global variables for current user
window.currentUser = null;
window.currentUserFirstName = null;
let currentUser = null;
let currentUserFirstName = null;
let pendingAction = null; // 'createGame' or 'joinGame'

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
const mainMenu = document.getElementById('mainMenu');
const createGameBtn = document.getElementById('createGameBtn');
const joinGameBtn = document.getElementById('joinGameBtn');
const activeGamesBtn = document.getElementById('activeGamesBtn');
const activeGamesCount = document.getElementById('activeGamesCount');
const howToPlayBtn = document.getElementById('howToPlayBtn');

// Bottom Navigation Elements
const friendsNavBtn = document.getElementById('friendsNavBtn');
const activeGamesNavBtn = document.getElementById('activeGamesNavBtn');
const createJoinBtn = document.getElementById('createJoinBtn');
const rulesNavBtn = document.getElementById('rulesNavBtn');
const menuNavBtn = document.getElementById('menuNavBtn');
const friendsNavBadge = document.getElementById('friendsNavBadge');
const activeGamesNavBadge = document.getElementById('activeGamesNavBadge');

// Create/Join Modal Elements
const createJoinModal = document.getElementById('createJoinModal');
const closeCreateJoinBtn = document.getElementById('closeCreateJoinBtn');

// Menu Modal Elements
const menuModal = document.getElementById('menuModal');
const closeMenuBtn = document.getElementById('closeMenuBtn');

// Old Menu Elements (deprecated, keeping for reference)
const menuButton = document.getElementById('menuButton');
const menuDropdown = document.getElementById('menuDropdown');
const menuUserInfo = document.getElementById('menuUserInfo');
const menuUserName = document.getElementById('menuUserName');
const menuDivider = document.getElementById('menuDivider');
const menuEditProfile = document.getElementById('menuEditProfile');
const menuSignIn = document.getElementById('menuSignIn');
const menuSignUp = document.getElementById('menuSignUp');
const menuSignOut = document.getElementById('menuSignOut');

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

// Active Games Modal Elements
const activeGamesModal = document.getElementById('activeGamesModal');
const closeActiveGamesBtn = document.getElementById('closeActiveGamesBtn');
const activeGamesList = document.getElementById('activeGamesList');
const noActiveGamesMessage = document.getElementById('noActiveGamesMessage');

// State
let currentAction = null; // 'create' or 'join'
let activeGamesListeners = []; // Track Firebase listeners for cleanup

// Check for join parameter in URL
const urlParams = new URLSearchParams(window.location.search);
const joinCode = urlParams.get('join');

// Auth State Listener - Update UI based on login state
auth.onAuthStateChanged(async (user) => {
    console.log('Auth state changed:', user ? user.uid : 'No user');

    if (user) {
        // User is logged in
        currentUser = user;
        window.currentUser = user;

        // Show Active Games button immediately for logged-in users
        if (activeGamesBtn) {
            activeGamesBtn.style.display = 'flex';
            activeGamesCount.textContent = '...'; // Loading indicator
        }

        // Active Games nav button is always visible, just update badge if needed
        if (activeGamesNavBadge) {
            // Don't show badge until we have actual count
            activeGamesNavBadge.style.display = 'none';
        }

        // Load active games and user data in parallel for faster page load
        console.log('Loading user data for UID:', user.uid);
        const [firstName] = await Promise.all([
            getUserFirstName(user.uid),
            loadActiveGames() // Load count in background
        ]);

        // Get user's first name from Firestore
        try {
            currentUserFirstName = firstName;
            window.currentUserFirstName = firstName;
            console.log('User first name from getUserFirstName:', currentUserFirstName);
            console.log('Firebase Auth displayName:', user.displayName);
            console.log('Firebase Auth phoneNumber:', user.phoneNumber);
            console.log('Firebase Auth email:', user.email);

            // Update menu UI
            if (menuUserName) menuUserName.textContent = currentUserFirstName;
            if (menuUserInfo) menuUserInfo.style.display = 'block';
            if (menuDivider) menuDivider.style.display = 'block';
            if (menuEditProfile) menuEditProfile.style.display = 'block';
            if (menuSignIn) menuSignIn.style.display = 'none';
            if (menuSignUp) menuSignUp.style.display = 'none';
            if (menuSignOut) menuSignOut.style.display = 'block';

            // If there's a join code in URL and user just logged in, auto-open join modal
            if (joinCode && joinCode.length === 4) {
                console.log('Join code detected in URL:', joinCode);
                setTimeout(() => {
                    openJoinModal();
                    gameCodeInput.value = joinCode;
                }, 100);
            }

            // Check if there's a pending action after login
            if (pendingAction === 'createGame') {
                pendingAction = null;
                handleCreateGame(currentUserFirstName);
            } else if (pendingAction === 'joinGame') {
                pendingAction = null;
                openJoinModal();
            }

            // Load friends data
            await loadFriendsData();
        } catch (error) {
            console.error('Error getting user data:', error);
            currentUserFirstName = user.displayName || 'Player';
            if (menuUserName) menuUserName.textContent = currentUserFirstName;
            if (menuUserInfo) menuUserInfo.style.display = 'block';
            if (menuDivider) menuDivider.style.display = 'block';
            if (menuEditProfile) menuEditProfile.style.display = 'block';
            if (menuSignIn) menuSignIn.style.display = 'none';
            if (menuSignUp) menuSignUp.style.display = 'none';
            if (menuSignOut) menuSignOut.style.display = 'block';
        }
    } else {
        // No user logged in - redirect to login page
        console.log('No user logged in - redirecting to login page');
        window.location.href = 'login.html';
    }
});

// Verify DOM elements loaded
console.log('DOM elements:', {
    createGameBtn: !!createGameBtn,
    joinGameBtn: !!joinGameBtn,
    howToPlayBtn: !!howToPlayBtn,
    menuButton: !!menuButton
});

// Event Listeners
if (createGameBtn) {
    createGameBtn.addEventListener('click', () => {
        closeCreateJoinModal();
        handleCreateGameClick();
    });
    console.log('Create game button listener added');
} else {
    console.error('Create game button not found!');
}

if (joinGameBtn) {
    joinGameBtn.addEventListener('click', () => {
        closeCreateJoinModal();
        openJoinModal();
    });
}

if (activeGamesBtn) {
    activeGamesBtn.addEventListener('click', openActiveGamesModal);
}

if (closeActiveGamesBtn) {
    closeActiveGamesBtn.addEventListener('click', closeActiveGamesModal);
}

if (activeGamesModal) {
    activeGamesModal.addEventListener('click', (e) => {
        if (e.target === activeGamesModal) {
            closeActiveGamesModal();
        }
    });
}

// Old menu button toggle (deprecated - now using modal)
// Keeping code for backwards compatibility
if (menuButton) {
    menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        openMenuModal();
    });
}

// Menu item actions
if (menuSignIn) {
    menuSignIn.addEventListener('click', () => {
        closeMenuModal();
        window.location.href = 'login.html';
    });
}

if (menuSignUp) {
    menuSignUp.addEventListener('click', () => {
        closeMenuModal();
        window.location.href = 'login.html';
    });
}

if (menuEditProfile) {
    menuEditProfile.addEventListener('click', () => {
        closeMenuModal();
        // Prompt for new name
        const newName = prompt('Enter your first name:', currentUserFirstName !== 'Player' ? currentUserFirstName : '');
        if (newName && newName.trim() && newName.trim() !== currentUserFirstName) {
            updateUserName(newName.trim())
                .then(() => {
                    currentUserFirstName = newName.trim();
                    window.currentUserFirstName = newName.trim();
                    if (menuUserName) menuUserName.textContent = newName.trim();
                    alert('Name updated successfully!');
                })
                .catch((error) => {
                    console.error('Error updating name:', error);
                    alert('Error updating name. Please try again.');
                });
        }
    });
}

if (menuSignOut) {
    menuSignOut.addEventListener('click', async () => {
        closeMenuModal();
        try {
            await signOutUser();
            // Redirect happens in auth state listener
        } catch (error) {
            console.error('Error logging out:', error);
            showErrorModal('Error signing out. Please try again.');
        }
    });
}

// nameSubmitBtn listener removed - no longer needed with auth system

if (closeJoinModalBtn) {
    closeJoinModalBtn.addEventListener('click', closeJoinModal);
}

if (joinSubmitBtn) {
    joinSubmitBtn.addEventListener('click', handleJoinGame);
}

if (howToPlayBtn) {
    howToPlayBtn.addEventListener('click', showHowToPlay);
}

// Bottom Navigation Event Listeners
if (friendsNavBtn) {
    friendsNavBtn.addEventListener('click', openFriendsModal);
}

if (activeGamesNavBtn) {
    activeGamesNavBtn.addEventListener('click', openActiveGamesModal);
}

if (createJoinBtn) {
    createJoinBtn.addEventListener('click', openCreateJoinModal);
}

if (rulesNavBtn) {
    rulesNavBtn.addEventListener('click', showHowToPlay);
}

if (menuNavBtn) {
    menuNavBtn.addEventListener('click', openMenuModal);
}

if (closeCreateJoinBtn) {
    closeCreateJoinBtn.addEventListener('click', closeCreateJoinModal);
}

if (createJoinModal) {
    createJoinModal.addEventListener('click', (e) => {
        if (e.target === createJoinModal) {
            closeCreateJoinModal();
        }
    });
}

if (closeMenuBtn) {
    closeMenuBtn.addEventListener('click', closeMenuModal);
}

if (menuModal) {
    menuModal.addEventListener('click', (e) => {
        if (e.target === menuModal) {
            closeMenuModal();
        }
    });
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

if (joinNameInput) {
    joinNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            if (gameCodeInput) gameCodeInput.focus();
        }
    });
}

if (gameCodeInput) {
    gameCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && gameCodeInput.value.length === 4) {
            handleJoinGame();
        }
    });
}

/**
 * Handle create game click - requires authentication
 */
function handleCreateGameClick() {
    console.log('Create game clicked');

    if (!currentUser || !currentUserFirstName) {
        // Store the intended action and redirect to login
        pendingAction = 'createGame';
        window.location.href = 'login.html';
        return;
    }

    handleCreateGame(currentUserFirstName);
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
 * Open the Join Game modal - requires authentication
 */
function openJoinModal() {
    if (!currentUser || !currentUserFirstName) {
        // Store the intended action and redirect to login
        pendingAction = 'joinGame';
        window.location.href = 'login.html';
        return;
    }

    joinModal.classList.add('active');
    gameCodeInput.value = '';
    gameCodeInput.focus();
    joinError.textContent = '';
}

/**
 * Close the Join Game modal
 */
function closeJoinModal() {
    joinModal.classList.remove('active');
    gameCodeInput.value = '';
    joinError.textContent = '';
}

/**
 * Open the Create/Join Game modal
 */
function openCreateJoinModal() {
    createJoinModal.classList.add('active');
}

/**
 * Close the Create/Join Game modal
 */
function closeCreateJoinModal() {
    createJoinModal.classList.remove('active');
}

/**
 * Open the Menu modal
 */
function openMenuModal() {
    menuModal.classList.add('active');
}

/**
 * Close the Menu modal
 */
function closeMenuModal() {
    menuModal.classList.remove('active');
}

/**
 * Join an existing game
 */
function handleJoinGame() {
    const code = gameCodeInput.value.trim();

    // Validate code
    if (code.length !== 4) {
        showJoinError('Please enter a 4-digit code');
        return;
    }

    console.log('Attempting to join game:', code, 'as', currentUserFirstName);

    // Store name in session storage
    sessionStorage.setItem('playerName', currentUserFirstName);

    // Check if game exists in Firebase
    checkGameExists(code, currentUserFirstName);
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

                // Save active game to user profile
                return saveActiveGame(gameCode, 'waiting');
            })
            .then(() => {
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
            // Save active game to user profile
            return saveActiveGame(gameCode, 'waiting');
        })
        .then(() => {
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

// ======================
// Active Games Functions
// ======================

/**
 * Load active games and update UI
 */
async function loadActiveGames() {
    try {
        // First, quickly get games from Firestore without validation
        const allGames = await getActiveGames();
        const invites = await getGameInvites();

        // Show button immediately if there are any games or invites
        const totalCount = allGames.length + invites.length;
        if (totalCount > 0 && activeGamesBtn) {
            activeGamesBtn.style.display = 'flex';
            activeGamesCount.textContent = totalCount;
        }
        // Update nav badge (button always visible)
        if (activeGamesNavBadge) {
            if (totalCount > 0) {
                activeGamesNavBadge.textContent = totalCount;
                activeGamesNavBadge.style.display = 'inline-flex';
            } else {
                activeGamesNavBadge.style.display = 'none';
            }
        }

        // Then clean up stale games in the background and update if needed
        const validGames = await cleanupStaleGames();

        // Update button with final count (games + invites)
        const finalCount = validGames.length + invites.length;
        if (finalCount > 0 && activeGamesBtn) {
            activeGamesBtn.style.display = 'flex';
            activeGamesCount.textContent = finalCount;
        } else if (activeGamesBtn) {
            activeGamesBtn.style.display = 'none';
        }

        // Update nav badge (button always visible)
        if (activeGamesNavBadge) {
            if (finalCount > 0) {
                activeGamesNavBadge.textContent = finalCount;
                activeGamesNavBadge.style.display = 'inline-flex';
            } else {
                activeGamesNavBadge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading active games:', error);
    }
}

/**
 * Open Active Games modal
 */
async function openActiveGamesModal() {
    try {
        console.log('Opening active games modal...');

        // Clean up any existing listeners
        cleanupActiveGamesListeners();

        // Load game invites first
        await loadGameInvites();

        // Get fresh list of active games
        const validGames = await cleanupStaleGames();

        // Clear current list
        activeGamesList.innerHTML = '';

        if (validGames.length === 0) {
            noActiveGamesMessage.style.display = 'block';
        } else {
            noActiveGamesMessage.style.display = 'none';

            // Sort by last updated (most recent first)
            validGames.sort((a, b) => {
                const aTime = a.lastUpdated?.getTime?.() || a.lastUpdated?.toMillis?.() || 0;
                const bTime = b.lastUpdated?.getTime?.() || b.lastUpdated?.toMillis?.() || 0;
                return bTime - aTime;
            });

            // Create game cards with live updates
            for (const game of validGames) {
                const cardContainer = document.createElement('div');
                cardContainer.id = `game-card-${game.gameCode}`;
                activeGamesList.appendChild(cardContainer);

                // Set up real-time listener for this game
                const gameRef = database.ref('games/' + game.gameCode);
                const listener = gameRef.on('value', async (snapshot) => {
                    if (snapshot.exists()) {
                        const gameData = snapshot.val();
                        // Update game status in local data
                        game.status = gameData.status;

                        // Recreate card with updated data
                        const card = await createActiveGameCard(game);
                        cardContainer.innerHTML = '';
                        cardContainer.appendChild(card);
                    } else {
                        // Game was deleted, remove card
                        cardContainer.remove();
                        // Also remove from active games list
                        await clearActiveGame(game.gameCode);
                        await loadActiveGames();
                    }
                });

                // Track listener for cleanup
                activeGamesListeners.push({ ref: gameRef, listener: listener });

                // Create initial card
                const card = await createActiveGameCard(game);
                cardContainer.appendChild(card);
            }
        }

        // Set up real-time listener for game invites
        if (typeof listenToGameInvites === 'function') {
            const unsubscribe = listenToGameInvites(async () => {
                // Reload invites when they change
                await loadGameInvites();
                // Also update Active Games badge count
                await loadActiveGames();
            });
            // Store unsubscribe function
            activeGamesListeners.push({ unsubscribe });
        }

        // Show modal
        activeGamesModal.classList.add('active');
    } catch (error) {
        console.error('Error opening active games modal:', error);
        showErrorModal('Error loading active games. Please try again.');
    }
}

/**
 * Close Active Games modal
 */
function closeActiveGamesModal() {
    activeGamesModal.classList.remove('active');
    // Clean up Firebase listeners
    cleanupActiveGamesListeners();
}

/**
 * Clean up Firebase listeners for active games
 */
function cleanupActiveGamesListeners() {
    activeGamesListeners.forEach(({ ref, listener, unsubscribe }) => {
        if (ref && listener) {
            ref.off('value', listener);
        }
        if (unsubscribe && typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    activeGamesListeners = [];
}

/**
 * Create an active game card element
 * @param {object} game - Game data
 * @returns {HTMLElement} Game card element
 */
async function createActiveGameCard(game) {
    const card = document.createElement('div');
    card.className = 'active-game-card';

    // Header with code and status
    const header = document.createElement('div');
    header.className = 'active-game-header';

    const code = document.createElement('div');
    code.className = 'active-game-code';
    code.textContent = game.gameCode;

    // Status badges container
    const statusContainer = document.createElement('div');
    statusContainer.style.display = 'flex';
    statusContainer.style.flexDirection = 'column';
    statusContainer.style.gap = '6px';
    statusContainer.style.alignItems = 'flex-end';

    const status = document.createElement('div');
    status.className = `active-game-status ${game.status}`;
    status.textContent = game.status === 'waiting' ? 'Lobby' : 'In Progress';

    statusContainer.appendChild(status);

    header.appendChild(code);
    header.appendChild(statusContainer);

    // Game info
    const info = document.createElement('div');
    info.className = 'active-game-info';

    // Get player names and turn info from Firebase
    try {
        const gameRef = database.ref('games/' + game.gameCode);
        const snapshot = await gameRef.once('value');

        if (snapshot.exists()) {
            const gameData = snapshot.val();
            let playerNames = [];
            let isYourTurn = false;
            let currentPlayerName = '';

            if (gameData.status === 'playing' && gameData.gameState?.playerNames) {
                // Game is active - get names from gameState
                const playerScores = gameData.gameState.playerScores || {};
                const round = gameData.gameState.currentRound || 1;

                // Build array of player info with scores
                const playersWithScores = [];
                for (const [pid, pname] of Object.entries(gameData.gameState.playerNames)) {
                    if (pname.toLowerCase() !== game.playerName.toLowerCase()) {
                        const score = playerScores[pid] || 0;
                        playersWithScores.push({ name: pname, score: score });
                    }
                }

                // Check if it's the current player's turn
                const currentPlayerId = gameData.gameState.currentPlayer;
                if (currentPlayerId && gameData.gameState.playerNames[currentPlayerId]) {
                    currentPlayerName = gameData.gameState.playerNames[currentPlayerId];

                    // Find player ID by name to check if it's their turn
                    for (const [pid, pname] of Object.entries(gameData.gameState.playerNames)) {
                        if (pname.toLowerCase() === game.playerName.toLowerCase() && pid === currentPlayerId) {
                            isYourTurn = true;
                            break;
                        }
                    }
                }

                // Format player names with scores (only show scores after round 1)
                if (playersWithScores.length > 0) {
                    if (round === 1) {
                        // Round 1 - no scores yet
                        playerNames = playersWithScores.map(p => p.name);
                    } else {
                        // Round 2+ - show scores
                        playerNames = playersWithScores.map(p => `${p.name} (${p.score})`);
                    }
                }
            } else if (gameData.players) {
                // Game is in lobby - get names from players
                playerNames = Object.values(gameData.players).map(p => p.name);
                // Remove current player from lobby list
                playerNames = playerNames.filter(name => name.toLowerCase() !== game.playerName.toLowerCase());
            }

            // Add "Playing with" section - this is the main info shown
            if (playerNames.length > 0) {
                info.innerHTML = `<strong>Playing with:</strong> ${playerNames.join(', ')}`;
            } else {
                info.innerHTML = `<span style="color: var(--text-muted);">Waiting for players...</span>`;
            }

            // Add wild card info and your score for active games
            if (gameData.status === 'playing' && gameData.gameState?.currentRound) {
                const round = gameData.gameState.currentRound;
                const wildCards = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
                const wildCard = wildCards[round - 1];

                const wildInfo = document.createElement('div');
                wildInfo.className = 'active-game-info';
                wildInfo.style.marginTop = '4px';
                wildInfo.style.fontSize = '13px';
                wildInfo.style.color = 'var(--text-muted)';

                // Only show your score after round 1 (when scores are meaningful)
                if (round === 1) {
                    wildInfo.innerHTML = `${wildCard}'s Wild`;
                } else {
                    // Get player's score
                    let yourScore = 0;

                    if (gameData.gameState.playerScores) {
                        // Find current player's score
                        for (const [pid, pname] of Object.entries(gameData.gameState.playerNames || {})) {
                            if (pname.toLowerCase() === game.playerName.toLowerCase()) {
                                yourScore = gameData.gameState.playerScores[pid] || 0;
                                break;
                            }
                        }
                    }

                    wildInfo.innerHTML = `${wildCard}'s Wild • You: ${yourScore}`;
                }

                info.appendChild(wildInfo);
            }

            // Add turn indicator badge for active games (beneath status)
            if (gameData.status === 'playing') {
                const turnBadge = document.createElement('div');
                turnBadge.className = 'active-game-status';

                if (isYourTurn) {
                    turnBadge.style.background = 'rgba(34, 197, 94, 0.3)';
                    turnBadge.style.color = '#86efac';
                    turnBadge.textContent = 'Your Turn';
                } else {
                    turnBadge.style.background = 'rgba(234, 179, 8, 0.3)';
                    turnBadge.style.color = '#fbbf24';
                    turnBadge.textContent = 'Their Turn';
                }

                statusContainer.appendChild(turnBadge);
            }
        }
    } catch (error) {
        console.error('Error fetching player names:', error);
    }

    // Actions
    const actions = document.createElement('div');
    actions.className = 'active-game-actions';

    const rejoinBtn = document.createElement('button');
    rejoinBtn.className = 'active-game-btn';
    rejoinBtn.textContent = '🎮 Rejoin';
    rejoinBtn.onclick = () => rejoinGame(game);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'active-game-btn danger';
    removeBtn.textContent = '🗑️ Remove';
    removeBtn.onclick = () => removeActiveGame(game.gameCode);

    actions.appendChild(rejoinBtn);
    actions.appendChild(removeBtn);

    // Assemble card
    card.appendChild(header);
    card.appendChild(info);
    card.appendChild(actions);

    return card;
}

/**
 * Rejoin an active game
 * @param {object} game - Game data
 */
async function rejoinGame(game) {
    try {
        console.log('Rejoining game:', game.gameCode);

        // Verify game still exists
        const gameRef = database.ref('games/' + game.gameCode);
        const snapshot = await gameRef.once('value');

        if (!snapshot.exists()) {
            showErrorModal('This game no longer exists.');
            // Remove from active games
            await clearActiveGame(game.gameCode);
            await loadActiveGames();
            closeActiveGamesModal();
            return;
        }

        const gameData = snapshot.val();

        // Find player ID by name
        let playerId = null;
        if (gameData.status === 'playing' && gameData.gameState?.playerNames) {
            // Game is active - search in gameState
            for (const [pid, pname] of Object.entries(gameData.gameState.playerNames)) {
                if (pname.toLowerCase() === game.playerName.toLowerCase()) {
                    playerId = pid;
                    break;
                }
            }
        } else if (gameData.players) {
            // Game is in lobby - search in players
            for (const [pid, pdata] of Object.entries(gameData.players)) {
                if (pdata.name?.toLowerCase() === game.playerName.toLowerCase()) {
                    playerId = pid;
                    break;
                }
            }
        }

        if (!playerId) {
            showErrorModal('Could not find your player in this game. The game may have been reset.');
            return;
        }

        // Store player info in session
        sessionStorage.setItem('playerId', playerId);
        sessionStorage.setItem('gameCode', game.gameCode);
        sessionStorage.setItem('playerName', game.playerName);

        // Redirect to appropriate page
        if (gameData.status === 'playing') {
            window.location.href = `game.html?code=${game.gameCode}`;
        } else {
            window.location.href = `lobby.html?code=${game.gameCode}`;
        }
    } catch (error) {
        console.error('Error rejoining game:', error);
        showErrorModal('Error rejoining game. Please try again.');
    }
}

/**
 * Remove a game from active games list
 * @param {string} gameCode - Game code to remove
 */
async function removeActiveGame(gameCode) {
    try {
        const confirmed = confirm('Remove this game from your active games list?');
        if (!confirmed) return;

        console.log('Removing game from active list:', gameCode);

        await clearActiveGame(gameCode);
        await loadActiveGames();

        // Refresh modal if it's open
        if (activeGamesModal.classList.contains('active')) {
            await openActiveGamesModal();
        }
    } catch (error) {
        console.error('Error removing active game:', error);
        showErrorModal('Error removing game. Please try again.');
    }
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
 * @param {string} message - Message to display
 * @param {string} title - Optional title (defaults to "Success")
 * @param {string} icon - Optional icon (defaults to "✓")
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
 * @param {string} message - Message to display
 * @param {string} title - Optional title
 * @returns {Promise<boolean>} True if confirmed, false if cancelled
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
// Friends System
// ======================

// Friends DOM Elements
const friendsBtn = document.getElementById('friendsBtn');
const friendRequestsCount = document.getElementById('friendRequestsCount');
const friendsModal = document.getElementById('friendsModal');
const closeFriendsBtn = document.getElementById('closeFriendsBtn');

// Friends Tab Elements
const friendsTabs = document.querySelectorAll('.friends-tab');
const friendsTabPanes = document.querySelectorAll('.tab-pane');
const friendsList = document.getElementById('friendsList');
const noFriendsMessage = document.getElementById('noFriendsMessage');

// Friend Requests Elements
const incomingRequestsList = document.getElementById('incomingRequestsList');
const outgoingRequestsList = document.getElementById('outgoingRequestsList');
const noIncomingRequestsMessage = document.getElementById('noIncomingRequestsMessage');
const noOutgoingRequestsMessage = document.getElementById('noOutgoingRequestsMessage');

// Add Friend Elements
const friendSearchInput = document.getElementById('friendSearchInput');
const searchFriendBtn = document.getElementById('searchFriendBtn');
const friendSearchError = document.getElementById('friendSearchError');
const friendSearchResults = document.getElementById('friendSearchResults');

// Badge Elements
const friendsCountBadge = document.getElementById('friendsCountBadge');
const requestsCountBadge = document.getElementById('requestsCountBadge');

// Game Invites Elements (now in Active Games modal)
const gameInvitesSection = document.getElementById('gameInvitesSection');
const gameInvitesList = document.getElementById('gameInvitesList');
const invitesCountBadge2 = document.getElementById('invitesCountBadge2');

// Friends Event Listeners
if (friendsBtn) {
    friendsBtn.addEventListener('click', openFriendsModal);
}

// Friends Nav Button
if (friendsNavBtn) {
    friendsNavBtn.addEventListener('click', openFriendsModal);
}

if (closeFriendsBtn) {
    closeFriendsBtn.addEventListener('click', closeFriendsModal);
}

if (friendsModal) {
    friendsModal.addEventListener('click', (e) => {
        if (e.target === friendsModal) {
            closeFriendsModal();
        }
    });
}

// Friends Tab Navigation
friendsTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        switchFriendsTab(tabName);
    });
});

// Friend Search
if (searchFriendBtn) {
    searchFriendBtn.addEventListener('click', handleFriendSearch);
}

if (friendSearchInput) {
    friendSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleFriendSearch();
        }
    });

    // Add phone number formatting to friend search input
    friendSearchInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 10) value = value.substring(0, 10);

        if (value.length === 0) {
            e.target.value = '';
        } else if (value.length <= 3) {
            e.target.value = '(' + value;
        } else if (value.length <= 6) {
            e.target.value = '(' + value.substring(0, 3) + ') ' + value.substring(3);
        } else {
            e.target.value = '(' + value.substring(0, 3) + ') ' + value.substring(3, 6) + '-' + value.substring(6);
        }
    });
}

/**
 * Format phone number for display
 * @param {string} phoneNumber - E.164 format phone number
 * @returns {string} Formatted phone number
 */
function formatPhoneNumberForDisplay(phoneNumber) {
    if (!phoneNumber) return 'Unknown';

    // Extract country code and number
    const match = phoneNumber.match(/^\+(\d{1,3})(\d+)$/);
    if (!match) return phoneNumber;

    const countryCode = match[1];
    const number = match[2];

    // Format US/Canada numbers as +1 (234) 567-8901
    if (countryCode === '1' && number.length === 10) {
        return `+1 (${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6)}`;
    }

    // For other countries, show as +CC XXXX...
    return `+${countryCode} ${number}`;
}

/**
 * Open Friends modal
 */
async function openFriendsModal() {
    friendsModal.classList.add('active');
    // Load initial tab
    await loadFriendsList();
    await loadFriendRequests();
    updateFriendsBadges();
}

/**
 * Close Friends modal
 */
function closeFriendsModal() {
    friendsModal.classList.remove('active');
}

/**
 * Switch between friends tabs
 */
function switchFriendsTab(tabName) {
    // Update tab buttons
    friendsTabs.forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Update tab panes
    friendsTabPanes.forEach(pane => {
        if (pane.id === tabName) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });

    // Load data for tab
    if (tabName === 'friends-list') {
        loadFriendsList();
    } else if (tabName === 'friend-requests') {
        loadFriendRequests();
    }
}

/**
 * Load and display friends list
 */
async function loadFriendsList() {
    try {
        const friends = await getFriends();

        if (friends.length === 0) {
            friendsList.innerHTML = '';
            noFriendsMessage.style.display = 'block';
            return;
        }

        noFriendsMessage.style.display = 'none';

        // Create friend cards
        friendsList.innerHTML = '';
        friends.forEach(friend => {
            const card = createFriendCard(friend);
            friendsList.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading friends list:', error);
    }
}

/**
 * Create a friend card element
 */
function createFriendCard(friend) {
    const card = document.createElement('div');
    card.className = 'friend-card';

    const info = document.createElement('div');
    info.className = 'friend-info';

    const name = document.createElement('div');
    name.className = 'friend-name';
    name.textContent = friend.displayName || friend.firstName || 'Player';

    const phoneNumber = document.createElement('div');
    phoneNumber.className = 'friend-username';
    phoneNumber.textContent = formatPhoneNumberForDisplay(friend.phoneNumber);

    info.appendChild(name);
    info.appendChild(phoneNumber);

    const actions = document.createElement('div');
    actions.className = 'friend-actions';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'friend-action-btn danger-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = () => handleRemoveFriend(friend);

    actions.appendChild(removeBtn);

    card.appendChild(info);
    card.appendChild(actions);

    return card;
}

/**
 * Load and display friend requests
 */
async function loadFriendRequests() {
    try {
        const incoming = await getIncomingFriendRequests();
        const outgoing = await getOutgoingFriendRequests();

        // Update badge
        if (incoming.length > 0) {
            requestsCountBadge.textContent = incoming.length;
            requestsCountBadge.style.display = 'inline-block';
            friendRequestsCount.textContent = incoming.length;
            friendRequestsCount.style.display = 'inline-block';
        } else {
            requestsCountBadge.style.display = 'none';
            friendRequestsCount.style.display = 'none';
        }

        // Incoming requests
        if (incoming.length === 0) {
            incomingRequestsList.innerHTML = '';
            noIncomingRequestsMessage.style.display = 'block';
        } else {
            noIncomingRequestsMessage.style.display = 'none';
            incomingRequestsList.innerHTML = '';
            incoming.forEach(request => {
                const card = createIncomingRequestCard(request);
                incomingRequestsList.appendChild(card);
            });
        }

        // Outgoing requests
        if (outgoing.length === 0) {
            outgoingRequestsList.innerHTML = '';
            noOutgoingRequestsMessage.style.display = 'block';
        } else {
            noOutgoingRequestsMessage.style.display = 'none';
            outgoingRequestsList.innerHTML = '';
            outgoing.forEach(request => {
                const card = createOutgoingRequestCard(request);
                outgoingRequestsList.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Error loading friend requests:', error);
    }
}

/**
 * Create incoming friend request card
 */
function createIncomingRequestCard(request) {
    const card = document.createElement('div');
    card.className = 'friend-card';

    const info = document.createElement('div');
    info.className = 'friend-info';

    const name = document.createElement('div');
    name.className = 'friend-name';
    name.textContent = request.displayName || 'Player';

    const phoneNumber = document.createElement('div');
    phoneNumber.className = 'friend-username';
    phoneNumber.textContent = formatPhoneNumberForDisplay(request.phoneNumber);

    info.appendChild(name);
    info.appendChild(phoneNumber);

    const actions = document.createElement('div');
    actions.className = 'friend-actions';

    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'friend-action-btn';
    acceptBtn.textContent = 'Accept';
    acceptBtn.onclick = () => handleAcceptFriendRequest(request.from);

    const declineBtn = document.createElement('button');
    declineBtn.className = 'friend-action-btn danger-btn';
    declineBtn.textContent = 'Decline';
    declineBtn.onclick = () => handleDeclineFriendRequest(request.from);

    actions.appendChild(acceptBtn);
    actions.appendChild(declineBtn);

    card.appendChild(info);
    card.appendChild(actions);

    return card;
}

/**
 * Create outgoing friend request card
 */
function createOutgoingRequestCard(request) {
    const card = document.createElement('div');
    card.className = 'friend-card';

    const info = document.createElement('div');
    info.className = 'friend-info';

    const name = document.createElement('div');
    name.className = 'friend-name';
    name.textContent = request.displayName || 'Player';

    const phoneNumber = document.createElement('div');
    phoneNumber.className = 'friend-username';
    phoneNumber.textContent = formatPhoneNumberForDisplay(request.phoneNumber);

    info.appendChild(name);
    info.appendChild(phoneNumber);

    const actions = document.createElement('div');
    actions.className = 'friend-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'friend-action-btn danger-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => handleCancelFriendRequest(request.to);

    actions.appendChild(cancelBtn);

    card.appendChild(info);
    card.appendChild(actions);

    return card;
}

/**
 * Handle friend search
 */
async function handleFriendSearch() {
    try {
        const friendSearchCountryCode = document.getElementById('friendSearchCountryCode');
        const phoneDigits = friendSearchInput.value.replace(/\D/g, ''); // Extract only digits
        const phoneNumber = friendSearchCountryCode.value + phoneDigits;

        if (!phoneDigits || phoneDigits.length < 7) {
            friendSearchError.textContent = 'Please enter a valid phone number';
            return;
        }

        searchFriendBtn.disabled = true;
        searchFriendBtn.textContent = 'Searching...';
        friendSearchError.textContent = '';
        friendSearchResults.innerHTML = '';

        const user = await searchUserByPhoneNumber(phoneNumber);

        if (!user) {
            friendSearchError.textContent = 'User not found';
            searchFriendBtn.disabled = false;
            searchFriendBtn.textContent = 'Search';
            return;
        }

        // Display search result
        const resultCard = createSearchResultCard(user);
        friendSearchResults.appendChild(resultCard);

        searchFriendBtn.disabled = false;
        searchFriendBtn.textContent = 'Search';
    } catch (error) {
        console.error('Error searching for friend:', error);
        friendSearchError.textContent = error.message || 'Error searching for user';
        searchFriendBtn.disabled = false;
        searchFriendBtn.textContent = 'Search';
    }
}

/**
 * Create search result card
 */
function createSearchResultCard(user) {
    const card = document.createElement('div');
    card.className = 'friend-card';

    const info = document.createElement('div');
    info.className = 'friend-info';

    const name = document.createElement('div');
    name.className = 'friend-name';
    name.textContent = user.displayName || user.firstName || 'Player';

    const phoneNumber = document.createElement('div');
    phoneNumber.className = 'friend-username';
    phoneNumber.textContent = formatPhoneNumberForDisplay(user.phoneNumber);

    info.appendChild(name);
    info.appendChild(phoneNumber);

    const actions = document.createElement('div');
    actions.className = 'friend-actions';

    const addBtn = document.createElement('button');
    addBtn.className = 'friend-action-btn';
    addBtn.textContent = 'Add Friend';
    addBtn.onclick = () => handleSendFriendRequest(user.phoneNumber, addBtn);

    actions.appendChild(addBtn);

    card.appendChild(info);
    card.appendChild(actions);

    return card;
}

/**
 * Handle send friend request
 */
async function handleSendFriendRequest(phoneNumber, button) {
    try {
        button.disabled = true;
        button.textContent = 'Sending...';

        await sendFriendRequest(phoneNumber);

        button.textContent = 'Request Sent!';
        button.classList.add('disabled');

        // Refresh requests list
        setTimeout(() => {
            loadFriendRequests();
        }, 500);
    } catch (error) {
        console.error('Error sending friend request:', error);
        showNotification(error.message || 'Error sending friend request', 'Error', '⚠️');
        button.disabled = false;
        button.textContent = 'Add Friend';
    }
}

/**
 * Handle accept friend request
 */
async function handleAcceptFriendRequest(fromUid) {
    try {
        await acceptFriendRequest(fromUid);
        await loadFriendRequests();
        await loadFriendsList();
        showNotification('Friend request accepted!', 'Success');
    } catch (error) {
        console.error('Error accepting friend request:', error);
        showNotification(error.message || 'Error accepting friend request', 'Error', '⚠️');
    }
}

/**
 * Handle decline friend request
 */
async function handleDeclineFriendRequest(fromUid) {
    try {
        await declineFriendRequest(fromUid);
        await loadFriendRequests();
        showNotification('Friend request declined', 'Declined');
    } catch (error) {
        console.error('Error declining friend request:', error);
        showNotification(error.message || 'Error declining friend request', 'Error', '⚠️');
    }
}

/**
 * Handle cancel friend request
 */
async function handleCancelFriendRequest(toUid) {
    try {
        await cancelFriendRequest(toUid);
        await loadFriendRequests();
        showNotification('Friend request cancelled', 'Cancelled');
    } catch (error) {
        console.error('Error cancelling friend request:', error);
        showNotification(error.message || 'Error cancelling friend request', 'Error', '⚠️');
    }
}

/**
 * Handle remove friend
 */
async function handleRemoveFriend(friend) {
    try {
        const confirmed = await showConfirm(
            `Remove ${friend.displayName} from your friends list?`,
            'Remove Friend'
        );
        if (!confirmed) return;

        await removeFriend(friend.uid);
        await loadFriendsList();
        showNotification('Friend removed', 'Removed');
    } catch (error) {
        console.error('Error removing friend:', error);
        showNotification(error.message || 'Error removing friend', 'Error', '⚠️');
    }
}

/**
 * Load and display game invites
 */
async function loadGameInvites() {
    try {
        const invites = await getGameInvites();

        if (invites.length === 0) {
            // Hide invites section when no invites
            if (gameInvitesSection) {
                gameInvitesSection.style.display = 'none';
            }
            if (invitesCountBadge2) {
                invitesCountBadge2.style.display = 'none';
            }
            return;
        }

        // Show invites section and update count
        if (gameInvitesSection) {
            gameInvitesSection.style.display = 'block';
        }
        if (invitesCountBadge2) {
            invitesCountBadge2.textContent = invites.length;
            invitesCountBadge2.style.display = 'inline-block';
        }

        // Create invite cards
        if (gameInvitesList) {
            gameInvitesList.innerHTML = '';
            invites.forEach(invite => {
                const card = createGameInviteCard(invite);
                gameInvitesList.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Error loading game invites:', error);
    }
}

/**
 * Create game invite card
 */
function createGameInviteCard(invite) {
    const card = document.createElement('div');
    card.className = 'friend-card';

    const info = document.createElement('div');
    info.className = 'friend-info';

    const title = document.createElement('div');
    title.className = 'friend-name';
    title.textContent = `${invite.from.displayName} invited you to a game`;

    const gameCode = document.createElement('div');
    gameCode.className = 'friend-username';
    gameCode.textContent = `Game Code: ${invite.gameCode}`;

    info.appendChild(title);
    info.appendChild(gameCode);

    const actions = document.createElement('div');
    actions.className = 'friend-actions';

    const joinBtn = document.createElement('button');
    joinBtn.className = 'friend-action-btn';
    joinBtn.textContent = 'Join Game';
    joinBtn.onclick = () => handleAcceptGameInvite(invite.id, invite.gameCode);

    const declineBtn = document.createElement('button');
    declineBtn.className = 'friend-action-btn danger-btn';
    declineBtn.textContent = 'Decline';
    declineBtn.onclick = () => handleDeclineGameInvite(invite.id);

    actions.appendChild(joinBtn);
    actions.appendChild(declineBtn);

    card.appendChild(info);
    card.appendChild(actions);

    return card;
}

/**
 * Handle accept game invite
 */
async function handleAcceptGameInvite(inviteId, gameCode) {
    try {
        await acceptGameInvite(inviteId);
        // Store player name and auto-join
        const playerName = currentUserFirstName;
        sessionStorage.setItem('playerName', playerName);
        checkGameExists(gameCode, playerName);
        closeFriendsModal();
    } catch (error) {
        console.error('Error accepting game invite:', error);
        showNotification(error.message || 'Error joining game', 'Error', '⚠️');
        await loadGameInvites();
    }
}

/**
 * Handle decline game invite
 */
async function handleDeclineGameInvite(inviteId) {
    try {
        await declineGameInvite(inviteId);
        await loadGameInvites();
    } catch (error) {
        console.error('Error declining game invite:', error);
        showNotification(error.message || 'Error declining invite', 'Error', '⚠️');
    }
}

/**
 * Update all friends-related badges
 */
async function updateFriendsBadges() {
    try {
        const requestCount = await getFriendRequestCount();

        // Update main friends button badge
        if (requestCount > 0) {
            friendRequestsCount.textContent = requestCount;
            friendRequestsCount.style.display = 'inline-block';
        } else {
            friendRequestsCount.style.display = 'none';
        }

        // Update requests tab badge
        if (requestCount > 0) {
            requestsCountBadge.textContent = requestCount;
            requestsCountBadge.style.display = 'inline-block';
        } else {
            requestsCountBadge.style.display = 'none';
        }

        // Update bottom nav friends badge
        if (requestCount > 0 && friendsNavBadge) {
            friendsNavBadge.textContent = requestCount;
            friendsNavBadge.style.display = 'inline-flex';
        } else if (friendsNavBadge) {
            friendsNavBadge.style.display = 'none';
        }
    } catch (error) {
        console.error('Error updating friends badges:', error);
    }
}

/**
 * Load friends data on page load for logged-in users
 */
async function loadFriendsData() {
    if (currentUser && currentUserFirstName) {
        // Phone users always have phone numbers, no validation needed
        // Show friends button
        if (friendsBtn) {
            friendsBtn.style.display = 'flex';
        }

        // Friends nav button is always visible, no need to show/hide

        // Update badges
        await updateFriendsBadges();
        await loadActiveGames(); // Also load active games (includes invites)

        // Set up periodic badge updates
        setInterval(async () => {
            await updateFriendsBadges();
            await loadActiveGames();
        }, 30000); // Update every 30 seconds
    }
}

console.log('Landing page ready!');

