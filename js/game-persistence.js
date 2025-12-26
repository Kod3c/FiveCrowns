// Five Crowns - Game Persistence
// Saves and restores active games for authenticated users

console.log('Game persistence loaded');

/**
 * Save active game to user's Firestore profile
 * @param {string} gameCode - Game code
 * @param {string} status - 'waiting' or 'playing'
 */
async function saveActiveGame(gameCode, status = 'waiting') {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('No user logged in, skipping game save');
            return;
        }

        console.log('Saving active game:', gameCode, 'Status:', status);

        await firestore.collection('users').doc(user.uid).update({
            activeGame: {
                gameCode: gameCode,
                status: status,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }
        });

        console.log('Active game saved successfully');
    } catch (error) {
        console.error('Error saving active game:', error);
        // Non-critical error, don't throw
    }
}

/**
 * Clear active game from user's profile
 */
async function clearActiveGame() {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('No user logged in, skipping clear');
            return;
        }

        console.log('Clearing active game');

        await firestore.collection('users').doc(user.uid).update({
            activeGame: firebase.firestore.FieldValue.delete()
        });

        console.log('Active game cleared successfully');
    } catch (error) {
        console.error('Error clearing active game:', error);
        // Non-critical error, don't throw
    }
}

/**
 * Get user's active game if any
 * @returns {Promise<object|null>} Active game data or null
 */
async function getActiveGame() {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('No user logged in, no active game');
            return null;
        }

        const doc = await firestore.collection('users').doc(user.uid).get();
        if (doc.exists && doc.data().activeGame) {
            const activeGame = doc.data().activeGame;
            console.log('Found active game:', activeGame);
            return activeGame;
        }

        console.log('No active game found');
        return null;
    } catch (error) {
        console.error('Error getting active game:', error);
        return null;
    }
}

/**
 * Check if user has an active game and offer to rejoin
 * Call this on index.html page load
 */
async function checkForActiveGame() {
    try {
        const activeGame = await getActiveGame();

        if (!activeGame) {
            return;
        }

        // Verify the game still exists in Firebase
        const gameRef = database.ref('games/' + activeGame.gameCode);
        const snapshot = await gameRef.once('value');

        if (!snapshot.exists()) {
            console.log('Active game no longer exists, clearing');
            await clearActiveGame();
            return;
        }

        const gameData = snapshot.val();

        // Show a modal or prompt to rejoin
        const shouldRejoin = confirm(
            `You have an active game (${activeGame.gameCode}).\n\n` +
            `Would you like to rejoin?`
        );

        if (shouldRejoin) {
            const playerId = sessionStorage.getItem('playerId');

            // Store game info in session
            sessionStorage.setItem('gameCode', activeGame.gameCode);

            // Redirect to appropriate page
            if (gameData.status === 'playing') {
                window.location.href = `game.html?code=${activeGame.gameCode}`;
            } else {
                window.location.href = `lobby.html?code=${activeGame.gameCode}`;
            }
        } else {
            // User declined, clear the active game
            await clearActiveGame();
        }
    } catch (error) {
        console.error('Error checking for active game:', error);
    }
}
