# 🚀 Quick Start Guide - CinemaHub

## Get Started in 3 Steps

### Step 1: Run the Setup Script

**Windows:**
```bash
run.bat
```

**Linux/macOS:**
```bash
./run.sh
```

The script will:
- ✅ Check Python installation
- ✅ Create virtual environment
- ✅ Install all dependencies
- ✅ Start the server

### Step 2: Open Your Browser

Navigate to: **http://localhost:5000**

### Step 3: Start Using CinemaHub

- 🔍 Search for your favorite movies/series
- ⭐ View detailed information
- 📥 Use the moviebox-api CLI for downloads

## 🎯 First Time Usage

1. **Search for a movie**: Type "Avatar" in the search box and press Enter
2. **Click on a result**: View detailed information about the movie
3. **Download or Stream**: Use the moviebox-api CLI commands shown in the details

## 💡 Pro Tips

### Keyboard Shortcuts
- `Enter` - Execute search
- `Ctrl+K` / `Cmd+K` - Focus search box
- `Escape` - Close details modal

### Download a Movie
```bash
moviebox download-movie "Avatar"
```

### Stream Directly (requires MPV)
```bash
moviebox download-movie "Avatar" --stream
```

### Download TV Series Episode
```bash
moviebox download-series "Game of Thrones" -s 1 -e 1
```

## 📞 Need Help?

- Check `SETUP_GUIDE.md` for detailed information
- Review API endpoints in `SETUP_GUIDE.md`
- Check Flask terminal for error messages

## ⚙️ System Requirements

- **Python 3.8+**
- **4GB+ RAM** (recommended)
- **Internet connection**
- **250MB+ disk space** (for dependencies)

---

**Start searching and enjoying movies now! 🎬**
