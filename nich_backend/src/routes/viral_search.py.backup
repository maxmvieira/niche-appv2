# src/routes/viral_search.py
from flask import Blueprint, request, jsonify, current_app
import os
import json
from datetime import datetime, timedelta, timezone
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import isodate # For parsing ISO 8601 duration strings, e.g. PT1M30S

# Load environment variables, especially YOUTUBE_API_KEY
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env")) # Adjust path to .env if necessary

viral_search_bp = Blueprint("viral_search", __name__)

# YouTube API Configuration
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
API_SERVICE_NAME = "youtube"
API_VERSION = "v3"

# TikTok API Keys (placeholders, will be used when TikTok logic is implemented)
TIKTOK_CLIENT_KEY = os.getenv("TIKTOK_CLIENT_KEY", "awq4bo3we76x8f7q")
TIKTOK_CLIENT_SECRET = os.getenv("TIKTOK_CLIENT_SECRET", "2fnFCitMqXSjlcq9BQWLvb7kFvDlTMZj")

# --- YouTube Helper Functions (adapted from youtube.py or new) ---

def get_youtube_client():
    if not YOUTUBE_API_KEY:
        current_app.logger.error("CRITICAL: YOUTUBE_API_KEY not configured.")
        return None
    try:
        return build(API_SERVICE_NAME, API_VERSION, developerKey=YOUTUBE_API_KEY)
    except Exception as e:
        current_app.logger.error(f"Error building YouTube client: {str(e)}")
        return None

def parse_youtube_datetime(date_string):
    if not date_string: return None
    try:
        return datetime.fromisoformat(date_string.replace("Z", "+00:00"))
    except ValueError:
        current_app.logger.warning(f"Failed to parse YouTube datetime: {date_string}")
        return None

def handle_youtube_api_error(e):
    error_message = "Error processing YouTube API request"
    status_code = 500
    details = str(e)
    if isinstance(e, HttpError):
        try:
            error_content = json.loads(e.content.decode("utf-8"))
            details_dict = error_content.get("error", {})
            error_message = details_dict.get("message", error_message)
            if e.resp.status == 403 and any("quotaExceeded" in reason.get("reason", "") for reason in details_dict.get("errors", [])):
                error_message = "YouTube API quota exceeded. Try again later."
                status_code = 429
            elif e.resp.status == 400:
                 error_message = "Invalid request to YouTube API. Check parameters."
                 status_code = 400
            else:
                status_code = e.resp.status
            details = details_dict
        except (json.JSONDecodeError, AttributeError):
            details = e.content.decode("utf-8") if hasattr(e.content, "decode") else str(e.content)
            status_code = e.resp.status if hasattr(e, "resp") else 500
    current_app.logger.error(f"YouTube API Error: {status_code} - {error_message} - Details: {details}")
    return jsonify({"error": error_message, "details": details}), status_code

# --- Main Search Endpoint ---
@viral_search_bp.route("/viral-videos", methods=["GET"])
def search_viral_videos():
    current_app.logger.info("Received request for /viral-videos")
    try:
        niches_str = request.args.get("niches", default="", type=str)
        video_published_days_ago_max = request.args.get("video_published_days", default=30, type=int)
        max_subs = request.args.get("max_subs", default=10000, type=int)
        min_views = request.args.get("min_views", default=10000, type=int) # Adjusted default for viral
        max_channel_videos_total = request.args.get("max_channel_videos_total", default=50, type=int)
        platform_filter = request.args.get("platform", default="all", type=str)

        selected_niches = [n.strip() for n in niches_str.split(",") if n.strip()] if niches_str else []
        if not selected_niches:
            return jsonify({"error": "No niches provided"}), 400

        current_app.logger.info(f"Search Params: niches={selected_niches}, published_days_max={video_published_days_ago_max}, max_subs={max_subs}, min_views={min_views}, max_channel_videos={max_channel_videos_total}, platform={platform_filter}")

        youtube_results = []
        tiktok_results = [] # Placeholder for TikTok

        youtube = get_youtube_client()
        if not youtube:
            return jsonify({"error": "Failed to initialize YouTube client. Check API key."}), 500

        if platform_filter == "all" or platform_filter == "youtube":
            current_app.logger.info("Starting YouTube Shorts search logic...")
            video_cutoff_date = datetime.now(timezone.utc) - timedelta(days=video_published_days_ago_max)
            
            all_video_ids_yt = []
            video_to_niche_map_yt = {}

            for niche in selected_niches:
                try:
                    query = f"{niche} #shorts"
                    current_app.logger.info(f"Searching YouTube for query: {query}")
                    # Corrected block for searching videos for a niche
                    search_request = youtube.search().list(
                        q=query,
                        part="id",
                        type="video",
                        videoDuration="short", # Specifically for shorts
                        maxResults=50 # Max per page
                    )
                    search_response = search_request.execute()
                    
                    for item in search_response.get("items", []):
                        video_id = item.get("id", {}).get("videoId")
                        if video_id:
                            all_video_ids_yt.append(video_id)
                            video_to_niche_map_yt[video_id] = niche
                    current_app.logger.info(f"Found {len(search_response.get('items', []))} videos for niche '{niche}'.")

                except HttpError as e:
                    # Log HttpError and continue to the next niche, or decide to return early
                    current_app.logger.error(f"HttpError during YouTube search for niche '{niche}': {str(e)}")
                    # Optionally, you could return handle_youtube_api_error(e) here if one niche failing should stop all
                    continue # Continue to the next niche
                except Exception as e:
                    current_app.logger.error(f"Generic error during YouTube search for niche '{niche}': {str(e)}", exc_info=True)
                    continue # Continue to the next niche
            
            unique_video_ids_yt = list(set(all_video_ids_yt))
            current_app.logger.info(f"Found {len(unique_video_ids_yt)} unique YouTube video IDs across all niches.")

            if unique_video_ids_yt:
                video_details_list_yt = []
                for i in range(0, len(unique_video_ids_yt), 50):
                    batch_ids = unique_video_ids_yt[i:i+50]
                    try:
                        video_response = youtube.videos().list(
                            part="snippet,statistics,contentDetails",
                            id=",".join(batch_ids)
                        ).execute()
                        video_details_list_yt.extend(video_response.get("items", []))
                    except HttpError as e:
                        current_app.logger.error(f"HttpError fetching YouTube video details batch: {str(e)}")
                        # Decide if to return or continue
                        continue
                    except Exception as e:
                        current_app.logger.error(f"Error fetching YouTube video details batch: {str(e)}", exc_info=True)
                        continue
                
                current_app.logger.info(f"Fetched details for {len(video_details_list_yt)} YouTube videos.")

                channel_ids_yt = list(set([vd["snippet"]["channelId"] for vd in video_details_list_yt if vd.get("snippet")]))
                channel_details_map_yt = {}
                if channel_ids_yt:
                    for i in range(0, len(channel_ids_yt), 50):
                        batch_ids = channel_ids_yt[i:i+50]
                        try:
                            channel_response = youtube.channels().list(
                                part="snippet,statistics",
                                id=",".join(batch_ids)
                            ).execute()
                            for item in channel_response.get("items", []):
                                channel_details_map_yt[item["id"]] = item
                        except HttpError as e:
                            current_app.logger.error(f"HttpError fetching YouTube channel details batch: {str(e)}")
                            continue
                        except Exception as e:
                            current_app.logger.error(f"Error fetching YouTube channel details batch: {str(e)}", exc_info=True)
                            continue
                    current_app.logger.info(f"Fetched details for {len(channel_details_map_yt)} YouTube channels.")

                for video_data in video_details_list_yt:
                    try:
                        video_id = video_data["id"]
                        snippet = video_data.get("snippet", {})
                        stats = video_data.get("statistics", {})
                        content_details = video_data.get("contentDetails", {})
                        
                        duration_iso = content_details.get("duration")
                        if duration_iso:
                            duration_seconds = isodate.parse_duration(duration_iso).total_seconds()
                            if duration_seconds > 70: 
                                continue
                        
                        published_at_dt = parse_youtube_datetime(snippet.get("publishedAt"))
                        if not published_at_dt or published_at_dt < video_cutoff_date:
                            continue

                        view_count = int(stats.get("viewCount", 0))
                        if view_count < min_views:
                            continue

                        channel_id = snippet.get("channelId")
                        channel_data = channel_details_map_yt.get(channel_id)
                        if not channel_data:
                            continue
                        
                        channel_stats = channel_data.get("statistics", {})
                        subscriber_count = int(channel_stats.get("subscriberCount", 0))
                        if subscriber_count > max_subs:
                            continue
                        
                        channel_video_count = int(channel_stats.get("videoCount", 0))
                        if channel_video_count > max_channel_videos_total:
                            continue
                        
                        video_niche = video_to_niche_map_yt.get(video_id, "Unknown")
                        formatted_video = {
                            "id": video_id,
                            "platform": "YouTube Shorts",
                            "niche": video_niche,
                            "videoTitle": snippet.get("title"),
                            "videoLink": f"https://www.youtube.com/shorts/{video_id}",
                            "thumbnailUrl": snippet.get("thumbnails", {}).get("high", snippet.get("thumbnails", {}).get("medium", snippet.get("thumbnails", {}).get("default", {}))).get("url"),
                            "publishedAt": snippet.get("publishedAt"),
                            "viewCount": view_count,
                            "likeCount": int(stats.get("likeCount", 0)),
                            "commentCount": int(stats.get("commentCount", 0)),
                            "channelName": channel_data.get("snippet", {}).get("title"),
                            "channelLink": f"https://www.youtube.com/channel/{channel_id}",
                            "subscriberCount": subscriber_count,
                        }
                        youtube_results.append(formatted_video)
                    except Exception as e:
                        current_app.logger.error(f"Error processing YouTube video {video_data.get('id')}: {str(e)}", exc_info=True)

        if platform_filter == "all" or platform_filter == "tiktok":
            current_app.logger.info("TikTok search logic placeholder.")
            if not tiktok_results: 
                for i, niche_val in enumerate(selected_niches):
                    if len(tiktok_results) < 5: 
                        tiktok_results.append({
                            "id": f"tiktok_mock_{i+1}",
                            "platform": "TikTok",
                            "niche": niche_val,
                            "videoTitle": f"Mock TikTok Video sobre {niche_val}",
                            "videoLink": "#tiktok_video_link",
                            "thumbnailUrl": "https://via.placeholder.com/300x300.png?text=TikTok+Mock",
                            "publishedAt": (datetime.now(timezone.utc) - timedelta(days=i*2)).isoformat(),
                            "viewCount": min_views + (i * 10000),
                            "likeCount": (min_views + (i * 10000)) // 15,
                            "commentCount": (min_views + (i * 10000)) // 150,
                            "channelName": f"TikTokCreator{i+1}",
                            "channelLink": "#tiktok_channel_link",
                            "subscriberCount": max_subs // (i+1) if i < 2 else max_subs // 2
                        })

        combined_results = youtube_results + tiktok_results
        combined_results.sort(key=lambda x: x.get("viewCount", 0), reverse=True)
        paginated_results = combined_results[:40]

        current_app.logger.info(f"Returning {len(paginated_results)} combined results. YouTube: {len(youtube_results)}, TikTok: {len(tiktok_results)}")
        return jsonify(paginated_results), 200

    except HttpError as e:
        return handle_youtube_api_error(e)
    except Exception as e:
        current_app.logger.error(f"Critical error in /viral-videos endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "An internal server error occurred.", "details": str(e)}), 500

