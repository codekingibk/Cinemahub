const API_BASE_URL = 'http://localhost:5000/api';
const OFFLINE_CACHE_NAME = 'cinemahub-offline-v1';
const MAX_OFFLINE_BYTES = 1024 * 1024 * 1024; // 1 GB
let isDownloadingOffline = false; // Track if download is in progress

// Register service worker and set up communication
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered in details.js');
            
            // Listen for messages from service worker
            navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    });
}

// Handle messages from service worker
function handleServiceWorkerMessage(event) {
    const { type, payload } = event.data;
    const userId = window.clerk?.user?.id;
    
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

// Warn user if they try to leave during download
window.addEventListener('beforeunload', (e) => {
    if (isDownloadingOffline) {
        e.preventDefault();
        e.returnValue = 'Download in progress. Leaving this page will stop the download.';
        return e.returnValue;
    }
});

function getQueryParam(key) {
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || '';
}

function showNotification(message, type = 'info') {
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

function updateOfflineEntry(userId, entryId, updates) {
    const library = getOfflineLibrary(userId);
    const index = library.findIndex(item => item.id === entryId);
    if (index === -1) return;
    library[index] = { ...library[index], ...updates };
    saveOfflineLibrary(userId, library);
}

async function checkStorageAvailability() {
    try {
        if (!navigator.storage || !navigator.storage.estimate) {
            return { available: true, estimate: null };
        }
        const estimate = await navigator.storage.estimate();
        const available = estimate.quota - estimate.usage > (1024 * 1024 * 1024 * 0.2); // 20% headroom
        console.log(`[Storage] Usage: ${estimate.usage} bytes, Quota: ${estimate.quota} bytes`);
        return { available, estimate };
    } catch (error) {
        console.warn(`[Storage] Could not estimate quota:`, error.message);
        return { available: true, estimate: null };
    }
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

    // Try to use Service Worker, but fallback to direct download if not available
    console.log('[Download] Checking Service Worker availability...');
    if (navigator.serviceWorker?.controller) {
        console.log('[Download] SW controller available, using background download');
        try {
            navigator.serviceWorker.controller.postMessage({
                type: 'START_DOWNLOAD',
                payload: { entryId, title, url, userId, cacheKey }
            });
            showNotification(`Downloading ${title}... Safe to leave this page.`, 'info');
            return;
        } catch (error) {
            console.warn('[Download] Failed to send to SW, falling back to direct download:', error);
        }
    }
    
    // Fallback: Direct download (keeps page open but still works)
    console.log('[Download] Using fallback direct download mode');
    showNotification(`Downloading ${title}...`, 'info');
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

async function loadDetails() {
    trackUserActivity('view'); // Track view
    const movieId = getQueryParam('id');
    const detailPath = getQueryParam('path');
    const fallbackTitle = getQueryParam('title');

    if (!movieId || !detailPath) {
        document.getElementById('detailsContent').innerHTML = '<p>Missing details. Return to the home page and try again.</p>';
        return;
    }

    if (typeof requireAuth === 'function' && !requireAuth('view movie details', 'view details')) {
        document.getElementById('detailsContent').innerHTML = `
            <div style="text-align: center; padding: 4rem;">
                <i class="fas fa-lock" style="font-size: 3rem; color: #ff9800; margin-bottom: 1rem;"></i>
                <h2>Authentication Required</h2>
                <p style="color: #ccc; margin-bottom: 2rem;">Please sign in to view movie details.</p>
                <button class="media-btn" onclick="openSignIn()">Sign In</button>
            </div>
        `;
        return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    try {
        const detailsResponse = await fetch(`${API_BASE_URL}/details/${movieId}?path=${encodeURIComponent(detailPath)}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        let details = { title: fallbackTitle };

        if (detailsResponse.ok) {
            const data = await detailsResponse.json();
            if (data.success && data.details) {
                details = { ...details, ...data.details };
            }
        } else {
            console.warn('Details request failed:', detailsResponse.status);
            const errData = await detailsResponse.json().catch(() => ({}));
            if (errData.error) {
                throw new Error(errData.error);
            }
            throw new Error(`Server returned ${detailsResponse.status}`);
        }

        details.id = movieId;
        details.detail_path = detailPath;
        renderDetails(details, detailPath);
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('Error loading details:', error);
        
        let errorMessage = error.message;
        if (error.name === 'AbortError') {
            errorMessage = 'Request timed out. The server took too long to respond.';
        } else if (errorMessage === 'Failed to fetch') {
            errorMessage = 'Network error. Please check your connection and ensure the server is running.';
        }

        document.getElementById('detailsContent').innerHTML = `
            <div style="text-align: center; padding: 4rem;">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #e50914; margin-bottom: 1rem;"></i>
                <h2>Failed to load details</h2>
                <p style="color: #ccc; margin-bottom: 2rem;">${errorMessage}</p>
                <div style="display: flex; justify-content: center; gap: 1rem;">
                    <button class="media-btn" onclick="location.reload()">Try Again</button>
                    <a href="index.html" class="media-btn" style="background: rgba(255,255,255,0.1);">Go Home</a>
                </div>
            </div>
        `;
    }
}

function renderDetails(details, detailPath) {
    const posterUrl = details.poster || '';
    const title = details.title || 'Unknown Title';
    const year = details.year || '';
    const rating = details.rating || 'N/A';
    const plot = details.description || 'No description available.';
    const duration = details.duration || '';
    const genre = Array.isArray(details.genre) ? details.genre : [];
    const seasons = Array.isArray(details.seasons) ? details.seasons : [];
    const isSeries = details.type === 'tv' && seasons.length > 0;

    const content = `
        <div class="details-layout">
            <div class="poster">
                ${posterUrl ? `<img src="${posterUrl}" alt="${title}">` : ''}
            </div>
            <div>
                <h1>${title}</h1>
                <div class="meta">
                    ${year ? `<span><i class="fas fa-calendar"></i> ${year}</span>` : ''}
                    ${rating !== 'N/A' ? `<span><i class="fas fa-star"></i> ${rating}/10</span>` : ''}
                    ${details.type ? `<span class="badge">${details.type}</span>` : ''}
                    ${duration ? `<span><i class="fas fa-clock"></i> ${duration}</span>` : ''}
                </div>

                ${plot ? `
                    <div class="section">
                        <h3>Plot</h3>
                        <p>${plot}</p>
                    </div>
                ` : ''}

                ${genre.length ? `
                    <div class="section">
                        <h3>Genres</h3>
                        <div class="genres">
                            ${genre.map(g => `<span>${g}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="media-panel">
                    <h3>Stream & Download</h3>
                    <p id="mediaStatus" style="color: #9191a8; margin-bottom: 1rem;">Loading streaming options...</p>
                    ${isSeries ? `
                        <div style="display: grid; gap: 1rem; margin-bottom: 1.2rem;">
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; color: #9191a8; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Season</label>
                                <select id="seasonSelect">
                                    ${seasons.map(s => `<option value="${s.se}">Season ${s.se}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; color: #9191a8; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Episode</label>
                                <select id="episodeSelect"></select>
                            </div>
                        </div>
                        
                    ` : ''}
                    <div id="mediaActions"></div>
                    <div id="mediaPlayer"></div>
                </div>

                <!-- Reviews Section -->
                <div class="reviews-section">
                    <h3>User Reviews</h3>
                    <div class="review-form">
                        <div class="form-row">
                            <span class="review-author-label">${window.clerk?.user?.firstName || 'Anonymous'}</span>
                            <div class="star-rating">
                                <input type="radio" id="star5" name="rating" value="5" /><label for="star5" title="5 stars"><i class="fas fa-star"></i></label>
                                <input type="radio" id="star4" name="rating" value="4" /><label for="star4" title="4 stars"><i class="fas fa-star"></i></label>
                                <input type="radio" id="star3" name="rating" value="3" /><label for="star3" title="3 stars"><i class="fas fa-star"></i></label>
                                <input type="radio" id="star2" name="rating" value="2" /><label for="star2" title="2 stars"><i class="fas fa-star"></i></label>
                                <input type="radio" id="star1" name="rating" value="1" /><label for="star1" title="1 star"><i class="fas fa-star"></i></label>
                            </div>
                        </div>
                        <textarea id="reviewText" class="form-input" rows="3" placeholder="Write your review..."></textarea>
                        <button class="media-btn" style="margin-top: 1rem;" onclick="submitReview('${details.id}')">Post Review</button>
                    </div>
                    <div class="reviews-list" id="reviewsList">Loading reviews...</div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('detailsContent').innerHTML = content;
    if (isSeries) {
        wireSeasonEpisodeSelectors(seasons, details, detailPath);
    }
    loadMediaOptions(details, detailPath);
    loadReviews(details.id);
}

async function loadMediaOptions(details, detailPath) {
    const statusEl = document.getElementById('mediaStatus');
    const actionsEl = document.getElementById('mediaActions');
    const playerEl = document.getElementById('mediaPlayer');
    const seasonSelect = document.getElementById('seasonSelect');
    const episodeSelect = document.getElementById('episodeSelect');

    const season = seasonSelect ? seasonSelect.value : '';
    const episode = episodeSelect ? episodeSelect.value : '';

    try {
        const query = new URLSearchParams({ path: detailPath });
        if (season && episode) {
            query.set('season', season);
            query.set('episode', episode);
        }
        const response = await fetch(`${API_BASE_URL}/media/${details.id}?${query.toString()}`);
        if (!response.ok) {
            throw new Error('Failed to load streaming options');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Streaming is not available for this title.');
        }

        const best = data.best;
        const downloads = Array.isArray(data.downloads) ? data.downloads : [];
        const captions = Array.isArray(data.captions) ? data.captions : [];

        window.detailMediaData = { title: details.title || 'movie', detailPath, best, downloads, captions };

        if (!best || !best.url) {
            statusEl.textContent = 'No streamable files found.';
            return;
        }

        const proxyBestUrl = `${API_BASE_URL}/stream?url=${encodeURIComponent(best.url)}&path=${encodeURIComponent(detailPath)}`;

        actionsEl.innerHTML = `
            <div style="display: grid; gap: 1rem; margin-bottom: 1rem;">
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; color: #9191a8; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Video Quality</label>
                    <select id="qualitySelect">
                        <option value="best">Best Quality</option>
                        ${downloads.map(d => `<option value="${d.resolution || 'unknown'}">${d.resolution || 'Unknown'}p</option>`).join('')}
                    </select>
                </div>
                ${captions.length ? `
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; color: #9191a8; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Subtitles</label>
                    <select id="subtitleSelect">
                        <option value="none">No Subtitles</option>
                        ${captions.map((c, i) => `<option value="${i}">${c.name || c.lang || 'Subtitle ' + (i + 1)}</option>`).join('')}
                    </select>
                </div>
                ` : ''}
            </div>
            <div class="media-actions">
                <button class="media-btn" onclick="handleStream()"><i class="fas fa-play"></i>Stream</button>
                <button class="media-btn secondary" onclick="handleDownload()"><i class="fas fa-cloud-download"></i>Offline</button>
                <button class="media-btn secondary" onclick="handleSaveToDevice()"><i class="fas fa-download"></i>Save file</button>
            </div>
        `;

        playerEl.innerHTML = `<video class="media-video" id="detailVideo" controls preload="metadata" src="${proxyBestUrl}"></video>`;
        statusEl.textContent = 'Ready to stream or download';
    } catch (error) {
        statusEl.textContent = error.message || 'Failed to load streaming options.';
    }
}

function wireSeasonEpisodeSelectors(seasons, details, detailPath) {
    const seasonSelect = document.getElementById('seasonSelect');
    const episodeSelect = document.getElementById('episodeSelect');
    if (!seasonSelect || !episodeSelect) return;

    const buildEpisodes = () => {
        const seasonValue = parseInt(seasonSelect.value, 10);
        const seasonInfo = seasons.find(s => parseInt(s.se, 10) === seasonValue);
        const maxEp = seasonInfo ? parseInt(seasonInfo.maxEp, 10) : 1;
        episodeSelect.innerHTML = '';
        for (let i = 1; i <= maxEp; i += 1) {
            const option = document.createElement('option');
            option.value = `${i}`;
            option.textContent = `Episode ${i}`;
            episodeSelect.appendChild(option);
        }
    };

    buildEpisodes();

    seasonSelect.addEventListener('change', () => {
        buildEpisodes();
        loadMediaOptions(details, detailPath);
    });

    episodeSelect.addEventListener('change', () => {
        loadMediaOptions(details, detailPath);
    });
}

function handleStream() {
    const data = window.detailMediaData;
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
        const video = document.getElementById('detailVideo');
        if (video) {
            video.src = streamUrl;
            video.load();
            video.play();
            showNotification('Streaming started', 'info');
        }
    }
}

function handleDownload() {
    const data = window.detailMediaData;
    if (!data) return;

    const qualitySelect = document.getElementById('qualitySelect');
    const subtitleSelect = document.getElementById('subtitleSelect');

    const quality = qualitySelect ? qualitySelect.value : 'best';
    const subtitleIndex = subtitleSelect ? subtitleSelect.value : 'none';

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
            title: data.title,
            url: downloadUrl,
            type: 'movie',
            quality: qualityLabel
        });
    }

    if (subtitleIndex !== 'none' && data.captions.length > 0) {
        const subtitle = data.captions[parseInt(subtitleIndex)];
        if (subtitle) {
            const subtitleUrl = `${API_BASE_URL}/stream?url=${encodeURIComponent(subtitle.url)}&path=${encodeURIComponent(data.detailPath)}`;
            setTimeout(() => {
                startOfflineDownload({
                    title: data.title,
                    url: subtitleUrl,
                    type: 'subtitle',
                    language: subtitle.name || subtitle.lang || 'Subtitle'
                });
            }, 400);
        }
    }
}

function handleSaveToDevice() {
    const data = window.detailMediaData;
    if (!data) return;

    const qualitySelect = document.getElementById('qualitySelect');
    const quality = qualitySelect ? qualitySelect.value : 'best';

    let downloadUrl;
    let nameSuffix = quality === 'best' ? '' : `-${quality}p`;
    if (quality === 'best') {
        downloadUrl = `${API_BASE_URL}/stream?url=${encodeURIComponent(data.best.url)}&path=${encodeURIComponent(data.detailPath)}&download=${encodeURIComponent(`${data.title}${nameSuffix}.mp4`)}`;
    } else {
        const download = data.downloads.find(d => d.resolution == quality);
        if (download) {
            downloadUrl = `${API_BASE_URL}/stream?url=${encodeURIComponent(download.url)}&path=${encodeURIComponent(data.detailPath)}&download=${encodeURIComponent(`${data.title}${nameSuffix}.mp4`)}`;
        }
    }

    if (downloadUrl) {
        window.open(downloadUrl, '_blank');
    }
}

async function initializePage() {
    if (typeof initializeClerk === 'function') {
        initializeClerk();
    }

    let attempts = 0;
    while (typeof isClerkReady !== 'undefined' && !isClerkReady && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    loadDetails();
}

document.addEventListener('DOMContentLoaded', () => {
    initializePage();
});

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

function trackUserActivity(type) {
    const userId = window.clerk?.user?.id;
    if (!userId) return;

    const statsKey = 'userStats_' + userId;
    // ...existing code...
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

// --- Review System Logic ---
async function loadReviews(movieId) {
    const listEl = document.getElementById('reviewsList');
    if(!listEl) return;
    // Try server first
    try {
        const resp = await fetch(`${API_BASE_URL}/reviews/${encodeURIComponent(movieId)}`);
        if (resp.ok) {
            const data = await resp.json();
            const reviews = data.reviews || [];
            if (reviews.length === 0) {
                listEl.innerHTML = '<p style="color: #666; font-style: italic;">No reviews yet. Be the first to share your thoughts!</p>';
                return;
            }
            listEl.innerHTML = reviews.map(r => `
                <div class="review-card">
                    <div class="review-header">
                        <span class="review-author">${r.author}</span>
                        <span class="review-stars">${getStars(r.rating)}</span>
                    </div>
                    <p class="review-text">${r.text}</p>
                    <div class="review-date">${new Date(r.date).toLocaleDateString()}</div>
                </div>
            `).join('');
            return;
        }
    } catch (e) {
        console.warn('Failed to fetch reviews from server, falling back to localStorage', e);
    }

    // Fallback to localStorage if server unavailable
    const key = 'reviews_' + movieId;
    let reviews = [];
    try {
        reviews = JSON.parse(localStorage.getItem(key)) || [];
    } catch(e) {}

    if(reviews.length === 0) {
        listEl.innerHTML = '<p style="color: #666; font-style: italic;">No reviews yet. Be the first to share your thoughts!</p>';
        return;
    }

    listEl.innerHTML = reviews.map(r => `
        <div class="review-card">
            <div class="review-header">
                <span class="review-author">${r.author}</span>
                <span class="review-stars">${getStars(r.rating)}</span>
            </div>
            <p class="review-text">${r.text}</p>
            <div class="review-date">${new Date(r.date).toLocaleDateString()}</div>
        </div>
    `).join('');
}

function getStars(count) {
    return '<i class="fas fa-star"></i>'.repeat(count) + '<i class="far fa-star"></i>'.repeat(5 - count);
}

function submitReview(movieId) {
    const textInput = document.getElementById('reviewText');
    const ratingInputs = document.querySelectorAll('input[name="rating"]');
    
    let rating = 0;
    ratingInputs.forEach(r => { if(r.checked) rating = parseInt(r.value); });

    // Always use logged-in user's name
    const author = window.clerk?.user?.firstName ? window.clerk.user.firstName : 'Anonymous';
    const text = textInput.value.trim();

    if(!text) {
        showNotification('Please write a review text', 'warning');
        return;
    }
    if(rating === 0) {
        showNotification('Please select a star rating', 'warning');
        return;
    }

    const review = {
        id: Date.now(),
        author,
        text,
        rating,
        date: Date.now()
    };

    // Try to POST to server; if it fails, save to localStorage as fallback
    (async () => {
        try {
            const payload = {
                author: review.author,
                user_id: window.clerk?.user?.id || null,
                rating: review.rating,
                text: review.text,
                date: review.date
            };
            const resp = await fetch(`${API_BASE_URL}/reviews/${encodeURIComponent(movieId)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (resp.ok) {
                showNotification('Review posted!', 'success');
                textInput.value = '';
                await loadReviews(movieId);
                return;
            }
            throw new Error('Server returned ' + resp.status);
        } catch (e) {
            console.warn('Failed to post review to server, saving locally', e);
            const key = 'reviews_' + movieId;
            let reviews = [];
            try {
                reviews = JSON.parse(localStorage.getItem(key)) || [];
            } catch (err) {}
            reviews.unshift(review);
            localStorage.setItem(key, JSON.stringify(reviews));
            showNotification('Review saved locally (offline)', 'info');
            textInput.value = '';
            loadReviews(movieId);
        }
    })();
}
// Make globally available
window.submitReview = submitReview;
