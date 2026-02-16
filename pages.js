// Common functionality for all pages

document.addEventListener('DOMContentLoaded', () => {
    // Handle logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('userToken');
            window.location.href = 'login.html';
        });
    }

    // Handle login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userToken', 'demo-token');
            alert('Logged in successfully!');
            window.location.href = 'profile.html';
        });
    }

    // Handle signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            localStorage.setItem('userName', name);
            localStorage.setItem('userEmail', email);
            localStorage.setItem('userToken', 'demo-token');
            alert('Account created successfully!');
            window.location.href = 'profile.html';
        });
    }

    // Navigate on chip clicks
    const chips = document.querySelectorAll('.chip[data-search]');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            const searchTerm = chip.getAttribute('data-search');
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = searchTerm;
                const searchBtn = document.getElementById('searchBtn');
                if (searchBtn) {
                    searchBtn.click();
                }
            }
        });
    });
});
