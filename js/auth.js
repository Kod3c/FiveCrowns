// Five Crowns - Authentication Service
// Handles user registration, login, logout, and profile management

console.log('Auth service loaded');

/**
 * Sign up a new user with email, password, and first name
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {string} firstName - User's first name
 * @returns {Promise<object>} User object
 */
async function signUpUser(email, password, firstName) {
    try {
        // Create user with email and password
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        console.log('User created:', user.uid);

        // Update profile with display name
        await user.updateProfile({
            displayName: firstName
        });

        console.log('Profile updated with name:', firstName);

        // Create user document in Firestore
        await firestore.collection('users').doc(user.uid).set({
            uid: user.uid,
            email: email,
            firstName: firstName,
            displayName: firstName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            stats: {
                gamesPlayed: 0,
                gamesWon: 0,
                totalScore: 0,
                averageScore: 0,
                bestScore: 999,
                currentStreak: 0,
                longestStreak: 0
            }
        });

        console.log('User profile created in Firestore');

        return user;
    } catch (error) {
        console.error('Error signing up:', error);
        throw error;
    }
}

/**
 * Sign in an existing user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<object>} User object
 */
async function signInUser(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        console.log('User signed in:', user.uid);

        // Update last login timestamp (or create document if it doesn't exist)
        try {
            await firestore.collection('users').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (updateError) {
            // Document might not exist, create it
            console.log('User document does not exist on login, creating...');
            await firestore.collection('users').doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                firstName: user.displayName || 'Player',
                displayName: user.displayName || 'Player',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                stats: {
                    gamesPlayed: 0,
                    gamesWon: 0,
                    totalScore: 0,
                    averageScore: 0,
                    bestScore: 999,
                    currentStreak: 0,
                    longestStreak: 0
                }
            });
        }

        return user;
    } catch (error) {
        console.error('Error signing in:', error);
        throw error;
    }
}

/**
 * Sign out the current user
 */
async function signOutUser() {
    try {
        await auth.signOut();
        console.log('User signed out');
        // Clear session storage
        sessionStorage.clear();
    } catch (error) {
        console.error('Error signing out:', error);
        throw error;
    }
}

/**
 * Get the current authenticated user
 * @returns {object|null} Current user or null
 */
function getCurrentUser() {
    return auth.currentUser;
}

/**
 * Get user's first name from Firestore
 * @param {string} uid - User ID
 * @returns {Promise<string>} User's first name
 */
async function getUserFirstName(uid) {
    try {
        const doc = await firestore.collection('users').doc(uid).get();
        if (doc.exists) {
            const data = doc.data();
            return data.firstName || data.displayName || 'Player';
        } else {
            // Document doesn't exist - user was created before Firestore was enabled
            // Try to create it now from auth data
            console.log('User document does not exist, creating from auth data...');
            const user = auth.currentUser;
            if (user) {
                const firstName = user.displayName || 'Player';
                await firestore.collection('users').doc(uid).set({
                    uid: uid,
                    email: user.email,
                    firstName: firstName,
                    displayName: firstName,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    stats: {
                        gamesPlayed: 0,
                        gamesWon: 0,
                        totalScore: 0,
                        averageScore: 0,
                        bestScore: 999,
                        currentStreak: 0,
                        longestStreak: 0
                    }
                });
                console.log('User document created successfully');
                return firstName;
            }
        }
        return 'Player';
    } catch (error) {
        console.error('Error getting user name:', error);
        // If it's a permission error, try to get name from auth object
        const user = auth.currentUser;
        return user ? (user.displayName || 'Player') : 'Player';
    }
}

/**
 * Send password reset email
 * @param {string} email - User's email
 */
async function sendPasswordReset(email) {
    try {
        await auth.sendPasswordResetEmail(email);
        console.log('Password reset email sent');
    } catch (error) {
        console.error('Error sending password reset:', error);
        throw error;
    }
}

/**
 * Get friendly error message for Firebase auth errors
 * @param {object} error - Firebase error
 * @returns {string} User-friendly error message
 */
function getAuthErrorMessage(error) {
    switch (error.code) {
        case 'auth/email-already-in-use':
            return 'This email is already registered. Please sign in instead.';
        case 'auth/invalid-email':
            return 'Invalid email address.';
        case 'auth/operation-not-allowed':
            return 'Email/password sign-in is not enabled.';
        case 'auth/weak-password':
            return 'Password is too weak. Use at least 6 characters.';
        case 'auth/user-disabled':
            return 'This account has been disabled.';
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        default:
            return error.message || 'An error occurred. Please try again.';
    }
}
