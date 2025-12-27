// Five Crowns - Friends Management System
// Handles friend requests, friend lists, and user search

console.log('Friends service loaded');

/**
 * Validate phone number format
 * @param {string} phoneNumber - Phone number to validate (E.164 format)
 * @returns {object} {valid: boolean, error: string}
 */
function validatePhoneNumber(phoneNumber) {
    if (!phoneNumber || phoneNumber.trim().length === 0) {
        return { valid: false, error: 'Phone number is required' };
    }

    const trimmed = phoneNumber.trim();

    // Check for E.164 format: +[country code][number]
    if (!/^\+[1-9]\d{1,14}$/.test(trimmed)) {
        return { valid: false, error: 'Invalid phone number format. Use format: +1234567890' };
    }

    return { valid: true };
}

/**
 * Search for a user by phone number
 * @param {string} phoneNumber - Phone number to search for (E.164 format)
 * @returns {Promise<object|null>} User data or null if not found
 */
async function searchUserByPhoneNumber(phoneNumber) {
    try {
        const trimmedPhone = phoneNumber.trim();

        const snapshot = await firestore.collection('users')
            .where('phoneNumber', '==', trimmedPhone)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        return {
            uid: userData.uid,
            phoneNumber: userData.phoneNumber,
            displayName: userData.displayName || userData.firstName || 'Player',
            firstName: userData.firstName
        };
    } catch (error) {
        console.error('Error searching for user:', error);
        throw error;
    }
}

/**
 * Send a friend request
 * @param {string} phoneNumber - Phone number of user to send request to (E.164 format)
 * @returns {Promise<void>}
 */
async function sendFriendRequest(phoneNumber) {
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
        if (!currentUserData.phoneNumber) {
            throw new Error('You must have a phone number to add friends');
        }

        // Search for target user
        const targetUser = await searchUserByPhoneNumber(phoneNumber);
        if (!targetUser) {
            throw new Error('User not found');
        }

        if (targetUser.uid === user.uid) {
            throw new Error('You cannot add yourself as a friend');
        }

        // Check if already friends
        const friends = currentUserData.friends || [];
        if (friends.includes(targetUser.uid)) {
            throw new Error('You are already friends with this user');
        }

        // Check if request already sent
        const outgoingRequests = currentUserData.friendRequests?.outgoing || [];
        const alreadySent = outgoingRequests.some(req => req.to === targetUser.uid);
        if (alreadySent) {
            throw new Error('Friend request already sent');
        }

        // Check if there's an incoming request from this user
        const incomingRequests = currentUserData.friendRequests?.incoming || [];
        const hasIncoming = incomingRequests.some(req => req.from === targetUser.uid);
        if (hasIncoming) {
            throw new Error('This user has already sent you a friend request. Please accept it instead.');
        }

        // Create request object with current timestamp
        // Note: We use new Date() instead of serverTimestamp() because
        // serverTimestamp() cannot be used inside arrayUnion()
        const now = new Date();

        const requestData = {
            from: user.uid,
            phoneNumber: currentUserData.phoneNumber,
            displayName: currentUserData.displayName || currentUserData.firstName || 'Player',
            timestamp: now
        };

        // Add to target user's incoming requests
        await firestore.collection('users').doc(targetUser.uid).update({
            'friendRequests.incoming': firebase.firestore.FieldValue.arrayUnion(requestData)
        });

        // Add to current user's outgoing requests
        await firestore.collection('users').doc(user.uid).update({
            'friendRequests.outgoing': firebase.firestore.FieldValue.arrayUnion({
                to: targetUser.uid,
                phoneNumber: targetUser.phoneNumber,
                displayName: targetUser.displayName,
                timestamp: now
            })
        });

        console.log('Friend request sent to:', phoneNumber);
    } catch (error) {
        console.error('Error sending friend request:', error);
        throw error;
    }
}

/**
 * Accept a friend request
 * @param {string} fromUid - UID of user who sent the request
 * @returns {Promise<void>}
 */
async function acceptFriendRequest(fromUid) {
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
        const incomingRequests = currentUserData.friendRequests?.incoming || [];

        // Find the request
        const request = incomingRequests.find(req => req.from === fromUid);
        if (!request) {
            throw new Error('Friend request not found');
        }

        // Get sender's data
        const senderDoc = await firestore.collection('users').doc(fromUid).get();
        if (!senderDoc.exists) {
            throw new Error('Sender profile not found');
        }

        const senderData = senderDoc.data();
        const outgoingRequests = senderData.friendRequests?.outgoing || [];

        // Add to both users' friends arrays
        await firestore.collection('users').doc(user.uid).update({
            friends: firebase.firestore.FieldValue.arrayUnion(fromUid),
            'friendRequests.incoming': firebase.firestore.FieldValue.arrayRemove(request)
        });

        // Find and remove the outgoing request from sender
        const outgoingRequest = outgoingRequests.find(req => req.to === user.uid);
        if (outgoingRequest) {
            await firestore.collection('users').doc(fromUid).update({
                friends: firebase.firestore.FieldValue.arrayUnion(user.uid),
                'friendRequests.outgoing': firebase.firestore.FieldValue.arrayRemove(outgoingRequest)
            });
        }

        console.log('Friend request accepted from:', fromUid);
    } catch (error) {
        console.error('Error accepting friend request:', error);
        throw error;
    }
}

/**
 * Decline a friend request
 * @param {string} fromUid - UID of user who sent the request
 * @returns {Promise<void>}
 */
async function declineFriendRequest(fromUid) {
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
        const incomingRequests = currentUserData.friendRequests?.incoming || [];

        // Find the request
        const request = incomingRequests.find(req => req.from === fromUid);
        if (!request) {
            throw new Error('Friend request not found');
        }

        // Remove from incoming requests
        await firestore.collection('users').doc(user.uid).update({
            'friendRequests.incoming': firebase.firestore.FieldValue.arrayRemove(request)
        });

        // Remove from sender's outgoing requests
        const senderDoc = await firestore.collection('users').doc(fromUid).get();
        if (senderDoc.exists) {
            const senderData = senderDoc.data();
            const outgoingRequests = senderData.friendRequests?.outgoing || [];
            const outgoingRequest = outgoingRequests.find(req => req.to === user.uid);

            if (outgoingRequest) {
                await firestore.collection('users').doc(fromUid).update({
                    'friendRequests.outgoing': firebase.firestore.FieldValue.arrayRemove(outgoingRequest)
                });
            }
        }

        console.log('Friend request declined from:', fromUid);
    } catch (error) {
        console.error('Error declining friend request:', error);
        throw error;
    }
}

/**
 * Cancel an outgoing friend request
 * @param {string} toUid - UID of user the request was sent to
 * @returns {Promise<void>}
 */
async function cancelFriendRequest(toUid) {
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
        const outgoingRequests = currentUserData.friendRequests?.outgoing || [];

        // Find the request
        const request = outgoingRequests.find(req => req.to === toUid);
        if (!request) {
            throw new Error('Friend request not found');
        }

        // Remove from outgoing requests
        await firestore.collection('users').doc(user.uid).update({
            'friendRequests.outgoing': firebase.firestore.FieldValue.arrayRemove(request)
        });

        // Remove from recipient's incoming requests
        const recipientDoc = await firestore.collection('users').doc(toUid).get();
        if (recipientDoc.exists) {
            const recipientData = recipientDoc.data();
            const incomingRequests = recipientData.friendRequests?.incoming || [];
            const incomingRequest = incomingRequests.find(req => req.from === user.uid);

            if (incomingRequest) {
                await firestore.collection('users').doc(toUid).update({
                    'friendRequests.incoming': firebase.firestore.FieldValue.arrayRemove(incomingRequest)
                });
            }
        }

        console.log('Friend request cancelled to:', toUid);
    } catch (error) {
        console.error('Error cancelling friend request:', error);
        throw error;
    }
}

/**
 * Remove a friend
 * @param {string} friendUid - UID of friend to remove
 * @returns {Promise<void>}
 */
async function removeFriend(friendUid) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('No user is currently signed in');
        }

        // Remove from current user's friends
        await firestore.collection('users').doc(user.uid).update({
            friends: firebase.firestore.FieldValue.arrayRemove(friendUid)
        });

        // Remove from friend's friends
        await firestore.collection('users').doc(friendUid).update({
            friends: firebase.firestore.FieldValue.arrayRemove(user.uid)
        });

        console.log('Friend removed:', friendUid);
    } catch (error) {
        console.error('Error removing friend:', error);
        throw error;
    }
}

/**
 * Get user's friends list with details
 * @returns {Promise<array>} Array of friend objects
 */
async function getFriends() {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('No user logged in');
            return [];
        }

        const userDoc = await firestore.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            return [];
        }

        const userData = userDoc.data();
        const friendUids = userData.friends || [];

        if (friendUids.length === 0) {
            return [];
        }

        // Fetch friend details
        const friendPromises = friendUids.map(async (friendUid) => {
            try {
                const friendDoc = await firestore.collection('users').doc(friendUid).get();
                if (friendDoc.exists) {
                    const friendData = friendDoc.data();
                    return {
                        uid: friendUid,
                        phoneNumber: friendData.phoneNumber || 'unknown',
                        displayName: friendData.displayName || friendData.firstName || 'Player',
                        firstName: friendData.firstName
                    };
                }
                return null;
            } catch (error) {
                console.error('Error fetching friend:', friendUid, error);
                return null;
            }
        });

        const friends = await Promise.all(friendPromises);

        // Filter out nulls and return
        return friends.filter(f => f !== null);
    } catch (error) {
        console.error('Error getting friends:', error);
        return [];
    }
}

/**
 * Get incoming friend requests
 * @returns {Promise<array>} Array of incoming request objects
 */
async function getIncomingFriendRequests() {
    try {
        const user = auth.currentUser;
        if (!user) {
            return [];
        }

        const userDoc = await firestore.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            return [];
        }

        const userData = userDoc.data();
        return userData.friendRequests?.incoming || [];
    } catch (error) {
        console.error('Error getting incoming friend requests:', error);
        return [];
    }
}

/**
 * Get outgoing friend requests
 * @returns {Promise<array>} Array of outgoing request objects
 */
async function getOutgoingFriendRequests() {
    try {
        const user = auth.currentUser;
        if (!user) {
            return [];
        }

        const userDoc = await firestore.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            return [];
        }

        const userData = userDoc.data();
        return userData.friendRequests?.outgoing || [];
    } catch (error) {
        console.error('Error getting outgoing friend requests:', error);
        return [];
    }
}

/**
 * Get count of incoming friend requests
 * @returns {Promise<number>} Count of pending requests
 */
async function getFriendRequestCount() {
    try {
        const requests = await getIncomingFriendRequests();
        return requests.length;
    } catch (error) {
        console.error('Error getting friend request count:', error);
        return 0;
    }
}

/**
 * Check if current user has a phone number set
 * @returns {Promise<boolean>} True if phone number is set
 */
async function hasPhoneNumber() {
    try {
        const user = auth.currentUser;
        if (!user) {
            return false;
        }

        const userDoc = await firestore.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            return false;
        }

        const userData = userDoc.data();
        return !!userData.phoneNumber;
    } catch (error) {
        console.error('Error checking phone number:', error);
        return false;
    }
}
