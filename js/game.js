// Five Crowns - Game Board JavaScript
// Handles game state, card interactions, and real-time gameplay

console.log('Five Crowns game board loaded!');

// Get game info from URL and session
const urlParams = new URLSearchParams(window.location.search);
const gameCode = urlParams.get('code');
const playerId = sessionStorage.getItem('playerId');
const playerName = sessionStorage.getItem('playerName');

// Check if we have valid game info
if (!gameCode || !playerId) {
    console.error('Missing game code or player ID');
    alert('Invalid game session. Returning to home.');
    window.location.href = 'index.html';
}

// DOM Elements
const roundNumber = document.getElementById('roundNumber');
const wildCard = document.getElementById('wildCard');
const yourScore = document.getElementById('yourScore');
const menuBtn = document.getElementById('menuBtn');

const otherPlayers = document.getElementById('otherPlayers');
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
const leaveGameBtn = document.getElementById('leaveGameBtn');

// Firebase References
const gameRef = database.ref('games/' + gameCode);
const gameStateRef = gameRef.child('gameState');
const playersRef = gameRef.child('players');
const handStateRef = gameRef.child('playerHandStates/' + playerId);

// Local Game State
let currentGameState = null;
let myHand = [];
let isMyTurn = false;
let currentRound = 1;
let currentWildRank = '3';
let highlightWilds = true;

// Card Hand Manager
let cardHandManager = null;
let savedHandState = null; // Store hand state loaded from Firebase

// Initialize
init();

function init() {
    console.log('Initializing game board...');
    console.log('Game Code:', gameCode);
    console.log('Player ID:', playerId);
    console.log('Player Name:', playerName);

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
 * Set up event listeners
 */
function setupEventListeners() {
    // Menu
    menuBtn.addEventListener('click', openGameMenu);
    closeMenuBtn.addEventListener('click', closeGameMenu);
    viewScoresBtn.addEventListener('click', showScores);
    viewRulesBtn.addEventListener('click', showRules);
    leaveGameBtn.addEventListener('click', confirmLeaveGame);

    // Deck and Discard
    deckArea.addEventListener('click', handleDrawFromDeck);
    discardArea.addEventListener('click', handleDrawFromDiscard);

    // Hand Actions
    discardBtn.addEventListener('click', handleDiscardCard);
    goOutBtn.addEventListener('click', handleGoOut);

    // Close modal on outside click
    gameMenuModal.addEventListener('click', (e) => {
        if (e.target === gameMenuModal) {
            closeGameMenu();
        }
    });
}

/**
 * Listen to real-time game state changes
 */
function listenToGameState() {
    gameRef.on('value', (snapshot) => {
        if (!snapshot.exists()) {
            console.error('Game not found');
            alert('Game no longer exists. Returning to home.');
            window.location.href = 'index.html';
            return;
        }

        const gameData = snapshot.val();
        currentGameState = gameData.gameState;

        // Get highlight wilds setting
        highlightWilds = gameData.highlightWilds !== false; // Default to true

        console.log('Game state updated:', currentGameState);
        console.log('Highlight wilds:', highlightWilds);

        // Initialize card hand manager on FIRST callback (once per page load)
        if (!cardHandManager) {
            console.log('First Firebase callback - initializing CardHandManager');
            initializeCardHandManager();
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
    // Update round info
    currentRound = currentGameState.currentRound || 1;
    roundNumber.textContent = currentRound;

    // Update wild card
    const wildRanks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    currentWildRank = wildRanks[currentRound - 1];
    wildCard.textContent = currentWildRank + 's';

    // Update deck count
    const remainingCards = currentGameState.deck ? currentGameState.deck.length : 0;
    if (deckCount) {
        deckCount.textContent = remainingCards;
    }

    // Update discard pile
    if (currentGameState.discardPile && currentGameState.discardPile.length > 0) {
        const topCard = currentGameState.discardPile[currentGameState.discardPile.length - 1];
        updateDiscardPile(topCard);
    }

    // Update my hand
    if (currentGameState.playerHands && currentGameState.playerHands[playerId]) {
        myHand = currentGameState.playerHands[playerId];
        renderMyHand();

        // Update wild rank in card hand manager
        if (cardHandManager) {
            cardHandManager.setWildRank(currentWildRank);
        }
    }

    // Update turn indicator
    isMyTurn = (currentGameState.currentPlayer === playerId);
    updateTurnIndicator();

    // Update other players
    renderOtherPlayers();
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
            // No saved state, make sure we render
            console.log('No saved state, rendering default stack');
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
        'stars': '⭐'
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
        discardBtn.disabled = true;
        goOutBtn.disabled = true;
        return;
    }

    const selectedCards = cardHandManager.getSelectedCards();

    // Enable discard if exactly 1 card selected
    discardBtn.disabled = selectedCards.length !== 1;

    // Enable "Go Out" if all cards can form valid sets/runs (to be implemented)
    goOutBtn.disabled = !canGoOut();
}

/**
 * Check if player can go out (placeholder)
 */
function canGoOut() {
    // TODO: Implement set/run validation logic
    return false;
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
 * Render other players
 */
function renderOtherPlayers() {
    // TODO: Fetch player data and render dynamically
    // For now, keep the demo HTML
}

/**
 * Update turn indicator
 */
function updateTurnIndicator() {
    if (isMyTurn) {
        turnInstruction.querySelector('p').textContent = '🎯 Your turn! Draw a card';
        turnInstruction.style.display = 'block';
    } else {
        turnInstruction.style.display = 'none';
    }
}

/**
 * Handle drawing from deck
 */
function handleDrawFromDeck() {
    if (!isMyTurn) {
        alert('Not your turn!');
        return;
    }

    console.log('Drawing from deck...');
    // TODO: Implement draw from deck logic
    alert('Draw from deck (coming soon)');
}

/**
 * Handle drawing from discard
 */
function handleDrawFromDiscard() {
    if (!isMyTurn) {
        alert('Not your turn!');
        return;
    }

    console.log('Drawing from discard...');
    // TODO: Implement draw from discard logic
    alert('Draw from discard (coming soon)');
}

/**
 * Handle discarding a card
 */
function handleDiscardCard() {
    if (!cardHandManager) return;

    const selectedCards = cardHandManager.getSelectedCards();

    if (selectedCards.length !== 1) {
        alert('Please select exactly one card to discard');
        return;
    }

    console.log('Discarding card:', selectedCards[0]);
    // TODO: Implement discard logic
    alert('Discard card (coming soon)');
}

/**
 * Handle going out
 */
function handleGoOut() {
    console.log('Going out!');
    // TODO: Implement go out logic
    alert('Go out (coming soon)');
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
 * Show scores
 */
function showScores() {
    alert('Scores:\n\nYou: 0\nAlice: 0\nBob: 0\n\n(Full scoreboard coming soon)');
}

/**
 * Show rules
 */
function showRules() {
    alert('Five Crowns Rules:\n\n' +
          '• 11 rounds (3s through Kings become wild)\n' +
          '• Draw from deck or discard pile\n' +
          '• Discard one card per turn\n' +
          '• Goal: Create sets (3+ same rank) or runs (3+ consecutive in same suit)\n' +
          '• "Go out" when all cards form valid sets/runs\n' +
          '• Lowest score wins!');
}

/**
 * Confirm leave game
 */
function confirmLeaveGame() {
    if (confirm('Are you sure you want to leave the game?')) {
        // Remove player from game
        playersRef.child(playerId).remove()
            .then(() => {
                console.log('Left game');
                window.location.href = 'index.html';
            })
            .catch((error) => {
                console.error('Error leaving game:', error);
                alert('Error leaving game. Please try again.');
            });
    }
}

console.log('Game board initialized!');
