// Five Crowns - Game Board JavaScript
// Handles game state, card interactions, and real-time gameplay

console.log('🎮 GAME.JS LOADED - You are on game.html');

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

function showConfirmModal(message, title = 'Confirm') {
    return new Promise((resolve) => {
        const confirmModal = document.getElementById('confirmModal');
        const confirmTitle = document.getElementById('confirmTitle');
        const confirmMessage = document.getElementById('confirmMessage');
        const confirmOkBtn = document.getElementById('confirmOkBtn');
        const confirmCancelBtn = document.getElementById('confirmCancelBtn');

        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        confirmModal.classList.add('active');

        const closeModal = (result) => {
            confirmModal.classList.remove('active');
            resolve(result);
        };

        confirmOkBtn.onclick = () => closeModal(true);
        confirmCancelBtn.onclick = () => closeModal(false);
        confirmModal.onclick = (e) => {
            if (e.target === confirmModal) closeModal(false);
        };
    });
}

// Get game info from URL and session
const urlParams = new URLSearchParams(window.location.search);
const gameCode = urlParams.get('code');
const playerId = sessionStorage.getItem('playerId');
const playerName = sessionStorage.getItem('playerName');

// Check if we have valid game info
if (!gameCode || !playerId) {
    console.error('Missing game code or player ID');
    showErrorModal('Invalid game session. Returning to home.');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 2000);
}

// DOM Elements
const roundNumber = document.getElementById('roundNumber');
const wildCard = document.getElementById('wildCard');
const yourScore = document.getElementById('yourScore');
const menuBtn = document.getElementById('menuBtn');

// const otherPlayers = document.getElementById('otherPlayers'); // Removed - not needed
const deckArea = document.getElementById('deckArea');
const discardArea = document.getElementById('discardArea');
const discardPile = document.getElementById('discardPile');
const deckCount = document.getElementById('deckCount');
const turnInstruction = document.getElementById('turnInstruction');

const handCardsContainer = document.getElementById('handCardsContainer');
const handCards = document.getElementById('handCards');
const handCount = document.getElementById('handCount');
const discardBtn = document.getElementById('discardBtn');
const goOutBtn = document.getElementById('goOutBtn');

const gameMenuModal = document.getElementById('gameMenuModal');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const viewScoresBtn = document.getElementById('viewScoresBtn');
const viewRulesBtn = document.getElementById('viewRulesBtn');
const settingsMenuBtn = document.getElementById('settingsMenuBtn');
const leaveGameBtn = document.getElementById('leaveGameBtn');

const rulesModal = document.getElementById('rulesModal');
const closeRulesBtn = document.getElementById('closeRulesBtn');

const errorModal = document.getElementById('errorModal');
const closeErrorBtn = document.getElementById('closeErrorBtn');
const errorMessage = document.getElementById('errorMessage');
const errorOkBtn = document.getElementById('errorOkBtn');

const roundEndModal = document.getElementById('roundEndModal');
const roundEndTitle = document.getElementById('roundEndTitle');
const roundEndContent = document.getElementById('roundEndContent');
const roundEndMessage = document.getElementById('roundEndMessage');
const continueRoundBtn = document.getElementById('continueRoundBtn');
const waitingMessage = document.getElementById('waitingMessage');

const gameEndModal = document.getElementById('gameEndModal');
const winnerMessage = document.getElementById('winnerMessage');
const finalScores = document.getElementById('finalScores');
const returnHomeBtn = document.getElementById('returnHomeBtn');

const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const closeSettingsOkBtn = document.getElementById('closeSettingsOkBtn');
const cardDesignSelector = document.getElementById('cardDesignSelector');
const wildHighlightToggle = document.getElementById('wildHighlightToggle');

// Firebase References
const gameRef = database.ref('games/' + gameCode);
const gameStateRef = gameRef.child('gameState');
const playersRef = gameRef.child('players');
const handStateRef = gameRef.child('playerHandStates/' + playerId);

// Local Game State
let currentGameState = null;
let currentGameData = null; // Full game data including players
let myHand = [];
let isMyTurn = false;
let isHost = false;
let currentRound = 1;
let currentWildRank = '3';
let highlightWilds = true;
let turnPhase = 'WAITING_FOR_DRAW'; // Track current turn phase

/**
 * Helper function to normalize score (handle both number and object formats)
 * Handles corrupted scores from old code versions
 */
function normalizeScore(score) {
    // Handle corrupted string scores like "0[object Object]"
    if (typeof score === 'string') {
        if (score.includes('[object')) {
            return 0;
        }
        const parsed = parseInt(score, 10);
        return isNaN(parsed) ? 0 : parsed;
    }
    // Handle object scores from old code
    if (typeof score === 'object' && score !== null) {
        return score.score || 0;
    }
    return score || 0;
}

// Card Hand Manager
let cardHandManager = null;
let savedHandState = null; // Store hand state loaded from Firebase

// Deck/Discard Manager
let deckDiscardManager = null;

// Track the card drawn from discard pile (to prevent immediate re-discard)
let cardDrawnFromDiscard = null;

// Flag to show custom message and prevent turn indicator override
let customTurnMessage = null;

// Initialize
init();

function init() {
    console.log('Initializing game board...');
    console.log('Game Code:', gameCode);
    console.log('Player ID:', playerId);
    console.log('Player Name:', playerName);

    // Load wild highlighting preference from settings
    if (settingsManager) {
        highlightWilds = settingsManager.getHighlightWilds();
        console.log('Loaded wild highlighting preference:', highlightWilds);
    }

    // Initialize buttons as disabled
    discardBtn.classList.add('btn-disabled');
    goOutBtn.classList.add('btn-disabled');

    setupEventListeners();
    listenToGameState();
    listenToHandState();

    // Don't show demo UI - wait for real Firebase data
    // This prevents double rendering which destroys event listeners
}

/**
 * Initialize the Card Hand Manager
 */
function initializeCardHandManager() {
    // Only initialize once
    if (cardHandManager) {
        console.log('CardHandManager already initialized');
        return;
    }

    console.log('Initializing CardHandManager with highlightWilds:', highlightWilds);
    cardHandManager = new CardHandManager('handCardsContainer', {
        enableMultiStack: true,
        maxStacks: 5,
        enableSorting: true,
        highlightWilds: highlightWilds,
        onSelectionChange: (selectedCards) => {
            console.log('Selection changed:', selectedCards);
            updateActionButtons();
        },
        onStackChange: (stacks) => {
            console.log('Stacks changed:', stacks);
            updateHandCount();
            saveHandState(); // Save hand organization when stacks change
        },
        onCardMove: (card, fromStack, toStack) => {
            console.log('Card moved:', card, 'from', fromStack, 'to', toStack);
            saveHandState(); // Save hand organization when cards are moved
        }
    });
}

/**
 * Initialize the Deck/Discard Manager
 */
function initializeDeckDiscardManager() {
    // Only initialize once
    if (deckDiscardManager) {
        console.log('DeckDiscardManager already initialized');
        return;
    }

    console.log('Initializing DeckDiscardManager');

    const deckArea = document.getElementById('deckArea');
    const discardArea = document.getElementById('discardArea');
    const handContainer = document.getElementById('handCardsContainer');

    deckDiscardManager = new DeckDiscardManager(deckArea, discardArea, handContainer, {
        onDrawFromDeck: handleDrawFromDeck,
        onDrawFromDiscard: handleDrawFromDiscardPile,
        onDiscardDrop: handleDiscardCardDrop,
        canDraw: () => {
            return isMyTurn && (turnPhase === 'WAITING_FOR_DRAW' || turnPhase === 'POST_GO_OUT');
        },
        canDiscard: () => {
            return isMyTurn && (turnPhase === 'CARD_DRAWN' || turnPhase === 'POST_GO_OUT_CARD_DRAWN');
        }
    });

    // Don't call updateDeckDiscardState() here - it will be called from updateGameUI()
    // after we know the actual turn state from Firebase
}

/**
 * Update deck/discard manager state based on turn phase
 */
function updateDeckDiscardState() {
    if (!deckDiscardManager) {
        console.log('updateDeckDiscardState: deckDiscardManager not initialized');
        return;
    }

    console.log('updateDeckDiscardState: isMyTurn =', isMyTurn, ', turnPhase =', turnPhase);

    // Handle POST_GO_OUT phase - players still need to draw and discard
    if (isMyTurn && turnPhase === 'POST_GO_OUT') {
        console.log('updateDeckDiscardState: POST_GO_OUT phase - enabling drawing (final turn)');
        deckDiscardManager.enableDrawing();
        deckDiscardManager.disableDiscard();
    } else if (isMyTurn && turnPhase === 'POST_GO_OUT_CARD_DRAWN') {
        console.log('updateDeckDiscardState: POST_GO_OUT_CARD_DRAWN phase - enabling discard');
        deckDiscardManager.disableDrawing();
        deckDiscardManager.enableDiscard();
    } else if (isMyTurn && turnPhase === 'WAITING_FOR_DRAW') {
        console.log('updateDeckDiscardState: Enabling drawing');
        deckDiscardManager.enableDrawing();
        deckDiscardManager.disableDiscard();
    } else if (isMyTurn && turnPhase === 'CARD_DRAWN') {
        console.log('updateDeckDiscardState: Enabling discard');
        deckDiscardManager.disableDrawing();
        deckDiscardManager.enableDiscard();
    } else {
        console.log('updateDeckDiscardState: Disabling both (not your turn or wrong phase)');
        deckDiscardManager.disableDrawing();
        deckDiscardManager.disableDiscard();
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Menu
    menuBtn.addEventListener('click', openGameMenu);
    closeMenuBtn.addEventListener('click', closeGameMenu);
    viewScoresBtn.addEventListener('click', showScores);
    viewRulesBtn.addEventListener('click', showRules);
    settingsMenuBtn.addEventListener('click', openSettingsFromMenu);
    leaveGameBtn.addEventListener('click', confirmLeaveGame);

    // Deck and Discard - now handled by DeckDiscardManager
    // (removed old listeners)

    // Hand Actions
    discardBtn.addEventListener('click', handleDiscardCard);
    goOutBtn.addEventListener('click', handleGoOut);

    // Rules modal
    closeRulesBtn.addEventListener('click', closeRulesModal);

    // Settings modal
    closeSettingsBtn.addEventListener('click', closeSettingsModal);
    closeSettingsOkBtn.addEventListener('click', closeSettingsModal);

    // Error modal
    closeErrorBtn.addEventListener('click', closeErrorModal);
    errorOkBtn.addEventListener('click', closeErrorModal);

    // Round end modal
    continueRoundBtn.addEventListener('click', startNextRound);

    // Game end modal
    returnHomeBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // Close modal on outside click
    gameMenuModal.addEventListener('click', (e) => {
        if (e.target === gameMenuModal) {
            closeGameMenu();
        }
    });

    errorModal.addEventListener('click', (e) => {
        if (e.target === errorModal) {
            closeErrorModal();
        }
    });

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeSettingsModal();
        }
    });

    // Initialize settings UI
    initializeSettingsUI();
}

/**
 * Listen to real-time game state changes
 */
function listenToGameState() {
    let isFirstLoad = true;
    let retryCount = 0;
    const MAX_RETRIES = 5;

    gameRef.on('value', (snapshot) => {
        if (!snapshot.exists()) {
            console.error('Game not found');

            // On first load, retry multiple times before showing error
            // This handles race conditions when redirecting from lobby
            if (isFirstLoad && retryCount < MAX_RETRIES) {
                const delay = Math.min(1000 * Math.pow(1.5, retryCount), 3000); // Exponential backoff, max 3s
                retryCount++;

                setTimeout(() => {
                    gameRef.once('value').then((retrySnapshot) => {
                        if (!retrySnapshot.exists() && retryCount >= MAX_RETRIES) {
                            console.error('Game not found after retries');
                            showErrorAndRedirect('Game no longer exists. Returning to home.');
                        } else if (retrySnapshot.exists()) {
                            isFirstLoad = false;
                        }
                    });
                }, delay);
                return;
            }

            // If not first load or exhausted retries, game was deleted
            if (!isFirstLoad || retryCount >= MAX_RETRIES) {
                showErrorAndRedirect('Game no longer exists. Returning to home.');
            }
            return;
        }

        isFirstLoad = false;
        retryCount = 0; // Reset retry count on successful connection
        const gameData = snapshot.val();
        currentGameState = gameData.gameState;
        currentGameData = gameData; // Store full game data for access to players

        // Store host info
        isHost = (gameData.host === playerId);

        // Get highlight wilds setting
        highlightWilds = gameData.highlightWilds !== false; // Default to true

        console.log('Game state updated:', currentGameState);
        console.log('Highlight wilds:', highlightWilds);
        console.log('Is host:', isHost);

        // Initialize card hand manager on FIRST callback (once per page load)
        if (!cardHandManager) {
            console.log('First Firebase callback - initializing CardHandManager');
            initializeCardHandManager();
        }

        // Initialize deck/discard manager on FIRST callback
        if (!deckDiscardManager) {
            console.log('First Firebase callback - initializing DeckDiscardManager');
            try {
                initializeDeckDiscardManager();
            } catch (error) {
                console.error('Error initializing DeckDiscardManager:', error);
                console.log('Continuing without DeckDiscardManager - some features may not work');
            }
        }

        // Update UI if game has actually started
        if (currentGameState && gameData.status === 'playing') {
            updateGameUI();
        }
    });
}

/**
 * Listen to hand state changes (card organization)
 */
function listenToHandState() {
    handStateRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            savedHandState = snapshot.val();
            console.log('Hand state loaded from Firebase:', savedHandState);

            // If cards are already loaded, restore the state immediately
            if (cardHandManager && myHand.length > 0) {
                cardHandManager.restoreHandState(savedHandState);
            }
        } else {
            console.log('No saved hand state found');
            savedHandState = null;
        }
    });
}

/**
 * Save current hand state (card organization) to Firebase
 */
function saveHandState() {
    if (!cardHandManager) return;

    const handState = cardHandManager.getHandState();
    console.log('Saving hand state to Firebase:', handState);
    console.log('Number of stacks:', handState.stacks.length);
    handState.stacks.forEach((stack, i) => {
        console.log(`  Stack ${i}: ${stack.name}, ${stack.cardIds.length} cards, isDefault: ${stack.isDefault}`);
    });

    handStateRef.set(handState)
        .then(() => {
            console.log('Hand state saved successfully');
        })
        .catch((error) => {
            console.error('Error saving hand state:', error);
        });
}

/**
 * Update game UI based on current state
 */
function updateGameUI() {
    console.log('=== UPDATE GAME UI ===');
    console.log('Current game state:', currentGameState);

    // Update round info
    currentRound = currentGameState.currentRound || 1;
    roundNumber.textContent = currentRound;

    // Update wild card
    const wildRanks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    currentWildRank = wildRanks[currentRound - 1];
    wildCard.textContent = currentWildRank + 's';

    // Update deck count
    const remainingCards = currentGameState.deck ? currentGameState.deck.length : 0;
    console.log('Deck has', remainingCards, 'cards');
    if (deckCount) {
        deckCount.textContent = remainingCards;
    }

    // Update discard pile
    if (currentGameState.discardPile && currentGameState.discardPile.length > 0) {
        const topCard = currentGameState.discardPile[currentGameState.discardPile.length - 1];
        console.log('Top discard card:', topCard);
        updateDiscardPile(topCard);
    } else {
        // Clear discard pile display if empty
        discardPile.innerHTML = '';
    }

    // Update my hand
    if (currentGameState.playerHands && currentGameState.playerHands[playerId]) {
        myHand = currentGameState.playerHands[playerId];
        console.log('My hand has', myHand.length, 'cards');
        renderMyHand();

        // Update wild rank in card hand manager
        if (cardHandManager) {
            cardHandManager.setWildRank(currentWildRank);
        }
    }

    // Update turn indicator
    isMyTurn = (currentGameState.currentPlayer === playerId);
    console.log('Is my turn?', isMyTurn, '(current player:', currentGameState.currentPlayer, ', my ID:', playerId + ')');

    // Sync turn phase from Firebase (default to WAITING_FOR_DRAW if not set)
    const newTurnPhase = currentGameState.turnPhase || 'WAITING_FOR_DRAW';
    console.log('Turn phase from Firebase:', newTurnPhase);
    updateGamePhase(newTurnPhase);

    // Check if round ended
    if (newTurnPhase === 'ROUND_ENDED') {
        handleRoundEnd();
    } else {
        // If we're back to playing (new round started), close the round end modal
        if (roundEndModal.classList.contains('active')) {
            roundEndModal.classList.remove('active');
            roundEndHandled = false; // Reset for next round end
        }
    }

    updateTurnIndicator();

    // Update other players - REMOVED (UI element removed from HTML)
    // renderOtherPlayers();

    // Update score display
    if (currentGameState.playerScores && currentGameState.playerScores[playerId]) {
        yourScore.textContent = normalizeScore(currentGameState.playerScores[playerId]);
    }
}

/**
 * Initialize demo game for UI testing
 */
function initializeDemoGame() {
    console.log('Initializing demo game for UI testing...');

    // Round 1: 3 cards, 3s are wild
    currentRound = 1;
    currentWildRank = '3';

    // Demo hand - More cards for testing multi-stack
    myHand = [
        { rank: '5', suit: 'hearts', id: '5-hearts' },
        { rank: '7', suit: 'diamonds', id: '7-diamonds' },
        { rank: '9', suit: 'clubs', id: '9-clubs' },
        { rank: '3', suit: 'spades', id: '3-spades' },
        { rank: 'J', suit: 'hearts', id: 'J-hearts' },
        { rank: 'Q', suit: 'diamonds', id: 'Q-diamonds' },
        { rank: 'K', suit: 'clubs', id: 'K-clubs' },
        { rank: '5', suit: 'spades', id: '5-spades' },
        { rank: '5', suit: 'diamonds', id: '5-diamonds' }
    ];

    // Initialize card hand manager if not already done
    if (!cardHandManager) {
        initializeCardHandManager();
    }

    renderMyHand();
    roundNumber.textContent = currentRound;
    wildCard.textContent = currentWildRank + 's';

    // Set wild rank in card hand manager
    if (cardHandManager) {
        cardHandManager.setWildRank(currentWildRank);
    }

    // Set as "your turn" for testing
    isMyTurn = true;
    updateTurnIndicator();
}

/**
 * Render my hand of cards using CardHandManager
 */
function renderMyHand() {
    if (cardHandManager) {
        console.log('renderMyHand() called with', myHand.length, 'cards');
        console.log('savedHandState exists:', !!savedHandState);

        // If we have saved hand state, skip the initial render and let restore handle it
        const skipInitialRender = !!savedHandState;

        // Set cards in the default stack
        cardHandManager.setCards(myHand, 'default', skipInitialRender);

        // Restore saved hand organization if available
        if (savedHandState) {
            console.log('Restoring saved hand state');
            try {
                cardHandManager.restoreHandState(savedHandState);
            } catch (error) {
                console.error('Error restoring hand state:', error);
                // If restore fails, just render with default stack
                cardHandManager.render();
            }
        } else {
            // No saved state - reset to only default stack
            console.log('No saved state, resetting to default stack only');
            // Clear all non-default stacks
            const allStacks = [...cardHandManager.stacks];
            allStacks.forEach(stack => {
                if (!stack.isDefault) {
                    cardHandManager.deleteStack(stack.id);
                }
            });
            cardHandManager.render();
        }

        updateHandCount();
    }
}

/**
 * Update hand count display
 */
function updateHandCount() {
    if (cardHandManager) {
        const allCards = cardHandManager.getAllCards();
        handCount.textContent = allCards.length;
    } else {
        handCount.textContent = myHand.length;
    }
}

/**
 * Create a simple card DOM element (for discard pile, etc.)
 */
function createCardElement(card) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.dataset.cardId = card.id;

    // Check if card is wild (only add class if highlighting is enabled)
    if (highlightWilds && card.rank === currentWildRank) {
        cardDiv.classList.add('wild');
    }

    // Special handling for Joker cards
    if (card.rank === 'Joker') {
        // For jokers, just show the joker emoji centered
        const content = document.createElement('div');
        content.className = 'card-content';

        const jokerSymbol = document.createElement('span');
        jokerSymbol.className = 'card-suit joker';
        jokerSymbol.textContent = '🃏';
        jokerSymbol.style.fontSize = '48px'; // Make it larger

        content.appendChild(jokerSymbol);
        cardDiv.appendChild(content);
    } else {
        // Regular cards
        // Corner rank (top-left)
        const cornerRank = document.createElement('div');
        cornerRank.className = 'card-corner ' + card.suit;
        cornerRank.innerHTML = `<span class="corner-rank">${card.rank}</span><span class="corner-suit">${getSuitSymbol(card.suit)}</span>`;
        cardDiv.appendChild(cornerRank);

        // Center content
        const content = document.createElement('div');
        content.className = 'card-content';

        const rank = document.createElement('span');
        rank.className = 'card-rank ' + card.suit;
        rank.textContent = card.rank;

        const suit = document.createElement('span');
        suit.className = 'card-suit ' + card.suit;
        suit.textContent = getSuitSymbol(card.suit);

        content.appendChild(rank);
        content.appendChild(suit);
        cardDiv.appendChild(content);
    }

    return cardDiv;
}

/**
 * Get suit symbol
 */
function getSuitSymbol(suit) {
    const symbols = {
        'spades': '♠',
        'hearts': '♥',
        'diamonds': '♦',
        'clubs': '♣',
        'stars': '⭐',
        'joker': '🃏'  // Joker symbol
    };
    return symbols[suit] || '?';
}

/**
 * Handle card click (selection) - Now handled by CardHandManager
 * This function is kept for backward compatibility
 */
function handleCardClick(card, cardElement) {
    // This is now handled by CardHandManager
    console.log('Card clicked:', card);
}

/**
 * Update action button states
 */
function updateActionButtons() {
    if (!cardHandManager) {
        discardBtn.classList.add('btn-disabled');
        goOutBtn.classList.add('btn-disabled');
        return;
    }

    const selectedCards = cardHandManager.getSelectedCards();

    // Check if we're in POST_GO_OUT phase
    const isPostGoOutPhase = (turnPhase === 'POST_GO_OUT' || turnPhase === 'POST_GO_OUT_CARD_DRAWN');
    const isWaitingForGoOut = turnPhase === 'WAITING_FOR_GO_OUT';
    const wasPreviousPlayer = currentGameState && currentGameState.previousPlayer === playerId;

    // Discard button: enabled if:
    // - Normal play: it's your turn, you've drawn a card, and exactly 1 card is selected
    // - POST_GO_OUT phase: it's your turn, you've drawn, and exactly 1 card is selected
    // - WAITING_FOR_GO_OUT: disabled (already discarded)
    let canDiscard = false;
    if (isWaitingForGoOut) {
        canDiscard = false; // Already discarded, waiting for go out decision
    } else if (turnPhase === 'POST_GO_OUT_CARD_DRAWN') {
        canDiscard = isMyTurn && selectedCards.length === 1;
    } else if (isPostGoOutPhase) {
        canDiscard = false; // Must draw first in POST_GO_OUT
    } else {
        canDiscard = isMyTurn && turnPhase === 'CARD_DRAWN' && selectedCards.length === 1;
    }

    if (canDiscard) {
        discardBtn.classList.remove('btn-disabled');
    } else {
        discardBtn.classList.add('btn-disabled');
    }

    // Go Out button: enabled in different scenarios
    let canGoOutNow = false;

    if (isWaitingForGoOut && wasPreviousPlayer) {
        // In WAITING_FOR_GO_OUT phase, last player can go out
        console.log('🎯 GO OUT BUTTON: Enabling for WAITING_FOR_GO_OUT phase');
        console.log('   - turnPhase:', turnPhase);
        console.log('   - wasPreviousPlayer:', wasPreviousPlayer);
        console.log('   - playerId:', playerId);
        canGoOutNow = true;
    } else if (isPostGoOutPhase) {
        // In POST_GO_OUT phase, enable go out button during your final turn
        canGoOutNow = isMyTurn;
    } else {
        // Normal play: enabled during entire turn OR if you just discarded and next player hasn't drawn yet
        canGoOutNow = (isMyTurn || (wasPreviousPlayer && turnPhase === 'WAITING_FOR_DRAW'));
    }

    if (canGoOutNow) {
        goOutBtn.classList.remove('btn-disabled');
        console.log('✅ Go Out button ENABLED');
    } else {
        goOutBtn.classList.add('btn-disabled');
        console.log('❌ Go Out button DISABLED');
    }
}

/**
 * Check if a group of cards forms a valid set (3+ cards of same rank)
 * Wild cards (Jokers and current round's wild rank) can substitute for any rank
 */
function isValidSet(cards, wildRank) {
    if (!cards || cards.length < 3) return false;

    // Separate wild cards from regular cards (Jokers are always wild)
    const wilds = cards.filter(card => card.rank === wildRank || card.rank === 'Joker');
    const nonWilds = cards.filter(card => card.rank !== wildRank && card.rank !== 'Joker');

    // If all cards are wild, it's a valid set
    if (nonWilds.length === 0) return true;

    // All non-wild cards must have the same rank
    const firstRank = nonWilds[0].rank;
    const allSameRank = nonWilds.every(card => card.rank === firstRank);

    return allSameRank;
}

/**
 * Check if a group of cards forms a valid run (3+ consecutive cards in same suit)
 * Wild cards (Jokers and current round's wild rank) can substitute for any card in the sequence
 */
function isValidRun(cards, wildRank) {
    if (!cards || cards.length < 3) return false;

    const rankOrder = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    // Separate wild cards from regular cards (Jokers are always wild)
    const wilds = cards.filter(card => card.rank === wildRank || card.rank === 'Joker');
    const nonWilds = cards.filter(card => card.rank !== wildRank && card.rank !== 'Joker');

    // If all cards are wild, it's valid (can represent any run)
    if (nonWilds.length === 0) return true;

    // All non-wild cards must be the same suit
    const firstSuit = nonWilds[0].suit;
    const allSameSuit = nonWilds.every(card => card.suit === firstSuit);
    if (!allSameSuit) return false;

    // Get rank indices for non-wild cards and sort them
    const rankIndices = nonWilds.map(card => rankOrder.indexOf(card.rank)).sort((a, b) => a - b);

    // The run must span from min to max index, and we need enough cards to fill it
    const minIndex = rankIndices[0];
    const maxIndex = rankIndices[rankIndices.length - 1];
    const spanLength = maxIndex - minIndex + 1;

    // Count gaps in the sequence of non-wild cards
    let gapsNeeded = 0;
    for (let i = minIndex; i <= maxIndex; i++) {
        if (!rankIndices.includes(i)) {
            gapsNeeded++;
        }
    }

    // Check if we have exactly the right number of wild cards to fill gaps
    // OR if wild cards extend the sequence beyond the min/max
    const totalCardsNeeded = spanLength;
    const nonWildCardsInSpan = nonWilds.length;
    const wildsNeededForGaps = gapsNeeded;

    // Wild cards can fill gaps and/or extend the sequence
    // Total cards = non-wilds + wilds
    // The span must be fillable with the cards we have
    if (wilds.length < wildsNeededForGaps) {
        // Not enough wilds to fill the gaps in the span
        return false;
    }

    // All remaining wilds must extend the sequence consecutively
    const wildsRemaining = wilds.length - wildsNeededForGaps;
    const expectedTotalCards = spanLength + wildsRemaining;

    return cards.length === expectedTotalCards;
}

/**
 * Check if a group of cards is valid (either a set or a run)
 */
function isValidGroup(cards, wildRank) {
    if (!cards || cards.length < 3) return false;
    return isValidSet(cards, wildRank) || isValidRun(cards, wildRank);
}

/**
 * Check if player can go out
 * Validates that all cards in hand form valid sets or runs based on current card organization
 */
function canGoOut() {
    if (!cardHandManager || !currentGameState) return false;

    // Get current hand organization
    const handState = cardHandManager.getHandState();
    if (!handState || !handState.stacks) return false;

    // Get current wild rank (Round 1 = 3s, Round 2 = 4s, ..., Round 11 = Ks)
    const wildRanks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const wildRank = wildRanks[currentGameState.currentRound - 1];

    // Get all cards in hand
    const allCards = cardHandManager.getAllCards();

    // Track which cards have been validated
    const validatedCardIds = new Set();

    // Check each stack/group
    for (const stack of handState.stacks) {
        // Get actual card objects for this stack
        const stackCards = stack.cardIds
            .map(cardId => allCards.find(c => c.id === cardId))
            .filter(card => card !== undefined);

        // Skip empty stacks
        if (stackCards.length === 0) continue;

        // Each non-empty stack must have at least 3 cards and be valid
        if (stackCards.length < 3) {
            console.log('Stack has less than 3 cards:', stack.name, stackCards.length);
            return false;
        }

        // Check if this group is valid
        if (!isValidGroup(stackCards, wildRank)) {
            console.log('Invalid group:', stack.name, stackCards.map(c => c.rank + c.suit));
            return false;
        }

        // Mark these cards as validated
        stackCards.forEach(card => validatedCardIds.add(card.id));
    }

    // Ensure ALL cards are in valid groups (no leftover cards)
    if (validatedCardIds.size !== allCards.length) {
        console.log('Not all cards are in valid groups:', validatedCardIds.size, 'validated,', allCards.length, 'total');
        return false;
    }

    // All checks passed!
    console.log('Player can go out! All', allCards.length, 'cards are in valid groups');
    return true;
}

/**
 * Debug helper function to display detailed scoring breakdown
 * Useful for troubleshooting scoring issues
 */
function debugScoreCalculation(playerHand, playerHandState, wildRank, playerId) {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║         DETAILED SCORE BREAKDOWN DEBUG                ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('Player ID:', playerId || 'Unknown');
    console.log('Wild Rank:', wildRank);
    console.log('Total cards in hand:', playerHand?.length || 0);

    if (!playerHand || playerHand.length === 0) {
        console.log('✓ Hand is empty - player went out (Score: 0)');
        return;
    }

    console.log('\nAll cards in hand:');
    playerHand.forEach((card, index) => {
        const value = getCardPointValue(card, wildRank);
        const isWild = card.rank === wildRank || card.rank === 'Joker';
        console.log(`  ${index + 1}. ${card.rank}${card.suit[0]} = ${value} pts${isWild ? ' (WILD)' : ''}`);
    });

    if (!playerHandState || !playerHandState.stacks) {
        console.log('\n⚠ No hand organization found - all cards count!');
        const total = playerHand.reduce((sum, card) => sum + getCardPointValue(card, wildRank), 0);
        console.log(`\nFINAL SCORE: ${total} points`);
        return;
    }

    console.log('\nCard organization (stacks):');
    const cardsInValidGroups = new Set();

    playerHandState.stacks.forEach((stack, index) => {
        const stackCards = stack.cardIds
            .map(cardId => playerHand.find(c => c.id === cardId))
            .filter(card => card !== undefined);

        if (stackCards.length === 0) return;

        const isValid = stackCards.length >= 3 && isValidGroup(stackCards, wildRank);
        console.log(`\n  Stack ${index + 1}: "${stack.name}" (${stackCards.length} cards)`);
        console.log(`    Cards: ${stackCards.map(c => c.rank + c.suit[0]).join(', ')}`);
        console.log(`    Status: ${isValid ? '✓ VALID (0 points)' : '✗ INVALID (counts toward score)'}`);

        if (isValid) {
            stackCards.forEach(card => cardsInValidGroups.add(card.id));
        }
    });

    console.log('\nCards counting toward score:');
    let finalScore = 0;
    let countingCards = 0;

    playerHand.forEach(card => {
        if (!cardsInValidGroups.has(card.id)) {
            const value = getCardPointValue(card, wildRank);
            console.log(`  • ${card.rank}${card.suit[0]} = ${value} pts`);
            finalScore += value;
            countingCards++;
        }
    });

    if (countingCards === 0) {
        console.log('  (none - all cards in valid groups)');
    }

    console.log(`\n${'='.repeat(56)}`);
    console.log(`FINAL SCORE: ${finalScore} points (${countingCards} cards counted)`);
    console.log(`${'='.repeat(56)}\n`);
}

/**
 * Get point value for a card
 * Returns the point value based on Five Crowns rules:
 * - Jokers: 50 points
 * - Wild rank for current round: 20 points
 * - Face cards: J=11, Q=12, K=13
 * - Number cards (3-10): face value
 */
function getCardPointValue(card, wildRank) {
    // Validate input
    if (!card || typeof card !== 'object') {
        console.error('getCardPointValue: Invalid card object', card);
        return 0;
    }

    if (!card.rank) {
        console.error('getCardPointValue: Card missing rank property', card);
        return 0;
    }

    const rank = card.rank;

    // Jokers are always worth 50 points
    if (rank === 'Joker') {
        console.log(`  ${card.id || 'Joker'}: 50 points (Joker)`);
        return 50;
    }

    // Wild cards for current round are worth 20 points
    if (wildRank && rank === wildRank) {
        console.log(`  ${card.id || rank}: 20 points (Wild ${wildRank})`);
        return 20;
    }

    // Face cards
    if (rank === 'J') {
        console.log(`  ${card.id || 'J'}: 11 points (Jack)`);
        return 11;
    }
    if (rank === 'Q') {
        console.log(`  ${card.id || 'Q'}: 12 points (Queen)`);
        return 12;
    }
    if (rank === 'K') {
        console.log(`  ${card.id || 'K'}: 13 points (King)`);
        return 13;
    }

    // Number cards are worth face value (3-10)
    const numValue = parseInt(rank, 10);
    if (isNaN(numValue) || numValue < 3 || numValue > 10) {
        console.error(`getCardPointValue: Invalid rank "${rank}" for card`, card);
        return 0;
    }

    console.log(`  ${card.id || rank}: ${numValue} points`);
    return numValue;
}

/**
 * Find the optimal grouping of cards that minimizes the score
 * Uses backtracking to try all possible combinations of sets and runs
 * Returns: { groups: [[cards...], ...], ungroupedCards: [...], score: number }
 */
function findOptimalGrouping(cards, wildRank) {
    if (!cards || cards.length === 0) {
        return { groups: [], ungroupedCards: [], score: 0 };
    }

    let bestSolution = {
        groups: [],
        ungroupedCards: [...cards],
        score: cards.reduce((sum, card) => sum + getCardPointValue(card, wildRank), 0)
    };

    // Try to find groups using backtracking
    function backtrack(remainingCards, currentGroups) {
        // Base case: no more cards to group
        if (remainingCards.length === 0) {
            const score = 0; // All cards grouped
            if (score < bestSolution.score) {
                bestSolution = {
                    groups: [...currentGroups],
                    ungroupedCards: [],
                    score: 0
                };
            }
            return;
        }

        // Calculate score for current solution (ungrouped cards)
        const currentScore = remainingCards.reduce((sum, card) => sum + getCardPointValue(card, wildRank), 0);

        // Update best solution if this is better
        if (currentScore < bestSolution.score) {
            bestSolution = {
                groups: [...currentGroups],
                ungroupedCards: [...remainingCards],
                score: currentScore
            };
        }

        // Try to form groups starting with the first remaining card
        // This avoids duplicate combinations
        if (remainingCards.length < 3) {
            return; // Can't form any more groups
        }

        // Try all possible groups of size 3 to remaining.length that include the first card
        const firstCard = remainingCards[0];

        for (let groupSize = 3; groupSize <= remainingCards.length; groupSize++) {
            // Generate all combinations of size groupSize that include firstCard
            const combinations = getCombinations(remainingCards, groupSize, firstCard);

            for (const combo of combinations) {
                // Check if this combination forms a valid group
                if (isValidGroup(combo, wildRank)) {
                    // Remove these cards from remaining
                    const newRemaining = remainingCards.filter(c => !combo.includes(c));

                    // Recurse with this group added
                    backtrack(newRemaining, [...currentGroups, combo]);
                }
            }
        }
    }

    backtrack(cards, []);
    return bestSolution;
}

/**
 * Get all combinations of size k from array that include a required element
 * Helper function for findOptimalGrouping
 */
function getCombinations(array, k, requiredElement) {
    const results = [];

    // If requiredElement is not in array, return empty
    if (!array.includes(requiredElement)) {
        return results;
    }

    // Get index of required element
    const reqIndex = array.indexOf(requiredElement);

    // Generate combinations that include the required element
    function combine(start, combo) {
        if (combo.length === k) {
            results.push([...combo]);
            return;
        }

        for (let i = start; i < array.length; i++) {
            combo.push(array[i]);
            combine(i + 1, combo);
            combo.pop();
        }
    }

    // Start with required element already in combo
    combine(reqIndex + 1, [requiredElement]);

    return results;
}

/**
 * Calculate score for a player's remaining cards
 * Returns 0 if player went out (empty hand or all cards in valid groups)
 * Returns sum of ungrouped/invalid cards otherwise
 */
function calculatePlayerScore(playerHand, playerHandState, wildRank) {
    console.log('=== CALCULATING PLAYER SCORE ===');
    console.log('Wild rank for scoring:', wildRank);
    console.log('Player hand:', playerHand ? playerHand.length + ' cards' : 'null/undefined');

    // Validate wildRank
    if (!wildRank) {
        console.error('calculatePlayerScore: wildRank is missing or invalid!', wildRank);
        console.warn('Using fallback: treating all cards at face value');
    }

    // If hand is empty, player went out - score is 0
    if (!playerHand || playerHand.length === 0) {
        console.log('Player went out (empty hand) - Score: 0');
        return { score: 0, optimalGrouping: { groups: [], ungroupedCards: [] } };
    }

    // Use optimal grouping algorithm to find best possible score
    console.log('Finding optimal grouping...');
    const optimalGrouping = findOptimalGrouping(playerHand, wildRank);

    console.log('Optimal grouping found:');
    console.log(`  - ${optimalGrouping.groups.length} valid groups`);
    optimalGrouping.groups.forEach((group, i) => {
        console.log(`    Group ${i + 1}: ${group.map(c => c.rank + c.suit[0]).join(', ')}`);
    });
    console.log(`  - ${optimalGrouping.ungroupedCards.length} ungrouped cards`);
    if (optimalGrouping.ungroupedCards.length > 0) {
        console.log(`    Ungrouped: ${optimalGrouping.ungroupedCards.map(c => c.rank + c.suit[0]).join(', ')}`);
    }
    console.log(`  - Total score: ${optimalGrouping.score}`);
    console.log('=== END SCORE CALCULATION ===\n');

    return { score: optimalGrouping.score, optimalGrouping };
}

/**
 * Calculate scores for all players at round end
 * Returns object with roundScores and updated playerScores
 */
async function calculateAllScores(updatedHands = {}) {
    console.log('\n========================================');
    console.log('CALCULATING ALL PLAYER SCORES');
    console.log('========================================');

    // Validate game state
    if (!currentGameState) {
        console.error('calculateAllScores: currentGameState is null or undefined!');
        return null;
    }

    // Validate and get current round
    const currentRound = currentGameState.currentRound;
    if (!currentRound || currentRound < 1 || currentRound > 11) {
        console.error('calculateAllScores: Invalid currentRound:', currentRound);
        return null;
    }

    console.log('Current round:', currentRound);

    // Get current wild rank (Round 1 = 3s, Round 2 = 4s, ..., Round 11 = Ks)
    const wildRanks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const wildRank = wildRanks[currentRound - 1];

    if (!wildRank) {
        console.error('calculateAllScores: Could not determine wildRank for round', currentRound);
        return null;
    }

    console.log('Wild rank:', wildRank);

    const roundScores = {};
    const roundHandHistory = {}; // Store hand history for hover tooltips

    // Normalize all existing player scores (fix corrupted data from old code)
    const updatedPlayerScores = {};
    for (const pid in currentGameState.playerScores) {
        const rawScore = currentGameState.playerScores[pid];
        // Handle corrupted string scores like "0[object Object]"
        if (typeof rawScore === 'string' && rawScore.includes('[object')) {
            updatedPlayerScores[pid] = 0; // Reset corrupted scores
            console.warn(`⚠️ Corrupted score detected for player ${pid}, resetting to 0`);
        } else {
            updatedPlayerScores[pid] = normalizeScore(rawScore);
        }
    }

    // Get all player hands and hand states, merging in any updated hands
    const playerHands = { ...(currentGameState.playerHands || {}), ...updatedHands };

    // For players who went out (empty hands), use their saved hands from before going out
    const playerHandsBeforeGoOut = currentGameState.playerHandsBeforeGoOut || {};
    for (const pid in playerHandsBeforeGoOut) {
        if (!playerHands[pid] || playerHands[pid].length === 0) {
            console.log(`Using saved hand for player ${pid} who went out`);
            playerHands[pid] = playerHandsBeforeGoOut[pid];
        }
    }

    console.log('Players to score:', Object.keys(playerHands));
    console.log('Updated hands provided:', Object.keys(updatedHands));

    // Get hand states for all players
    const handStatesRef = gameRef.child('playerHandStates');
    const handStatesSnapshot = await handStatesRef.once('value');
    const handStates = handStatesSnapshot.val() || {};

    console.log('Hand states available for:', Object.keys(handStates));

    // Calculate score for each player
    for (const pid in playerHands) {
        console.log(`\n--- Scoring Player: ${pid} ---`);
        const playerHand = playerHands[pid] || [];
        const playerHandState = handStates[pid];

        console.log(`Hand size: ${playerHand.length} cards`);
        console.log(`Cards:`, playerHand.map(c => c.rank + c.suit[0]).join(', '));

        // Calculate optimal score
        const scoreResult = calculatePlayerScore(playerHand, playerHandState, wildRank);
        const roundScore = scoreResult.score;
        roundScores[pid] = roundScore;

        // Save hand history for this player
        roundHandHistory[pid] = {
            cards: playerHand,
            optimalGroups: scoreResult.optimalGrouping.groups,
            ungroupedCards: scoreResult.optimalGrouping.ungroupedCards,
            score: roundScore,
            timestamp: Date.now()
        };

        // Update cumulative score
        const previousTotal = normalizeScore(updatedPlayerScores[pid]);
        updatedPlayerScores[pid] = previousTotal + roundScore;

        console.log(`Player ${pid.substring(0, 8)}...:`);
        console.log(`  Round ${currentRound} score: ${roundScore}`);
        console.log(`  Previous total: ${previousTotal}`);
        console.log(`  New total: ${updatedPlayerScores[pid]}`);
    }

    // Save hand history to Firebase for this round
    const roundHandsPath = `roundHands/round${currentRound}`;
    console.log('💾 Saving hand history to Firebase...');
    console.log('  Path:', roundHandsPath);
    console.log('  Data:', roundHandHistory);
    console.log('  Player IDs:', Object.keys(roundHandHistory));

    await gameStateRef.child(roundHandsPath).set(roundHandHistory);
    console.log('✅ Hand history saved successfully!');

    // Verify the save worked
    const verifySnapshot = await gameStateRef.child(roundHandsPath).once('value');
    const verifiedData = verifySnapshot.val();
    console.log('🔍 Verification - Data in Firebase:', verifiedData);
    console.log('🔍 Verification - Player IDs in Firebase:', verifiedData ? Object.keys(verifiedData) : 'null');

    console.log('\n========================================');
    console.log('SCORING COMPLETE');
    console.log('Round scores:', roundScores);
    console.log('Updated totals:', updatedPlayerScores);
    console.log('========================================\n');

    return {
        roundScores,
        playerScores: updatedPlayerScores
    };
}

/**
 * Update discard pile display
 */
function updateDiscardPile(card) {
    discardPile.innerHTML = '';
    const cardEl = createCardElement(card);
    discardPile.appendChild(cardEl);
}

/**
 * Render other players - REMOVED (UI element removed from HTML)
 * This function is kept for reference but not called anymore
 */
/*
function renderOtherPlayers() {
    if (!otherPlayers || !currentGameState || !currentGameData) return;

    // Get all player IDs
    const playerIds = Object.keys(currentGameState.playerHands || {});

    // Get players data from Firebase
    const players = currentGameData.players || {};

    // Clear current display
    otherPlayers.innerHTML = '';

    // Filter out the current player
    const otherPlayerIds = playerIds.filter(pid => pid !== playerId);

    if (otherPlayerIds.length === 0) {
        // No other players to display
        otherPlayers.style.display = 'none';
        return;
    }

    otherPlayers.style.display = 'flex';

    // Render each other player
    otherPlayerIds.forEach(pid => {
        const playerHand = currentGameState.playerHands[pid] || [];
        const cardCount = playerHand.length;
        const isTurn = (currentGameState.currentPlayer === pid);

        // Get player name from players object
        const playerData = players[pid];
        let playerDisplayName = playerData && playerData.name ? playerData.name : `Player ${pid.substring(0, 4)}`;

        // Create player card
        const playerCard = document.createElement('div');
        playerCard.className = 'other-player-card';
        if (isTurn) {
            playerCard.classList.add('active-turn');
        }

        playerCard.innerHTML = `
            <div class="other-player-avatar">👤</div>
            <div class="other-player-info">
                <div class="other-player-name">${playerDisplayName}</div>
                <div class="other-player-cards">${cardCount} card${cardCount !== 1 ? 's' : ''}</div>
            </div>
            ${isTurn ? '<div class="turn-indicator">🎯</div>' : ''}
        `;

        otherPlayers.appendChild(playerCard);
    });
}
*/

/**
 * Update game phase
 */
function updateGamePhase(newPhase) {
    turnPhase = newPhase;
    console.log('Turn phase changed to:', turnPhase);

    // Update UI based on phase
    updateTurnIndicator();
    updateDeckDiscardState();
    updateActionButtons();
}

/**
 * Update turn indicator
 */
function updateTurnIndicator() {
    // Check if there's a custom message to display (e.g., from discard prevention)
    if (customTurnMessage) {
        const instructionParagraph = turnInstruction?.querySelector('p');
        if (instructionParagraph) {
            instructionParagraph.textContent = customTurnMessage;
            turnInstruction.style.display = 'block';
        }
        updateActionButtons();
        return; // Don't override the custom message
    }

    // Check for WAITING_FOR_GO_OUT phase first
    const wasPreviousPlayer = currentGameState && currentGameState.previousPlayer === playerId;
    if (turnPhase === 'WAITING_FOR_GO_OUT' && wasPreviousPlayer) {
        const message = '⏱️ Last chance!\nClick "Go Out" if you can!';
        const instructionParagraph = turnInstruction?.querySelector('p');
        if (instructionParagraph) {
            instructionParagraph.textContent = message;
            turnInstruction.style.display = 'block';
        }
        updateActionButtons();
        return;
    }

    if (isMyTurn) {
        let message = '🎯 Your turn!';

        // Check if we're in POST_GO_OUT phase
        if (turnPhase === 'POST_GO_OUT') {
            message = '⏰ Final turn!\nDraw a card - last chance to go out!';
        } else if (turnPhase === 'POST_GO_OUT_CARD_DRAWN') {
            message = '⏰ Final turn! Discard or go out now!';
        } else {
            switch(turnPhase) {
                case 'WAITING_FOR_DRAW':
                    message = '🎯 Your turn! Draw a card';
                    break;
                case 'CARD_DRAWN':
                    message = '🎯 Drag a card to discard pile';
                    break;
                case 'TURN_COMPLETE':
                    message = '⏳ Advancing turn...';
                    break;
                case 'ROUND_ENDED':
                    message = '🏁 Round ended - calculating scores...';
                    break;
            }
        }

        const instructionParagraph = turnInstruction?.querySelector('p');
        if (instructionParagraph) {
            instructionParagraph.textContent = message;
            turnInstruction.style.display = 'block';
        }
    } else {
        // Not your turn - check if someone went out
        if (currentGameState?.firstPlayerOut && turnPhase === 'POST_GO_OUT') {
            // Show different message depending on whether current player went out
            const isPlayerWhoWentOut = (currentGameState.firstPlayerOut === playerId);
            const message = isPlayerWhoWentOut
                ? '⏰ Others are taking their final turns...'
                : '⏰ A player went out!<br>Others are taking their final turns...';
            const instructionParagraph = turnInstruction?.querySelector('p');
            if (instructionParagraph) {
                instructionParagraph.innerHTML = message;
                turnInstruction.style.display = 'block';
            }
        } else {
            if (turnInstruction) {
                turnInstruction.style.display = 'none';
            }
        }
    }

    // Update button states when turn changes
    updateActionButtons();
}

/**
 * Handle drawing from deck
 */
function handleDrawFromDeck() {
    console.log('=== DRAW FROM DECK CLICKED ===');
    console.log('isMyTurn:', isMyTurn);
    console.log('turnPhase:', turnPhase);
    console.log('Current hand size:', myHand.length);
    console.log('Deck size:', currentGameState?.deck?.length || 0);

    // Validate game state
    if (!currentGameState) {
        console.error('BLOCKED: Game state not loaded');
        showError('Game is still loading. Please wait...');
        return;
    }

    // Validate turn
    if (!isMyTurn) {
        console.warn('BLOCKED: Not your turn!');
        showError('Not your turn!');
        return;
    }

    // Validate phase - allow drawing in WAITING_FOR_DRAW or POST_GO_OUT
    if (turnPhase !== 'WAITING_FOR_DRAW' && turnPhase !== 'POST_GO_OUT') {
        console.warn('BLOCKED: Wrong phase. Current phase:', turnPhase);
        showError('You already drew a card!');
        return;
    }

    // Check if deck is empty - reshuffle discard pile if needed
    if (!currentGameState.deck || currentGameState.deck.length === 0) {
        console.warn('Deck is empty - attempting to reshuffle discard pile');

        // Check if there are cards in discard pile to reshuffle
        if (!currentGameState.discardPile || currentGameState.discardPile.length <= 1) {
            showError('No cards left to draw! Deck and discard pile are both empty.');
            return;
        }

        // Reshuffle discard pile (keep top card)
        const reshuffleResult = reshuffleDiscardPile();
        if (!reshuffleResult.success) {
            showError('Unable to reshuffle deck');
            return;
        }

        console.log('Deck reshuffled!', reshuffleResult.newDeck.length, 'cards added to deck');
        // Continue with draw after reshuffle
    }

    console.log('✅ All validations passed. Drawing card...');

    // Clear the discard pile tracking since drawing from deck
    cardDrawnFromDiscard = null;
    customTurnMessage = null; // Clear any custom messages

    // Get card from deck
    const newDeck = [...currentGameState.deck];
    const drawnCard = newDeck.pop();

    // Add to hand
    const newHand = [...myHand, drawnCard];

    console.log('Drew card:', drawnCard);
    console.log('New hand size:', newHand.length);
    console.log('New deck size:', newDeck.length);

    // Optimistic UI update
    myHand = newHand;
    renderMyHand();

    // Update Firebase
    console.log('Updating Firebase...');

    // Determine the next phase based on current phase
    const nextPhase = (turnPhase === 'POST_GO_OUT') ? 'POST_GO_OUT_CARD_DRAWN' : 'CARD_DRAWN';

    gameStateRef.update({
        'deck': newDeck,
        [`playerHands/${playerId}`]: newHand,
        'turnPhase': nextPhase,
        'previousPlayer': null  // Clear previous player - go out window is closed
    })
    .then(() => {
        console.log('✅ Successfully updated Firebase');
        console.log('New hand in Firebase:', newHand.length, 'cards');
        console.log('New deck in Firebase:', newDeck.length, 'cards');
        console.log('Turn phase now: CARD_DRAWN');
        console.log('Go out window closed - previousPlayer cleared');
    })
    .catch((error) => {
        console.error('❌ Error drawing from deck:', error);
        // Rollback on error
        myHand = myHand.slice(0, -1);
        renderMyHand();
        showErrorModal('Error drawing card. Please try again.');
    });
}

/**
 * Handle drawing from discard pile (called by DeckDiscardManager)
 */
function handleDrawFromDiscardPile() {
    // Validate game state
    if (!currentGameState) {
        console.error('BLOCKED: Game state not loaded');
        showError('Game is still loading. Please wait...');
        return;
    }

    // Validate turn (already checked by DeckDiscardManager, but double-check)
    if (!isMyTurn) {
        showError('Not your turn!');
        return;
    }

    // Validate phase - allow drawing in WAITING_FOR_DRAW or POST_GO_OUT
    if (turnPhase !== 'WAITING_FOR_DRAW' && turnPhase !== 'POST_GO_OUT') {
        showError('You already drew a card!');
        return;
    }

    // Check if discard pile has cards
    if (!currentGameState.discardPile || currentGameState.discardPile.length === 0) {
        showError('Discard pile is empty!');
        return;
    }

    console.log('Drawing from discard pile...');

    // Get card from discard pile
    const newDiscardPile = [...currentGameState.discardPile];
    const drawnCard = newDiscardPile.pop();

    // Track this card to prevent immediate re-discard
    cardDrawnFromDiscard = drawnCard;
    customTurnMessage = null; // Clear any custom messages

    // Add to hand
    const newHand = [...myHand, drawnCard];

    console.log('Drew card from discard:', drawnCard);

    // Optimistic UI update
    myHand = newHand;
    renderMyHand();

    // Immediately update discard pile UI to prevent duplication appearance
    if (newDiscardPile.length > 0) {
        updateDiscardPile(newDiscardPile[newDiscardPile.length - 1]);
    } else {
        discardPile.innerHTML = '';
    }

    // Update Firebase
    // Determine the next phase based on current phase
    const nextPhase = (turnPhase === 'POST_GO_OUT') ? 'POST_GO_OUT_CARD_DRAWN' : 'CARD_DRAWN';

    gameStateRef.update({
        'discardPile': newDiscardPile,
        [`playerHands/${playerId}`]: newHand,
        'turnPhase': nextPhase,
        'previousPlayer': null  // Clear previous player - go out window is closed
    })
    .then(() => {
        console.log('Successfully drew from discard pile');
        console.log('Go out window closed - previousPlayer cleared');
    })
    .catch((error) => {
        console.error('Error drawing from discard:', error);
        // Rollback on error
        myHand = myHand.slice(0, -1);
        renderMyHand();
        cardDrawnFromDiscard = null; // Clear tracking on rollback
        showErrorModal('Error drawing card. Please try again.');
    });
}

/**
 * Handle discarding a card
 */
function handleDiscardCard() {
    // Validate turn
    if (!isMyTurn) {
        showError('Not your turn!');
        return;
    }

    // Validate phase - allow discard in CARD_DRAWN or POST_GO_OUT_CARD_DRAWN
    if (turnPhase !== 'CARD_DRAWN' && turnPhase !== 'POST_GO_OUT_CARD_DRAWN') {
        showError('You must draw a card first!');
        return;
    }

    if (!cardHandManager) return;

    const selectedCards = cardHandManager.getSelectedCards();

    if (selectedCards.length !== 1) {
        showError('Please select exactly one card to discard');
        return;
    }

    console.log('Discarding card via button:', selectedCards[0]);

    // Use the existing drop handler logic
    handleDiscardCardDrop(selectedCards[0]);
}

/**
 * Handle discard card drop (called by DeckDiscardManager)
 */
async function handleDiscardCardDrop(card) {
    console.log('=== DISCARD CARD DROP ===');
    console.log('Card dropped:', card);
    console.log('isMyTurn:', isMyTurn);
    console.log('turnPhase:', turnPhase);
    console.log('Current hand size:', myHand.length);

    // Validate turn
    if (!isMyTurn) {
        console.warn('BLOCKED: Not your turn!');
        showError('Not your turn!');
        return;
    }

    // Validate phase - allow discard in CARD_DRAWN or POST_GO_OUT_CARD_DRAWN
    if (turnPhase !== 'CARD_DRAWN' && turnPhase !== 'POST_GO_OUT_CARD_DRAWN') {
        console.warn('BLOCKED: Must draw first. Current phase:', turnPhase);
        showError('You must draw a card first!');
        return;
    }

    // Check if player is trying to discard the card they just drew from the discard pile
    if (cardDrawnFromDiscard && card.id === cardDrawnFromDiscard.id) {
        console.log('Player attempted to discard card from discard pile - resetting to draw phase');

        // Set custom message to prevent it from being overridden
        customTurnMessage = '⚠️ You cannot discard the card you just drew from the discard pile. You must now draw again.';

        // Show message to player
        const instructionParagraph = turnInstruction?.querySelector('p');
        if (instructionParagraph) {
            instructionParagraph.textContent = customTurnMessage;
            turnInstruction.style.display = 'block';
        }

        // Remove the card from hand (put it back to discard pile)
        const handWithoutCard = myHand.filter(c => c.id !== card.id);

        // Put card back on discard pile
        const currentDiscard = currentGameState.discardPile || [];
        const restoredDiscardPile = [...currentDiscard, card];

        // Clear the tracking variable
        cardDrawnFromDiscard = null;

        // Optimistic UI update
        myHand = handWithoutCard;

        // Delay render slightly to avoid interfering with drag cleanup
        setTimeout(() => {
            renderMyHand();

            // Clear any card selection since we're resetting the turn
            if (cardHandManager) {
                cardHandManager.clearSelection();
            }
        }, 100);

        // Update discard pile UI
        if (restoredDiscardPile.length > 0) {
            updateDiscardPile(restoredDiscardPile[restoredDiscardPile.length - 1]);
        }

        // Go back to WAITING_FOR_DRAW phase - but player must draw from deck
        const nextPhase = (turnPhase === 'POST_GO_OUT_CARD_DRAWN') ? 'POST_GO_OUT' : 'WAITING_FOR_DRAW';

        try {
            await gameStateRef.update({
                'discardPile': restoredDiscardPile,
                [`playerHands/${playerId}`]: handWithoutCard,
                'turnPhase': nextPhase
            });

            console.log('✅ Successfully reset to draw phase - player can draw again');
            // Keep the custom message visible until they draw again
            // (it will be cleared when they draw from deck or discard pile)
        } catch (error) {
            console.error('❌ Error resetting to draw phase:', error);
            // Rollback UI on error
            myHand = myHand.concat([card]);
            renderMyHand();
            cardDrawnFromDiscard = card; // Restore tracking
            showErrorModal('Error. Please try again.');
        }

        return;
    }

    console.log('✅ All validations passed. Discarding card...');

    // Clear the tracking variable since a normal discard is happening
    cardDrawnFromDiscard = null;

    // Remove card from hand
    const newHand = myHand.filter(c => c.id !== card.id);

    // Add card to discard pile (handle case where discardPile might be null/undefined)
    const currentDiscard = currentGameState.discardPile || [];
    const newDiscardPile = [...currentDiscard, card];

    console.log('New hand size:', newHand.length);
    console.log('New discard pile size:', newDiscardPile.length);
    console.log('Discarded card:', card);

    // IMPORTANT: Save hand state BEFORE advancing turn
    // This preserves card organization for scoring if player doesn't go out
    if (cardHandManager) {
        const currentHandState = cardHandManager.getHandState();
        console.log('Saving hand state before discarding:', currentHandState);

        try {
            // Save hand state - wait for it to complete to ensure it's saved before scoring
            await handStateRef.set(currentHandState);
            console.log('Hand state saved successfully before advancing turn');
        } catch (error) {
            console.error('Error saving hand state before advancing turn:', error);
            // Continue anyway - scoring will fall back to counting all cards
        }
    }

    console.log('Advancing turn...');

    // Optimistic UI update
    myHand = newHand;
    renderMyHand();
    updateDiscardPile(card); // Update the discard pile UI immediately

    // Advance turn
    await advanceTurn(card, newHand, newDiscardPile);
}

/**
 * Advance to next player's turn
 */
async function advanceTurn(discardedCard, newHand, newDiscardPile) {
    console.log('Advancing turn...');
    console.log('playersRef path:', playersRef.toString());

    // Check if we're in POST_GO_OUT phase
    if (currentGameState.firstPlayerOut && currentGameState.playersRemaining) {
        console.log('In POST_GO_OUT phase');
        console.log('Players remaining:', currentGameState.playersRemaining);

        // Remove current player from playersRemaining
        const updatedPlayersRemaining = currentGameState.playersRemaining.filter(id => id !== playerId);
        console.log('Updated players remaining:', updatedPlayersRemaining);

        // Check if there are more players who need their final turn
        if (updatedPlayersRemaining.length > 0) {
            const nextPlayerId = updatedPlayersRemaining[0];
            console.log('Next player for final turn:', nextPlayerId);

            // Update Firebase: advance to next player in POST_GO_OUT phase
            try {
                await gameStateRef.update({
                    'currentPlayer': nextPlayerId,
                    'playersRemaining': updatedPlayersRemaining,
                    'turnPhase': 'POST_GO_OUT',
                    'discardPile': newDiscardPile,
                    [`playerHands/${playerId}`]: newHand,
                    'previousPlayer': null
                });

                console.log('Turn advanced in POST_GO_OUT phase');
                return;
            } catch (error) {
                console.error('Error advancing turn in POST_GO_OUT phase:', error);
                showErrorModal('Error advancing turn. Please try again.');
                return;
            }
        } else {
            console.log('╔═══════════════════════════════════════════════════════════╗');
            console.log('║  LAST PLAYER HAS DISCARDED - GIVING CHANCE TO GO OUT     ║');
            console.log('╚═══════════════════════════════════════════════════════════╝');
            console.log('Player ID:', playerId);
            console.log('Hand size after discard:', newHand.length);
            console.log('Setting phase to WAITING_FOR_GO_OUT');
            console.log('Player can now click "Go Out" button for 5 seconds');

            // Set phase to WAITING_FOR_GO_OUT to give the last player a chance to click "Go Out"
            try {
                await gameStateRef.update({
                    'discardPile': newDiscardPile,
                    [`playerHands/${playerId}`]: newHand,
                    'turnPhase': 'WAITING_FOR_GO_OUT',
                    'playersRemaining': [],
                    'previousPlayer': playerId // Track who just discarded
                });

                console.log('✅ Firebase updated successfully');
                console.log('   - turnPhase: WAITING_FOR_GO_OUT');
                console.log('   - previousPlayer:', playerId);
                console.log('   - Go Out button should now be ENABLED');
                console.log('   - Starting 5-second countdown...');

                // After 5 seconds, automatically end the round if player hasn't gone out
                setTimeout(() => {
                    console.log('⏱️ Timeout check: Current phase =', currentGameState?.turnPhase);
                    // Check if round hasn't ended yet (player didn't go out)
                    if (currentGameState?.turnPhase === 'WAITING_FOR_GO_OUT') {
                        console.log('⏰ 5 seconds elapsed - player did not go out');
                        console.log('Ending round automatically...');
                        endRound();
                    } else {
                        console.log('✓ Player already went out or round ended');
                    }
                }, 5000); // 5 second window to go out

                return;
            } catch (error) {
                console.error('❌ Error setting WAITING_FOR_GO_OUT phase:', error);
                showErrorModal('Error advancing turn. Please try again.');
                return;
            }
        }
    }

    // Get player IDs from playerHands in gameState
    const playerIds = Object.keys(currentGameState.playerHands || {});

    console.log('Player order:', playerIds);

    // Find current player index
    const currentIndex = playerIds.indexOf(currentGameState.currentPlayer);

    if (currentIndex === -1) {
        console.error('Current player not found in players list');
        return;
    }

    // Get next player (wrap around)
    const nextIndex = (currentIndex + 1) % playerIds.length;
    const nextPlayerId = playerIds[nextIndex];

    console.log('Next player:', nextPlayerId);

    // Update Firebase with all changes
    try {
        await gameStateRef.update({
            'currentPlayer': nextPlayerId,
            'previousPlayer': playerId,  // Track who just finished their turn
            'turnPhase': 'WAITING_FOR_DRAW',
            'discardPile': newDiscardPile,
            [`playerHands/${playerId}`]: newHand
        });

        console.log('Turn advanced successfully');
    } catch (error) {
        console.error('Error advancing turn:', error);
        showErrorModal('Error advancing turn. Please try again.');
    }
}

/**
 * End the current round and calculate scores
 * Called when all players have finished their final turns
 */
async function endRound() {
    console.log('=== ENDING ROUND ===');

    if (!currentGameState) {
        console.error('endRound: No game state available');
        return;
    }

    // Prevent multiple simultaneous calls
    if (currentGameState.turnPhase === 'ROUND_ENDED') {
        console.log('Round already ended, skipping');
        return;
    }

    try {
        console.log('Calculating scores for all players...');
        const scores = await calculateAllScores();

        if (!scores) {
            console.error('Failed to calculate scores');
            showErrorModal('Error calculating scores');
            return;
        }

        // Save round scores to gameState
        const currentRound = currentGameState.currentRound;
        const roundScoresPath = `roundScores/round${currentRound}`;

        await gameStateRef.update({
            'turnPhase': 'ROUND_ENDED',
            [roundScoresPath]: scores.roundScores,
            'playerScores': scores.playerScores
        });

        console.log('Round ended - scores calculated and saved');
    } catch (error) {
        console.error('Error ending round:', error);
        showErrorModal('Error ending round. Please try again.');
    }
}

/**
 * Handle going out
 */
async function handleGoOut() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║              HANDLE GO OUT CLICKED                        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('Player ID:', playerId);
    console.log('Turn Phase:', turnPhase);
    console.log('isMyTurn:', isMyTurn);
    console.log('currentPlayer:', currentGameState?.currentPlayer);
    console.log('previousPlayer:', currentGameState?.previousPlayer);

    // Check if it's your turn OR if you just discarded and next player hasn't drawn yet
    // OR if you're in the WAITING_FOR_GO_OUT phase (last player's final chance)
    const wasPreviousPlayer = currentGameState && currentGameState.previousPlayer === playerId;
    const isWaitingForGoOut = turnPhase === 'WAITING_FOR_GO_OUT' && wasPreviousPlayer;
    const canAttemptGoOut = isMyTurn || (wasPreviousPlayer && turnPhase === 'WAITING_FOR_DRAW') || isWaitingForGoOut;

    console.log('Validation checks:');
    console.log('  - wasPreviousPlayer:', wasPreviousPlayer);
    console.log('  - isWaitingForGoOut:', isWaitingForGoOut);
    console.log('  - canAttemptGoOut:', canAttemptGoOut);

    if (!canAttemptGoOut) {
        console.log('❌ Cannot go out - validation failed');
        showError('Not your turn! The window to go out has closed.');
        return;
    }

    console.log('✅ Validation passed - proceeding with go out');


    // If it's currently your turn, you must have drawn a card first (unless in POST_GO_OUT phases)
    if (isMyTurn && turnPhase === 'WAITING_FOR_DRAW') {
        showError('You must draw a card first!');
        return;
    }

    // Same for POST_GO_OUT phase - must draw first
    if (isMyTurn && turnPhase === 'POST_GO_OUT') {
        showError('You must draw a card first!');
        return;
    }

    // Check if player can actually go out (must have valid sets/runs)
    if (!canGoOut()) {
        showError('You cannot go out yet! All cards must form valid sets or runs.');
        return;
    }

    console.log('Going out!');

    // IMPORTANT: Save current hand state before clearing hand
    // This ensures scoring can properly evaluate which cards were in valid groups
    if (cardHandManager) {
        const currentHandState = cardHandManager.getHandState();
        console.log('Saving hand state before going out:', currentHandState);

        try {
            // Save hand state - wait for it to complete before clearing hand
            await handStateRef.set(currentHandState);
            console.log('Hand state saved successfully before going out');
        } catch (error) {
            console.error('Error saving hand state before going out:', error);
            // Continue anyway - player is going out so score should be 0
        }
    }

    // Check if we're in the WAITING_FOR_GO_OUT phase (last player going out)
    if (turnPhase === 'WAITING_FOR_GO_OUT') {
        console.log('Last player going out in WAITING_FOR_GO_OUT phase - ending round immediately');

        // Save current hand for scoring before clearing
        const currentHand = currentGameState.playerHands[playerId] || [];

        // Clear this player's hand and end the round
        try {
            await gameStateRef.update({
                [`playerHands/${playerId}`]: [], // Clear hand - player went out
                [`playerHandsBeforeGoOut/${playerId}`]: currentHand // Save hand for scoring
            });

            console.log('Hand cleared and saved - now ending round');
            // End the round immediately
            await endRound();
            return;
        } catch (error) {
            console.error('Error going out in WAITING_FOR_GO_OUT phase:', error);
            showError('Error going out. Please try again.');
            return;
        }
    }

    // Check if this is the first player to go out
    const isFirstPlayerOut = !currentGameState.firstPlayerOut;

    if (isFirstPlayerOut) {
        console.log('First player going out! Starting POST_GO_OUT phase');

        // Get all player IDs from playerHands
        const allPlayerIds = Object.keys(currentGameState.playerHands);

        // Get players who still need their final turn (everyone except current player, in turn order)
        const currentIndex = allPlayerIds.indexOf(playerId);
        const playersRemaining = [];

        // Add all players after current player (in circular order)
        for (let i = 1; i < allPlayerIds.length; i++) {
            const nextIndex = (currentIndex + i) % allPlayerIds.length;
            playersRemaining.push(allPlayerIds[nextIndex]);
        }

        console.log('Players remaining for final turns:', playersRemaining);

        // Save current hand for scoring before clearing
        const currentHand = currentGameState.playerHands[playerId] || [];

        // Update Firebase: mark this player as first out, set POST_GO_OUT phase
        gameStateRef.update({
            'firstPlayerOut': playerId,
            'playersRemaining': playersRemaining,
            'turnPhase': 'POST_GO_OUT',
            'currentPlayer': playersRemaining.length > 0 ? playersRemaining[0] : null,
            [`playerHands/${playerId}`]: [], // Clear hand - player went out
            [`playerHandsBeforeGoOut/${playerId}`]: currentHand, // Save hand for scoring
            'previousPlayer': null // Clear previous player
        })
        .then(() => {
            console.log('Successfully went out! POST_GO_OUT phase started');
        })
        .catch((error) => {
            console.error('Error going out:', error);
            showError('Error going out. Please try again.');
        });
    } else {
        console.log('Going out during POST_GO_OUT phase');

        // Save current hand for scoring before clearing
        const currentHand = currentGameState.playerHands[playerId] || [];

        // Another player already went out - just clear this player's hand
        gameStateRef.update({
            [`playerHands/${playerId}`]: [], // Clear hand - player went out
            [`playerHandsBeforeGoOut/${playerId}`]: currentHand // Save hand for scoring
        })
        .then(() => {
            console.log('Successfully went out during POST_GO_OUT phase');
            // Turn will advance via normal discard flow
        })
        .catch((error) => {
            console.error('Error going out:', error);
            showError('Error going out. Please try again.');
        });
    }
}

/**
 * Handle round end - show scores and prompt to continue
 */
let roundEndHandled = false;

function handleRoundEnd() {
    // Only handle once (prevent multiple alerts)
    if (roundEndHandled) return;
    roundEndHandled = true;

    console.log('Round ended! Displaying scores...');

    // Get current round scores
    const currentRound = currentGameState.currentRound;
    const roundScores = currentGameState.roundScores?.[`round${currentRound}`] || {};
    const playerScores = currentGameState.playerScores || {};

    // Check if this is the final round (round 11)
    if (currentRound >= 11) {
        handleGameEnd();
        return;
    }

    // Update modal title
    roundEndTitle.textContent = `🏁 Round ${currentRound} Complete!`;

    // Build score table
    const scoreTable = createScoreTable(roundScores, playerScores, currentRound);
    roundEndContent.innerHTML = scoreTable;

    // Update message
    const nextRoundWild = (currentRound + 1) + 2;
    roundEndMessage.textContent = `Next: Round ${currentRound + 1} (${nextRoundWild}s Wild)`.replace(/\s+/g, ' ');

    // Show/hide buttons based on host status
    if (isHost) {
        continueRoundBtn.style.display = 'block';
        waitingMessage.style.display = 'none';
        continueRoundBtn.textContent = `Start Round ${currentRound + 1}`;
    } else {
        continueRoundBtn.style.display = 'none';
        waitingMessage.style.display = 'block';
    }

    // Show modal
    roundEndModal.classList.add('active');
}

/**
 * Show hand tooltip when hovering over a score cell
 */
async function showHandTooltip(cellElement, round, playerId, isPersistent = false) {
    // Only show tooltips for completed rounds
    if (currentGameState && round > currentGameState.currentRound) {
        return; // Round hasn't been played yet, don't show tooltip
    }

    // Remove any existing tooltip
    const existingTooltip = document.querySelector('.score-tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
        // If clicking the same cell, just remove and return
        if (isPersistent && existingTooltip.dataset.cellId === `${round}-${playerId}`) {
            return;
        }
    }

    // Create tooltip container
    const tooltip = document.createElement('div');
    tooltip.className = 'score-tooltip';
    if (isPersistent) {
        tooltip.classList.add('persistent');
    }
    tooltip.dataset.cellId = `${round}-${playerId}`;
    tooltip.innerHTML = '<div class="score-tooltip-title">Loading...</div>';
    document.body.appendChild(tooltip); // Append to body to avoid overflow issues

    // Position tooltip near the cell
    const rect = cellElement.getBoundingClientRect();
    const tooltipWidth = 280;
    const tooltipHeight = 150; // Approximate height
    const margin = 10;

    // Calculate center position
    let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
    let top = rect.top - tooltipHeight - margin;

    // Adjust horizontal position if too close to edges
    if (left < margin) {
        left = margin;
    } else if (left + tooltipWidth > window.innerWidth - margin) {
        left = window.innerWidth - tooltipWidth - margin;
    }

    // If tooltip would go off top of screen, position it below the cell instead
    if (top < margin) {
        top = rect.bottom + margin;
        tooltip.classList.add('below');
    }

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';

    try {
        // Fetch hand data from Firebase
        const roundHandsPath = `roundHands/round${round}/${playerId}`;
        console.log('🔍 Fetching hand data from:', roundHandsPath);

        const roundHandsRef = gameStateRef.child(roundHandsPath);
        const snapshot = await roundHandsRef.once('value');
        const handData = snapshot.val();

        console.log('📦 Hand data retrieved:', handData);

        if (!handData) {
            console.warn('⚠️ No hand data found at:', roundHandsPath);
            // Check if the data exists at the parent level
            const parentRef = gameStateRef.child(`roundHands/round${round}`);
            const parentSnapshot = await parentRef.once('value');
            console.log('📂 All round data:', parentSnapshot.val());

            tooltip.innerHTML = '<div class="score-tooltip-title">No hand data available</div><div style="font-size: 10px; margin-top: 4px;">Data may not have been saved for this round</div>';
            return;
        }

        // Build tooltip content
        let tooltipContent = '<div class="score-tooltip-title">Hand Breakdown:</div>';

        // Check if player went out (score of 0)
        const wentOut = handData.score === 0;

        // Show groups
        if (handData.optimalGroups && handData.optimalGroups.length > 0) {
            handData.optimalGroups.forEach((group, i) => {
                const groupType = isValidSet(group, getWildRankForRound(round)) ? 'Set' : 'Run';
                const cards = group.map(c => {
                    const rank = c.rank === 'Joker' ? 'JKR' : c.rank;
                    return rank + getSuitSymbol(c.suit);
                }).join(', ');
                tooltipContent += `<div class="score-tooltip-group">`;
                tooltipContent += `<span class="score-tooltip-group-title">${groupType}:</span> `;
                tooltipContent += `<span class="score-tooltip-cards">${cards}</span>`;
                tooltipContent += `<span class="score-tooltip-pts"> (0 pts)</span>`;
                tooltipContent += `</div>`;
            });
        }

        // Show "Went out" message if score is 0 (even if there are groups)
        if (wentOut) {
            tooltipContent += `<div class="score-tooltip-group">`;
            tooltipContent += `<span class="score-tooltip-group-title">✨ Went out successfully! 🎉</span>`;
            tooltipContent += `</div>`;
        }

        // Show ungrouped cards
        if (handData.ungroupedCards && handData.ungroupedCards.length > 0) {
            const wildRank = getWildRankForRound(round);
            const ungroupedStr = handData.ungroupedCards.map(c => {
                const pts = getCardPointValue(c, wildRank);
                const rank = c.rank === 'Joker' ? 'JKR' : c.rank;
                return `${rank}${getSuitSymbol(c.suit)} (${pts})`;
            }).join(', ');
            tooltipContent += `<div class="score-tooltip-group">`;
            tooltipContent += `<span class="score-tooltip-ungrouped">Ungrouped:</span> `;
            tooltipContent += `<span class="score-tooltip-cards">${ungroupedStr}</span>`;
            tooltipContent += `</div>`;
        }

        // Show total
        tooltipContent += `<div class="score-tooltip-total">Total: ${handData.score} points</div>`;

        tooltip.innerHTML = tooltipContent;

        // Show tooltip with animation
        setTimeout(() => tooltip.classList.add('show'), 10);
    } catch (error) {
        console.error('❌ Error loading hand tooltip:', error);
        tooltip.innerHTML = `<div class="score-tooltip-title">Error loading hand data</div><div style="font-size: 10px; margin-top: 4px;">${error.message}</div>`;
    }

    // Handle tooltip removal
    if (isPersistent) {
        // For persistent tooltips (from clicks), add close button and click-outside handler
        const closeBtn = document.createElement('button');
        closeBtn.className = 'tooltip-close-btn';
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = 'position: absolute; top: 5px; right: 5px; background: transparent; border: none; color: var(--white); font-size: 20px; cursor: pointer; padding: 0; width: 24px; height: 24px; line-height: 20px;';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            tooltip.remove();
        };
        tooltip.appendChild(closeBtn);

        // Click outside to close
        setTimeout(() => {
            const clickOutsideHandler = (e) => {
                if (!tooltip.contains(e.target) && e.target !== cellElement) {
                    tooltip.remove();
                    document.removeEventListener('click', clickOutsideHandler);
                }
            };
            document.addEventListener('click', clickOutsideHandler);
        }, 100);
    } else {
        // For hover tooltips, remove when mouse leaves
        cellElement.addEventListener('mouseleave', () => {
            if (!tooltip.classList.contains('persistent')) {
                tooltip.remove();
            }
        }, { once: true });
    }
}

/**
 * Helper function to get wild rank for a specific round
 */
function getWildRankForRound(round) {
    const wildRanks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    return wildRanks[round - 1];
}

/**
 * Create score table HTML
 */
function createScoreTable(roundScores, playerScores, currentRound) {
    // Get all player IDs from playerScores (most reliable source)
    let playerIds = Object.keys(playerScores || {});

    // Fallback to roundScores if playerScores is empty
    if (playerIds.length === 0) {
        playerIds = Object.keys(roundScores || {});
    }

    // Fallback to playerHands if both are empty
    if (playerIds.length === 0 && currentGameState?.playerHands) {
        playerIds = Object.keys(currentGameState.playerHands);
    }

    // Get all round scores from gameState
    const allRoundScores = currentGameState.roundScores || {};

    // Get player names from gameState (stored at game start)
    let storedPlayerNames = currentGameState?.playerNames || {};
    const players = currentGameData?.players || {};

    // Migration: Populate or update playerNames in gameState
    // Check if current player's name is missing or is a fallback value
    if (playerName && (!storedPlayerNames[playerId] || storedPlayerNames[playerId].startsWith('Player '))) {
        console.log('Adding/updating current player name in gameState...');

        // Create update object preserving existing names and adding current player
        const updatedPlayerNames = { ...storedPlayerNames };

        // Add names from players object if available
        playerIds.forEach((pid) => {
            if (players[pid]?.name && !updatedPlayerNames[pid]) {
                updatedPlayerNames[pid] = players[pid].name;
            }
        });

        // Add/update current player's name from sessionStorage
        updatedPlayerNames[playerId] = playerName;

        // Update storedPlayerNames for local use
        storedPlayerNames = updatedPlayerNames;

        // Save to Firebase
        gameStateRef.update({ playerNames: updatedPlayerNames })
            .then(() => console.log('Successfully updated playerNames in gameState:', updatedPlayerNames))
            .catch(err => console.error('Failed to update playerNames:', err));
    }

    const playerNames = {};
    playerIds.forEach((pid) => {
        // Priority: 1) gameState.playerNames, 2) players object, 3) sessionStorage for self, 4) fallback
        if (storedPlayerNames[pid]) {
            playerNames[pid] = storedPlayerNames[pid];
        } else if (players[pid]?.name) {
            playerNames[pid] = players[pid].name;
        } else if (pid === playerId && playerName) {
            playerNames[pid] = playerName;
        } else {
            playerNames[pid] = `Player ${pid.substring(0, 4)}`;
        }
    });

    // Sort players alphabetically by name
    playerIds.sort((a, b) => {
        return playerNames[a].localeCompare(playerNames[b]);
    });

    // Wild card names for each round
    const wildNames = ["3's", "4's", "5's", "6's", "7's", "8's", "9's", "10's", "J's", "Q's", "K's"];

    let html = '<table class="score-table">';

    // Header row with player names
    html += '<thead><tr>';
    html += '<th>Round</th>';
    playerIds.forEach(pid => {
        const isYou = pid === playerId;
        html += `<th class="${isYou ? 'you' : ''}">${playerNames[pid]}</th>`;
    });
    html += '</tr></thead>';

    html += '<tbody>';

    // Row for each round
    for (let round = 1; round <= currentRound; round++) {
        html += '<tr>';
        html += `<td><strong>${wildNames[round - 1]}</strong></td>`;

        const roundScoreData = allRoundScores[`round${round}`] || {};

        playerIds.forEach(pid => {
            const score = normalizeScore(roundScoreData[pid]);
            const wentOut = score === 0;
            html += `<td class="score-value${wentOut ? ' went-out' : ''}" data-round="${round}" data-player="${pid}" onmouseover="showHandTooltip(this, ${round}, '${pid}')" onclick="showHandTooltip(this, ${round}, '${pid}', true)">${score}</td>`;
        });

        html += '</tr>';
    }

    // Total row
    html += '<tr class="total-row">';
    html += '<td><strong>Total</strong></td>';
    playerIds.forEach(pid => {
        const totalScore = normalizeScore(playerScores[pid]);
        html += `<td class="score-value"><strong>${totalScore}</strong></td>`;
    });
    html += '</tr>';

    html += '</tbody></table>';

    return html;
}

/**
 * Handle game end after round 11
 */
function handleGameEnd() {
    const currentRound = currentGameState.currentRound;
    const roundScores = currentGameState.roundScores?.[`round${currentRound}`] || {};
    const playerScores = currentGameState.playerScores || {};

    // Find winner (lowest score)
    let winner = null;
    let lowestScore = Infinity;

    for (const pid in playerScores) {
        if (playerScores[pid] < lowestScore) {
            lowestScore = playerScores[pid];
            winner = pid;
        }
    }

    // Get winner name from players object
    const players = currentGameData?.players || {};
    let winnerName;
    if (winner === playerId) {
        winnerName = 'You win!';
    } else {
        const winnerData = players[winner];
        const name = winnerData && winnerData.name ? winnerData.name : `Player ${winner.substring(0, 4)}`;
        winnerName = `${name} wins!`;
    }

    // Update winner message
    winnerMessage.innerHTML = `🏆 ${winnerName}<br><span style="font-size: 18px; font-weight: 400;">with ${lowestScore} points</span>`;

    // Build final scores table
    const scoreTable = createFinalScoreTable(playerScores);
    finalScores.innerHTML = scoreTable;

    // Show game end modal
    gameEndModal.classList.add('active');
}

/**
 * Create final score table HTML
 */
function createFinalScoreTable(playerScores) {
    // Get player names from players object
    const players = currentGameData?.players || {};
    const playerNames = {};
    for (const pid in playerScores) {
        if (pid === playerId) {
            playerNames[pid] = 'You';
        } else {
            const playerData = players[pid];
            playerNames[pid] = playerData && playerData.name ? playerData.name : `Player ${pid.substring(0, 4)}`;
        }
    }

    // Sort by total score (best to worst)
    const sortedPlayers = Object.keys(playerScores).sort((a, b) => playerScores[a] - playerScores[b]);

    let html = '<table class="score-table">';
    html += '<thead><tr>';
    html += '<th>Final Ranking</th>';
    html += '<th>Total Score</th>';
    html += '</tr></thead>';
    html += '<tbody>';

    sortedPlayers.forEach((pid, index) => {
        const totalScore = playerScores[pid];
        const isYou = pid === playerId;

        html += '<tr>';

        // Player name with rank badge
        html += '<td>';
        const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-other';
        html += `<span class="rank-badge ${rankClass}">${index + 1}</span>`;
        html += `<span class="player-name${isYou ? ' you' : ''}">${playerNames[pid]}</span>`;
        html += '</td>';

        // Total score
        html += `<td class="score-value">${totalScore}</td>`;

        html += '</tr>';
    });

    html += '</tbody></table>';

    return html;
}

/**
 * Start next round (host only)
 */
async function startNextRound() {
    console.log('=== START NEXT ROUND CLICKED ===');
    console.log('Current round:', currentGameState?.currentRound);
    console.log('Is host:', isHost);

    if (!isHost) {
        console.error('Only host can start next round!');
        showErrorModal('Only the host can start the next round.');
        return;
    }

    // Close the round end modal
    roundEndModal.classList.remove('active');

    const nextRound = currentGameState.currentRound + 1;
    console.log('Next round will be:', nextRound);

    // Create and shuffle new deck
    const deck = createFiveCrownsDeck();
    let shuffledDeck = shuffleDeck(deck);

    // Calculate cards per player for this round
    const cardsPerPlayer = nextRound + 2; // Round 1 = 3 cards, Round 2 = 4 cards, etc.

    // Get all player IDs from the players object (not playerHands, which might have empty arrays)
    // This ensures we include ALL players, even those who went out in the previous round
    console.log('DEBUG: currentGameData:', currentGameData);
    console.log('DEBUG: currentGameData.players:', currentGameData?.players);
    console.log('DEBUG: currentGameState.playerIds:', currentGameState?.playerIds);

    // Try multiple sources for player IDs (in order of preference)
    let playerIds = Object.keys(currentGameData?.players || {});

    // Fallback 1: Use playerIds stored in gameState
    if (playerIds.length === 0 && currentGameState?.playerIds) {
        console.log('Using playerIds from gameState');
        playerIds = currentGameState.playerIds;
    }

    // Fallback 2: Use playerScores (everyone who's played must have a score)
    if (playerIds.length === 0) {
        console.log('Attempting to get players from playerScores instead...');
        playerIds = Object.keys(currentGameState.playerScores || {});
    }

    // Fallback 3: Use playerHands (but this might miss players who went out)
    if (playerIds.length === 0) {
        console.log('Attempting to get players from playerHands instead...');
        playerIds = Object.keys(currentGameState.playerHands || {});
    }

    if (playerIds.length === 0) {
        console.error('❌ CRITICAL ERROR: No players found!');
        console.error('currentGameData:', currentGameData);
        console.error('currentGameState:', currentGameState);
        showErrorModal('Error: No players found to deal cards to. Check console for details.');
        return;
    }

    console.log('Found', playerIds.length, 'players:', playerIds);

    console.log('Dealing cards for Round', nextRound);
    console.log('Players:', playerIds);
    console.log('Cards per player:', cardsPerPlayer);
    console.log('Current playerHands:', currentGameState.playerHands);

    // Deal cards for new round
    const newPlayerHands = {};
    playerIds.forEach(pid => {
        const hand = [];
        for (let i = 0; i < cardsPerPlayer; i++) {
            if (shuffledDeck.length > 0) {
                hand.push(shuffledDeck.pop());
            }
        }
        newPlayerHands[pid] = hand;
        console.log(`Dealt ${hand.length} cards to player ${pid}:`, hand.map(c => c.rank + c.suit[0]));
    });

    console.log('NEW PLAYER HANDS OBJECT:', newPlayerHands);
    console.log('Player IDs in new hands:', Object.keys(newPlayerHands));

    // Flip one card to start discard pile
    const newDiscardPile = [];
    if (shuffledDeck.length > 0) {
        newDiscardPile.push(shuffledDeck.pop());
    }

    // Determine first player (rotate from previous round)
    // Use firstPlayerThisRound if available (who started the round), otherwise fall back to currentPlayer
    const previousFirstPlayer = currentGameState.firstPlayerThisRound || currentGameState.currentPlayer || playerIds[0];
    const currentIndex = playerIds.indexOf(previousFirstPlayer);
    const nextFirstPlayer = playerIds[(currentIndex + 1) % playerIds.length];

    console.log('Rotating first player:');
    console.log('  - Previous first player:', previousFirstPlayer);
    console.log('  - Next first player:', nextFirstPlayer);
    console.log('About to update Firebase with:');
    console.log('  - currentRound:', nextRound);
    console.log('  - currentPlayer:', nextFirstPlayer);
    console.log('  - playerHands:', newPlayerHands);

    // Update game state for next round
    try {
        await gameStateRef.update({
            'currentRound': nextRound,
            'deck': shuffledDeck,
            'discardPile': newDiscardPile,
            'playerHands': newPlayerHands,
            'turnPhase': 'WAITING_FOR_DRAW',
            'currentPlayer': nextFirstPlayer,
            'firstPlayerThisRound': nextFirstPlayer, // Track who starts this round for rotation
            'firstPlayerOut': null,
            'playersRemaining': [],
            'previousPlayer': null,
            'playerHandsBeforeGoOut': null // Clear saved hands from previous round
        });

        console.log('✅ Firebase update successful!');

        // Clear all player hand states (card organization)
        const handStatesRef = gameRef.child('playerHandStates');
        await handStatesRef.remove();

        console.log('✅ Successfully started round', nextRound);
        console.log('=== ROUND START COMPLETE ===');
        roundEndHandled = false; // Reset for next round end
    } catch (error) {
        console.error('❌ ERROR starting next round:', error);
        console.error('Error details:', error.message, error.code);
        showErrorModal('Error starting next round: ' + error.message);
    }
}

/**
 * Helper function to create Five Crowns deck (same as in lobby.js)
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
 * Helper function to shuffle deck (same as in lobby.js)
 */
function shuffleDeck(deck) {
    const shuffled = [...deck];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

/**
 * Reshuffle discard pile when deck is empty
 * Keeps the top card of discard pile, shuffles the rest into new deck
 */
function reshuffleDiscardPile() {
    if (!currentGameState.discardPile || currentGameState.discardPile.length <= 1) {
        return { success: false };
    }

    // Take all cards except the top one
    const discardPileCopy = [...currentGameState.discardPile];
    const topCard = discardPileCopy.pop(); // Keep top card

    // Shuffle the remaining cards into new deck
    const newDeck = shuffleDeck(discardPileCopy);

    // Update currentGameState (optimistic update)
    currentGameState.deck = newDeck;
    currentGameState.discardPile = [topCard];

    // Update Firebase
    gameStateRef.update({
        'deck': newDeck,
        'discardPile': [topCard]
    })
    .then(() => {
        console.log('Discard pile reshuffled into deck successfully');
    })
    .catch((error) => {
        console.error('Error reshuffling deck:', error);
    });

    return { success: true, newDeck, newDiscardPile: [topCard] };
}

/**
 * Open game menu
 */
function openGameMenu() {
    gameMenuModal.classList.add('active');
}

/**
 * Close game menu
 */
function closeGameMenu() {
    gameMenuModal.classList.remove('active');
}

/**
 * Show scores - Display current game scores in round end modal
 */
function showScores() {
    if (!currentGameState) {
        showErrorModal('No game in progress');
        return;
    }

    const currentRound = currentGameState.currentRound;
    const roundScores = currentGameState.roundScores || {};
    const playerScores = currentGameState.playerScores || {};

    // Reuse the round end modal to show scores
    roundEndTitle.textContent = `📊 Score Summary - Round ${currentRound}`;

    // Build score table
    const scoreTable = createScoreTable(roundScores[`round${currentRound}`] || playerScores, playerScores, currentRound);
    roundEndContent.innerHTML = scoreTable;

    // Update message
    roundEndMessage.textContent = `Game in progress...`;

    // Hide action buttons when viewing scores mid-game
    continueRoundBtn.style.display = 'none';
    waitingMessage.style.display = 'none';

    // Show modal
    roundEndModal.classList.add('active');

    // Add click handler to close when clicking outside
    const closeHandler = (e) => {
        if (e.target === roundEndModal) {
            roundEndModal.classList.remove('active');
            roundEndModal.removeEventListener('click', closeHandler);
        }
    };
    roundEndModal.addEventListener('click', closeHandler);
}

/**
 * Show rules modal
 */
function showRules() {
    closeGameMenu();
    rulesModal.style.display = 'flex';

    // Add click handler to close when clicking outside
    const closeHandler = (e) => {
        if (e.target === rulesModal) {
            closeRulesModal();
            rulesModal.removeEventListener('click', closeHandler);
        }
    };
    rulesModal.addEventListener('click', closeHandler);
}

/**
 * Close rules modal
 */
function closeRulesModal() {
    rulesModal.style.display = 'none';
}

/**
 * Initialize Settings UI
 */
function initializeSettingsUI() {
    if (!settingsManager) {
        console.warn('Settings manager not initialized yet');
        return;
    }

    // Get available card designs
    const designs = settingsManager.getAvailableDesigns();
    const currentDesign = settingsManager.getCardDesign();

    // Clear existing options
    cardDesignSelector.innerHTML = '';

    // Create design options
    designs.forEach(design => {
        const option = document.createElement('div');
        option.className = 'card-design-option';
        if (design.id === currentDesign) {
            option.classList.add('selected');
        }

        option.innerHTML = `
            <div class="card-design-radio"></div>
            <div class="card-design-info">
                <div class="card-design-name">${design.name}</div>
                <div class="card-design-description">${design.description}</div>
            </div>
        `;

        option.addEventListener('click', () => {
            selectCardDesign(design.id);
        });

        cardDesignSelector.appendChild(option);
    });

    // Initialize wild highlighting toggle
    const highlightEnabled = settingsManager.getHighlightWilds();
    wildHighlightToggle.checked = highlightEnabled;
    highlightWilds = highlightEnabled;

    // Add event listener for toggle
    wildHighlightToggle.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        settingsManager.setHighlightWilds(enabled);
        highlightWilds = enabled;

        // Update card hand manager if it exists
        if (cardHandManager) {
            cardHandManager.setHighlightWilds(enabled);
            cardHandManager.renderHand();
        }
    });

    console.log('Settings UI initialized with', designs.length, 'designs');
}

/**
 * Select a card design
 */
function selectCardDesign(designId) {
    // Update settings
    if (settingsManager.setCardDesign(designId)) {
        // Update UI selection
        const options = cardDesignSelector.querySelectorAll('.card-design-option');
        options.forEach((option, index) => {
            const designs = settingsManager.getAvailableDesigns();
            if (designs[index].id === designId) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });

        console.log('Card design changed to:', designId);
    }
}

/**
 * Open settings modal from game menu
 */
function openSettingsFromMenu() {
    closeGameMenu(); // Close the menu first
    openSettingsModal();
}

/**
 * Open settings modal
 */
function openSettingsModal() {
    settingsModal.classList.add('active');
    console.log('Settings modal opened');
}

/**
 * Close settings modal
 */
function closeSettingsModal() {
    settingsModal.classList.remove('active');
    console.log('Settings modal closed');
}

/**
 * Confirm leave game
 */
async function confirmLeaveGame() {
    const confirmed = await showConfirmModal('Are you sure you want to leave the game?', 'Leave Game');
    if (confirmed) {
        // Remove player from game
        playersRef.child(playerId).remove()
            .then(() => {
                console.log('Left game');
                window.location.href = 'index.html';
            })
            .catch((error) => {
                console.error('Error leaving game:', error);
                showErrorModal('Error leaving game. Please try again.');
            });
    }
}

/**
 * Show error modal
 */
function showError(message) {
    errorMessage.textContent = message;
    errorModal.classList.add('active');
}

/**
 * Close error modal
 */
function closeErrorModal() {
    errorModal.classList.remove('active');
}

/**
 * Show error modal and redirect to home after user acknowledges
 */
function showErrorAndRedirect(message) {
    errorMessage.textContent = message;
    errorModal.classList.add('active');

    // Set up one-time event listener for OK button
    const handleRedirect = () => {
        errorModal.classList.remove('active');
        window.location.href = 'index.html';
    };

    const errorOkBtn = document.getElementById('errorOkBtn');
    const closeErrorBtn = document.getElementById('closeErrorBtn');

    // Remove any existing listeners
    errorOkBtn.replaceWith(errorOkBtn.cloneNode(true));
    closeErrorBtn.replaceWith(closeErrorBtn.cloneNode(true));

    // Add new listeners
    document.getElementById('errorOkBtn').addEventListener('click', handleRedirect, { once: true });
    document.getElementById('closeErrorBtn').addEventListener('click', handleRedirect, { once: true });
}

console.log('Game board initialized!');
