// Five Crowns - Landing Page JavaScript
// Handles Create Game, Join Game, and navigation

console.log('Five Crowns app loaded!');

// Global variables for current user
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

// Menu Elements
const menuButton = document.getElementById('menuButton');
const menuDropdown = document.getElementById('menuDropdown');
const menuUserInfo = document.getElementById('menuUserInfo');
const menuUserName = document.getElementById('menuUserName');
const menuDivider = document.getElementById('menuDivider');
const menuSignIn = document.getElementById('menuSignIn');
const menuSignUp = document.getElementById('menuSignUp');
const menuSignOut = document.getElementById('menuSignOut');

// Auth Modal Elements
const authModal = document.getElementById('authModal');
const authModalTitle = document.getElementById('authModalTitle');
const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
const loginFormContent = document.getElementById('loginFormContent');
const signupFormContent = document.getElementById('signupFormContent');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const signupFirstName = document.getElementById('signupFirstName');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const signupBtn = document.getElementById('signupBtn');
const signupError = document.getElementById('signupError');
const showSignupLink = document.getElementById('showSignupLink');
const showLoginLink = document.getElementById('showLoginLink');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');

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

// Check for join parameter in URL
const urlParams = new URLSearchParams(window.location.search);
const joinCode = urlParams.get('join');

// Auth State Listener - Update UI based on login state
auth.onAuthStateChanged(async (user) => {
    console.log('Auth state changed:', user ? user.uid : 'No user');

    if (user) {
        // User is logged in
        currentUser = user;

        // Get user's first name from Firestore
        try {
            currentUserFirstName = await getUserFirstName(user.uid);
            console.log('User first name:', currentUserFirstName);

            // Update menu UI
            if (menuUserName) menuUserName.textContent = currentUserFirstName;
            if (menuUserInfo) menuUserInfo.style.display = 'block';
            if (menuDivider) menuDivider.style.display = 'block';
            if (menuSignIn) menuSignIn.style.display = 'none';
            if (menuSignUp) menuSignUp.style.display = 'none';
            if (menuSignOut) menuSignOut.style.display = 'block';

            // Load and display active games
            await loadActiveGames();

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
        } catch (error) {
            console.error('Error getting user data:', error);
            currentUserFirstName = user.displayName || 'Player';
            if (menuUserName) menuUserName.textContent = currentUserFirstName;
            if (menuUserInfo) menuUserInfo.style.display = 'block';
            if (menuDivider) menuDivider.style.display = 'block';
            if (menuSignIn) menuSignIn.style.display = 'none';
            if (menuSignUp) menuSignUp.style.display = 'none';
            if (menuSignOut) menuSignOut.style.display = 'block';
        }
    } else {
        // No user logged in - show sign in/up options
        console.log('No user logged in');
        if (menuUserInfo) menuUserInfo.style.display = 'none';
        if (menuDivider) menuDivider.style.display = 'none';
        if (menuSignIn) menuSignIn.style.display = 'block';
        if (menuSignUp) menuSignUp.style.display = 'block';
        if (menuSignOut) menuSignOut.style.display = 'none';
        if (activeGamesBtn) activeGamesBtn.style.display = 'none';
    }
});

// Verify DOM elements loaded
console.log('DOM elements:', {
    createGameBtn: !!createGameBtn,
    joinGameBtn: !!joinGameBtn,
    howToPlayBtn: !!howToPlayBtn,
    menuButton: !!menuButton,
    authModal: !!authModal,
    closeAuthModalBtn: !!closeAuthModalBtn
});

// Event Listeners
if (createGameBtn) {
    createGameBtn.addEventListener('click', handleCreateGameClick);
    console.log('Create game button listener added');
} else {
    console.error('Create game button not found!');
}

if (joinGameBtn) {
    joinGameBtn.addEventListener('click', openJoinModal);
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

// Menu button toggle
if (menuButton) {
    menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        menuDropdown.classList.toggle('active');
    });
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (menuDropdown && !menuButton.contains(e.target) && !menuDropdown.contains(e.target)) {
        menuDropdown.classList.remove('active');
    }
});

// Menu item actions
if (menuSignIn) {
    menuSignIn.addEventListener('click', () => {
        menuDropdown.classList.remove('active');
        showAuthModal('login');
    });
}

if (menuSignUp) {
    menuSignUp.addEventListener('click', () => {
        menuDropdown.classList.remove('active');
        showAuthModal('signup');
    });
}

if (menuSignOut) {
    menuSignOut.addEventListener('click', async () => {
        menuDropdown.classList.remove('active');
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

// Auth Modal Event Listeners
console.log('Setting up auth modal listeners...');
if (closeAuthModalBtn) {
    console.log('Close button found, adding listener');
    closeAuthModalBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Close button clicked');
        closeAuthModal();
    });
} else {
    console.error('closeAuthModalBtn not found!');
}

if (authModal) {
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
            closeAuthModal();
        }
    });
}

// Toggle between login and signup
if (showSignupLink) {
    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Switching to signup form');
        showAuthModal('signup');
    });
}

if (showLoginLink) {
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Switching to login form');
        showAuthModal('login');
    });
}

// Login form submission
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const email = loginEmail.value.trim();
        const password = loginPassword.value;

        if (!email || !password) {
            showAuthError(loginError, 'Please fill in all fields');
            return;
        }

        loginBtn.disabled = true;
        loginBtn.textContent = 'Signing in...';

        try {
            await signInUser(email, password);
            closeAuthModal();
            // Auth state listener will handle the redirect
        } catch (error) {
            console.error('Login error:', error);
            showAuthError(loginError, getAuthErrorMessage(error));
            loginBtn.disabled = false;
            loginBtn.textContent = 'Sign In';
        }
    });
}

// Signup form submission
if (signupBtn) {
    signupBtn.addEventListener('click', async () => {
        const firstName = signupFirstName.value.trim();
        const email = signupEmail.value.trim();
        const password = signupPassword.value;

        if (!firstName || !email || !password) {
            showAuthError(signupError, 'Please fill in all fields');
            return;
        }

        if (firstName.length < 2) {
            showAuthError(signupError, 'First name must be at least 2 characters');
            return;
        }

        if (password.length < 6) {
            showAuthError(signupError, 'Password must be at least 6 characters');
            return;
        }

        signupBtn.disabled = true;
        signupBtn.textContent = 'Creating account...';

        try {
            await signUpUser(email, password, firstName);
            closeAuthModal();
            // Auth state listener will handle the redirect
        } catch (error) {
            console.error('Signup error:', error);
            showAuthError(signupError, getAuthErrorMessage(error));
            signupBtn.disabled = false;
            signupBtn.textContent = 'Create Account';
        }
    });
}

// Forgot password
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = loginEmail.value.trim();

        if (!email) {
            showAuthError(loginError, 'Please enter your email address first');
            return;
        }

        try {
            await sendPasswordReset(email);
            showAuthError(loginError, '✅ Password reset email sent! Check your inbox.');
            loginError.style.color = '#4ade80';
        } catch (error) {
            showAuthError(loginError, getAuthErrorMessage(error));
        }
    });
}

// Enter key handlers for auth modal
if (loginPassword) {
    loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loginBtn.click();
    });
}

if (signupPassword) {
    signupPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') signupBtn.click();
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
 * Handle create game click - requires authentication
 */
function handleCreateGameClick() {
    console.log('Create game clicked');

    if (!currentUser || !currentUserFirstName) {
        // Store the intended action and show login modal
        pendingAction = 'createGame';
        showAuthModal('login');
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
        // Store the intended action and show login modal
        pendingAction = 'joinGame';
        showAuthModal('login');
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
// Auth Modal Functions
// ======================

/**
 * Show the auth modal (login or signup)
 * @param {string} mode - 'login' or 'signup'
 */
function showAuthModal(mode = 'login') {
    console.log('showAuthModal called with mode:', mode);

    if (mode === 'signup') {
        console.log('Showing signup form');
        if (loginFormContent) loginFormContent.style.display = 'none';
        if (signupFormContent) signupFormContent.style.display = 'block';
        if (authModalTitle) authModalTitle.textContent = 'Create Account';
    } else {
        console.log('Showing login form');
        if (loginFormContent) loginFormContent.style.display = 'block';
        if (signupFormContent) signupFormContent.style.display = 'none';
        if (authModalTitle) authModalTitle.textContent = 'Sign In';
    }

    // Clear any errors
    if (loginError) loginError.textContent = '';
    if (signupError) signupError.textContent = '';

    // Clear inputs only when opening fresh
    if (!authModal.classList.contains('active')) {
        if (loginEmail) loginEmail.value = '';
        if (loginPassword) loginPassword.value = '';
        if (signupFirstName) signupFirstName.value = '';
        if (signupEmail) signupEmail.value = '';
        if (signupPassword) signupPassword.value = '';
    }

    if (authModal) authModal.classList.add('active');

    // Focus on first input
    setTimeout(() => {
        if (mode === 'signup') {
            if (signupFirstName) signupFirstName.focus();
        } else {
            if (loginEmail) loginEmail.focus();
        }
    }, 100);
}

/**
 * Close the auth modal
 */
function closeAuthModal() {
    console.log('Closing auth modal');
    if (authModal) {
        authModal.classList.remove('active');
    }
    if (loginError) loginError.textContent = '';
    if (signupError) signupError.textContent = '';
}

/**
 * Show error in auth modal
 */
function showAuthError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
}

// ======================
// Active Games Functions
// ======================

/**
 * Load active games and update UI
 */
async function loadActiveGames() {
    try {
        console.log('Loading active games...');

        // Clean up stale games and get valid ones
        const validGames = await cleanupStaleGames();

        console.log('Valid active games:', validGames.length);

        // Update button visibility
        if (validGames.length > 0) {
            activeGamesBtn.style.display = 'flex';
            activeGamesCount.textContent = validGames.length;
        } else {
            activeGamesBtn.style.display = 'none';
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
                const aTime = a.lastUpdated?.toMillis?.() || 0;
                const bTime = b.lastUpdated?.toMillis?.() || 0;
                return bTime - aTime;
            });

            // Create game cards
            validGames.forEach(game => {
                const card = createActiveGameCard(game);
                activeGamesList.appendChild(card);
            });
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
}

/**
 * Create an active game card element
 * @param {object} game - Game data
 * @returns {HTMLElement} Game card element
 */
function createActiveGameCard(game) {
    const card = document.createElement('div');
    card.className = 'active-game-card';

    // Header with code and status
    const header = document.createElement('div');
    header.className = 'active-game-header';

    const code = document.createElement('div');
    code.className = 'active-game-code';
    code.textContent = game.gameCode;

    const status = document.createElement('div');
    status.className = `active-game-status ${game.status}`;
    status.textContent = game.status === 'waiting' ? 'Lobby' : 'In Progress';

    header.appendChild(code);
    header.appendChild(status);

    // Game info
    const info = document.createElement('div');
    info.className = 'active-game-info';
    info.innerHTML = `<strong>Playing as:</strong> ${game.playerName}`;

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

// Initialize
console.log('Landing page ready!');

