from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import asyncio
import os
import logging
import httpx
import ipaddress
from urllib.parse import urlparse
import tempfile
import zipfile
import shutil
import sys
import time

# Set the moviebox host before importing the module
if "MOVIEBOX_API_HOST" not in os.environ:
    os.environ["MOVIEBOX_API_HOST"] = "h5.aoneroom.com"

# Add moviebox-api to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'moviebox-api', 'src'))

from moviebox_api import (
    MIRROR_HOSTS,
    SELECTED_HOST,
    DownloadableMovieFilesDetail,
    DownloadableTVSeriesFilesDetail,
    MovieDetails,
    PopularSearch,
    Search,
    Session,
    SubjectType,
    Trending,
    TVSeriesDetails,
)
from moviebox_api.extractor import JsonDetailsExtractor
from moviebox_api.constants import DOWNLOAD_REQUEST_HEADERS, HOST_URL
from moviebox_api.exceptions import MovieboxApiException, ZeroSearchResultsError
from pymongo import MongoClient
from bson.objectid import ObjectId

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)
app.logger.setLevel(logging.INFO)
@app.route('/', methods=['GET'])
def serve_index():
    return send_from_directory('.', 'index.html')


@app.route('/<path:asset_path>', methods=['GET'])
def serve_assets(asset_path):
    return send_from_directory('.', asset_path)



def map_subject_type(subject_type):
    if subject_type == SubjectType.MOVIES:
        return "movie"
    if subject_type == SubjectType.TV_SERIES:
        return "tv"
    if subject_type == SubjectType.MUSIC:
        return "music"
    return "unknown"


def get_year(value):
    try:
        return value.year
    except Exception:
        return ""


def to_string(value):
    if value is None:
        return ""
    return str(value)


def build_referer(detail_path: str) -> str:
    detail_path = detail_path.strip("/")
    return f"{HOST_URL.rstrip('/')}/movies/{detail_path}"


def is_safe_media_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False
        try:
            ip = ipaddress.ip_address(hostname)
            if ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local:
                return False
        except ValueError:
            if hostname in {"localhost"}:
                return False
        return True
    except Exception:
        return False


def get_cover_url(item):
    cover = getattr(item, "cover", None)
    return to_string(getattr(cover, "url", "")) if cover else ""


def format_search_item(item):
    return {
        "id": getattr(item, "subjectId", ""),
        "title": getattr(item, "title", "N/A"),
        "type": map_subject_type(getattr(item, "subjectType", None)),
        "year": get_year(getattr(item, "releaseDate", None)),
        "poster": get_cover_url(item),
        "description": to_string(getattr(item, "description", "")),
        "rating": getattr(item, "imdbRatingValue", "N/A"),
        "detail_path": to_string(getattr(item, "detailPath", "")),
    }


def format_media_file(media_file):
    if not media_file:
        return None
    return {
        "resolution": getattr(media_file, "resolution", None),
        "size": getattr(media_file, "size", None),
        "url": to_string(getattr(media_file, "url", "")),
    }

async def _with_session(handler):
    session = Session()
    try:
        return await handler(session)
    finally:
        await session._client.aclose()


def run_with_session(handler):
    """Run an async handler with a fresh Session per request."""
    return asyncio.run(_with_session(handler))


# --- MongoDB setup ---
MONGODB_URI = os.environ.get('MONGODB_URI') or 'mongodb+srv://gboyegaibk:Oyinlola@007@cinemahub.aavmlgj.mongodb.net/?appName=Cinemahub'
try:
    mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    mongo_db = mongo_client.get_database('cinemahub')
    reviews_coll = mongo_db.get_collection('reviews')
    users_coll = mongo_db.get_collection('users')
    app.logger.info('Connected to MongoDB')
except Exception as e:
    mongo_client = None
    mongo_db = None
    reviews_coll = None
    users_coll = None
    app.logger.warning(f'Failed to connect to MongoDB: {e}')

# Helper to ensure DB available
def db_available():
    return reviews_coll is not None


@app.route('/api/search', methods=['GET'])
def search_movies():
    """
    Search for movies or TV series
    Query params: q (search term), page (optional)
    """
    try:
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'error': 'Search query required'}), 400
        
        # Search for the movie/series
        async def handler(session):
            search = Search(session, query=query, subject_type=SubjectType.ALL)
            return await search.get_content_model()

        results = run_with_session(handler)
        
        if not results:
            return jsonify({
                'success': True,
                'results': [],
                'message': 'No results found'
            })
        
        # Format results
        formatted_results = []
        for item in results.items[:20]:  # Limit to 20 results
            formatted_results.append(format_search_item(item))
        
        return jsonify({
            'success': True,
            'results': formatted_results
        })
    
    except ZeroSearchResultsError:
        return jsonify({
            'success': True,
            'results': [],
            'message': 'No results found'
        })
    except httpx.ConnectTimeout:
        return jsonify({
            'error': (
                f'Connection timed out while contacting Moviebox host {SELECTED_HOST}. '
                'Try a different mirror by setting MOVIEBOX_API_HOST in run.bat.'
            )
        }), 504
    except MovieboxApiException as e:
        app.logger.exception("Moviebox API error during search")
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        app.logger.exception("Unexpected error during search")
        return jsonify({'error': f'Search failed: {str(e)}'}), 500


@app.route('/api/trending', methods=['GET'])
def get_trending():
    """Get trending movies and TV series"""
    try:
        async def handler(session):
            trending = Trending(session)
            return await trending.get_content_model()

        trending_data = run_with_session(handler)

        trending_items = []
        for item in trending_data.items[:20]:
            trending_items.append(format_search_item(item))
        
        return jsonify({
            'success': True,
            'trending': trending_items
        })
    
    except Exception as e:
        app.logger.exception("Unexpected error during trending fetch")
        return jsonify({'error': f'Failed to fetch trending: {str(e)}'}), 500


@app.route('/api/popular', methods=['GET'])
def get_popular():
    """Get popular searches"""
    try:
        async def handler(session):
            popular = PopularSearch(session)
            return await popular.get_content_model()

        searches = run_with_session(handler)
        
        popular_list = []
        if searches:
            for search in searches[:15]:
                popular_list.append({
                    'title': getattr(search, 'title', ''),
                    'keyword': getattr(search, 'title', '')
                })
        
        return jsonify({
            'success': True,
            'popular': popular_list
        })
    
    except Exception as e:
        app.logger.exception("Unexpected error during popular searches fetch")
        return jsonify({'error': f'Failed to fetch popular searches: {str(e)}'}), 500


@app.route('/api/details/<movie_id>', methods=['GET'])
def get_movie_details(movie_id):
    """Get detailed information about a specific movie/series"""
    try:
        detail_path = request.args.get('path', '').strip()
        page_url = request.args.get('url', '').strip()

        if not page_url and detail_path:
            page_url = f"/detail/{detail_path}?id={movie_id}"

        if not page_url:
            return jsonify({'error': 'Detail path is required'}), 400

        async def handler(session):
            item_details = MovieDetails(page_url, session)
            details_model = await item_details.get_content_model()
            html_content = await item_details.get_html_content()
            extractor = JsonDetailsExtractor(html_content)
            return details_model, extractor

        details_model, extractor = run_with_session(handler)
        subject = details_model.resData.subject
        seasons = []
        if subject.subjectType == SubjectType.TV_SERIES:
            seasons = extractor.seasons

        return jsonify({
            'success': True,
            'details': {
                'id': getattr(subject, 'subjectId', ''),
                'title': getattr(subject, 'title', 'N/A'),
                'type': map_subject_type(getattr(subject, 'subjectType', None)),
                'year': get_year(getattr(subject, 'releaseDate', None)),
                'poster': get_cover_url(subject),
                'description': to_string(getattr(subject, 'description', '')),
                'rating': getattr(subject, 'imdbRate', 'N/A'),
                'duration': getattr(subject, 'duration', ''),
                'genre': getattr(subject, 'genre', []),
                'seasons': seasons,
            }
        })
    
    except httpx.ConnectTimeout:
        return jsonify({
            'error': (
                f'Connection timed out while contacting Moviebox host {SELECTED_HOST}. '
                'Try a different mirror by setting MOVIEBOX_API_HOST in run.bat.'
            )
        }), 504
    except Exception as e:
        app.logger.exception("Unexpected error during details fetch")
        return jsonify({'error': f'Failed to fetch details: {str(e)}'}), 500


@app.route('/api/reviews/<movie_id>', methods=['GET', 'POST'])
def reviews_endpoint(movie_id):
    """GET: return list of reviews for movie_id. POST: add a review."""
    if not db_available():
        return jsonify({'error': 'Database not configured'}), 500

    if request.method == 'GET':
        try:
            docs = list(reviews_coll.find({'movie_id': str(movie_id)}).sort('date', -1).limit(200))
            reviews = []
            for d in docs:
                reviews.append({
                    'id': str(d.get('_id')),
                    'movie_id': d.get('movie_id'),
                    'user_id': d.get('user_id'),
                    'author': d.get('author'),
                    'rating': d.get('rating'),
                    'text': d.get('text'),
                    'date': d.get('date')
                })
            return jsonify({'success': True, 'reviews': reviews})
        except Exception as e:
            app.logger.exception('Failed to fetch reviews')
            return jsonify({'error': str(e)}), 500

    # POST - add review
    try:
        payload = request.get_json() or {}
        author = payload.get('author') or 'Anonymous'
        user_id = payload.get('user_id') or None
        rating = int(payload.get('rating') or 0)
        text = payload.get('text') or ''
        date = payload.get('date') or int(time.time() * 1000)

        doc = {
            'movie_id': str(movie_id),
            'user_id': user_id,
            'author': author,
            'rating': rating,
            'text': text,
            'date': date,
        }
        res = reviews_coll.insert_one(doc)
        # Build a JSON-serializable representation
        out = {}
        for k, v in doc.items():
            if isinstance(v, ObjectId):
                out[k] = str(v)
            else:
                out[k] = v
        out['id'] = str(res.inserted_id)
        return jsonify({'success': True, 'review': out}), 201
    except Exception as e:
        app.logger.exception('Failed to save review')
        return jsonify({'error': str(e)}), 500


@app.route('/api/media/<movie_id>', methods=['GET'])
def get_media_options(movie_id):
    """Get stream/download URLs for a movie"""
    try:
        detail_path = request.args.get('path', '').strip()
        page_url = request.args.get('url', '').strip()
        season = request.args.get('season', '').strip()
        episode = request.args.get('episode', '').strip()

        if not page_url and detail_path:
            page_url = f"/detail/{detail_path}?id={movie_id}"

        if not page_url:
            return jsonify({'error': 'Detail path is required'}), 400

        async def handler(session):
            details_model = await MovieDetails(page_url, session).get_content_model()
            return details_model

        details_model = run_with_session(handler)
        subject = details_model.resData.subject

        if subject.subjectType == SubjectType.TV_SERIES:
            try:
                season_num = int(season) if season else 1
                episode_num = int(episode) if episode else 1
            except ValueError:
                return jsonify({'error': 'Season and episode must be numbers'}), 400

            async def download_handler(session):
                return await DownloadableTVSeriesFilesDetail(session, details_model).get_content_model(
                    season=season_num, episode=episode_num
                )
        else:
            async def download_handler(session):
                return await DownloadableMovieFilesDetail(session, details_model).get_content_model()

        downloadable = run_with_session(download_handler)

        downloads = [format_media_file(item) for item in downloadable.downloads]
        captions = [
            {
                'lang': getattr(caption, 'lan', ''),
                'name': getattr(caption, 'lanName', ''),
                'size': getattr(caption, 'size', None),
                'url': to_string(getattr(caption, 'url', '')),
            }
            for caption in downloadable.captions
        ]

        best = format_media_file(downloadable.best_media_file) if downloads else None

        return jsonify({
            'success': True,
            'best': best,
            'downloads': downloads,
            'captions': captions,
            'limited': getattr(downloadable, 'limited', False),
            'has_resource': getattr(downloadable, 'hasResource', True),
        })
    except httpx.ConnectTimeout:
        return jsonify({
            'error': (
                f'Connection timed out while contacting Moviebox host {SELECTED_HOST}. '
                'Try a different mirror by setting MOVIEBOX_API_HOST in run.bat.'
            )
        }), 504
    except MovieboxApiException as e:
        app.logger.exception("Moviebox API error during media fetch")
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        app.logger.exception("Unexpected error during media fetch")
        return jsonify({'error': f'Failed to fetch media options: {str(e)}'}), 500


@app.route('/api/stream', methods=['GET'])
def stream_media():
    """Proxy media streaming/download with required headers."""
    url = request.args.get('url', '').strip()
    detail_path = request.args.get('path', '').strip()
    download_name = request.args.get('download', '').strip()

    if not url:
        return jsonify({'error': 'Media url is required'}), 400

    if not is_safe_media_url(url):
        return jsonify({'error': 'Media url is not allowed'}), 400

    headers = dict(DOWNLOAD_REQUEST_HEADERS)
    if detail_path and "Referer" not in headers:
        headers["Referer"] = build_referer(detail_path)
    range_header = request.headers.get("Range")
    if range_header:
        headers["Range"] = range_header

    try:
        client = httpx.Client(follow_redirects=True, timeout=None)
        request_obj = client.build_request("GET", url, headers=headers)
        resp = client.send(request_obj, stream=True)
        
        app.logger.info(f"[Stream] Upstream response: {resp.status_code} {resp.reason_phrase}")
        app.logger.info(f"[Stream] Headers: content-length={resp.headers.get('content-length')}, transfer-encoding={resp.headers.get('transfer-encoding')}")
        
        # Check for error status before trying to stream
        if not (200 <= resp.status_code < 300):
            error_msg = f"Upstream server returned {resp.status_code} {resp.reason_phrase}"
            app.logger.warning(f"[Stream] {error_msg}")
            resp.close()
            client.close()
            return jsonify({'error': error_msg, 'upstream_status': resp.status_code}), 502
        
        resp.raise_for_status()

        byte_count = 0
        chunk_count = 0

        def generate():
            nonlocal byte_count, chunk_count
            try:
                for chunk in resp.iter_bytes(chunk_size=1024 * 512):
                    if chunk:
                        chunk_count += 1
                        byte_count += len(chunk)
                        if chunk_count % 10 == 0:
                            app.logger.info(f"[Stream] Generated chunk {chunk_count}: +{len(chunk)} bytes, total: {byte_count} bytes")
                        yield chunk
                app.logger.info(f"[Stream] Finished generating {chunk_count} chunks, {byte_count} total bytes")
            except Exception as e:
                app.logger.exception(f"[Stream] Error during generation: {str(e)}")
                raise
            finally:
                resp.close()
                client.close()

        response = app.response_class(
            generate(),
            status=resp.status_code,
            mimetype=resp.headers.get("content-type", "application/octet-stream"),
            direct_passthrough=True,
        )

        for header_name in ["Content-Length", "Content-Range", "Accept-Ranges"]:
            if header_name in resp.headers:
                response.headers[header_name] = resp.headers[header_name]

        if download_name:
            response.headers["Content-Disposition"] = f"attachment; filename=\"{download_name}\""

        return response
    except httpx.HTTPError as e:
        app.logger.exception(f"[Stream] HTTPError: {str(e)}")
        return jsonify({'error': f'Failed to stream media: {str(e)}', 'type': 'http_error'}), 502


# --- New endpoint: Download all episodes in a season as ZIP ---
@app.route('/api/season_zip/<series_id>', methods=['GET'])
def download_season_zip(series_id):
    """Download all episodes in a season as a ZIP archive"""
    detail_path = request.args.get('path', '').strip()
    season = request.args.get('season', '').strip()
    if not detail_path or not season:
        return jsonify({'error': 'Detail path and season required'}), 400

    async def handler(session):
        details_model = await MovieDetails(f"/detail/{detail_path}?id={series_id}", session).get_content_model()
        return details_model

    details_model = run_with_session(handler)
    subject = details_model.resData.subject
    if subject.subjectType != SubjectType.TV_SERIES:
        return jsonify({'error': 'Not a TV series'}), 400

    async def episodes_handler(session):
        # Fetch all episodes for the season
        season_num = int(season)
        episode_count = 1
        # Find max episode count from extractor
        extractor = JsonDetailsExtractor(await MovieDetails(f"/detail/{detail_path}?id={series_id}", session).get_html_content())
        for s in extractor.seasons:
            if str(s['se']) == str(season):
                episode_count = int(s['maxEp'])
                break
        files = []
        for ep in range(1, episode_count + 1):
            meta = await DownloadableTVSeriesFilesDetail(session, details_model).get_content_model(season=season_num, episode=ep)
            for item in meta.downloads:
                files.append({'url': to_string(getattr(item, 'url', '')), 'filename': f"{subject.title} S{season_num}E{ep}.{getattr(item, 'resolution', 'HD')}.{getattr(item, 'ext', 'mp4')}"})
        return files

    files = run_with_session(episodes_handler)
    if not files:
        return jsonify({'error': 'No episode files found'}), 404

    # Download and package files as ZIP
    temp_dir = tempfile.mkdtemp()
    zip_path = os.path.join(temp_dir, f"{subject.title}_Season{season}.zip")
    try:
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for file in files:
                # Download each file to temp
                file_url = file['url']
                filename = file['filename']
                local_path = os.path.join(temp_dir, filename)
                try:
                    with httpx.stream('GET', file_url, headers=DOWNLOAD_REQUEST_HEADERS) as resp:
                        resp.raise_for_status()
                        with open(local_path, 'wb') as f:
                            for chunk in resp.iter_bytes():
                                f.write(chunk)
                    zipf.write(local_path, filename)
                except Exception as e:
                    app.logger.warning(f"Failed to download episode: {filename} ({file_url}): {e}")
        return send_file(zip_path, as_attachment=True, download_name=os.path.basename(zip_path))
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@app.route('/api/mirrors', methods=['GET'])
def get_mirrors():
    """Get available mirror hosts"""
    try:
        mirror_list = []
        for host in MIRROR_HOSTS:
            mirror_list.append({
                'name': host,
                'url': f"https://{host}/",
                'selected': host == SELECTED_HOST,
            })
        
        return jsonify({
            'success': True,
            'mirrors': mirror_list
        })
    
    except Exception as e:
        app.logger.exception("Unexpected error during mirrors fetch")
        return jsonify({'error': f'Failed to fetch mirrors: {str(e)}'}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'MovieBox API Server'
    })


@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    print("🎬 MovieBox API Server Starting...")
    print("📍 Access frontend at: http://localhost:5000")
    print("🔌 API endpoints: http://localhost:5000/api/")
    app.run(debug=True, host='0.0.0.0', port=5000)
