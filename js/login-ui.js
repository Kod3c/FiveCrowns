/* Five Crowns - shared login UI.
   One copy of the login markup + wiring, used two ways:
     - login.html            -> mount(id, {})            (full page; redirects to the app on success)
     - index.html (logged out)-> mount(id, {modal:true})  (modal over the app; calls onSuccess)
   Auth logic itself lives in js/auth.js. */
(function () {
  'use strict';

  var LOGIN_HTML = `
<aside class="login-aside" aria-hidden="true">
    <div class="hero-fan">
        <div class="rv-card rv-s1 rv-ink"><span class="rv-pip">7</span><span class="rv-big">♠</span></div>
        <div class="rv-card rv-s2 rv-red"><span class="rv-pip">4</span><span class="rv-big">♥</span></div>
        <div class="rv-card rv-s3 rv-ink"><span class="rv-pip">9</span><span class="rv-big">♣</span></div>
        <div class="rv-card rv-s4 rv-red"><span class="rv-pip">Q</span><span class="rv-big">♦</span></div>
        <div class="rv-card rv-s5 rv-crown rv-gold"><span class="rv-pip">K</span><span class="rv-big">★</span></div>
    </div>
    <p class="login-aside-line">Eleven rounds. Each one crowns a new wild rank. Lowest total wins.</p>
    <ul class="login-aside-list">
        <li>2&ndash;6 players, one phone each</li>
        <li>Runs, sets, and a fifth suit</li>
        <li>Pick a game back up from any device</li>
    </ul>
</aside>
<div class="auth-container">
            <!-- Login Form -->
            <div id="loginForm" class="auth-form">
                <h2 class="auth-brand">Five<span class="title-2">Crowns</span></h2>
                <p class="auth-brand-sub">Five-Suited Rummy</p>

                <!-- Phone Login Fields -->
                <div id="phoneLoginFields">
                    <div class="form-group">
                        <label class="form-label" for="loginPhone">Phone Number</label>
                        <div class="phone-input-group">
                            <select id="loginCountryCode" class="country-code-select">
                                <option value="+1">US +1</option>
                                <option value="+44">GB +44</option>
                                <option value="+91">IN +91</option>
                                <option value="+61">AU +61</option>
                                <option value="+81">JP +81</option>
                                <option value="+86">CN +86</option>
                            </select>
                            <input type="tel" id="loginPhone" class="form-input" placeholder="(123) 456-7890" autocomplete="tel">
                        </div>
                    </div>

                    <div class="form-group" id="loginVerificationCodeGroup" style="display: none; margin-top: 20px;">
                        <label class="form-label" for="loginVerificationCode">Verification Code</label>
                        <input type="text" id="loginVerificationCode" class="form-input" placeholder="123 - 456" maxlength="9" inputmode="numeric" autocomplete="one-time-code">
                    </div>
                </div>

                <p class="error-text" id="loginError"></p>

                <button class="btn btn-primary btn-large" id="loginBtn">Send Code</button>
                <div id="loginRecaptcha"></div>

                <div class="social-signin">
                    <p class="social-signin-text">Or continue with</p>
                    <div class="social-buttons">
                        <button class="btn-social" id="googleSignInBtn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            Sign in with Google
                        </button>
                        <button class="btn-social" id="appleSignInBtn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09l-.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                            </svg>
                            Sign in with Apple
                        </button>
                    </div>
                </div>

                <div class="auth-toggle">
                    Don't have an account? <a href="#" id="showSignupLink">Sign up</a>
                </div>
            </div>

            <!-- Signup Form -->
            <div id="signupForm" class="auth-form" style="display: none;">
                <h2 class="auth-title">Create Account</h2>
                <p class="auth-subtitle">Join the game</p>

                <div class="form-group">
                    <label class="form-label" for="signupFirstName">First Name</label>
                    <input type="text" id="signupFirstName" class="form-input" placeholder="Your name" autocomplete="given-name">
                </div>

                <!-- Phone Signup Fields -->
                <div id="phoneSignupFields">
                    <div class="form-group">
                        <label class="form-label" for="signupPhone">Phone Number</label>
                        <div class="phone-input-group">
                            <select id="signupCountryCode" class="country-code-select">
                                <option value="+1">US +1</option>
                                <option value="+44">GB +44</option>
                                <option value="+91">IN +91</option>
                                <option value="+61">AU +61</option>
                                <option value="+81">JP +81</option>
                                <option value="+86">CN +86</option>
                            </select>
                            <input type="tel" id="signupPhone" class="form-input" placeholder="(123) 456-7890" autocomplete="tel">
                        </div>
                    </div>

                    <div class="form-group" id="signupVerificationCodeGroup" style="display: none;">
                        <label class="form-label" for="signupVerificationCode">Verification Code</label>
                        <input type="text" id="signupVerificationCode" class="form-input" placeholder="123 - 456" maxlength="9" inputmode="numeric" autocomplete="one-time-code">
                    </div>
                </div>

                <p class="error-text" id="signupError"></p>

                <button class="btn btn-primary btn-large" id="signupBtn">Send Code</button>
                <div id="signupRecaptcha"></div>

                <div class="social-signin">
                    <p class="social-signin-text">Or continue with</p>
                    <div class="social-buttons">
                        <button class="btn-social" id="googleSignUpBtn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            Sign up with Google
                        </button>
                        <button class="btn-social" id="appleSignUpBtn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09l-.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                            </svg>
                            Sign up with Apple
                        </button>
                    </div>
                </div>

                <div class="auth-toggle">
                    Already have an account? <a href="#" id="showLoginLink">Sign in</a>
                </div>
            </div>

            <!-- Loading State -->
            <div class="loading-spinner" id="loadingSpinner">
                <div class="spinner"></div>
                <p style="color: var(--white); margin-top: 15px;">Loading...</p>
            </div>
        </div>
    </div>

    <!-- Phone Number Collection Modal -->
    <div class="phone-modal" id="phoneCollectionModal">
        <div class="phone-modal-content">
            <h2 class="phone-modal-title">Add Phone Number</h2>
            <p class="phone-modal-subtitle">We need your phone number to connect you with friends</p>

            <div class="form-group">
                <label class="form-label" for="modalPhoneNumber">Phone Number</label>
                <div class="phone-input-group">
                    <select id="modalCountryCode" class="country-code-select">
                        <option value="+1">US +1</option>
                        <option value="+44">GB +44</option>
                        <option value="+91">IN +91</option>
                        <option value="+61">AU +61</option>
                        <option value="+81">JP +81</option>
                        <option value="+86">CN +86</option>
                    </select>
                    <input type="tel" id="modalPhoneNumber" class="form-input" placeholder="(123) 456-7890" autocomplete="tel">
                </div>
            </div>

            <div class="form-group" id="modalVerificationCodeGroup" style="display: none;">
                <label class="form-label" for="modalVerificationCode">Verification Code</label>
                <input type="text" id="modalVerificationCode" class="form-input" placeholder="123 - 456" maxlength="9" inputmode="numeric" autocomplete="one-time-code" style="text-align: center; letter-spacing: 2px; font-weight: 600;">
            </div>

            <p class="error-text" id="modalPhoneError"></p>

            <button class="btn btn-primary btn-large" id="modalPhoneBtn">Send Code</button>
            <div id="modalRecaptcha"></div>
        </div>
    </div>`;

  function initLoginUI(opts) {
    opts = opts || {};

    var MODAL = !!opts.modal;
    function finish() {
        if (MODAL) { if (typeof opts.onSuccess === 'function') opts.onSuccess(); }
        else { window.location.href = 'index.html'; }
    }

        console.log('Login page loaded');

        // DOM Elements
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const loadingSpinner = document.getElementById('loadingSpinner');

        // Phone login elements
        const loginCountryCode = document.getElementById('loginCountryCode');
        const loginPhone = document.getElementById('loginPhone');
        const loginVerificationCodeGroup = document.getElementById('loginVerificationCodeGroup');
        const loginVerificationCode = document.getElementById('loginVerificationCode');
        const loginBtn = document.getElementById('loginBtn');
        const loginError = document.getElementById('loginError');

        // Phone signup elements
        const signupFirstName = document.getElementById('signupFirstName');
        const signupCountryCode = document.getElementById('signupCountryCode');
        const signupPhone = document.getElementById('signupPhone');
        const signupVerificationCodeGroup = document.getElementById('signupVerificationCodeGroup');
        const signupVerificationCode = document.getElementById('signupVerificationCode');
        const signupBtn = document.getElementById('signupBtn');
        const signupError = document.getElementById('signupError');

        // State variables for phone auth
        let loginConfirmationResult = null;
        let signupConfirmationResult = null;
        let isVerifyingLogin = false; // Flag to prevent auto-redirect during login verification
        let isCreatingAccount = false; // Flag to prevent auto-redirect during signup

        // Toggle links
        const showSignupLink = document.getElementById('showSignupLink');
        const showLoginLink = document.getElementById('showLoginLink');

        // Format phone number input as "(XXX) XXX-XXXX"
        function formatPhoneNumber(input) {
            let value = input.value.replace(/\D/g, ''); // Remove all non-digits
            if (value.length > 10) value = value.substring(0, 10); // Limit to 10 digits

            if (value.length === 0) {
                input.value = '';
            } else if (value.length <= 3) {
                input.value = '(' + value;
            } else if (value.length <= 6) {
                input.value = '(' + value.substring(0, 3) + ') ' + value.substring(3);
            } else {
                input.value = '(' + value.substring(0, 3) + ') ' + value.substring(3, 6) + '-' + value.substring(6);
            }
        }

        // Format verification code input as "XXX - XXX"
        function formatVerificationCode(input) {
            let value = input.value.replace(/\D/g, ''); // Remove all non-digits
            if (value.length > 6) value = value.substring(0, 6); // Limit to 6 digits

            if (value.length > 3) {
                input.value = value.substring(0, 3) + ' - ' + value.substring(3);
            } else {
                input.value = value;
            }
        }

        // Add formatting to phone number inputs
        loginPhone.addEventListener('input', () => formatPhoneNumber(loginPhone));
        signupPhone.addEventListener('input', () => formatPhoneNumber(signupPhone));

        // Add formatting to verification code inputs
        loginVerificationCode.addEventListener('input', () => formatVerificationCode(loginVerificationCode));
        signupVerificationCode.addEventListener('input', () => formatVerificationCode(signupVerificationCode));

        // Add Enter key handlers for login form
        loginPhone.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loginBtn.click();
        });

        loginVerificationCode.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loginBtn.click();
        });

        // Add Enter key handlers for signup form
        signupFirstName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') signupBtn.click();
        });

        signupPhone.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') signupBtn.click();
        });

        signupVerificationCode.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') signupBtn.click();
        });

        // Check for debug mode (prevents redirect to see console logs)
        const urlParams = new URLSearchParams(window.location.search);
        const debugMode = urlParams.has('debug');
        const addPhoneMode = urlParams.has('addPhone');

        if (debugMode) {
            console.log('%c🔧 DEBUG MODE ENABLED - Auto-redirect disabled', 'background: #ff6b6b; color: white; padding: 5px; font-weight: bold;');
        }

        if (addPhoneMode) {
            console.log('Add phone mode detected - will show phone collection modal');
        }

        // Check if user is already logged in
        if (!MODAL) { auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('User already logged in:', user.uid);

                // Don't process if we're in the middle of creating an account
                if (isCreatingAccount) {
                    console.log('Account creation in progress, skipping auto-redirect');
                    return;
                }

                // Check if we need to show phone collection modal
                if (addPhoneMode) {
                    console.log('Checking if user needs to add phone number...');
                    try {
                        const hasPhone = await currentUserHasPhoneNumber();
                        if (!hasPhone) {
                            console.log('User missing phone number - showing modal');
                            loadingSpinner.classList.remove('show');
                            showPhoneCollectionModal();
                            return; // Don't redirect
                        } else {
                            console.log('User already has phone number');
                            finish();
                            return;
                        }
                    } catch (error) {
                        console.error('Error checking phone number:', error);
                    }
                }

                // Don't redirect if we're in the middle of verifying login
                // (need to check Firestore account existence first)
                if (!isVerifyingLogin) {
                    // Make sure the account has a phone number before leaving the login
                    // page (covers Google/Apple sign-in, whose popup resolves after this
                    // listener already fired and would otherwise redirect away).
                    try {
                        const hasPhone = await currentUserHasPhoneNumber();
                        if (!hasPhone) {
                            console.log('User missing phone number - showing collection modal');
                            loadingSpinner.classList.remove('show');
                            showPhoneCollectionModal();
                            return;
                        }
                    } catch (error) {
                        console.error('Error checking phone number:', error);
                    }

                    // Don't redirect in debug mode (or when shown as a modal)
                    if (debugMode && !MODAL) {
                        console.log('%c🔧 DEBUG: Would redirect to index.html but debug mode is on', 'background: #4CAF50; color: white; padding: 5px;');
                        loadingSpinner.classList.remove('show');
                        loginForm.style.display = 'block';
                    } else {
                        finish();
                    }
                }
            } else {
                // Hide loading, show login form
                loadingSpinner.classList.remove('show');
                loginForm.style.display = 'block';
            }
        });
        }

        // Show loading initially
        loadingSpinner.classList.add('show');
        loginForm.style.display = 'none';

        // Toggle between login and signup
        showSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
            loginError.classList.remove('show');
            signupError.classList.remove('show');
        });

        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            signupForm.style.display = 'none';
            loginForm.style.display = 'block';
            loginError.classList.remove('show');
            signupError.classList.remove('show');
        });

        // Login - Phone only
        loginBtn.addEventListener('click', async () => {
            if (!loginConfirmationResult) {
                // Step 1: Send verification code
                const phoneDigits = loginPhone.value.replace(/\D/g, ''); // Extract only digits
                const phoneNumber = loginCountryCode.value + phoneDigits;

                if (!phoneDigits || phoneDigits.length < 10) {
                    showError(loginError, 'Please enter a valid 10-digit phone number');
                    return;
                }

                loginBtn.disabled = true;
                loginBtn.textContent = 'Checking account...';

                try {
                    // Check if account exists before sending code
                    const exists = await phoneNumberExists(phoneNumber);
                    if (!exists) {
                        showError(loginError, 'No account exists with this phone number. Please sign up first.');
                        loginBtn.disabled = false;
                        loginBtn.textContent = 'Send Code';
                        return;
                    }

                    loginBtn.textContent = 'Sending code...';

                    // Initialize reCAPTCHA
                    await initializeRecaptcha('loginRecaptcha');

                    // Send verification code
                    loginConfirmationResult = await sendPhoneVerificationCode(phoneNumber, window.recaptchaVerifier);

                    // Show verification code input
                    loginVerificationCodeGroup.style.display = 'block';
                    loginBtn.textContent = 'Verify Code';
                    showError(loginError, '✅ Code sent! Check your phone.', false);
                    loginBtn.disabled = false;
                } catch (error) {
                    console.error('Error sending code:', error);
                    showError(loginError, getAuthErrorMessage(error));
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Send Code';
                    loginConfirmationResult = null;
                }
            } else {
                // Step 2: Verify code and sign in
                const code = loginVerificationCode.value.replace(/\D/g, ''); // Extract only digits

                if (!code || code.length !== 6) {
                    showError(loginError, 'Please enter the 6-digit code');
                    return;
                }

                loginBtn.disabled = true;
                loginBtn.textContent = 'Verifying...';

                try {
                    // Set flag to prevent auto-redirect
                    isVerifyingLogin = true;

                    const result = await verifyPhoneCode(loginConfirmationResult, code);

                    // Check if user has a Firestore account (now authenticated, can query)
                    const phoneNumber = loginCountryCode.value + loginPhone.value.replace(/\D/g, '');
                    console.log('Checking Firestore account for:', phoneNumber);
                    const hasAccount = await phoneNumberHasFirestoreAccount(phoneNumber);
                    console.log('Firestore account exists:', hasAccount);

                    if (!hasAccount) {
                        // User verified phone but has no account - sign them out and show error
                        console.log('No Firestore account found - signing out');
                        await auth.signOut();
                        isVerifyingLogin = false; // Reset flag
                        showError(loginError, 'No account exists with this phone number. Please sign up first.');
                        loginBtn.disabled = false;
                        loginBtn.textContent = 'Send Code';
                        loginConfirmationResult = null;
                        loginVerificationCodeGroup.style.display = 'none';
                        loginVerificationCode.value = '';
                        return;
                    }

                    // Has account - manually redirect
                    console.log('Firestore account found - continuing');
                    if (!debugMode || MODAL) {
                        finish();
                    } else {
                        console.log('%c🔧 DEBUG: Would redirect to index.html but debug mode is on', 'background: #4CAF50; color: white; padding: 5px;');
                    }
                } catch (error) {
                    console.error('Verification error:', error);
                    isVerifyingLogin = false; // Reset flag on error
                    showError(loginError, getAuthErrorMessage(error));
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Verify Code';
                }
            }
        });

        // Signup - Phone only
        signupBtn.addEventListener('click', async () => {
            const firstName = signupFirstName.value.trim();
            console.log('Signup button clicked, firstName:', firstName);

            if (!firstName || firstName.length < 2) {
                showError(signupError, 'First name must be at least 2 characters');
                return;
            }

            if (!signupConfirmationResult) {
                // Step 1: Send verification code
                const phoneDigits = signupPhone.value.replace(/\D/g, ''); // Extract only digits
                const phoneNumber = signupCountryCode.value + phoneDigits;

                if (!phoneDigits || phoneDigits.length < 10) {
                    showError(signupError, 'Please enter a valid 10-digit phone number');
                    return;
                }

                signupBtn.disabled = true;
                signupBtn.textContent = 'Sending code...';

                try {
                    // Initialize reCAPTCHA
                    await initializeRecaptcha('signupRecaptcha');

                    // Send verification code
                    signupConfirmationResult = await sendPhoneVerificationCode(phoneNumber, window.recaptchaVerifier);

                    // Show verification code input
                    signupVerificationCodeGroup.style.display = 'block';
                    signupBtn.textContent = 'Create Account';
                    showError(signupError, '✅ Code sent! Check your phone.', false);
                    signupBtn.disabled = false;
                } catch (error) {
                    console.error('Error sending code:', error);
                    showError(signupError, getAuthErrorMessage(error));
                    signupBtn.disabled = false;
                    signupBtn.textContent = 'Send Code';
                    signupConfirmationResult = null;
                }
            } else {
                // Step 2: Verify code and create account
                const code = signupVerificationCode.value.replace(/\D/g, ''); // Extract only digits

                if (!code || code.length !== 6) {
                    showError(signupError, 'Please enter the 6-digit code');
                    return;
                }

                signupBtn.disabled = true;
                signupBtn.textContent = 'Creating account...';

                try {
                    // Set flag to prevent onAuthStateChanged from interfering
                    isCreatingAccount = true;
                    console.log('Calling verifyPhoneCode with firstName:', firstName);
                    await verifyPhoneCode(signupConfirmationResult, code, firstName);

                    // Account creation complete, clear flag
                    isCreatingAccount = false;

                    console.log('✅ Signup complete! Redirecting to index.html');

                    if (debugMode && !MODAL) {
                        console.log('%c🔧 DEBUG: Signup complete! Check logs above. Would normally redirect to index.html', 'background: #4CAF50; color: white; padding: 5px; font-weight: bold;');
                        console.log('%c🔧 User UID:', 'font-weight: bold;', auth.currentUser?.uid);
                        console.log('%c🔧 DisplayName:', 'font-weight: bold;', auth.currentUser?.displayName);
                    } else {
                        finish();
                    }
                } catch (error) {
                    console.error('Signup error:', error);
                    isCreatingAccount = false; // Clear flag on error
                    showError(signupError, getAuthErrorMessage(error));
                    signupBtn.disabled = false;
                    signupBtn.textContent = 'Create Account';
                }
            }
        });

        // Google Sign-In (Login)
        const googleSignInBtn = document.getElementById('googleSignInBtn');
        googleSignInBtn.addEventListener('click', async () => {
            googleSignInBtn.disabled = true;
            googleSignInBtn.textContent = 'Signing in...';

            try {
                const result = await signInWithGoogle();
                if (result.needsPhoneNumber) {
                    // Show phone collection modal
                    showPhoneCollectionModal();
                }
                // Redirect handled by onAuthStateChanged or after phone is added
            } catch (error) {
                console.error('Google sign-in error:', error);
                showError(loginError, getAuthErrorMessage(error));
                googleSignInBtn.disabled = false;
                googleSignInBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Sign in with Google';
            }
        });

        // Apple Sign-In (Login)
        const appleSignInBtn = document.getElementById('appleSignInBtn');
        appleSignInBtn.addEventListener('click', async () => {
            appleSignInBtn.disabled = true;
            appleSignInBtn.textContent = 'Signing in...';

            try {
                const result = await signInWithApple();
                if (result.needsPhoneNumber) {
                    // Show phone collection modal
                    showPhoneCollectionModal();
                }
                // Redirect handled by onAuthStateChanged or after phone is added
            } catch (error) {
                console.error('Apple sign-in error:', error);
                showError(loginError, getAuthErrorMessage(error));
                appleSignInBtn.disabled = false;
                appleSignInBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09l-.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg> Sign in with Apple';
            }
        });

        // Google Sign-Up
        const googleSignUpBtn = document.getElementById('googleSignUpBtn');
        googleSignUpBtn.addEventListener('click', async () => {
            googleSignUpBtn.disabled = true;
            googleSignUpBtn.textContent = 'Signing up...';

            try {
                const result = await signInWithGoogle();
                if (result.needsPhoneNumber) {
                    // Show phone collection modal
                    showPhoneCollectionModal();
                }
                // Redirect handled by onAuthStateChanged or after phone is added
            } catch (error) {
                console.error('Google sign-up error:', error);
                showError(signupError, getAuthErrorMessage(error));
                googleSignUpBtn.disabled = false;
                googleSignUpBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Sign up with Google';
            }
        });

        // Apple Sign-Up
        const appleSignUpBtn = document.getElementById('appleSignUpBtn');
        appleSignUpBtn.addEventListener('click', async () => {
            appleSignUpBtn.disabled = true;
            appleSignUpBtn.textContent = 'Signing up...';

            try {
                const result = await signInWithApple();
                if (result.needsPhoneNumber) {
                    // Show phone collection modal
                    showPhoneCollectionModal();
                }
                // Redirect handled by onAuthStateChanged or after phone is added
            } catch (error) {
                console.error('Apple sign-up error:', error);
                showError(signupError, getAuthErrorMessage(error));
                appleSignUpBtn.disabled = false;
                appleSignUpBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09l-.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg> Sign up with Apple';
            }
        });

        // Helper function to show errors
        function showError(element, message, isError = true) {
            element.textContent = message;
            element.classList.add('show');
            if (!isError) {
                element.style.color = '#4ade80';
            } else {
                element.style.color = '#ff6b6b';
            }
        }

        // ===== Phone Number Collection Modal Logic =====
        const phoneCollectionModal = document.getElementById('phoneCollectionModal');
        const modalCountryCode = document.getElementById('modalCountryCode');
        const modalPhoneNumber = document.getElementById('modalPhoneNumber');
        const modalVerificationCodeGroup = document.getElementById('modalVerificationCodeGroup');
        const modalVerificationCode = document.getElementById('modalVerificationCode');
        const modalPhoneBtn = document.getElementById('modalPhoneBtn');
        const modalPhoneError = document.getElementById('modalPhoneError');
        let modalConfirmationResult = null;

        // Format phone number input in modal
        modalPhoneNumber.addEventListener('input', () => formatPhoneNumber(modalPhoneNumber));
        modalVerificationCode.addEventListener('input', () => formatVerificationCode(modalVerificationCode));

        // Enter key handlers for modal
        modalPhoneNumber.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') modalPhoneBtn.click();
        });

        modalVerificationCode.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') modalPhoneBtn.click();
        });

        // Show phone collection modal
        function showPhoneCollectionModal() {
            phoneCollectionModal.classList.add('show');
            modalPhoneNumber.value = '';
            modalVerificationCode.value = '';
            modalVerificationCodeGroup.style.display = 'none';
            modalPhoneError.classList.remove('show');
            modalPhoneBtn.textContent = 'Send Code';
            modalConfirmationResult = null;
        }

        // Phone collection button handler
        modalPhoneBtn.addEventListener('click', async () => {
            if (!modalConfirmationResult) {
                // Step 1: Send verification code
                const phoneDigits = modalPhoneNumber.value.replace(/\D/g, '');
                const phoneNumber = modalCountryCode.value + phoneDigits;

                if (!phoneDigits || phoneDigits.length < 10) {
                    showError(modalPhoneError, 'Please enter a valid 10-digit phone number');
                    return;
                }

                modalPhoneBtn.disabled = true;
                modalPhoneBtn.textContent = 'Sending code...';

                try {
                    // Initialize reCAPTCHA
                    await initializeRecaptcha('modalRecaptcha');

                    // Send verification code
                    modalConfirmationResult = await sendPhoneVerificationCode(phoneNumber, window.recaptchaVerifier);

                    // Show verification code input
                    modalVerificationCodeGroup.style.display = 'block';
                    modalPhoneBtn.textContent = 'Verify & Continue';
                    showError(modalPhoneError, '✅ Code sent! Check your phone.', false);
                    modalPhoneBtn.disabled = false;
                } catch (error) {
                    console.error('Error sending code:', error);
                    showError(modalPhoneError, getAuthErrorMessage(error));
                    modalPhoneBtn.disabled = false;
                    modalPhoneBtn.textContent = 'Send Code';
                    modalConfirmationResult = null;
                }
            } else {
                // Step 2: Verify code and add phone number to account
                const code = modalVerificationCode.value.replace(/\D/g, '');

                if (!code || code.length !== 6) {
                    showError(modalPhoneError, 'Please enter the 6-digit code');
                    return;
                }

                modalPhoneBtn.disabled = true;
                modalPhoneBtn.textContent = 'Verifying...';

                try {
                    // Verify the code and add phone to existing user account
                    await verifyAndAddPhoneToUser(modalConfirmationResult, code);

                    console.log('✅ Phone number successfully added to account');

                    // Wait a moment for Firestore to sync
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Verify the phone number was saved
                    const hasPhone = await currentUserHasPhoneNumber();
                    console.log('Verification check - user has phone number:', hasPhone);

                    if (!hasPhone) {
                        console.error('⚠️ WARNING: Phone number verification returned false after save!');
                    }

                    // Close modal and continue
                    phoneCollectionModal.classList.remove('show');
                    if (!debugMode || MODAL) {
                        finish();
                    } else {
                        console.log('%c🔧 DEBUG: Would redirect to index.html but debug mode is on', 'background: #4CAF50; color: white; padding: 5px;');
                    }
                } catch (error) {
                    console.error('❌ Verification error:', error);
                    showError(modalPhoneError, getAuthErrorMessage(error));
                    modalPhoneBtn.disabled = false;
                    modalPhoneBtn.textContent = 'Verify & Continue';
                }
            }
        });
    

    if (MODAL) {
        // the module's own auth listener is gated off in modal mode, so show the form here
        loadingSpinner.classList.remove('show');
        loginForm.style.display = 'block';
    }

    return {
      finish: finish,
      showPhoneCollectionModal: typeof showPhoneCollectionModal === 'function' ? showPhoneCollectionModal : null,
      showLoginForm: function () {
        var lf = document.getElementById('loginForm');
        var sf = document.getElementById('signupForm');
        var ls = document.getElementById('loadingSpinner');
        if (ls) ls.classList.remove('show');
        if (sf) sf.style.display = 'none';
        if (lf) lf.style.display = 'block';
      }
    };
  }

  function mount(target, opts) {
    var el = typeof target === 'string' ? document.getElementById(target) : target;
    if (!el) { console.warn('FiveCrownsLogin: mount target not found'); return null; }
    el.innerHTML = LOGIN_HTML;
    return initLoginUI(opts || {});
  }

  window.FiveCrownsLogin = { mount: mount, html: LOGIN_HTML };
})();
