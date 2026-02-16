# 🎬 CinemaHub - MovieBox Powered Movie Site

A modern, fully functional movie website powered by the **moviebox-api** backend. Search, discover, and stream/download movies and TV series!

## 📋 Features

- **🔍 Search**: Find movies and TV series across the entire catalog
- **📺 Discover**: Browse trending content and popular searches
- **⭐ Details**: View comprehensive movie/series information
- **🎨 Beautiful UI**: Modern, responsive interface with dark theme
- **📱 Fully Responsive**: Works great on desktop, tablet, and mobile
- **⚡ Fast**: Optimized performance and loading times
- **🖥️ Backend Powered**: REST API backend using Flask and moviebox-api

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+** - [Download](https://www.python.org)
- **Git** (recommended)

### Installation & Running

#### Windows
```bash
run.bat
```

#### Linux/macOS
```bash
chmod +x run.sh
./run.sh
```

#### Manual Setup
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py
```

Once running, open your browser to:
- **Frontend**: http://localhost:5000
- **API**: http://localhost:5000/api

## 📁 Project Structure

```
MOVIE SITE/
├── index.html          # Main HTML page
├── styles.css          # Styling
├── script.js           # Frontend JavaScript
├── app.py              # Flask backend server
├── requirements.txt    # Python dependencies
├── run.bat             # Windows startup script
├── run.sh              # Linux/macOS startup script
├── README.md           # This file
└── moviebox-api/       # Cloned moviebox-api repository
    └── src/
        └── moviebox_api/  # Python library
```

## 🔌 API Endpoints

The backend provides these REST API endpoints:

### Search
```
GET /api/search?q=<query>
```
Search for movies or TV series

**Response:**
```json
{
    "success": true,
    "results": [
        {
            "id": "movie-id",
            "title": "Movie Title",
            "type": "movie",
            "year": "2023",
            "poster": "image-url",
            "description": "Plot summary",
            "rating": "8.5"
        }
    ]
}
```

### Trending
```
GET /api/trending
```
Get trending movies and series

### Popular Searches
```
GET /api/popular
```
Get popular search terms

### Movie Details
```
GET /api/details/<movie_id>
```
Get detailed information about a specific movie/series

### Available Mirrors
```
GET /api/mirrors
```
Get available streaming mirrors

### Health Check
```
GET /health
```
Check server status

## 🎯 Usage Guide

### Searching for Movies
1. Enter a movie or series name in the search box
2. Press Enter or click the Search button
3. Browse results and click on a movie for details

### Keyboard Shortcuts
- **Enter** - Search
- **Escape** - Close movie details modal
- **Ctrl+K** or **Cmd+K** - Focus search input

### Downloading/Streaming
The site integrates with moviebox-api. To download or stream content:

```bash
# Download a movie
moviebox download-movie "Avatar"

# Download a TV series episode
moviebox download-series "Game of Thrones" -s 1 -e 1

# Stream a movie (requires MPV)
moviebox download-movie "Avatar" --stream
```

For more CLI commands, see the [moviebox-api documentation](https://github.com/Simatwa/moviebox-api)

## 🛠️ Configuration

### Backend Port
To change the port (default: 5000), modify `app.py`:
```python
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)  # Change port here
```

Then update `script.js`:
```javascript
const API_BASE_URL = 'http://localhost:8000/api';
```

### Debug Mode
The server runs in debug mode by default (development). For production:
```python
app.run(debug=False, host='0.0.0.0', port=5000)
```

## 📦 Dependencies

- **Flask** - Web framework
- **Flask-CORS** - Cross-Origin Resource Sharing
- **moviebox-api** - Movie API wrapper
- **requests** - HTTP library

All dependencies are listed in `requirements.txt`

## 🐛 Troubleshooting

### Port Already in Use
If port 5000 is already in use:
1. Change the port in `app.py`
2. Update the API URL in `script.js`

### ModuleNotFoundError
Make sure your virtual environment is activated:
```bash
# Windows
venv\Scripts\activate

# Linux/macOS
source venv/bin/activate
```

### API Connection Error (400)
- Make sure the Flask server is running
- Check that you're using `http:` not `https:`
- Verify the port number matches

### CORS Errors
CORS is already enabled in the Flask app. If you add headers, make sure to keep `@app.after_request` decorator.

## 📝 Future Enhancements

- [ ] User accounts and watchlists
- [ ] Advanced filtering (genre, year, rating)
- [ ] Download queue management
- [ ] Subtitle management
- [ ] Multi-language support
- [ ] Dark/Light theme toggle
- [ ] Social sharing features

## 📄 License

This project uses the [moviebox-api](https://github.com/Simatwa/moviebox-api) which is an unofficial wrapper.

## 🤝 Contributing

Feel free to fork, modify, and improve this project!

## ⚠️ Disclaimer

This tool is for educational purposes. Please respect copyright laws and terms of service of the streaming platforms you use.

---

**Happy watching! 🍿🎬**
