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

        // Send email verification
        await user.sendEmailVerification();
        console.log('Verification email sent to:', email);

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
            emailVerified: false,
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

        // Check if email is verified
        if (!user.emailVerified) {
            // Sign the user out
            await auth.signOut();
            const error = new Error('Please verify your email address before signing in. Check your inbox for the verification link.');
            error.code = 'auth/email-not-verified';
            throw error;
        }

        // Update last login timestamp and email verification status
        try {
            await firestore.collection('users').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                emailVerified: true
            });
        } catch (updateError) {
            // Document might not exist, create it
            console.log('User document does not exist on login, creating...');
            await firestore.collection('users').doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                firstName: user.displayName || 'Player',
                displayName: user.displayName || 'Player',
                emailVerified: true,
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
 * Update user's display name
 * @param {string} firstName - New first name
 * @returns {Promise<void>}
 */
async function updateUserName(firstName) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('No user is currently signed in');
        }

        // Update Firebase Auth profile
        await user.updateProfile({
            displayName: firstName
        });

        // Update Firestore document
        await firestore.collection('users').doc(user.uid).update({
            firstName: firstName,
            displayName: firstName
        });

        console.log('User name updated to:', firstName);
    } catch (error) {
        console.error('Error updating user name:', error);
        throw error;
    }
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
 * Resend email verification to the current user
 * @returns {Promise<void>}
 */
async function resendVerificationEmail() {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('No user is currently signed in');
        }

        if (user.emailVerified) {
            throw new Error('Email is already verified');
        }

        await user.sendEmailVerification();
        console.log('Verification email resent to:', user.email);
    } catch (error) {
        console.error('Error resending verification email:', error);
        throw error;
    }
}

/**
 * Sign in with Google
 * @returns {Promise<object>} User object
 */
async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const userCredential = await auth.signInWithPopup(provider);
        const user = userCredential.user;

        console.log('User signed in with Google:', user.uid);

        // Check if user document exists, create if not
        const userDoc = await firestore.collection('users').doc(user.uid).get();

        if (!userDoc.exists) {
            // Create user document for new Google sign-in
            await firestore.collection('users').doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                firstName: user.displayName ? user.displayName.split(' ')[0] : 'Player',
                displayName: user.displayName || 'Player',
                emailVerified: user.emailVerified,
                photoURL: user.photoURL || null,
                provider: 'google',
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
            console.log('New Google user profile created in Firestore');
        } else {
            // Update last login for existing user
            await firestore.collection('users').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                emailVerified: user.emailVerified
            });
        }

        return user;
    } catch (error) {
        console.error('Error signing in with Google:', error);
        throw error;
    }
}

/**
 * Sign in with Apple
 * @returns {Promise<object>} User object
 */
async function signInWithApple() {
    try {
        const provider = new firebase.auth.OAuthProvider('apple.com');
        provider.addScope('email');
        provider.addScope('name');

        const userCredential = await auth.signInWithPopup(provider);
        const user = userCredential.user;

        console.log('User signed in with Apple:', user.uid);

        // Check if user document exists, create if not
        const userDoc = await firestore.collection('users').doc(user.uid).get();

        if (!userDoc.exists) {
            // Create user document for new Apple sign-in
            await firestore.collection('users').doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                firstName: user.displayName ? user.displayName.split(' ')[0] : 'Player',
                displayName: user.displayName || 'Player',
                emailVerified: user.emailVerified,
                photoURL: user.photoURL || null,
                provider: 'apple',
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
            console.log('New Apple user profile created in Firestore');
        } else {
            // Update last login for existing user
            await firestore.collection('users').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                emailVerified: user.emailVerified
            });
        }

        return user;
    } catch (error) {
        console.error('Error signing in with Apple:', error);
        throw error;
    }
}

/**
 * Check if a phone number has an existing account
 * @param {string} phoneNumber - Phone number in E.164 format
 * @returns {Promise<boolean>} True if account exists
 */
async function phoneNumberExists(phoneNumber) {
    try {
        console.log('Checking if phone number exists:', phoneNumber);
        const snapshot = await firestore.collection('users')
            .where('phoneNumber', '==', phoneNumber)
            .limit(1)
            .get();
        const exists = !snapshot.empty;
        console.log('Phone number exists:', exists);
        return exists;
    } catch (error) {
        console.error('Error checking phone number:', error);
        // If permission denied, we can't check - skip the validation
        // Return true to allow the process to continue and let Firebase handle auth
        if (error.code === 'permission-denied') {
            console.warn('Cannot check phone number due to Firestore rules - skipping validation');
            return true;
        }
        return true;
    }
}

/**
 * Send phone verification code
 * @param {string} phoneNumber - Phone number in E.164 format (e.g., +1234567890)
 * @param {object} recaptchaVerifier - reCAPTCHA verifier instance
 * @returns {Promise<object>} Confirmation result
 */
async function sendPhoneVerificationCode(phoneNumber, recaptchaVerifier) {
    try {
        console.log('Sending verification code to:', phoneNumber);
        const confirmationResult = await auth.signInWithPhoneNumber(phoneNumber, recaptchaVerifier);
        console.log('Verification code sent');
        return confirmationResult;
    } catch (error) {
        console.error('Error sending verification code:', error);
        throw error;
    }
}

/**
 * Verify phone code and complete sign-in
 * @param {object} confirmationResult - Result from sendPhoneVerificationCode
 * @param {string} verificationCode - 6-digit code from SMS
 * @param {string} firstName - User's first name (for new users, REQUIRED for new users)
 * @returns {Promise<object>} User object with isNewUser flag
 */
async function verifyPhoneCode(confirmationResult, verificationCode, firstName = null) {
    try {
        // First, verify the code and sign in the user
        const userCredential = await confirmationResult.confirm(verificationCode);
        const user = userCredential.user;
        const isNewUser = userCredential.additionalUserInfo?.isNewUser || false;

        console.log('Phone verified, user signed in:', user.uid, 'New user:', isNewUser);

        // Check if user document exists
        const userDoc = await firestore.collection('users').doc(user.uid).get();
        const needsUserDoc = !userDoc.exists;

        if (needsUserDoc) {
            // IMPORTANT: For new users, firstName must be provided
            // If not provided, this is a login flow that needs to handle new user differently
            if (!firstName) {
                console.warn('New user detected but no firstName provided - document will be created with placeholder');
                return { user, isNewUser: true, needsName: true };
            }

            // Create user document for new phone sign-in
            const userData = {
                uid: user.uid,
                phoneNumber: user.phoneNumber,
                firstName: firstName,
                displayName: firstName,
                emailVerified: false,
                provider: 'phone',
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
            };
            console.log('Creating user document with data:', { ...userData, firstName, displayName: firstName });
            await firestore.collection('users').doc(user.uid).set(userData);
            console.log('New phone user profile created in Firestore with name:', firstName);

            // Update Firebase Auth display name
            await user.updateProfile({ displayName: firstName });
            console.log('Firebase Auth displayName updated to:', firstName);
        } else {
            // Update last login for existing user
            await firestore.collection('users').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        return { user, isNewUser: needsUserDoc, needsName: false };
    } catch (error) {
        console.error('Error verifying phone code:', error);
        throw error;
    }
}

/**
 * Initialize reCAPTCHA verifier for phone authentication
 * @param {string} containerId - ID of the container element for reCAPTCHA
 * @param {boolean} useVisible - Use visible reCAPTCHA (default: false)
 * @returns {Promise<object>} RecaptchaVerifier instance (after rendering)
 */
async function initializeRecaptcha(containerId, useVisible = false) {
    // Clear any existing verifier
    if (window.recaptchaVerifier) {
        try {
            window.recaptchaVerifier.clear();
        } catch (e) {
            console.log('Error clearing previous verifier:', e);
        }
        window.recaptchaVerifier = null;
    }

    // Verify container exists
    const container = document.getElementById(containerId);
    if (!container) {
        throw new Error(`reCAPTCHA container not found: ${containerId}`);
    }

    // Clear container contents
    container.innerHTML = '';

    // Create new verifier with visible option as fallback
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(containerId, {
        'size': useVisible ? 'normal' : 'invisible',
        'callback': (response) => {
            console.log('reCAPTCHA solved', response);
        },
        'expired-callback': () => {
            console.log('reCAPTCHA expired - clearing verifier');
            if (window.recaptchaVerifier) {
                try {
                    window.recaptchaVerifier.clear();
                } catch (e) {
                    console.log('Error clearing expired verifier:', e);
                }
            }
            window.recaptchaVerifier = null;
        },
        'error-callback': (error) => {
            console.error('reCAPTCHA error:', error);
        }
    });

    // Render the verifier (required before use)
    try {
        const widgetId = await window.recaptchaVerifier.render();
        console.log('reCAPTCHA rendered successfully, widget ID:', widgetId);
    } catch (error) {
        console.error('Error rendering reCAPTCHA:', error);
        // Clear failed verifier
        window.recaptchaVerifier = null;
        throw error;
    }

    return window.recaptchaVerifier;
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
            return 'No account exists with this email. Please sign up first.';
        case 'auth/wrong-password':
            return 'Incorrect password.';
        case 'auth/invalid-credential':
            return 'No account exists with this email or incorrect password.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        case 'auth/email-not-verified':
            return error.message;
        case 'auth/popup-closed-by-user':
            return 'Sign-in popup was closed. Please try again.';
        case 'auth/cancelled-popup-request':
            return 'Only one popup can be open at a time.';
        case 'auth/account-exists-with-different-credential':
            return 'An account already exists with the same email but different sign-in credentials.';
        case 'auth/invalid-app-credential':
            return 'Phone authentication is not properly configured. Please contact support.';
        case 'auth/invalid-phone-number':
            return 'Invalid phone number format. Use international format (e.g., +1234567890).';
        case 'auth/missing-phone-number':
            return 'Please enter a phone number.';
        case 'auth/quota-exceeded':
            return 'SMS quota exceeded. Please try again later.';
        case 'auth/invalid-verification-code':
            return 'Invalid verification code. Please try again.';
        case 'auth/code-expired':
            return 'Verification code has expired. Please request a new one.';
        default:
            return error.message || 'An error occurred. Please try again.';
    }
}
