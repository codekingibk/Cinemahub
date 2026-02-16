# Download Progress Bar & Debugging Guide

## ✅ Updates Made

### 1. **Progress Bar Now Shows Percentage**
The progress bar now displays the download percentage right inside the bar:
```
[████████░░░░░░░░░░░░░] 35%
```

**Changes:**
- Bar height increased from 8px to 24px (much more visible)
- Percentage text displayed in the center of the bar
- Better styling with gradient colors
- Indeterminate animation still works for unknown-size downloads

### 2. **Enhanced Console Logging**
Added detailed logging at every stage of the download process. Check **DevTools Console (F12)** for these logs:

```javascript
[Download] Movie Title
  url: "http://localhost:5000/api/stream?url=..."
  contentLength: 191180000
  totalBytes: 191180000
  hasContentLength: true

[Progress] abc12345...
  received: 52428800
  totalBytes: 191180000
  progress: 27
  avgSpeed: '104857600 B/s'

[Cache] Opening cache: cinemahub-offline-v1
[Cache] Successfully cached: abc12345...

[Download Complete] Movie Title
  entryId: abc12345
  totalBytes: 191180000
  cachedBytes: 191180000
  timestamp: 2026-02-11T...
```

### 3. **Better Error Messages**
Now shows specific error types instead of generic "Download failed":
- **QuotaExceededError** → "Storage quota exceeded. Clear downloads to continue."
- **NetworkError** → "Network connection lost. Please try again."
- **Timeout** → "Download took too long. Please try again."
- **Other** → Detailed error with name and message

### 4. **Storage Quota Check Before Download**
The system now checks available storage before starting a download to prevent mid-download failures:
```javascript
[Storage] Usage: 524288000 bytes, Quota: 1073741824 bytes, Available: true
```

---

## 🔍 How to Debug Why Download Failed

### Step 1: Open DevTools Console
1. Click **Download** button (Offline)
2. Press **F12** to open DevTools
3. Click **Console** tab
4. Watch the logs as download progresses

### Step 2: Check Each Log Stage

**Expected sequence for successful download:**

```
✓ [Download] - Should show contentLength > 0
✓ [Progress] - Should show increasing received bytes
✓ [Cache] - Should show "Successfully cached"
✓ [Download Complete] - Should show final size
```

**If you see [Download Error] instead:**
- Check the error message shown
- Note the error.name (QuotaExceededError, NetworkError, etc.)
- See detailed stack trace if needed

### Step 3: Check Storage

Open **DevTools > Application > Cache Storage > cinemahub-offline-v1**:
- ✓ File should appear as download progresses
- ✓ File size should match expected total
- If file doesn't appear = Cache storage issue
- If file size wrong = Streaming issue

### Step 4: Watch Network Tab

Open **DevTools > Network > Filter by `stream`**:
- ✓ `/api/stream?url=...` request should show:
  - Status: 200
  - Size: 182.4 MB (or expected file size)
  - Content-Type: `video/mp4` or similar
  - `Content-Length` header present

---

## 📊 What You're Already Seeing

You reported: **"1.1mb/182.4mb"**

This means:
```
✓ Server IS returning Content-Length (182.4 MB total)
✓ Download IS streaming (1.1 MB received so far)
✓ Progress bar SHOULD update every 500ms
```

The fact it shows the byte count means progress tracking **is working**!

**Question:** Does the progress bar show **35%** inside the bar, or does it look different?

---

## 🛠️ What to Check If Download Fails Again

### Scenario 1: Download stuck at 0%
```
[Download] log should show: contentLength: 191180000
[Progress] log should show: progress: 0, received: 0
```
→ If progress stays at 0 for >10 seconds and no more [Progress] logs, stream is frozen

### Scenario 2: Error says "Storage quota exceeded"
```
[Storage] Usage: 900000000 bytes, Quota: 1073741824 bytes, Available: false
```
→ Not enough space - clear downloads and retry

### Scenario 3: Error says "Network connection lost"
→ Internet disconnected or proxy interrupted

### Scenario 4: Error says "Download took too long"
→ Network timeout - file too large or connection too slow

---

## 📱 Testing Checklist

- [ ] Start movie download (182.4 MB example)
- [ ] Open DevTools Console
- [ ] See `[Download]` log with positive contentLength
- [ ] Wait ~5 seconds
- [ ] See multiple `[Progress]` logs showing increasing received bytes
- [ ] Check Downloads page - should show progress bar with percentage like **"27%"**
- [ ] Wait for download to complete OR fail
- [ ] See either `[Download Complete]` or `[Download Error]` log
- [ ] If failed, note the error.message shown

---

## 🐛 Debugging Commands

**In browser console, you can manually check:**

```javascript
// Check offline library
console.log(JSON.parse(localStorage.getItem('offlineLibrary_' + clerk.user.id)))

// Check storage quota
navigator.storage.estimate().then(estimate => {
  console.log('Used:', estimate.usage, 'bytes');
  console.log('Quota:', estimate.quota, 'bytes');
  console.log('Available:', estimate.quota - estimate.usage, 'bytes');
})

// List all cached files
caches.open('cinemahub-offline-v1').then(cache => {
  cache.keys().then(keys => console.log('Cached files:', keys))
})

// Check cache size of specific file
caches.open('cinemahub-offline-v1').then(cache => {
  cache.match('http://localhost:5000/api/stream?url=...').then(response => {
    console.log('Cached file size:', response.headers.get('content-length'))
  })
})
```

---

## 📋 Next Steps

1. **Try another download** with these improvements
2. **Check console logs** - especially look for errors or unusual values
3. **Report if:**
   - Progress bar doesn't show percentage
   - `[Download Error]` log appears with specific error
   - `[Storage]` shows `Available: false`
   - Network tab shows request status != 200

The detailed logging will help pinpoint exactly where and why downloads fail!
