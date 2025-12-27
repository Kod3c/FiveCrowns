// Five Crowns - Game Persistence
// Saves and restores active games for authenticated users

console.log('Game persistence loaded');

/**
 * Save active game to user's Firestore profile
 * Adds game to activeGames array (supports multiple concurrent games)
 * @param {string} gameCode - Game code
 * @param {string} status - 'waiting' or 'playing'
 */
async function saveActiveGame(gameCode, status = 'waiting') {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('⚠️ No user logged in, skipping game save');
            return;
        }

        console.log('Saving active game:', gameCode, 'Status:', status);

        const userRef = firestore.collection('users').doc(user.uid);
        const userDoc = await userRef.get();

        // Get player name from session storage
        const playerName = sessionStorage.getItem('playerName') || 'Player';
        let activeGames = [];

        if (!userDoc.exists) {
            console.log('User document does not exist, creating with active game');
            activeGames = [{
                gameCode: gameCode,
                status: status,
                playerName: playerName,
                lastUpdated: new Date(),
                createdAt: new Date()
            }];
            await userRef.set({
                uid: user.uid,
                email: user.email,
                firstName: user.displayName || 'Player',
                displayName: user.displayName || 'Player',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                activeGames: activeGames
            });
        } else {
            const userData = userDoc.data();
            activeGames = userData.activeGames || [];

            // Migrate old activeGame format to activeGames array
            if (userData.activeGame && !userData.activeGames) {
                console.log('Migrating old activeGame to activeGames array');
                activeGames = [{
                    gameCode: userData.activeGame.gameCode,
                    status: userData.activeGame.status,
                    playerName: playerName,
                    lastUpdated: userData.activeGame.lastUpdated || new Date(),
                    createdAt: new Date()
                }];
            }

            // Check if game already exists in array
            const existingIndex = activeGames.findIndex(g => g.gameCode === gameCode);

            if (existingIndex >= 0) {
                // Update existing game entry
                activeGames[existingIndex] = {
                    gameCode: gameCode,
                    status: status,
                    playerName: playerName,
                    lastUpdated: new Date(),
                    createdAt: activeGames[existingIndex].createdAt || new Date()
                };
            } else {
                // Add new game to array
                activeGames.push({
                    gameCode: gameCode,
                    status: status,
                    playerName: playerName,
                    lastUpdated: new Date(),
                    createdAt: new Date()
                });
            }

            // Limit to 10 most recent games
            if (activeGames.length > 10) {
                activeGames.sort((a, b) => {
                    const aTime = a.lastUpdated?.getTime?.() || a.lastUpdated?.toMillis?.() || 0;
                    const bTime = b.lastUpdated?.getTime?.() || b.lastUpdated?.toMillis?.() || 0;
                    return bTime - aTime;
                });
                activeGames = activeGames.slice(0, 10);
            }

            await userRef.update({
                activeGames: activeGames,
                activeGame: firebase.firestore.FieldValue.delete() // Remove old field
            });
        }

        console.log('Active game saved successfully! Total games:', activeGames.length);
    } catch (error) {
        console.error('Error saving active game:', error);
        // Non-critical error, don't throw
    }
}

/**
 * Clear active game from user's profile
 * Removes specific game from activeGames array
 * @param {string} gameCode - Optional game code to remove. If not provided, clears all games.
 */
async function clearActiveGame(gameCode = null) {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('No user logged in, skipping clear');
            return;
        }

        console.log('Clearing active game:', gameCode || 'ALL');

        const userRef = firestore.collection('users').doc(user.uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            console.log('User document does not exist');
            return;
        }

        const userData = userDoc.data();
        let activeGames = userData.activeGames || [];

        if (gameCode) {
            // Remove specific game from array
            activeGames = activeGames.filter(g => g.gameCode !== gameCode);
            console.log(`Removed game ${gameCode}, ${activeGames.length} games remaining`);
        } else {
            // Clear all games
            activeGames = [];
            console.log('Cleared all active games');
        }

        await userRef.update({
            activeGames: activeGames
        });

        console.log('Active game cleared successfully');
    } catch (error) {
        console.error('Error clearing active game:', error);
        // Non-critical error, don't throw
    }
}

/**
 * Get user's active games
 * @returns {Promise<array>} Array of active games
 */
async function getActiveGames() {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('No user logged in, no active games');
            return [];
        }

        const doc = await firestore.collection('users').doc(user.uid).get();
        if (doc.exists) {
            const userData = doc.data();

            // Migrate old activeGame format
            if (userData.activeGame && !userData.activeGames) {
                console.log('Found old activeGame format, migrating...');
                const activeGames = [{
                    gameCode: userData.activeGame.gameCode,
                    status: userData.activeGame.status,
                    playerName: sessionStorage.getItem('playerName') || 'Player',
                    lastUpdated: userData.activeGame.lastUpdated || new Date(),
                    createdAt: new Date()
                }];

                // Perform migration
                await firestore.collection('users').doc(user.uid).update({
                    activeGames: activeGames,
                    activeGame: firebase.firestore.FieldValue.delete()
                });

                return activeGames;
            }

            const activeGames = userData.activeGames || [];
            console.log('Found active games:', activeGames.length);
            return activeGames;
        }

        console.log('No active games found');
        return [];
    } catch (error) {
        console.error('Error getting active games:', error);
        return [];
    }
}

/**
 * Get user's active game if any (legacy - kept for backwards compatibility)
 * @returns {Promise<object|null>} Active game data or null
 */
async function getActiveGame() {
    try {
        const games = await getActiveGames();
        if (games.length > 0) {
            // Return most recently updated game
            games.sort((a, b) => {
                const aTime = a.lastUpdated?.getTime?.() || a.lastUpdated?.toMillis?.() || 0;
                const bTime = b.lastUpdated?.getTime?.() || b.lastUpdated?.toMillis?.() || 0;
                return bTime - aTime;
            });
            return games[0];
        }
        return null;
    } catch (error) {
        console.error('Error getting active game:', error);
        return null;
    }
}

/**
 * Clean up stale games that no longer exist in Firebase
 * @returns {Promise<array>} Array of valid active games
 */
async function cleanupStaleGames() {
    try {
        const activeGames = await getActiveGames();

        if (activeGames.length === 0) {
            return [];
        }

        console.log(`Checking ${activeGames.length} active games for validity...`);

        const validGames = [];

        for (const game of activeGames) {
            const gameRef = database.ref('games/' + game.gameCode);
            const snapshot = await gameRef.once('value');

            if (snapshot.exists()) {
                // Game still exists, update status from Firebase
                const gameData = snapshot.val();
                game.status = gameData.status;
                validGames.push(game);
            } else {
                console.log(`Game ${game.gameCode} no longer exists, will be removed`);
            }
        }

        // Update user's active games with only valid ones
        if (validGames.length !== activeGames.length) {
            const user = auth.currentUser;
            if (user) {
                await firestore.collection('users').doc(user.uid).update({
                    activeGames: validGames
                });
                console.log(`Cleaned up ${activeGames.length - validGames.length} stale games`);
            }
        }

        return validGames;
    } catch (error) {
        console.error('Error cleaning up stale games:', error);
        return [];
    }
}

/**
 * Check if user has an active game and offer to rejoin
 * Call this on index.html page load
 * NOTE: This function is now deprecated in favor of showing Active Games list in UI
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
            await clearActiveGame(activeGame.gameCode);
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
            await clearActiveGame(activeGame.gameCode);
        }
    } catch (error) {
        console.error('Error checking for active game:', error);
    }
}
