# 🎬 CinemaHub - Professional Movie Database Website

A modern, responsive movie website built with vanilla HTML, CSS, and JavaScript, powered by the Free Movie DB API.

## ✨ Features

### 🔍 Search Functionality
- **Powerful Search**: Search through millions of movies and TV shows from IMDb
- **Real-time Results**: Get instant search results as you type
- **Keyboard Shortcuts**: Press Ctrl/Cmd + K to quickly focus the search box

### 🎥 Movie Details
- **Comprehensive Information**: View detailed information including:
  - Plot summaries
  - IMDb ratings
  - Release dates
  - Cast and crew
  - Genres
  - Movie posters and banners
- **Interactive Modal**: Click any movie card to see full details in a beautiful modal

### 📺 Streaming Availability
- **Where to Watch**: Find out which streaming platforms offer your favorite movies
- **Direct Links**: Quick access to IMDb for more information

### 🎨 Modern UI/UX
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Smooth Animations**: Elegant transitions and hover effects
- **Dark Theme**: Eye-friendly dark color scheme
- **Professional Layout**: Clean, organized interface
- **Loading States**: Visual feedback during data fetching

### 🚀 Performance
- **Fast Loading**: Optimized API calls and image loading
- **Lazy Loading**: Images load as needed for better performance
- **Error Handling**: Graceful error messages and fallbacks

## 🛠️ Technologies Used

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with CSS Grid, Flexbox, and animations
- **JavaScript (ES6+)**: Vanilla JavaScript with async/await
- **Font Awesome**: Icon library
- **Google Fonts**: 'Poppins' font family

## 📡 API

This project uses the **Free Movie DB API**:
- Base URL: `https://imdb.iamidiotareyoutoo.com`
- No API key required
- Endpoints used:
  - `/search` - Search for movies and TV shows
  - `/justwatch` - Get streaming availability
  - `/photo/{id}` - Get movie posters
  - `/media/{id}` - Get trailer videos

## 🚀 Getting Started

### Installation

1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd "MOVIE SITE"
   ```

2. **Open the website**
   - Simply open `index.html` in your web browser
   - Or use a local server (recommended):
     ```bash
     # Using Python 3
     python -m http.server 8000
     
     # Using Node.js with http-server
     npx http-server
     
     # Using PHP
     php -S localhost:8000
     ```

3. **Access the site**
   - Open your browser and navigate to:
     - Direct: `file:///path/to/index.html`
     - Local server: `http://localhost:8000`

### Usage

1. **Search for Movies**
   - Enter a movie or TV show title in the search box
   - Press Enter or click the Search button
   - Browse through the results

2. **View Details**
   - Click on any movie card to open the detailed view
   - See ratings, plot, cast, and streaming options
   - Click the IMDb link to view more information

3. **Quick Search**
   - Use the trending tags below the search section
   - Click any tag to instantly search for that title

4. **Keyboard Shortcuts**
   - `Ctrl/Cmd + K`: Focus search bar
   - `ESC`: Close movie detail modal

## 📁 Project Structure

```
MOVIE SITE/
│
├── index.html          # Main HTML file
├── styles.css          # All CSS styles
├── script.js           # JavaScript functionality
└── README.md          # Project documentation
```

## 🎨 Customization

### Colors
To customize the color scheme, edit the CSS variables in `styles.css`:

```css
:root {
    --primary-color: #e50914;      /* Main accent color */
    --secondary-color: #141414;    /* Background color */
    --text-color: #ffffff;         /* Text color */
    --text-gray: #999999;          /* Secondary text */
    /* ... more variables */
}
```

### Fonts
To change the font, update the Google Fonts import in `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=YourFont:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

And update the CSS:
```css
body {
    font-family: 'YourFont', sans-serif;
}
```

## 🌟 Features Breakdown

### Hero Section
- Eye-catching gradient background
- Prominent search functionality
- Animated title and subtitle

### Search Results
- Grid layout with responsive columns
- Movie cards with poster images
- Hover effects and animations
- Rating badges on cards

### Movie Details Modal
- Full-screen overlay
- Detailed movie information
- Streaming availability
- Close on overlay click or ESC key

### Trending Section
- Quick-access popular movie tags
- One-click search functionality
- Hover animations

### About Section
- Feature highlights in card layout
- Icon-based visual communication

### Footer
- Site information
- Quick navigation links
- API attribution

## 🔧 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Opera (latest)

## 📱 Responsive Breakpoints

- **Desktop**: 1200px and above
- **Tablet**: 768px - 1199px
- **Mobile**: 480px - 767px
- **Small Mobile**: Below 480px

## 🐛 Known Issues

- Some older movies may not have poster images
- Streaming availability depends on region and API data
- Search results limited to API response

## 🚀 Future Enhancements

Potential features to add:
- [ ] Movie categories/filters (Genre, Year, Rating)
- [ ] Favorites and watchlist functionality
- [ ] User reviews and ratings
- [ ] Advanced search filters
- [ ] Movie recommendations
- [ ] Dark/Light theme toggle
- [ ] Progressive Web App (PWA) capabilities
- [ ] Search history
- [ ] Share movie details on social media

## 📄 License

This project is open source and available for personal and commercial use.

## 🙏 Acknowledgments

- **Free Movie DB API** - For providing the movie data
- **IMDb** - For the comprehensive movie database
- **Font Awesome** - For the icon library
- **Google Fonts** - For the Poppins font family

## 💡 Tips

1. **Search Tips**:
   - Use specific movie titles for best results
   - Try different variations if you don't find what you're looking for
   - Include the year for movies with common titles

2. **Performance**:
   - The site caches search results for faster subsequent views
   - Images are lazy-loaded for optimal performance
   - Modal content is loaded on-demand

3. **Mobile Experience**:
   - Swipe gestures work naturally with the modal
   - Touch-friendly button sizes
   - Optimized for portrait and landscape views

## 📞 Support

If you encounter any issues or have questions:
1. Check the browser console for error messages
2. Verify your internet connection
3. Try refreshing the page
4. Clear your browser cache

## 🌐 API Documentation

For more information about the API, visit:
[Free Movie DB API Documentation](https://imdb.iamidiotareyoutoo.com/docs/index.html)

---

**Enjoy discovering your next favorite movie! 🎬🍿**
