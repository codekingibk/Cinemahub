/**
 * Clerk Authentication Integration
 * Provides authentication for the movie site using Clerk
 */

// Clerk Configuration
const CLERK_PUBLISHABLE_KEY = 'pk_test_ZXhjaXRpbmctcGlnbGV0LTIzLmNsZXJrLmFjY291bnRzLmRldiQ';

// Initialize Clerk
let clerk = null;
let isClerkReady = false;

async function initializeClerk() {
    try {
        // Wait for Clerk to be loaded from CDN
        let attempts = 0;
        while (!window.Clerk && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.Clerk) {
            console.error('Clerk SDK failed to load after 5 seconds');
            showNotification('Authentication system failed to load. Please refresh the page.', 'error');
            return;
        }

        clerk = window.Clerk;
        window.clerk = clerk;
        await clerk.load({
            publishableKey: CLERK_PUBLISHABLE_KEY,
        });
        
        isClerkReady = true;
        window.isClerkReady = true;
        console.log('Clerk initialized successfully');

        // Update UI based on auth state
        updateAuthUI();
        
        // Listen for auth state changes
        clerk.addListener((resources) => {
            updateAuthUI();
        });

    } catch (error) {
        console.error('Failed to initialize Clerk:', error);
    }
}

// Update UI based on authentication state
function updateAuthUI() {
    const user = clerk?.user;
    const authButtons = document.getElementById('authButtons');
    const userProfile = document.getElementById('userProfile');
    const searchInput = document.getElementById('searchInput');

    if (!authButtons) return;

    if (user) {
        // User is signed in
        const userName = user.firstName || user.username || 'User';
        const userImage = user.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=9147ff&color=fff`;

        authButtons.style.display = 'none';
        if (userProfile) {
            userProfile.style.display = 'flex';
            userProfile.innerHTML = `
                <div class="user-info">
                    <img src="${userImage}" alt="${userName}" class="user-avatar">
                    <span class="user-name">${userName}</span>
                </div>
                <button id="signOutBtn" class="btn-outline">Sign Out</button>
            `;

            // Add sign out handler
            document.getElementById('signOutBtn')?.addEventListener('click', async () => {
                try {
                    await clerk.signOut();
                    window.location.reload();
                } catch (error) {
                    console.error('Sign out failed:', error);
                }
            });
        }
        
        // Update search input placeholder
        if (searchInput) {
            searchInput.placeholder = 'Search movies, series, actors...';
        }
        
        // Hide the sign-in panel when logged in
        const signInPanel = document.getElementById('signInPanel');
        if (signInPanel) {
            signInPanel.style.display = 'none';
        }

        // Hide promotional pro-tip card when logged in
        const proTipCard = document.getElementById('proTipCard');
        if (proTipCard) {
            proTipCard.style.display = 'none';
        }
    } else {
        // User is not signed in
        authButtons.style.display = 'flex';
        if (userProfile) {
            userProfile.style.display = 'none';
        }
        
        // Update search input placeholder
        if (searchInput) {
            searchInput.placeholder = 'Sign in to search movies, series, actors...';
        }
        
        // Show the sign-in panel when not logged in
        const signInPanel = document.getElementById('signInPanel');
        if (signInPanel) {
            signInPanel.style.display = 'block';
        }

        // Show promotional pro-tip card when not logged in
        const proTipCard = document.getElementById('proTipCard');
        if (proTipCard) {
            proTipCard.style.display = 'block';
        }
    }
}

// Sign in with redirect
async function signInWithGoogle() {
    try {
        await clerk.authenticateWithRedirect({
            strategy: 'oauth_google',
            redirectUrl: window.location.origin + '/sso-callback',
            redirectUrlComplete: window.location.href,
        });
    } catch (error) {
        console.error('Google sign-in failed:', error);
        showNotification('Failed to sign in with Google', 'error');
    }
}

async function signInWithApple() {
    try {
        await clerk.authenticateWithRedirect({
            strategy: 'oauth_apple',
            redirectUrl: window.location.origin + '/sso-callback',
            redirectUrlComplete: window.location.href,
        });
    } catch (error) {
        console.error('Apple sign-in failed:', error);
        showNotification('Failed to sign in with Apple', 'error');
    }
}

// Open Clerk sign-in modal
async function openSignIn() {
    try {
        if (!clerk || !isClerkReady) {
            console.error('Clerk not initialized');
            showNotification('Please wait, authentication is loading...', 'warning');
            return;
        }
        
        await clerk.openSignIn({
            appearance: {
                baseTheme: 'dark',
                variables: {
                    colorPrimary: '#9147ff',
                    colorBackground: '#1a1a2e',
                },
            },
        });
    } catch (error) {
        console.error('Failed to open sign-in:', error);
        showNotification('Failed to open sign-in. Please try again.', 'error');
    }
}

// Open Clerk sign-up modal
async function openSignUp() {
    try {
        if (!clerk || !isClerkReady) {
            console.error('Clerk not initialized');
            showNotification('Please wait, authentication is loading...', 'warning');
            return;
        }
        
        await clerk.openSignUp({
            appearance: {
                baseTheme: 'dark',
                variables: {
                    colorPrimary: '#9147ff',
                    colorBackground: '#1a1a2e',
                },
            },
        });
    } catch (error) {
        console.error('Failed to open sign-up:', error);
        showNotification('Failed to open sign-up. Please try again.', 'error');
    }
}

// Check if user is authenticated
function isUserAuthenticated() {
    return clerk && clerk.user !== null && clerk.user !== undefined;
}

// Require authentication for an action
function requireAuth(action, actionName = 'this action') {
    if (!isUserAuthenticated()) {
        showAuthNotification(`Please sign in to ${actionName}`, 'warning');
        setTimeout(() => openSignIn(), 500);
        return false;
    }
    return true;
}

// Show notification (standalone, doesn't rely on script.js)
function showAuthNotification(message, type = 'info') {
    // Check if script.js notification function exists
    if (typeof showNotification === 'function') {
        showNotification(message, type);
        return;
    }
    
    // Fallback notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'error' ? '#e50914' : type === 'warning' ? '#ff9800' : '#4caf50'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        z-index: 3000;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
        font-family: 'Space Grotesk', sans-serif;
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'check-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeClerk);
} else {
    initializeClerk();
}
