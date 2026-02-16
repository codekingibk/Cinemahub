# CinemaHub - Full-Featured Movie Streaming Platform

## 🎬 Overview
CinemaHub is a fully functional movie and TV series streaming platform with search, download, and subtitle capabilities. The site features modern glass morphism design with purple gradients and seamless authentication via Clerk.

## ✨ Features Implemented

### 1. **Movie Search & Discovery** ✅
- Real-time search across millions of movies and TV series
- Trending content and popular searches
- Quick search chips for instant discovery
- Movie cards with posters, ratings, and metadata

### 2. **Streaming & Video Player** ✅
- In-browser video player with controls
- Multiple quality options (auto-selected best quality)
- Range request support for seeking
- Direct streaming without forced downloads

### 3. **Download Management** ✅
- Download movies in multiple resolutions (360p, 480p, 720p, 1080p, 4K)
- Best quality auto-selection
- Download size indicators
- Proxied downloads to bypass CORS restrictions

### 4. **Subtitle Support** ✅
- Multi-language subtitle downloads
- Auto-detection of available languages
- SRT format subtitles
- Easy one-click subtitle download

### 5. **Clerk Authentication** ✅
- **Google OAuth** - Sign in with Google account
- **Apple OAuth** - Sign in with Apple ID
- Email/password authentication
- User profile with avatar and name display
- Secure session management
- Sign out functionality

### 6. **Modern UI/UX** ✅
- Purple glass morphism design (#9147ff primary color)
- Bebas Neue + Space Grotesk typography
- Responsive layout for all devices
- Smooth animations and transitions
- Loading states and error handling
- Toast notifications for user feedback

## 🚀 Getting Started

### Starting the Server

**Windows:**
```bash
cd "d:\MOVIE SITE"
.\run.bat
```

**Manual Start:**
```bash
cd "d:\MOVIE SITE"
.\venv\Scripts\Activate.ps1
python app.py
```

The server will start at: **http://localhost:5000**

### API Endpoints

- `GET /` - Serve frontend
- `GET /api/search?q={query}` - Search movies/TV series
- `GET /api/details/{id}?path={path}` - Get movie details
- `GET /api/media/{id}?path={path}` - Get streaming/download URLs
- `GET /api/stream?url={url}&path={path}` - Proxy streaming
- `GET /api/trending` - Get trending content
- `GET /api/popular` - Get popular searches
- `GET /api/mirrors` - List available API mirrors

## 🔐 Authentication Setup

The site uses **Clerk** for authentication with the following providers enabled:

### Configured OAuth Providers:
1. **Google** ✅ - Sign in with Google
2. **Apple** ✅ - Sign in with Apple ID
3. **Email/Password** ✅ - Traditional signup

### Clerk Configuration:
- Publishable Key: `pk_test_ZXhjaXRpbmctcGlnbGV0LTIzLmNsZXJrLmFjY291bnRzLmRldiQ`
- Secret Key: Stored in `d:\\clerk-nextjs\\.env.local`
- SSO Callback: `/sso-callback.html`

### Authentication Flow:
1. Click "Sign up" or "Log in" button
2. Clerk modal opens with Google/Apple/Email options
3. After authentication, user info displays in header
4. Avatar, name, and sign-out button appear when logged in

## 📁 File Structure

```
d:\MOVIE SITE\
├── app.py                  # Flask backend with API endpoints
├── script.js               # Frontend JavaScript (search, streaming, download)
├── clerk-auth.js           # Clerk authentication integration
├── index.html              # Home page with search and discovery
├── login.html              # Login page (optional, Clerk modal preferred)
├── signup.html             # Signup page (optional, Clerk modal preferred)
├── about.html              # About page
├── downloads.html          # Downloads management page
├── profile.html            # User profile page
├── sso-callback.html       # OAuth callback handler
├── styles.css              # Global styles
├── run.bat                 # Windows startup script
├── run.sh                  # Unix startup script (if needed)
├── requirements.txt        # Python dependencies
├── venv/                   # Python virtual environment
└── moviebox-api/           # MovieBox API library
    ├── src/
    │   └── moviebox_api/
    │       ├── core.py
    │       ├── requests.py
    │       ├── constants.py
    │       └── ...
    └── pyproject.toml
```

## 🎯 How to Use

### Searching for Movies
1. Open http://localhost:5000
2. Enter a movie/series name in the search box
3. Click "Explore" or press Enter
4. Browse results with posters and ratings

### Streaming a Movie
1. Click on any movie card
2. Modal opens with movie details
3. Click "Stream (Best)" to play in-browser
4. Or select a specific resolution from the list

### Downloading Movies
1. Open movie modal
2. Click "Download (Best)" for immediate download
3. Or choose specific quality from Downloads section
4. File downloads to your browser's default folder

### Downloading Subtitles
1. Open movie modal
2. Scroll to Subtitles section
3. Click desired language (English, Spanish, etc.)
4. SRT file downloads automatically

### Using Authentication
1. Click "Sign up" in top-right corner
2. Choose Google or Apple sign-in
3. Complete OAuth flow
4. Your avatar and name appear in header
5. Click "Sign Out" to log out

## 🔧 Technical Stack

### Backend:
- **Flask 2.3.3** - Web framework
- **Flask-CORS** - Cross-origin resource sharing
- **httpx 0.28.1** - Async HTTP client
- **moviebox-api 0.3.4** - Movie data API wrapper
- **throttlebuster 0.1.11** - Download acceleration
- **bs4 (BeautifulSoup4)** - HTML parsing
- **pydantic 2.11.7** - Data validation

### Frontend:
- **Vanilla JavaScript** - No frameworks needed
- **Clerk SDK** - Authentication
- **Font Awesome 6** - Icons
- **Google Fonts** - Bebas Neue + Space Grotesk
- **CSS3** - Glass morphism effects

### API Source:
- **Primary Host:** h5.aoneroom.com
- **Alternative mirrors:** moviebox.pk, moviebox.ph, moviebox.id, v.moviebox.ph, netnaija.video

## 🐛 Troubleshooting

### Server won't start:
```bash
# Activate venv first
cd "d:\MOVIE SITE"
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -e ./moviebox-api

# Start server
python app.py
```

### API errors (404/timeout):
- The moviebox API hosts occasionally change
- Try different mirror by setting `MOVIEBOX_API_HOST` in `run.bat`
- Available mirrors: h5.aoneroom.com, moviebox.pk, moviebox.ph

### Clerk authentication not working:
- Ensure Clerk SDK script loads (check browser console)
- Verify publishable key in `clerk-auth.js`
- Check if Google/Apple OAuth is enabled in Clerk dashboard

### Movies not streaming:
- Check Flask server is running on port 5000
- Verify `/api/stream` endpoint is accessible
- Some movies may have limited/no sources available

## 📊 API Response Examples

### Search Results:
```json
{
  "success": true,
  "results": [
    {
      "id": "8906247916759695608",
      "title": "Avatar",
      "type": "movie",
      "year": 2009,
      "poster": "https://pbcdnw.aoneroom.com/image/...",
      "rating": 7.9,
      "detail_path": "avatar-WLDIi21IUBa"
    }
  ]
}
```

### Media Options:
```json
{
  "success": true,
  "best": {
    "resolution": 1080,
    "size": "2.1 GB",
    "url": "https://..."
  },
  "downloads": [...],
  "captions": [
    {
      "lang": "en",
      "name": "English",
      "url": "https://..."
    }
  ]
}
```

## 🎨 Design System

### Colors:
- **Background:** #07070c (dark base)
- **Primary:** #9147ff (purple)
- **Primary Gradient:** #aa5eff → #7c3ced
- **Text:** #ffffff (white)
- **Text Gray:** #cbcbdb
- **Muted:** #9191a8

### Fonts:
- **Display:** Bebas Neue (uppercase headings)
- **Body:** Space Grotesk (400-700 weights)
- **Fallback:** -apple-system, BlinkMacSystemFont, Segoe UI

### Glass Morphism:
- Background: `rgba(255,255,255,0.05)`
- Backdrop filter: `blur(16px)`
- Border: `1px solid rgba(255,255,255,0.1)`

## 🔐 Security Notes

- All media streaming is proxied through Flask backend
- Referer headers automatically added for authentication
- Private IPs and localhost blocked in proxy
- CORS properly configured
- User sessions managed by Clerk (secure)

## 📝 License

This project integrates with:
- moviebox-api (Unlicense)
- Clerk (Commercial license required for production)
- Font Awesome (Free license)
- Google Fonts (Open Font License)

## 🚀 Next Steps (Optional Enhancements)

- [ ] Add TV series episode selection
- [ ] Implement watchlist/favorites
- [ ] Add download history tracking
- [ ] Enable resume playback
- [ ] Add movie recommendations
- [ ] Implement search filters (genre, year, rating)
- [ ] Add video quality selector in player
- [ ] Enable fullscreen mode
- [ ] Add keyboard shortcuts for player
- [ ] Implement progressive web app (PWA)

## 📧 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Flask server logs in terminal
3. Check browser console for JavaScript errors
4. Verify Clerk dashboard for auth issues

---

**Built with ❤️ using moviebox-api by Simatwa**  
**Authentication powered by Clerk**  
**Design inspired by modern glass morphism trends**

🎬 **Happy Streaming!** 🍿
