// Five Crowns - Game Invitations System
// Handles sending and receiving game invitations

console.log('Game invites service loaded');

/**
 * Send a game invitation to a friend
 * @param {string} friendUid - UID of friend to invite
 * @param {string} gameCode - Game code to invite to
 * @returns {Promise<string>} Invite ID
 */
async function sendGameInvite(friendUid, gameCode) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('No user is currently signed in');
        }

        // Get current user's data
        const currentUserDoc = await firestore.collection('users').doc(user.uid).get();
        if (!currentUserDoc.exists) {
            throw new Error('User profile not found');
        }

        const currentUserData = currentUserDoc.data();

        // Get friend's data
        const friendDoc = await firestore.collection('users').doc(friendUid).get();
        if (!friendDoc.exists) {
            throw new Error('Friend profile not found');
        }

        const friendData = friendDoc.data();

        // Verify game exists
        const gameRef = database.ref('games/' + gameCode);
        const gameSnapshot = await gameRef.once('value');
        if (!gameSnapshot.exists()) {
            throw new Error('Game not found');
        }

        // Create invite document
        const inviteData = {
            gameCode: gameCode,
            from: {
                uid: user.uid,
                username: currentUserData.username || 'unknown',
                displayName: currentUserData.displayName || currentUserData.firstName || 'Player'
            },
            to: {
                uid: friendUid,
                username: friendData.username || 'unknown',
                displayName: friendData.displayName || friendData.firstName || 'Player'
            },
            status: 'pending',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        };

        const inviteRef = await firestore.collection('gameInvites').add(inviteData);

        // Add invited player to the lobby
        const gameData = gameSnapshot.val();
        const invitedPlayerId = 'player_invited_' + friendUid + '_' + Date.now();

        // Add player to game with invited status
        await gameRef.child('players/' + invitedPlayerId).set({
            id: invitedPlayerId,
            name: friendData.displayName || friendData.firstName || 'Player',
            uid: friendUid, // Store the user's UID for later verification
            isHost: false,
            isReady: false,
            isInvited: true, // Mark as invited
            invitedAt: firebase.database.ServerValue.TIMESTAMP,
            inviteId: inviteRef.id // Link to the invite for cleanup
        });

        console.log('Game invite sent to:', friendData.displayName || friendData.firstName, 'for game:', gameCode);
        return inviteRef.id;
    } catch (error) {
        console.error('Error sending game invite:', error);
        throw error;
    }
}

/**
 * Send game invitations to multiple friends
 * @param {array} friendUids - Array of friend UIDs
 * @param {string} gameCode - Game code to invite to
 * @returns {Promise<array>} Array of invite IDs
 */
async function sendGameInvites(friendUids, gameCode) {
    try {
        const invitePromises = friendUids.map(friendUid =>
            sendGameInvite(friendUid, gameCode)
        );

        const inviteIds = await Promise.all(invitePromises);
        console.log(`Sent ${inviteIds.length} game invites for game ${gameCode}`);
        return inviteIds;
    } catch (error) {
        console.error('Error sending game invites:', error);
        throw error;
    }
}

/**
 * Get incoming game invites for current user
 * @returns {Promise<array>} Array of invite objects
 */
async function getGameInvites() {
    try {
        const user = auth.currentUser;
        if (!user) {
            return [];
        }

        const snapshot = await firestore.collection('gameInvites')
            .where('to.uid', '==', user.uid)
            .where('status', '==', 'pending')
            .orderBy('timestamp', 'desc')
            .get();

        const invites = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            invites.push({
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate() || new Date(),
                expiresAt: data.expiresAt?.toDate() || new Date()
            });
        });

        // Filter out expired invites
        const now = new Date();
        const validInvites = invites.filter(invite => invite.expiresAt > now);

        // Clean up expired invites in background
        const expiredInvites = invites.filter(invite => invite.expiresAt <= now);
        expiredInvites.forEach(invite => {
            firestore.collection('gameInvites').doc(invite.id).delete()
                .catch(err => console.error('Error deleting expired invite:', err));
        });

        // Validate that games still exist and are joinable
        const validatedInvites = [];
        const invalidInvites = [];

        for (const invite of validInvites) {
            try {
                const gameRef = database.ref('games/' + invite.gameCode);
                const gameSnapshot = await gameRef.once('value');

                if (!gameSnapshot.exists()) {
                    // Game no longer exists
                    console.log('Game no longer exists for invite:', invite.gameCode);
                    invalidInvites.push(invite);
                    continue;
                }

                const gameData = gameSnapshot.val();

                // Check if game has started or is full
                if (gameData.status !== 'waiting') {
                    console.log('Game has already started:', invite.gameCode);
                    invalidInvites.push(invite);
                    continue;
                }

                const playerCount = gameData.players ? Object.keys(gameData.players).length : 0;
                if (playerCount >= 6) {
                    console.log('Game is full:', invite.gameCode);
                    invalidInvites.push(invite);
                    continue;
                }

                // Game is valid
                validatedInvites.push(invite);
            } catch (error) {
                console.error('Error validating game invite:', error);
                // On error, keep the invite to avoid accidentally hiding valid invites
                validatedInvites.push(invite);
            }
        }

        // Clean up invalid invites in background
        invalidInvites.forEach(invite => {
            firestore.collection('gameInvites').doc(invite.id).delete()
                .catch(err => console.error('Error deleting invalid invite:', err));
        });

        return validatedInvites;
    } catch (error) {
        console.error('Error getting game invites:', error);
        return [];
    }
}

/**
 * Get count of pending game invites
 * @returns {Promise<number>} Count of pending invites
 */
async function getGameInviteCount() {
    try {
        const invites = await getGameInvites();
        return invites.length;
    } catch (error) {
        console.error('Error getting game invite count:', error);
        return 0;
    }
}

/**
 * Accept a game invite
 * @param {string} inviteId - ID of invite to accept
 * @returns {Promise<string>} Game code to join
 */
async function acceptGameInvite(inviteId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('No user is currently signed in');
        }

        // Get invite
        const inviteDoc = await firestore.collection('gameInvites').doc(inviteId).get();
        if (!inviteDoc.exists) {
            throw new Error('Invite not found');
        }

        const inviteData = inviteDoc.data();

        // Verify invite is for current user
        if (inviteData.to.uid !== user.uid) {
            throw new Error('This invite is not for you');
        }

        // Verify invite is still pending
        if (inviteData.status !== 'pending') {
            throw new Error('This invite has already been responded to');
        }

        // Verify game still exists
        const gameRef = database.ref('games/' + inviteData.gameCode);
        const gameSnapshot = await gameRef.once('value');
        if (!gameSnapshot.exists()) {
            // Game no longer exists, delete invite
            await firestore.collection('gameInvites').doc(inviteId).delete();
            throw new Error('This game no longer exists');
        }

        const gameData = gameSnapshot.val();

        // Verify game is still in waiting state
        if (gameData.status !== 'waiting') {
            // Game has already started or finished, delete invite
            await firestore.collection('gameInvites').doc(inviteId).delete();
            throw new Error('This game has already started');
        }

        // Verify game is not full (max 6 players)
        const playerCount = gameData.players ? Object.keys(gameData.players).length : 0;
        if (playerCount >= 6) {
            // Game is full, delete invite
            await firestore.collection('gameInvites').doc(inviteId).delete();
            throw new Error('This game is full');
        }

        // Update invite status
        await firestore.collection('gameInvites').doc(inviteId).update({
            status: 'accepted',
            acceptedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('Game invite accepted:', inviteId);
        return inviteData.gameCode;
    } catch (error) {
        console.error('Error accepting game invite:', error);
        throw error;
    }
}

/**
 * Decline a game invite
 * @param {string} inviteId - ID of invite to decline
 * @returns {Promise<void>}
 */
async function declineGameInvite(inviteId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('No user is currently signed in');
        }

        // Get invite
        const inviteDoc = await firestore.collection('gameInvites').doc(inviteId).get();
        if (!inviteDoc.exists) {
            throw new Error('Invite not found');
        }

        const inviteData = inviteDoc.data();

        // Verify invite is for current user
        if (inviteData.to.uid !== user.uid) {
            throw new Error('This invite is not for you');
        }

        // Update invite status
        await firestore.collection('gameInvites').doc(inviteId).update({
            status: 'declined',
            declinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('Game invite declined:', inviteId);
    } catch (error) {
        console.error('Error declining game invite:', error);
        throw error;
    }
}

/**
 * Delete/dismiss a game invite
 * @param {string} inviteId - ID of invite to delete
 * @returns {Promise<void>}
 */
async function deleteGameInvite(inviteId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('No user is currently signed in');
        }

        // Get invite
        const inviteDoc = await firestore.collection('gameInvites').doc(inviteId).get();
        if (!inviteDoc.exists) {
            return; // Already deleted
        }

        const inviteData = inviteDoc.data();

        // Verify invite is for current user
        if (inviteData.to.uid !== user.uid) {
            throw new Error('This invite is not for you');
        }

        // Delete invite
        await firestore.collection('gameInvites').doc(inviteId).delete();

        console.log('Game invite deleted:', inviteId);
    } catch (error) {
        console.error('Error deleting game invite:', error);
        throw error;
    }
}

/**
 * Clean up old invites (for games that no longer exist)
 * @returns {Promise<number>} Number of invites cleaned up
 */
async function cleanupOldGameInvites() {
    try {
        const user = auth.currentUser;
        if (!user) {
            return 0;
        }

        const invites = await getGameInvites();
        let cleanedCount = 0;

        for (const invite of invites) {
            // Check if game still exists
            const gameRef = database.ref('games/' + invite.gameCode);
            const gameSnapshot = await gameRef.once('value');

            if (!gameSnapshot.exists()) {
                // Delete invite
                await firestore.collection('gameInvites').doc(invite.id).delete();
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`Cleaned up ${cleanedCount} old game invites`);
        }

        return cleanedCount;
    } catch (error) {
        console.error('Error cleaning up old game invites:', error);
        return 0;
    }
}

/**
 * Set up real-time listener for game invites
 * @param {function} callback - Callback function to call when invites change
 * @returns {function} Unsubscribe function
 */
function listenToGameInvites(callback) {
    const user = auth.currentUser;
    if (!user) {
        console.warn('No user logged in, cannot listen to game invites');
        return () => {};
    }

    console.log('Setting up game invites listener for user:', user.uid);

    const unsubscribe = firestore.collection('gameInvites')
        .where('to.uid', '==', user.uid)
        .where('status', '==', 'pending')
        .orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            const invites = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                invites.push({
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp?.toDate() || new Date(),
                    expiresAt: data.expiresAt?.toDate() || new Date()
                });
            });

            // Filter out expired invites
            const now = new Date();
            const validInvites = invites.filter(invite => invite.expiresAt > now);

            callback(validInvites);
        }, error => {
            console.error('Error in game invites listener:', error);
        });

    return unsubscribe;
}
