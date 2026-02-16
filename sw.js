// Service Worker for background downloads
const OFFLINE_CACHE_NAME = 'cinemahub-offline-v1';
const DOWNLOADS_DB = 'cinemahubDownloads';
const DOWNLOADS_STORE = 'activeDownloads';

// Initialize IndexedDB for tracking downloads
function initDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DOWNLOADS_DB, 1);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(DOWNLOADS_STORE)) {
                db.createObjectStore(DOWNLOADS_STORE, { keyPath: 'entryId' });
            }
        };
    });
}

// Listen for messages from main thread
self.addEventListener('message', (event) => {
    const { type, payload } = event.data;
    console.log('[SW-Worker] Received message:', type);
    console.log('[SW-Worker] Payload:', JSON.stringify(payload));
    
    if (type === 'START_DOWNLOAD') {
        console.log('[SW-Worker] Starting download handler...');
        handleBackgroundDownload(payload);
    } else if (type === 'TEST') {
        console.log('[SW-Worker] Received test message, responding...');
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    type: 'TEST_RESPONSE',
                    payload: { timestamp: Date.now() }
                });
            });
        });
    }
});

// Main download handler - runs in background
async function handleBackgroundDownload({ entryId, title, url, userId }) {
    console.log('[SW-Download] Download handler started for:', title);
    let downloadState = null;
    try {
        const db = await initDB();
        
        // Store download state
        downloadState = {
            entryId,
            title,
            url,
            userId,
            status: 'downloading',
            receivedBytes: 0,
            totalBytes: 0,
            cacheKey: `${url}${url.includes('?') ? '&' : '?'}offline=1&entry=${entryId}`,
            startTime: Date.now()
        };

        // Update IndexedDB
        const tx = db.transaction(DOWNLOADS_STORE, 'readwrite');
        tx.objectStore(DOWNLOADS_STORE).put(downloadState);
        
        // Start the fetch and stream
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentLength = response.headers.get('content-length');
        const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
        
        downloadState.totalBytes = totalBytes;
        
        // Read the stream
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Response body not readable');
        }

        const chunks = [];
        let receivedBytes = 0;

        while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
                break;
            }
            
            if (value) {
                chunks.push(value);
                receivedBytes += value.length;
                
                // Update progress in IndexedDB
                downloadState.receivedBytes = receivedBytes;
                const tx = db.transaction(DOWNLOADS_STORE, 'readwrite');
                tx.objectStore(DOWNLOADS_STORE).put(downloadState);
                
                // Notify all clients of progress
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({
                            type: 'DOWNLOAD_PROGRESS',
                            payload: {
                                entryId,
                                receivedBytes,
                                totalBytes,
                                progress: totalBytes ? Math.round((receivedBytes / totalBytes) * 100) : 0,
                                userId, // Send userId to client
                                cacheKey: downloadState && downloadState.cacheKey
                            }
                        });
                    });
                });
            }
        }

        // Create blob and cache
        const blob = new Blob(chunks, { type: response.headers.get('content-type') || 'application/octet-stream' });
        
        if (blob.size === 0) {
            throw new Error('Downloaded blob is empty');
        }

        // Build a safe response for caching. Don't copy all upstream headers
        // (some headers may be restricted or may not match the blob size).
        const safeHeaders = new Headers();
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        safeHeaders.set('Content-Type', contentType);

        const cacheResponse = new Response(blob, {
            status: response.status,
            statusText: response.statusText,
            headers: safeHeaders
        });

        // Only cache same-origin responses to avoid opaque/cors issues with CDN hosts.
        let cached = false;
        try {
            const parsed = new URL(url);
            const sameOrigin = parsed.origin === self.location.origin;
            if (sameOrigin) {
                const cache = await caches.open(OFFLINE_CACHE_NAME);
                await cache.put(downloadState.cacheKey, cacheResponse);
                cached = true;
            } else {
                // Skip caching cross-origin resources; mark cacheKey as null to indicate not cached
                downloadState.cacheKey = null;
            }
        } catch (cacheErr) {
            console.warn('[SW] Failed to write cache for', url, cacheErr);
            // If caching fails, clear cacheKey so UI doesn't try to use it
            downloadState.cacheKey = null;
        }

        // Mark as complete
        downloadState.status = 'ready';
        downloadState.completedAt = Date.now();
        const tx2 = db.transaction(DOWNLOADS_STORE, 'readwrite');
        tx2.objectStore(DOWNLOADS_STORE).put(downloadState);

        // Notify all clients of completion (include cacheKey)
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    type: 'DOWNLOAD_COMPLETE',
                    payload: { entryId, title, userId, cacheKey: downloadState.cacheKey }
                });
            });
        });

    } catch (error) {
        const errorMsg = error?.message || String(error) || 'Unknown error';
        console.error(`[SW] Download failed for ${entryId}:`, errorMsg);

        // Store failure state
        const db = await initDB();
        const tx = db.transaction(DOWNLOADS_STORE, 'readwrite');
        tx.objectStore(DOWNLOADS_STORE).put({
            entryId,
            status: 'failed',
            error: errorMsg,
            failedAt: Date.now(),
            cacheKey: downloadState && downloadState.cacheKey
        });

        // Notify clients (include cacheKey if available)
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    type: 'DOWNLOAD_FAILED',
                    payload: { entryId, error: errorMsg, userId, cacheKey: downloadState && downloadState.cacheKey }
                });
            });
        });
    }
}

// Handle install event
self.addEventListener('install', () => {
    self.skipWaiting();
});

// Handle activate event
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        self.clients.claim().then(() => {
            console.log('[SW] Service Worker claimed all clients');
        })
    );
});

// Intercept requests for cached offline entries
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    // Our cache keys include the offline=1 and entry query params
    if (url.searchParams.has('offline') && url.searchParams.has('entry')) {
        event.respondWith((async () => {
            const cache = await caches.open(OFFLINE_CACHE_NAME);
            const match = await cache.match(event.request.url);
            if (match) {
                return match.clone();
            }
            // If not cached yet, try network fallback
            try {
                return await fetch(event.request);
            } catch (e) {
                return new Response('Offline resource not available', { status: 404 });
            }
        })());
    }
});
