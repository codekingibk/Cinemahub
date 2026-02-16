// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const loading = document.getElementById('loading');
const moviesGrid = document.getElementById('moviesGrid');
const noResults = document.getElementById('noResults');
const resultsTitle = document.getElementById('resultsTitle');
const movieModal = document.getElementById('movieModal');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const modalBody = document.getElementById('modalBody');

// State
let currentSearchResults = [];

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

// Trending tag clicks
document.querySelectorAll('.tag').forEach(tag => {
    tag.addEventListener('click', () => {
        const searchTerm = tag.getAttribute('data-search');
        searchInput.value = searchTerm;
        handleSearch();
        scrollToResults();
    });
});

// Modal close events
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Handle Search
async function handleSearch() {
    // Check authentication first
    if (!requireAuth('search for movies', 'search for movies')) {
        return;
    }
    
    const query = searchInput.value.trim();
    
    if (!query) {
        showNotification('Please enter a search term', 'warning');
        return;
    }

    showLoading();
    hideResults();
    scrollToResults();

    try {
        const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            let message = 'Failed to fetch movies';
            try {
                const errorData = await response.json();
                if (errorData && errorData.error) {
                    message = errorData.error;
                } else if (errorData && errorData.message) {
                    message = errorData.message;
                }
            } catch (parseError) {
                const text = await response.text();
                if (text) {
                    message = text;
                }
            }
            throw new Error(message);
        }

        const data = await response.json();
        
        hideLoading();

        if (data.success && data.results && data.results.length > 0) {
            currentSearchResults = data.results;
            displayMovies(data.results, query);
            
            // Track search activity
            trackUserActivity('search');
        } else {
            showNoResults();
        }
    } catch (error) {
        console.error('Error fetching movies:', error);
        hideLoading();
        showNotification(error.message || 'Failed to fetch movies. Please try again.', 'error');
    }
}

// Display Movies
function displayMovies(movies, query, customTitle = null) {
    moviesGrid.innerHTML = '';
    
    if (customTitle) {
        resultsTitle.textContent = customTitle;
    } else if (query) {
        resultsTitle.textContent = `Search Results for "${query}"`;
    } else {
        resultsTitle.textContent = 'Results';
    }
    
    movies.forEach(movie => {
        const movieCard = createMovieCard(movie);
        moviesGrid.appendChild(movieCard);
    });

    showResults();
}

// Create Movie Card
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.onclick = () => openDetailsPage(movie);

    const posterUrl = movie.poster || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="250" height="375" viewBox="0 0 250 375"%3E%3Crect fill="%232a2a2a" width="250" height="375"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="20" fill="%23666"%3ENo Image%3C/text%3E%3C/svg%3E';
    
    const rating = movie.rating || 'N/A';
    const title = movie.title || 'Unknown Title';
    const year = movie.year || '';

    card.innerHTML = `
        <div class="movie-poster-container">
            <img src="${posterUrl}" alt="${title}" class="movie-poster" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"250\\" height=\\"375\\" viewBox=\\"0 0 250 375\\"%3E%3Crect fill=\\"%232a2a2a\\" width=\\"250\\" height=\\"375\\"/%3E%3Ctext x=\\"50%25\\" y=\\"50%25\\" dominant-baseline=\\"middle\\" text-anchor=\\"middle\\" font-family=\\"Arial\\" font-size=\\"20\\" fill=\\"%23666\\"%3ENo Image%3C/text%3E%3C/svg%3E'">
            ${rating !== 'N/A' ? `
                <div class="movie-rating">
                    <i class="fas fa-star"></i>
                    <span>${rating}</span>
                </div>
            ` : ''}
        </div>
        <div class="movie-info">
            <h3 class="movie-title">${title}</h3>
            ${year ? `<p class="movie-year">${year}</p>` : ''}
        </div>
    `;

    return card;
}

function openDetailsPage(movie) {
    if (!requireAuth('view movie details', 'view details')) {
        return;
    }

    const params = new URLSearchParams({
        id: movie.id || '',
        path: movie.detail_path || '',
        title: movie.title || ''
    });

    window.location.href = `details.html?${params.toString()}`;
}

// Show Movie Details
async function showMovieDetails(movie) {
    // Require authentication to view movie details
    if (!requireAuth('view movie details', 'view details')) {
        return;
    }
    
    const movieId = movie.id;
    
    if (!movieId) {
        showNotification('Movie details not available', 'warning');
        return;
    }

    // Show loading in modal
    modalBody.innerHTML = `
        <div style="padding: 4rem; text-align: center;">
            <div class="spinner"></div>
            <p style="margin-top: 1rem;">Loading details...</p>
        </div>
    `;
    openModal();

    try {
        // Fetch detailed information
        const detailPath = movie.detail_path || '';
        const detailsResponse = await fetch(
            `${API_BASE_URL}/details/${movieId}?path=${encodeURIComponent(detailPath)}`
        );
        
        let details = movie;
        if (detailsResponse.ok) {
            const detailsData = await detailsResponse.json();
            if (detailsData.success && detailsData.details) {
                details = { ...movie, ...detailsData.details };
            }
        }

        displayMovieModal(details);
        loadMediaOptions(details);
        
        // Track movie view activity
        trackUserActivity('movieView');
    } catch (error) {
        console.error('Error fetching movie details:', error);
        modalBody.innerHTML = `
            <div style="padding: 4rem; text-align: center; color: var(--text-gray);">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p>Failed to load movie details. Please try again.</p>
            </div>
        `;
    }
}

// Display Movie Modal
function displayMovieModal(movie) {
    const posterUrl = movie.poster || '';
    const title = movie.title || 'Unknown Title';
    const year = movie.year || '';
    const rating = movie.rating || 'N/A';
    const plot = movie.description || 'No description available.';
    const duration = movie.duration || '';
    const genre = movie.genre || [];

    let modalHTML = `
        ${posterUrl ? `
            <div class="modal-banner">
                <img src="${posterUrl}" alt="${title}" onerror="this.style.display='none'">
            </div>
        ` : ''}
        
        <div class="modal-details">
            <div class="modal-header">
                <h2 class="modal-title">${title}</h2>
                <div class="modal-meta">
                    ${year ? `<span><i class="fas fa-calendar"></i> ${year}</span>` : ''}
                    ${rating !== 'N/A' ? `
                        <div class="modal-rating">
                            <i class="fas fa-star"></i>
                            <span>${rating}/10</span>
                        </div>
                    ` : ''}
                    ${movie.type ? `<span><i class="fas fa-film"></i> ${movie.type}</span>` : ''}
                    ${duration ? `<span><i class="fas fa-clock"></i> ${duration}</span>` : ''}
                </div>
            </div>

            ${plot !== 'No description available.' ? `
                <div class="modal-section">
                    <h3><i class="fas fa-align-left"></i> Plot</h3>
                    <p>${plot}</p>
                </div>
            ` : ''}

            ${Array.isArray(genre) && genre.length > 0 ? `
                <div class="modal-section">
                    <h3><i class="fas fa-tags"></i> Genres</h3>
                    <div class="modal-genres">
                        ${genre.map(g => `<span class="genre-tag">${g}</span>`).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="modal-section">
                <h3><i class="fas fa-download"></i> Download/Stream</h3>
                <p id="mediaStatus" style="color: var(--text-gray); font-size: 0.95rem;">Loading streaming options...</p>
                <div class="media-actions" id="mediaActions"></div>
                <div class="media-player" id="mediaPlayer"></div>
                <div class="media-list" id="mediaList"></div>
            </div>
        </div>
    `;

    modalBody.innerHTML = modalHTML;
}

async function loadMediaOptions(movie) {
    const statusEl = document.getElementById('mediaStatus');
    const actionsEl = document.getElementById('mediaActions');
    const playerEl = document.getElementById('mediaPlayer');
    const listEl = document.getElementById('mediaList');

    if (!statusEl || !actionsEl || !listEl) {
        return;
    }

    const movieId = movie.id;
    const detailPath = movie.detail_path || '';
    const movieTitle = movie.title || 'movie';

    if (!movieId || !detailPath) {
        statusEl.textContent = 'Streaming is not available for this title.';
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/media/${movieId}?path=${encodeURIComponent(detailPath)}`
        );

        if (!response.ok) {
            let message = 'Failed to load streaming options';
            try {
                const errorData = await response.json();
                if (errorData && errorData.error) {
                    message = errorData.error;
                }
            } catch (parseError) {
                const text = await response.text();
                if (text) {
                    message = text;
                }
            }
            throw new Error(message);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Streaming is not available for this title.');
        }

        const best = data.best;
        const downloads = Array.isArray(data.downloads) ? data.downloads : [];
        const captions = Array.isArray(data.captions) ? data.captions : [];

        // Store data globally for dropdown handlers
        window.currentMediaData = { movieTitle, detailPath, best, downloads, captions };

        if (best && best.url) {
            const proxyBestUrl = `${API_BASE_URL}/stream?url=${encodeURIComponent(best.url)}&path=${encodeURIComponent(detailPath)}`;
            
   // Create dropdown UI for quality and subtitles
            actionsEl.innerHTML = `
                <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px;">
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--text-gray); font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Video Quality</label>
                        <select id="qualitySelect" style="width: 100%; padding: 0.8rem 1rem; background: rgba(20, 20, 35, 0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: white; font-size: 0.95rem; cursor: pointer; outline: none; transition: 0.2s;">
                            <option value="best">Best Quality</option>
                            ${downloads.map(d => `<option value="${d.resolution || 'unknown'}">${d.resolution || 'Unknown'}p</option>`).join('')}
                        </select>
                    </div>
                    ${captions.length > 0 ? `
                    <div style="flex: 1; min-width: 200px;">
                        <label style="display: block; margin-bottom: 0.5rem; color: var(--text-gray); font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Subtitles</label>
                        <select id="subtitleSelect" style="width: 100%; padding: 0.8rem 1rem; background: rgba(20, 20, 35, 0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: white; font-size: 0.95rem; cursor: pointer; outline: none; transition: 0.2s;">
                            <option value="none">No Subtitles</option>
                            ${captions.map((c, i) => `<option value="${i}">${c.name || c.lang || 'Subtitle ' + (i+1)}</option>`).join('')}
                        </select>
                    </div>
                    ` : ''}
                </div>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <button onclick="handleStream()" class="media-btn" style="flex: 1; cursor: pointer;"><i class="fas fa-play"></i> Stream</button>
                    <button onclick="handleDownload()" class="media-btn secondary" style="flex: 1; cursor: pointer;"><i class="fas fa-download"></i> Download</button>
                </div>
            `;
            
            // Add hover effect to selects
            setTimeout(() => {
                document.querySelectorAll('#qualitySelect, #subtitleSelect').forEach(el => {
                    el.addEventListener('mouseenter', function() {
                        this.style.borderColor = 'rgba(145, 71, 255, 0.5)';
                    });
                    el.addEventListener('mouseleave', function() {
                        this.style.borderColor = 'rgba(255,255,255,0.1)';
                    });
                });
            }, 100);
            
            playerEl.innerHTML = `
                <video class="media-video" id="mainVideo" controls preload="metadata" src="${proxyBestUrl}"></video>
            `;
            statusEl.textContent = 'Ready to stream or download';
        } else {
            statusEl.textContent = 'No streamable files found.';
        }

    } catch (error) {
        statusEl.textContent = error.message || 'Failed to load streaming options.';
        actionsEl.innerHTML = '';
        playerEl.innerHTML = '';
        listEl.innerHTML = '';
    }
}

// Handle streaming with selected quality
function handleStream() {
    const data = window.currentMediaData;
    if (!data) return;
    
    const qualitySelect = document.getElementById('qualitySelect');
    const quality = qualitySelect ? qualitySelect.value : 'best';
    
    let streamUrl;
    if (quality === 'best') {
        streamUrl = `${API_BASE_URL}/stream?url=${encodeURIComponent(data.best.url)}&path=${encodeURIComponent(data.detailPath)}`;
    } else {
        const download = data.downloads.find(d => d.resolution == quality);
        if (download) {
            streamUrl = `${API_BASE_URL}/stream?url=${encodeURIComponent(download.url)}&path=${encodeURIComponent(data.detailPath)}`;
        }
    }
    
    if (streamUrl) {
        const video = document.getElementById('mainVideo');
        if (video) {
            video.src = streamUrl;
            video.load();
            video.play();
            showNotification('Streaming started', 'info');
        }
    }
}

// Handle download with selected options
function handleDownload() {
    const data = window.currentMediaData;
    if (!data) return;
    
    const qualitySelect = document.getElementById('qualitySelect');
    const subtitleSelect = document.getElementById('subtitleSelect');
    
    const quality = qualitySelect ? qualitySelect.value : 'best';
    const subtitleIndex = subtitleSelect ? subtitleSelect.value : 'none';
    
    // Download video (offline cache)
    let downloadUrl;
    let qualityLabel = quality;
    if (quality === 'best') {
        downloadUrl = `${API_BASE_URL}/stream?url=${encodeURIComponent(data.best.url)}&path=${encodeURIComponent(data.detailPath)}`;
    } else {
        const download = data.downloads.find(d => d.resolution == quality);
        if (download) {
            downloadUrl = `${API_BASE_URL}/stream?url=${encodeURIComponent(download.url)}&path=${encodeURIComponent(data.detailPath)}`;
        }
    }
    
    if (downloadUrl) {
        startOfflineDownload({
            title: data.movieTitle,
            url: downloadUrl,
            type: 'movie',
            quality: qualityLabel
        });
    }
    
    // Download subtitle if selected
    if (subtitleIndex !== 'none' && data.captions.length > 0) {
        const subtitle = data.captions[parseInt(subtitleIndex)];
        if (subtitle) {
            const subtitleUrl = `${API_BASE_URL}/stream?url=${encodeURIComponent(subtitle.url)}&path=${encodeURIComponent(data.detailPath)}`;
            setTimeout(() => {
                startOfflineDownload({
                    title: data.movieTitle,
                    url: subtitleUrl,
                    type: 'subtitle',
                    language: subtitle.name || subtitle.lang || 'Subtitle'
                });
            }, 400);
        }
    }
}

// Modal Functions
function openModal() {
    movieModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    movieModal.classList.remove('active');
    document.body.style.overflow = '';
}

// Utility Functions
function showLoading() {
    loading.classList.add('active');
}

function hideLoading() {
    loading.classList.remove('active');
}

function showResults() {
    const resultsSection = document.getElementById('results');
    if (resultsSection) {
        resultsSection.classList.add('active');
    }
    moviesGrid.style.display = 'grid';
    noResults.classList.remove('active');
}

function hideResults() {
    const resultsSection = document.getElementById('results');
    if (resultsSection) {
        resultsSection.classList.remove('active');
    }
    moviesGrid.style.display = 'none';
    noResults.classList.remove('active');
}

function showNoResults() {
    const resultsSection = document.getElementById('results');
    if (resultsSection) {
        resultsSection.classList.add('active');
    }
    moviesGrid.style.display = 'none';
    noResults.classList.add('active');
    resultsTitle.textContent = 'No Results Found';
}

function scrollToResults() {
    setTimeout(() => {
        document.getElementById('results').scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }, 300);
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
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
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'check-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification animations to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Load trending movies on page load
let isDownloadingOffline = false; // Track if download is in progress
let serviceWorkerRegistration = null; // Store registration
let swControllerReady = false; // Track if controller is active

window.addEventListener('DOMContentLoaded', async () => {
    console.log('[SM] CinemaHub loaded successfully!');
    
    // Register service worker for background downloads
    if ('serviceWorker' in navigator) {
        try {
            console.log('[SM] Registering Service Worker from /sw.js...');
            const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            console.log('[SM] ✓ Service Worker registered:', registration);
            serviceWorkerRegistration = registration;
            
            // Important: Listen BEFORE anything tries to use it
            navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
            console.log('[SM] ✓ Message listener attached');
            
            // Check if already controlled immediately
            if (navigator.serviceWorker.controller) {
                console.log('[SM] ✓ Page ALREADY controlled by SW');
                swControllerReady = true;
            } else {
                console.log('[SM] ⏳ Page NOT yet controlled by SW, waiting for activation...');
                
                // Listen for controller change (when SW takes control)
                const onControllerChange = () => {
                    console.log('[SM] ✓ SW CONTROLLER ACTIVATED');
                    swControllerReady = true;
                    // Don't remove listener yet, it might happen again
                };
                
                navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
                
                // Also check if updatefound fires (new version installed)
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log(`[SM] New worker found, state: ${newWorker?.state}`);
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            console.log(`[SM] Worker state → ${newWorker.state}`);
                            if (newWorker.state === 'activated') {
                                console.log('[SM] ✓ Installed worker activated');
                                swControllerReady = true;
                            }
                        });
                    }
                });
                
                // Give it time to activate (usually instant for first load)
                setTimeout(() => {
                    if (!swControllerReady) {
                        console.warn('[SM] SW not activated after 1s, may need page reload');
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('[SM] Service Worker registration failed:', error);
            swControllerReady = false;
        }
    } else {
        console.warn('[SM] Service Workers not supported in this browser');
    }
    
    // Add fade-in animation to page
    document.body.style.opacity = '0';
   setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
    
    // Load trending movies on home page
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        await loadTrendingMovies();
    }
});

// Handle messages from service worker
function handleServiceWorkerMessage(event) {
    const { type, payload } = event.data;
    console.log('[MSG] Received from SW:', type);
    
    // Use userId from payload (sent by SW) not from clerk context
    const userId = payload?.userId || window.clerk?.user?.id;
    if (!userId) {
        console.warn('[MSG] No userId in message or clerk context');
        return;
    }
    
    if (type === 'DOWNLOAD_PROGRESS') {
        const { entryId, receivedBytes, totalBytes, progress } = payload;
        updateDownloadProgress(userId, entryId, receivedBytes, totalBytes, progress);
    } else if (type === 'DOWNLOAD_COMPLETE') {
        const { entryId, title } = payload;
        completeDownload(userId, entryId, title);
    } else if (type === 'DOWNLOAD_FAILED') {
        const { entryId, error } = payload;
        failDownload(userId, entryId, error);
    }
}

function updateDownloadProgress(userId, entryId, receivedBytes, totalBytes, progress) {
    const library = getOfflineLibrary(userId);
    const index = library.findIndex(item => item.id === entryId);
    if (index !== -1) {
        library[index] = {
            ...library[index],
            progress,
            receivedBytes,
            totalBytes,
            updatedAt: Date.now()
        };
        saveOfflineLibrary(userId, library);
    }
}

function completeDownload(userId, entryId, title) {
    const library = getOfflineLibrary(userId);
    const index = library.findIndex(item => item.id === entryId);
    if (index !== -1) {
        library[index] = {
            ...library[index],
            status: 'ready',
            progress: 100,
            cachedAt: Date.now()
        };
        saveOfflineLibrary(userId, library);
        showNotification(`${title} ready for offline viewing`, 'info');
    }
    isDownloadingOffline = false;
}

function failDownload(userId, entryId, error) {
    const library = getOfflineLibrary(userId);
    const index = library.findIndex(item => item.id === entryId);
    if (index !== -1) {
        library[index] = {
            ...library[index],
            status: 'failed',
            error: error || 'Download failed'
        };
        saveOfflineLibrary(userId, library);
        showNotification(`Download failed: ${error}`, 'error');
    }
    isDownloadingOffline = false;
}

// Load and display trending movies
async function loadTrendingMovies() {
    try {
        const response = await fetch(`${API_BASE_URL}/trending`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch trending movies');
        }
        
        const data = await response.json();
        
        if (data.success && data.results && data.results.length > 0) {
            currentSearchResults = data.results;
            displayMovies(data.results, null, 'Trending Now');
        } else {
            // If no trending data, just hide the section
            hideResults();
        }
    } catch (error) {
        console.error('Failed to load trending movies:', error);
        // Silently fail - don't show error to user on page load
        hideResults();
    }
}

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // ESC key to close modal
    if (e.key === 'Escape' && movieModal.classList.contains('active')) {
        closeModal();
    }
    
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
    }
});

// Lazy loading for images
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                observer.unobserve(img);
            }
        });
    });

    // Observe all images with data-src attribute
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// Performance monitoring (optional)
if (window.performance && window.performance.timing) {
    window.addEventListener('load', () => {
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        console.log(`Page loaded in ${pageLoadTime}ms`);
    });
}

// Service Worker registration (for PWA capabilities - optional)
if ('serviceWorker' in navigator) {
    // Uncomment the following lines if you create a service worker
    // window.addEventListener('load', () => {
    //     navigator.serviceWorker.register('/sw.js')
    //         .then(registration => console.log('SW registered'))
    //         .catch(error => console.log('SW registration failed'));
    // });
}

// Track user activity for profile stats
function trackUserActivity(activityType) {
    try {
        // Get user ID from Clerk if available
        const userId = window.clerk?.user?.id;
        if (!userId) {
            console.log('User not authenticated, skipping activity tracking');
            return;
        }

        // Get current stats
        const statsKey = `userStats_${userId}`;
        const stats = JSON.parse(localStorage.getItem(statsKey)) || {
            searchCount: 0,
            moviesViewed: 0,
            downloadsCount: 0
        };

        // Update the appropriate stat
        switch(activityType) {
            case 'search':
                stats.searchCount++;
                break;
            case 'movieView':
                stats.moviesViewed++;
                break;
            case 'download':
                stats.downloadsCount++;
                break;
        }

        // Save updated stats
        localStorage.setItem(statsKey, JSON.stringify(stats));
        console.log(`Activity tracked: ${activityType}`, stats);
    } catch (error) {
        console.error('Failed to track activity:', error);
    }
}

// Track detailed download history
function trackDownload(title, type, quality = null, language = null) {
    try {
        const userId = window.clerk?.user?.id;
        if (!userId) return;

        const historyKey = `downloadHistory_${userId}`;
        const history = JSON.parse(localStorage.getItem(historyKey)) || [];

        history.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            title: title,
            type: type, // 'movie', 'video', or 'subtitle'
            quality: quality,
            language: language,
            timestamp: Date.now(),
            date: new Date().toISOString()
        });

        // Keep only last 100 downloads
        if (history.length > 100) {
            history.splice(0, history.length - 100);
        }

        localStorage.setItem(historyKey, JSON.stringify(history));
        
        // Also update the download count
        trackUserActivity('download');
        
        showNotification('Download tracked successfully', 'info');
    } catch (error) {
        console.error('Failed to track download:', error);
    }
}

// Offline download manager
const OFFLINE_CACHE_NAME = 'cinemahub-offline-v1';
const MAX_OFFLINE_BYTES = 1024 * 1024 * 1024; // 1 GB

function getOfflineLibrary(userId) {
    try {
        const key = `offlineLibrary_${userId}`;
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch (error) {
        console.error('Failed to read offline library:', error);
        return [];
    }
}

function saveOfflineLibrary(userId, library) {
    try {
        const key = `offlineLibrary_${userId}`;
        localStorage.setItem(key, JSON.stringify(library));
    } catch (error) {
        console.error('Failed to save offline library:', error);
    }
}

function getOfflineUsage(library) {
    return library.reduce((total, item) => total + (item.size || 0), 0);
}

async function enforceOfflineLimit(userId, library, neededBytes) {
    let updated = [...library];
    let total = getOfflineUsage(updated);

    if (total + neededBytes <= MAX_OFFLINE_BYTES) {
        return updated;
    }

    // Remove oldest completed items first
    updated.sort((a, b) => (a.cachedAt || 0) - (b.cachedAt || 0));
    while (updated.length > 0 && total + neededBytes > MAX_OFFLINE_BYTES) {
        const removed = updated.shift();
        if (removed && removed.cacheKey) {
            const cache = await caches.open(OFFLINE_CACHE_NAME);
            await cache.delete(removed.cacheKey);
            total -= removed.size || 0;
        }
    }

    return updated;
}

async function checkStorageAvailability() {
    try {
        if (!navigator.storage || !navigator.storage.estimate) {
            return { available: true, estimate: null };
        }
        const estimate = await navigator.storage.estimate();
        const available = estimate.quota - estimate.usage > MAX_OFFLINE_BYTES * 0.2; // Keep 20% headroom
        console.log(`[Storage] Usage: ${formatBytes(estimate.usage)}, Quota: ${formatBytes(estimate.quota)}, Available: ${available}`);
        return { available, estimate };
    } catch (error) {
        console.warn(`[Storage] Could not estimate quota:`, error.message);
        return { available: true, estimate: null };
    }
}

function updateOfflineEntry(userId, entryId, updates) {
    const library = getOfflineLibrary(userId);
    const index = library.findIndex(item => item.id === entryId);
    if (index === -1) return;
    library[index] = { ...library[index], ...updates };
    saveOfflineLibrary(userId, library);
}

async function startOfflineDownload({ title, url, type, quality = null, language = null }) {
    const userId = window.clerk?.user?.id;
    if (!userId) {
        showNotification('Please sign in to download for offline use', 'warning');
        return;
    }

    if (window.location.protocol === 'file:') {
        showNotification('Offline downloads require http://localhost:5000', 'warning');
        return;
    }

    if (!('caches' in window)) {
        showNotification('Offline downloads are not supported in this browser', 'error');
        return;
    }

    // Check storage availability before starting
    const { available: hasEnoughStorage } = await checkStorageAvailability();
    if (!hasEnoughStorage) {
        showNotification('Not enough storage space. Clear some downloads to continue.', 'warning');
        return;
    }

    const entryId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const cacheKey = `${url}${url.includes('?') ? '&' : '?'}offline=1&entry=${entryId}`;

    let library = getOfflineLibrary(userId);
    library.push({
        id: entryId,
        title,
        type,
        quality,
        language,
        status: 'downloading',
        progress: 0,
        size: 0,
        receivedBytes: 0,
        totalBytes: 0,
        cacheKey,
        createdAt: Date.now()
    });
    saveOfflineLibrary(userId, library);

    console.log(`[Download] Starting download: "${title}"`);
    console.log(`[Download] URL: ${url.substring(0, 60)}...`);
    console.log(`[Download] Entry ID: ${entryId}`);
    console.log(`[Download] SW Controller Ready: ${swControllerReady}`);
    console.log(`[Download] Controller Exists: ${!!navigator.serviceWorker?.controller}`);
    
    // PRIMARY ROUTE: Use Service Worker (background download - survives page navigation)
    const controller = navigator.serviceWorker?.controller;
    if (controller && swControllerReady) {
        console.log(`[Download] ✓ [PRIMARY] Using Service Worker for background download`);
        try {
            const message = {
                type: 'START_DOWNLOAD',
                payload: { entryId, title, url, userId, cacheKey }
            };
            controller.postMessage(message);
            console.log(`[Download] ✓ Message sent to Service Worker`);
            showNotification(`⏳ Downloading ${title}... You can safely leave this page.`, 'info');
            return;
        } catch (error) {
            console.error(`[Download] ✗ Failed to send to SW:`, error.message);
        }
    } else if (controller && !swControllerReady) {
        console.log(`[Download] ⚠ Controller exists but swControllerReady=false, waiting 500ms...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        if (swControllerReady && navigator.serviceWorker?.controller) {
            try {
                const message = {
                    type: 'START_DOWNLOAD',
                    payload: { entryId, title, url, userId, cacheKey }
                };
                navigator.serviceWorker.controller.postMessage(message);
                console.log(`[Download] ✓ Message sent to Service Worker (after wait)`);
                showNotification(`⏳ Downloading ${title}... You can safely leave this page.`, 'info');
                return;
            } catch (error) {
                console.error(`[Download] ✗ Still failed after wait:`, error.message);
            }
        }
    } else {
        console.log(`[Download] ✗ No SW controller available`);
        if (serviceWorkerRegistration) {
            console.log(`[Download] (Registration exists but controller not active - may need page reload)`);
        }
    }
    
    // FALLBACK ROUTE: Direct download (requires page to stay open)
    console.log(`[Download] [FALLBACK] Using direct download in main thread`);
    showNotification(`⚠ Downloading ${title}... You MUST KEEP THIS PAGE OPEN.`, 'warning');
    await performDirectDownload({ userId, entryId, title, url, cacheKey });
}

async function performDirectDownload({ userId, entryId, title, url, cacheKey }) {
    try {
        isDownloadingOffline = true;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentLength = response.headers.get('content-length');
        const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
        
        updateOfflineEntry(userId, entryId, { totalBytes });

        const cache = await caches.open(OFFLINE_CACHE_NAME);
        const reader = response.body?.getReader();
        
        if (!reader) {
            throw new Error('Response body not readable');
        }

        const chunks = [];
        let received = 0;
        let lastUpdate = 0;
        const startTime = Date.now();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            if (value) {
                chunks.push(value);
                received += value.length;
                
                const now = Date.now();
                if (now - lastUpdate > 500) {
                    const progress = totalBytes ? Math.round((received / totalBytes) * 100) : 0;
                    updateOfflineEntry(userId, entryId, {
                        progress,
                        receivedBytes: received,
                        totalBytes
                    });
                    lastUpdate = now;
                }
            }
        }

        // Create and cache the blob
        const blob = new Blob(chunks, { type: response.headers.get('content-type') || 'application/octet-stream' });
        if (blob.size === 0) {
            throw new Error('Downloaded blob is empty');
        }

        const cacheResponse = new Response(blob, {
            status: response.status,
            statusText: response.statusText,
            headers: new Headers(response.headers)
        });

        await cache.put(cacheKey, cacheResponse);

        updateOfflineEntry(userId, entryId, {
            status: 'ready',
            progress: 100,
            cachedAt: Date.now()
        });

        showNotification(`${title} ready for offline viewing`, 'info');
        
    } catch (error) {
        const errorMsg = error?.message || 'Download failed';
        updateOfflineEntry(userId, entryId, {
            status: 'failed',
            error: errorMsg
        });
        showNotification(`Download failed: ${errorMsg}`, 'error');
    } finally {
        isDownloadingOffline = false;
    }
}


// Get user preferences (for video quality, subtitles, etc.)
function getUserPreferences() {
    try {
        const userId = window.clerk?.user?.id;
        if (!userId) return null;

        const prefsKey = `userPrefs_${userId}`;
        return JSON.parse(localStorage.getItem(prefsKey)) || {
            emailNotifications: false,
            autoPlay: true,
            recommendations: true,
            subtitleLang: 'en',
            videoQuality: 'auto',
            downloadQuality: '1080'
        };
    } catch (error) {
        console.error('Failed to get user preferences:', error);
        return null;
    }
}

function trackUserActivity(type) {
    const userId = window.clerk?.user?.id;
    if (!userId) return;

    const statsKey = 'userStats_' + userId;
    let stats = { searchCount: 0, moviesViewed: 0, downloadsCount: 0 };
    
    try {
        const stored = localStorage.getItem(statsKey);
        if (stored) stats = JSON.parse(stored);
    } catch (e) { console.error('Error parsing stats', e); }

    if (type === 'search') {
        stats.searchCount++;
    } else if (type === 'view') {
        stats.moviesViewed++;
    } else if (type === 'download') {
        stats.downloadsCount++;
    }

    localStorage.setItem(statsKey, JSON.stringify(stats));
}

// Generic search handler for categories/links
function handleSearchGeneric(term) {
    if(searchInput) {
        searchInput.value = term;
        handleSearch();
        scrollToResults();
    }
}

// Load Trending Movies
async function loadTrending() {
    const slider = document.getElementById('trendingSlider');
    const loading = document.getElementById('trendingLoading');
    if (!slider || !loading) return;

    try {
        // Fetch specific trending query (using 2026 for current trending)
        const response = await fetch(`${API_BASE_URL}/search?q=2026`);
        if (!response.ok) throw new Error('Failed to load trending');
        
        const data = await response.json();
        
        if (data.success && data.results && data.results.length > 0) {
            displayTrending(data.results.slice(0, 10)); // Top 10
            loading.style.display = 'none';
            slider.style.display = 'flex';
        } else {
             loading.style.display = 'none';
        }
    } catch (e) {
        console.error('Trending load error', e);
        loading.style.display = 'none';
    }
}

function displayTrending(movies) {
    const slider = document.getElementById('trendingSlider');
    slider.innerHTML = '';
    
    movies.forEach(movie => {
        const div = document.createElement('div');
        div.className = 'trend-card';
        div.onclick = () => openDetailsPage(movie);
        
        const posterUrl = movie.poster || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'300\' viewBox=\'0 0 200 300\'%3E%3Crect fill=\'%23111\' width=\'200\' height=\'300\'/%3E%3C/svg%3E';
        
        div.innerHTML = `
            <img src='${posterUrl}' class='trend-poster' loading='lazy' alt='${movie.title}'>
            <h4 class='trend-title'>${movie.title}</h4>
        `;
        slider.appendChild(div);
    });
}

// User-specified: Trending = Random Category + >7 Stars + Auto-running slider
async function loadTrending() {
    const slider = document.getElementById('trendingSlider');
    const loading = document.getElementById('trendingLoading');
    if (!slider || !loading) return;

    // Pick a random category, including Anime/Animation explicit triggers
    const categories = ['Action', 'Sci-Fi', 'Adventure', 'Animation', 'Drama', 'Thriller', 'Comedy', 'Anime', 'Cartoons', 'Fantasy'];
    const randomCat = categories[Math.floor(Math.random() * categories.length)];

    try {
        console.log(`Loading trending via category: ${randomCat}`);
        const response = await fetch(`${API_BASE_URL}/search?q=${randomCat}`);
        if (!response.ok) throw new Error('Failed to load trending');
        
        const data = await response.json();
        
        if (data.success && data.results && data.results.length > 0) {
            // Filter: Rating >= 7 and must have a poster
            let highRated = data.results.filter(m => {
                const r = parseFloat(m.rating);
                return !isNaN(r) && r >= 7.0 && m.poster;
            });

            // Fallback if strict filtering yields too few results
            if (highRated.length < 5) {
                highRated = data.results.slice(0, 15); 
            }

            displayTrending(highRated.slice(0, 20)); // Limit to top 20
            loading.style.display = 'none';
            slider.style.display = 'flex';
            
            // Start auto-scroll
            startTrendingAutoScroll(slider);
        } else {
             loading.style.display = 'none';
        }
    } catch (e) {
        console.error('Trending load error', e);
        loading.style.display = 'none';
    }
}

function startTrendingAutoScroll(slider) {
    let scrollStep = 1; // Speed
    let scrollDelay = 30; // 30ms per step
    let isPaused = false;
    
    // Pause on hover
    slider.addEventListener('mouseenter', () => isPaused = true);
    slider.addEventListener('mouseleave', () => isPaused = false);
    
    // Also pause if container (including arrows) is hovered
    const container = slider.parentElement;
    if(container) {
        container.addEventListener('mouseenter', () => isPaused = true);
        container.addEventListener('mouseleave', () => isPaused = false);
    }

    setInterval(() => {
        if(!isPaused) {
            if(slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 10) {
                // Return to start softly or jump? Jumping is better for continuous loop illusion but hard without cloning. 
                // For now, smooth scroll back to 0 or simple increment
                // Let's bounce or just reset
                if (slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 5) {
                     slider.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    slider.scrollLeft += scrollStep;
                }
            } else {
                slider.scrollLeft += scrollStep;
            }
        }
    }, scrollDelay);
}

// Ensure global access for HTML onclick attributes
window.handleSearchGeneric = handleSearchGeneric;

// Load Popular Searches
async function loadPopularSearches() {
    const stripTags = document.querySelector('.strip-tags');
    const chipRow = document.querySelector('.chip-row');

    if (!stripTags && !chipRow) return;

    try {
        const response = await fetch(`${API_BASE_URL}/popular`);
        // If API fails or endpoint not ready, we just keep the hardcoded HTML defaults
        if (!response.ok) return;

        const data = await response.json();
        
        if (data.success && data.popular && data.popular.length > 0) {
            
            const createChip = (item) => {
                const term = item.keyword || item.title;
                if(!term) return null;

                const btn = document.createElement('button');
                btn.className = 'chip tag';
                btn.setAttribute('data-search', term);
                btn.textContent = term;
                
                // Re-bind click event
                btn.addEventListener('click', () => {
                    const searchInput = document.getElementById('searchInput'); 
                    if(searchInput) {
                        searchInput.value = term;
                        if (typeof handleSearch === 'function') handleSearch();
                        if (typeof scrollToResults === 'function') scrollToResults();
                    }
                });
                return btn;
            };

            // Populate strip-tags (bottom list)
            if (stripTags) {
                stripTags.innerHTML = '';
                data.popular.forEach(item => {
                    const btn = createChip(item);
                    if(btn) stripTags.appendChild(btn);
                });
            }

            // Populate chip-row (hero list) - Limit to 5
            if (chipRow) {
                chipRow.innerHTML = '';
                data.popular.slice(0, 5).forEach(item => {
                    const btn = createChip(item);
                    if(btn) chipRow.appendChild(btn);
                });
            }
        }
    } catch (e) {
        console.warn('Could not load popular searches, using defaults', e);
    }
}

// Initialize trending & popular on load
document.addEventListener('DOMContentLoaded', () => {
    loadTrending();
    loadPopularSearches();
});

