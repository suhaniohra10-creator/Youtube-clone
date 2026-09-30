import asyncio
import json
import re
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.db.session import get_db
from app.routers.video import serialize_video
from app.schemas.video import parse_duration_seconds

router = APIRouter(prefix="/youtube", tags=["youtube"])
_search_pool = ThreadPoolExecutor(max_workers=2)
YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3"
YOUTUBE_SUGGEST_URL = "https://suggestqueries.google.com/complete/search"
CATEGORY_NAMES = {
    "1": "Movies", "2": "Movies", "10": "Music", "17": "Sports", "20": "Gaming",
    "22": "Knowledge", "23": "Comedy", "24": "Comedy", "27": "Tech", "28": "Tech",
    "29": "Spirituality",
}
EXPLORE_QUERIES = {
    "Music": "official music video trending hits",
    "Movies": "official movie trailer cinema",
    "Spirituality": "bhajan meditation spiritual discourse",
    "Tech": "machine learning python fullstack tutorial",
    "Comedy": "standup comedy special",
}
RELATED_QUERIES = {
    "Music": "official music video songs",
    "Tech": "programming tutorial machine learning python",
    "Movies": "official movie trailer cinema clip",
    "Comedy": "standup comedy special",
    "Spirituality": "bhajan meditation spiritual discourse",
}
ISO_DURATION = re.compile(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?")


def parse_iso_duration(value: str) -> int:
    match = ISO_DURATION.fullmatch(value or "")
    if not match:
        return 0
    hours, minutes, seconds = (int(part or 0) for part in match.groups())
    return hours * 3600 + minutes * 60 + seconds


def format_clock(total_seconds: int) -> str:
    hours, remainder = divmod(max(0, int(total_seconds or 0)), 3600)
    minutes, seconds = divmod(remainder, 60)
    if hours:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    return f"{minutes}:{seconds:02d}"


def relative_age(published_at: Optional[str]) -> str:
    if not published_at:
        return ""
    try:
        moment = datetime.fromisoformat(str(published_at).replace("Z", "+00:00"))
    except ValueError:
        return str(published_at)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    seconds = max(0, int((datetime.now(timezone.utc) - moment.astimezone(timezone.utc)).total_seconds()))
    if seconds < 60:
        return "just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    days = hours // 24
    if days < 7:
        return f"{days} day{'s' if days != 1 else ''} ago"
    if days < 30:
        weeks = days // 7
        return f"{weeks} week{'s' if weeks != 1 else ''} ago"
    if days < 365:
        months = days // 30
        return f"{months} month{'s' if months != 1 else ''} ago"
    years = days // 365
    return f"{years} year{'s' if years != 1 else ''} ago"


def parse_view_label(label: str) -> int:
    cleaned = (label or "").lower().replace("views", "").replace("view", "").replace(",", "").strip()
    if not cleaned:
        return 0
    factors = {"k": 1_000, "m": 1_000_000, "b": 1_000_000_000}
    try:
        if cleaned[-1] in factors:
            return int(float(cleaned[:-1]) * factors[cleaned[-1]])
        return int(float(cleaned))
    except ValueError:
        return 0


def innertube_text(node: Any) -> str:
    if not node:
        return ""
    if isinstance(node, str):
        return node
    if not isinstance(node, dict):
        return ""
    if node.get("simpleText"):
        return str(node["simpleText"])
    return "".join(str(part.get("text", "")) for part in (node.get("runs") or []) if isinstance(part, dict))


def youtube_request(resource: str, params: Dict[str, Any]) -> Dict[str, Any]:
    settings = get_settings()
    if not settings.youtube_api_key:
        raise HTTPException(status_code=503, detail="YouTube API is not configured")
    try:
        response = requests.get(
            f"{YOUTUBE_API_URL}/{resource}",
            params={**params, "key": settings.youtube_api_key},
            timeout=15,
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as error:
        raise HTTPException(status_code=502, detail="YouTube API request failed") from error


def map_video(item: Dict[str, Any], details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    # The search response has presentation metadata; video details adds the
    # category id and statistics. Merge them so the client can filter live
    # results by the same category chips as its fallback catalogue.
    snippet = {**(item.get("snippet", {})), **((details or {}).get("snippet", {}))}
    statistics = (details or item).get("statistics", {})
    content_details = (details or item).get("contentDetails", {})
    resource_id = item.get("id", {})
    video_id = resource_id.get("videoId") if isinstance(resource_id, dict) else resource_id
    thumbs = snippet.get("thumbnails") or {}
    thumbnail = (thumbs.get("high") or thumbs.get("medium") or thumbs.get("default") or {}).get("url", "")
    duration_seconds = parse_iso_duration(content_details.get("duration", ""))
    channel_title = snippet.get("channelTitle", "YouTube creator")
    published = snippet.get("publishedAt") or ""
    return {
        "id": video_id,
        "videoId": video_id,
        "title": snippet.get("title", "Untitled video"),
        "description": snippet.get("description", ""),
        "channelTitle": channel_title,
        "channel_name": channel_title,
        "channel_avatar": thumbs.get("default", {}).get("url", ""),
        "thumbnail": thumbnail,
        "thumbnail_url": thumbnail,
        "thumbnailUrl": thumbnail,
        "video_url": f"https://www.youtube.com/watch?v={video_id}",
        "videoUrl": f"https://www.youtube.com/watch?v={video_id}",
        "views": int(statistics.get("viewCount", 0)),
        "likes": int(statistics.get("likeCount", 0)),
        "dislikes": 0,
        "channel_id": snippet.get("channelId", ""),
        "channelId": snippet.get("channelId", ""),
        "category": CATEGORY_NAMES.get(snippet.get("categoryId", ""), "All"),
        "duration_seconds": duration_seconds,
        "duration": format_clock(duration_seconds) if duration_seconds else "",
        "createdAt": published,
        "publishedAt": published,
        "age": relative_age(published),
        "subscribers": 0,
        "channel_handle": "",
    }


def channel_profiles(channel_ids: List[str]) -> Dict[str, Dict[str, Any]]:
    ids = [cid for cid in dict.fromkeys(channel_ids) if cid][:50]
    if not ids:
        return {}
    try:
        result = youtube_request("channels", {"part": "snippet,statistics", "id": ",".join(ids)})
    except HTTPException:
        return {}
    profiles = {}
    for item in result.get("items") or []:
        snippet = item.get("snippet") or {}
        handle = str(snippet.get("customUrl") or "").strip()
        if handle and not handle.startswith("@"):
            handle = f"@{handle.lstrip('@')}"
        try:
            count = int((item.get("statistics") or {}).get("subscriberCount") or 0)
        except (TypeError, ValueError):
            count = 0
        profiles[item.get("id")] = {
            "subscribers": count,
            "channel_handle": handle,
            "channel_name": snippet.get("title") or "",
        }
    return profiles


def with_channel_profiles(videos: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    profiles = channel_profiles([item.get("channel_id") or item.get("channelId") or "" for item in videos])
    for video in videos:
        profile = profiles.get(video.get("channel_id") or video.get("channelId") or "") or {}
        if not profile:
            continue
        video["subscribers"] = profile.get("subscribers", 0)
        video["channel_handle"] = profile.get("channel_handle") or ""
        if profile.get("channel_name"):
            video["channel_name"] = profile["channel_name"]
            video["channelTitle"] = profile["channel_name"]
    return videos


def data_api_search(query: str, max_results: int) -> List[Dict[str, Any]]:
    settings = get_settings()
    if not settings.youtube_api_key:
        return []
    try:
        response = requests.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={
                "part": "snippet",
                "maxResults": min(max(max_results, 1), 20),
                "type": "video",
                "q": query,
                "key": settings.youtube_api_key,
            },
            timeout=(3, 8),
        )
        if response.status_code in {400, 403, 429}:
            return []
        response.raise_for_status()
        payload = response.json()
        if payload.get("error"):
            return []
        return [map_video(item) for item in payload.get("items", []) if (item.get("id") or {}).get("videoId")]
    except (requests.RequestException, ValueError, TypeError):
        return []


async def mongo_search_videos(db: AsyncIOMotorDatabase, query: str, limit: int) -> List[Dict[str, Any]]:
    pattern = {"$regex": re.escape(query), "$options": "i"}
    filt = {"$or": [{"title": pattern}, {"description": pattern}, {"channel_name": pattern}, {"category": pattern}]}
    videos = []
    async for document in db.videos.find(filt).sort("created_at", -1).limit(limit):
        videos.append(serialize_video(document))
    return videos


@router.get("/search")
async def search_youtube(
    q: str = Query(min_length=1),
    max_results: int = Query(default=20, ge=1, le=50),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> List[Dict[str, Any]]:
    try:
        videos = await asyncio.wait_for(asyncio.to_thread(data_api_search, q, max_results), timeout=8)
    except (asyncio.TimeoutError, RecursionError, ValueError, TypeError):
        videos = []
    if videos:
        return videos
    return await mongo_search_videos(db, q, max_results)


@router.get("/videos/{video_id}")
def youtube_video(video_id: str) -> Dict[str, Any]:
    result = youtube_request("videos", {"part": "snippet,statistics,contentDetails", "id": video_id})
    if not result.get("items"):
        raise HTTPException(status_code=404, detail="YouTube video not found")
    mapped = map_video(result["items"][0], result["items"][0])
    return with_channel_profiles([mapped])[0]


@router.get("/home")
def youtube_home(max_results: int = Query(default=24, ge=1, le=50)) -> List[Dict[str, Any]]:
    """Trending home feed; the API key is never returned to the browser."""
    result = youtube_request("videos", {
        "part": "snippet,statistics,contentDetails",
        "chart": "mostPopular",
        "regionCode": "IN",
        "maxResults": max_results,
    })
    return with_channel_profiles([map_video(item, item) for item in result.get("items", [])])


@router.get("/shorts")
def youtube_shorts(max_results: int = Query(default=12, ge=1, le=50)) -> List[Dict[str, Any]]:
    result = youtube_request("search", {"part": "snippet", "q": "shorts", "type": "video", "videoDuration": "short", "maxResults": max_results})
    ids = [item.get("id", {}).get("videoId") for item in result.get("items", [])]
    details = youtube_request("videos", {"part": "snippet,statistics,contentDetails", "id": ",".join(filter(None, ids))}) if ids else {"items": []}
    detail_map = {item.get("id"): item for item in details.get("items", [])}
    return [map_video(item, detail_map.get(item.get("id", {}).get("videoId"))) for item in result.get("items", [])]


def collect_video_renderers(node: Any, found: List[Dict[str, Any]], remaining: int = 4000) -> int:
    if len(found) >= 20 or remaining <= 0:
        return remaining
    remaining -= 1
    if isinstance(node, dict):
        renderer = node.get("videoRenderer") or node.get("compactVideoRenderer")
        if renderer:
            found.append(renderer)
            return remaining
        for value in node.values():
            remaining = collect_video_renderers(value, found, remaining)
            if len(found) >= 20 or remaining <= 0:
                return remaining
    elif isinstance(node, list):
        for value in node:
            remaining = collect_video_renderers(value, found, remaining)
            if len(found) >= 20 or remaining <= 0:
                return remaining
    return remaining


def fallback_youtube_search(query: str, limit: int) -> List[Dict[str, Any]]:
    """Real youtube.com search results, used when Data API search quota is exhausted."""
    try:
        response = requests.post(
            "https://www.youtube.com/youtubei/v1/search?prettyPrint=false",
            json={
                "context": {
                    "client": {
                        "clientName": "WEB",
                        "clientVersion": "2.20240725.00.00",
                        "hl": "en",
                        "gl": "IN",
                    }
                },
                "query": query,
            },
            headers={"User-Agent": "Mozilla/5.0", "Accept-Language": "en-IN,en;q=0.9"},
            timeout=(3, 8),
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError, TypeError):
        return []

    renderers: List[Dict[str, Any]] = []
    collect_video_renderers(payload, renderers)
    videos = []
    for renderer in renderers:
        video_id = renderer.get("videoId")
        if not video_id:
            continue
        title_runs = (renderer.get("title") or {}).get("runs") or []
        channel_runs = ((renderer.get("ownerText") or renderer.get("longBylineText") or {}).get("runs")) or []
        channel_run = channel_runs[0] if channel_runs else {}
        channel_id = ((channel_run.get("navigationEndpoint") or {}).get("browseEndpoint") or {}).get("browseId") or ""
        length_label = innertube_text(renderer.get("lengthText"))
        duration_seconds = parse_duration_seconds(length_label)
        description = innertube_text(renderer.get("descriptionSnippet"))
        if not description:
            snippets = renderer.get("detailedMetadataSnippets") or []
            description = innertube_text((snippets[0] or {}).get("snippetText")) if snippets else ""
        avatar_thumbs = ((((renderer.get("channelThumbnailSupportedRenderers") or {}).get("channelThumbnailWithLinkRenderer") or {}).get("thumbnail") or {}).get("thumbnails")) or []
        videos.append({
            "id": video_id,
            "videoId": video_id,
            "title": title_runs[0].get("text", "Untitled video") if title_runs else "Untitled video",
            "description": description,
            "channel_name": channel_run.get("text", "YouTube creator"),
            "channel_avatar": (avatar_thumbs[-1] or {}).get("url", "") if avatar_thumbs else "",
            "thumbnail_url": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
            "thumbnailUrl": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
            "video_url": f"https://www.youtube.com/watch?v={video_id}",
            "videoUrl": f"https://www.youtube.com/watch?v={video_id}",
            "views": parse_view_label(innertube_text(renderer.get("viewCountText")) or innertube_text(renderer.get("shortViewCountText"))),
            "likes": 0,
            "dislikes": 0,
            "channel_id": channel_id,
            "channelId": channel_id,
            "category": "All",
            "duration_seconds": duration_seconds,
            "duration": format_clock(duration_seconds) if duration_seconds else length_label,
            "age": innertube_text(renderer.get("publishedTimeText")),
        })
        if len(videos) >= limit:
            break
    return videos


def search_videos(query: str, max_results: int) -> List[Dict[str, Any]]:
    videos = data_api_search(query, max_results)
    if videos:
        return videos
    future = _search_pool.submit(fallback_youtube_search, query, max_results)
    try:
        return future.result(timeout=12) or []
    except (FuturesTimeout, RecursionError, ValueError, TypeError):
        return []


def extract_suggestion_texts(payload: Any) -> List[str]:
    if not isinstance(payload, list) or len(payload) < 2 or not isinstance(payload[1], list):
        return []
    queries = []
    for item in payload[1]:
        text = item[0] if isinstance(item, list) and item else item
        if isinstance(text, str) and text.strip():
            queries.append(text.strip())
    return queries


def parse_suggest_body(raw: str) -> List[str]:
    text = (raw or "").strip()
    if not text:
        return []
    if text.startswith("["):
        try:
            return extract_suggestion_texts(json.loads(text))
        except json.JSONDecodeError:
            return []
    match = re.search(r"\[[\s\S]*\]", text)
    if not match:
        return []
    try:
        return extract_suggestion_texts(json.loads(match.group(0)))
    except json.JSONDecodeError:
        return []


def fetch_autocomplete(query: str, limit: int) -> List[str]:
    """Letter-by-letter YouTube type-ahead via the official suggest endpoint, with JSON fallback."""
    headers = {"User-Agent": "Mozilla/5.0"}
    params_list = [
        {"client": "youtube", "ds": "yt", "q": query},
        {"client": "firefox", "ds": "yt", "hl": "en", "gl": "in", "q": query},
    ]
    queries: List[str] = []
    for params in params_list:
        try:
            response = requests.get(YOUTUBE_SUGGEST_URL, params=params, headers=headers, timeout=(2, 3))
            response.raise_for_status()
            queries = parse_suggest_body(response.text)
        except (requests.RequestException, ValueError, TypeError):
            queries = []
        if queries:
            break
    unique = sorted(set(queries), key=str.lower)
    return unique[:limit]


@router.get("/suggestions")
def youtube_suggestions(q: str = Query(min_length=1), max_results: int = Query(default=10, ge=1, le=15)) -> Dict[str, Any]:
    """Alphabetical type-ahead queries for the search overlay; does not spend Data API quota."""
    return {"queries": fetch_autocomplete(q, max_results), "videos": []}


def infer_watch_topic(category: str, title: str) -> str:
    text = f"{category} {title}".lower()
    if any(token in text for token in ("music", "song", "lyrical", "singer", "album", "mashup")):
        return "Music"
    if any(token in text for token in ("tutorial", "python", "programming", "machine learning", "tech", "coding", "software")):
        return "Tech"
    if any(token in text for token in ("movie", "trailer", "cinema", "film")):
        return "Movies"
    if any(token in text for token in ("standup", "stand-up", "comedy", "funny")):
        return "Comedy"
    if category in RELATED_QUERIES:
        return category
    return "All"


def apply_seconds_badge(video: Dict[str, Any], fallback: int) -> Dict[str, Any]:
    seconds = int(video.get("duration_seconds") or 0) or fallback
    video["duration_seconds"] = seconds
    video["duration"] = f"{seconds}s"
    return video


def enrich_related_durations(videos: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    ids = [item.get("id") for item in videos if item.get("id")]
    details = {}
    if ids and get_settings().youtube_api_key:
        try:
            result = youtube_request("videos", {"part": "snippet,statistics,contentDetails", "id": ",".join(ids)})
            details = {item.get("id"): item for item in result.get("items", [])}
        except HTTPException:
            details = {}
    enriched = []
    for index, video in enumerate(videos):
        detail = details.get(video.get("id"))
        mapped = map_video({"id": {"videoId": video.get("id")}}, detail) if detail else dict(video)
        enriched.append(apply_seconds_badge(mapped, 180 + (index * 30)))
    return enriched


def related_to_video_id(video_id: str, max_results: int) -> List[Dict[str, Any]]:
    settings = get_settings()
    if not settings.youtube_api_key or len(video_id) != 11:
        return []
    try:
        response = requests.get(
            f"{YOUTUBE_API_URL}/search",
            params={
                "part": "snippet",
                "relatedToVideoId": video_id,
                "type": "video",
                "maxResults": max_results,
                "key": settings.youtube_api_key,
            },
            timeout=(3, 8),
        )
        if response.status_code in {400, 403, 429}:
            return []
        response.raise_for_status()
        items = [map_video(item) for item in response.json().get("items", []) if (item.get("id") or {}).get("videoId")]
        return enrich_related_durations(items)
    except (requests.RequestException, ValueError, TypeError):
        return []


@router.get("/related")
def youtube_related(
    video_id: str = Query(default=""),
    category: str = Query(default=""),
    q: str = Query(default=""),
    max_results: int = Query(default=12, ge=1, le=20),
) -> List[Dict[str, Any]]:
    videos = related_to_video_id(video_id, max_results)
    if videos:
        return videos
    topic = infer_watch_topic(category, q)
    query = RELATED_QUERIES.get(topic) or q or category or "recommended videos"
    videos = enrich_related_durations(data_api_search(query, max_results))
    for video in videos:
        video["category"] = topic if topic != "All" else video.get("category") or "All"
    return videos


@router.get("/explore")
def youtube_explore(
    category: str = Query(min_length=1),
    max_results: int = Query(default=24, ge=1, le=50),
) -> List[Dict[str, Any]]:
    """Niche trending search used by Home and /category/:name pages."""
    query = EXPLORE_QUERIES.get(category, category)
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": min(max(max_results, 20), 30),
    }
    if category.strip().lower() == "live":
        params["eventType"] = "live"
    try:
        result = youtube_request("search", params)
        if not result.get("items") and params.get("eventType"):
            params.pop("eventType", None)
            result = youtube_request("search", params)
    except HTTPException:
        if params.pop("eventType", None):
            result = youtube_request("search", params)
        else:
            raise
    ids = [item.get("id", {}).get("videoId") for item in result.get("items", [])]
    details = youtube_request("videos", {"part": "snippet,statistics,contentDetails", "id": ",".join(filter(None, ids))}) if ids else {"items": []}
    detail_map = {item.get("id"): item for item in details.get("items", [])}
    videos = [map_video(item, detail_map.get(item.get("id", {}).get("videoId"))) for item in result.get("items", [])]
    for video in videos:
        video["category"] = category
    return videos


def _compact_count(value: int) -> str:
    if value >= 1_000_000_000:
        text = f"{value / 1_000_000_000:.1f}B"
    elif value >= 1_000_000:
        text = f"{value / 1_000_000:.1f}M" if value < 10_000_000 else f"{value // 1_000_000}M"
    elif value >= 1_000:
        text = f"{value / 1_000:.1f}K" if value < 10_000 else f"{value // 1_000}K"
    else:
        return str(value)
    return text.replace(".0", "")


def _abs_url(url: str) -> str:
    return f"https:{url}" if url.startswith("//") else url


def channel_from_data_api(query: str) -> Optional[Dict[str, Any]]:
    """Official Data API: search.list (type=channel) then channels.list for full statistics."""
    found = youtube_request("search", {"part": "snippet", "type": "channel", "q": query, "maxResults": 1})
    items = found.get("items") or []
    channel_id = ((items[0].get("id") or {}).get("channelId")) if items else None
    if not channel_id:
        return None
    result = youtube_request("channels", {"part": "snippet,statistics,brandingSettings", "id": channel_id})
    if not result.get("items"):
        return None
    item = result["items"][0]
    snippet, stats = item.get("snippet") or {}, item.get("statistics") or {}
    thumbs = snippet.get("thumbnails") or {}
    avatar = (thumbs.get("high") or thumbs.get("medium") or thumbs.get("default") or {}).get("url", "")
    handle = str(snippet.get("customUrl") or "")
    if handle and not handle.startswith("@"):
        handle = f"@{handle}"
    hidden = bool(stats.get("hiddenSubscriberCount"))
    subs = int(stats.get("subscriberCount") or 0)
    return {
        "id": item.get("id"),
        "name": snippet.get("title", ""),
        "handle": handle,
        "avatar": avatar,
        "description": snippet.get("description", ""),
        "subscribers": "Subscribers hidden" if hidden else f"{_compact_count(subs)} subscriber{'s' if subs != 1 else ''}",
        "subscriber_count": None if hidden else subs,
        "video_count": int(stats.get("videoCount") or 0),
        "view_count": int(stats.get("viewCount") or 0),
        "published_at": snippet.get("publishedAt", ""),
        # The Data API does not expose the verification badge; only the fallback below can.
        "verified": None,
        "source": "youtube-data-api",
    }


def channel_from_site_search(query: str) -> Optional[Dict[str, Any]]:
    """Real youtube.com channel result (includes the verified badge); used when the API key is unavailable."""
    try:
        response = requests.post(
            "https://www.youtube.com/youtubei/v1/search?prettyPrint=false",
            json={
                "context": {"client": {"clientName": "WEB", "clientVersion": "2.20240725.00.00", "hl": "en", "gl": "IN"}},
                "query": query,
                "params": "EgIQAg==",
            },
            headers={"User-Agent": "Mozilla/5.0", "Accept-Language": "en-IN,en;q=0.9"},
            timeout=(3, 8),
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError, TypeError):
        return None

    def find(node: Any, budget: List[int]) -> Optional[Dict[str, Any]]:
        budget[0] -= 1
        if budget[0] < 0:
            return None
        if isinstance(node, dict):
            if "channelRenderer" in node:
                return node["channelRenderer"]
            for value in node.values():
                hit = find(value, budget)
                if hit:
                    return hit
        elif isinstance(node, list):
            for value in node:
                hit = find(value, budget)
                if hit:
                    return hit
        return None

    renderer = find(payload, [6000])
    if not renderer:
        return None
    texts = [innertube_text(renderer.get("subscriberCountText")), innertube_text(renderer.get("videoCountText"))]
    handle = next((t for t in texts if t.startswith("@")), "")
    subs = next((t for t in texts if "subscriber" in t.lower()), "")
    videos = next((t for t in texts if "video" in t.lower()), "")
    thumbs = ((renderer.get("thumbnail") or {}).get("thumbnails")) or []
    badges = renderer.get("ownerBadges") or []
    verified = any("VERIFIED" in json.dumps(b).upper() for b in badges)
    return {
        "id": renderer.get("channelId", ""),
        "name": innertube_text(renderer.get("title")).strip(),
        "handle": handle,
        "avatar": _abs_url((thumbs[-1] or {}).get("url", "")) if thumbs else "",
        "description": innertube_text(renderer.get("descriptionSnippet")),
        "subscribers": subs,
        "subscriber_count": None,
        "video_count": parse_view_label(videos.split()[0]) if videos else 0,
        "view_count": 0,
        "published_at": "",
        "verified": verified,
        "source": "youtube-search",
    }


@router.get("/channel")
def youtube_channel(q: str = Query(min_length=1)) -> Dict[str, Any]:
    """Live channel profile for a search term. Never returns invented data; 404 when nothing real is found."""
    channel = None
    try:
        channel = channel_from_data_api(q)
    except HTTPException:
        channel = None
    if not channel:
        channel = channel_from_site_search(q)
    if not channel or not channel.get("name"):
        raise HTTPException(status_code=404, detail="Channel not found")
    return channel


# ───────────────────────── Full channel pages ─────────────────────────
INNERTUBE_CONTEXT = {"client": {"clientName": "WEB", "clientVersion": "2.20240725.00.00", "hl": "en", "gl": "IN"}}
TAB_PARAMS = {"videos": "EgZ2aWRlb3PyBgQKAjoA", "shorts": "EgZzaG9ydHPyBgUKA5oBAA==", "live": "EgdzdHJlYW1z8gYECgJ6AA=="}
CHANNEL_ID_RE = re.compile(r"^UC[\w-]{22}$")


def _innertube(endpoint: str, body: Dict[str, Any]) -> Dict[str, Any]:
    try:
        response = requests.post(
            f"https://www.youtube.com/youtubei/v1/{endpoint}?prettyPrint=false",
            json={"context": INNERTUBE_CONTEXT, **body},
            headers={"User-Agent": "Mozilla/5.0", "Accept-Language": "en-IN,en;q=0.9"},
            timeout=(3, 10),
        )
        response.raise_for_status()
        return response.json()
    except (requests.RequestException, ValueError):
        raise HTTPException(status_code=502, detail="YouTube request failed")


def _walk(node: Any, key: str, out: List[Any], limit: int = 200) -> None:
    if len(out) >= limit:
        return
    if isinstance(node, dict):
        if key in node:
            out.append(node[key])
        for value in node.values():
            _walk(value, key, out, limit)
    elif isinstance(node, list):
        for value in node:
            _walk(value, key, out, limit)


def resolve_channel_id(ref: str) -> str:
    ref = ref.strip()
    if CHANNEL_ID_RE.match(ref):
        return ref
    if ref.startswith("@"):
        data = _innertube("navigation/resolve_url", {"url": f"https://www.youtube.com/{ref}"})
        browse_id = ((data.get("endpoint") or {}).get("browseEndpoint") or {}).get("browseId")
        if browse_id:
            return browse_id
    found = channel_from_site_search(ref.lstrip("@"))
    if found and found.get("id"):
        return found["id"]
    raise HTTPException(status_code=404, detail="Channel not found")


def _biggest(sources: List[Dict[str, Any]]) -> str:
    sources = [s for s in sources or [] if s.get("url")]
    return _abs_url(max(sources, key=lambda s: s.get("width") or 0)["url"]) if sources else ""


def channel_profile_page(channel_id: str) -> Dict[str, Any]:
    data = _innertube("browse", {"browseId": channel_id})
    header = ((data.get("header") or {}).get("pageHeaderRenderer")) or {}
    view = ((header.get("content") or {}).get("pageHeaderViewModel")) or {}
    meta = ((data.get("metadata") or {}).get("channelMetadataRenderer")) or {}
    name = (meta.get("title") or header.get("pageTitle") or "").strip()
    if not name:
        raise HTTPException(status_code=404, detail="Channel not found")
    avatars: List[Any] = []
    _walk(view.get("image"), "sources", avatars, 3)
    banners: List[Any] = []
    _walk(view.get("banner"), "sources", banners, 3)
    rows = (((view.get("metadata") or {}).get("contentMetadataViewModel")) or {}).get("metadataRows") or []
    parts = [((p.get("text") or {}).get("content") or "") for row in rows for p in row.get("metadataParts") or []]
    handle = next((p for p in parts if p.startswith("@")), "")
    subs = next((p for p in parts if "subscriber" in p.lower()), "")
    videos = next((p for p in parts if re.search(r"\bvideos?\b", p.lower())), "")
    header_json = json.dumps(header)
    verified = "BADGE_STYLE_TYPE_VERIFIED" in header_json or "CHECK_CIRCLE_FILLED" in header_json
    tab_list = (((data.get("contents") or {}).get("twoColumnBrowseResultsRenderer")) or {}).get("tabs", [])
    tabs = [((t.get("tabRenderer") or {}).get("title") or "") for t in tab_list]
    return {
        "id": meta.get("externalId") or channel_id,
        "name": name,
        "handle": handle,
        "avatar": _biggest(avatars[0]) if avatars else "",
        "banner": _biggest(banners[0]) if banners else "",
        "description": meta.get("description", ""),
        "subscribers": subs,
        "video_count_label": videos,
        "verified": verified,
        "tabs": [t for t in tabs if t],
        "keywords": meta.get("keywords", ""),
        "source": "youtube",
    }


def _channel_video(video_id: str, title: str, views_text: str, age: str, duration: str, seconds: int, channel: Dict[str, Any], thumb: str = "") -> Dict[str, Any]:
    thumb = thumb or f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
    return {
        "id": video_id, "videoId": video_id, "title": title, "description": "",
        "channel_name": channel["name"], "channelTitle": channel["name"], "channel_id": channel["id"], "channelId": channel["id"],
        "channel_avatar": channel.get("avatar", ""), "channel_handle": channel.get("handle", ""),
        "thumbnail_url": thumb, "thumbnailUrl": thumb, "thumbnail": thumb,
        "video_url": f"https://www.youtube.com/watch?v={video_id}", "videoUrl": f"https://www.youtube.com/watch?v={video_id}",
        "views": views_text or "0 views", "likes": 0, "dislikes": 0, "category": "All",
        "duration_seconds": seconds, "duration": duration, "age": age,
    }


def _lockup_video(lockup: Dict[str, Any], channel: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    video_id = lockup.get("contentId")
    if not video_id or lockup.get("contentType") not in (None, "LOCKUP_CONTENT_TYPE_VIDEO"):
        return None
    image: List[Any] = []
    _walk(lockup.get("contentImage"), "sources", image, 1)
    badges: List[Any] = []
    _walk(lockup.get("contentImage"), "thumbnailBadgeViewModel", badges, 1)
    duration_label = (badges[0].get("text") if badges else "") or ""
    metadata = ((lockup.get("metadata") or {}).get("lockupMetadataViewModel")) or {}
    title = ((metadata.get("title") or {}).get("content")) or "Untitled video"
    rows = (((metadata.get("metadata") or {}).get("contentMetadataViewModel")) or {}).get("metadataRows") or []
    texts = [((p.get("text") or {}).get("content") or "") for row in rows for p in row.get("metadataParts") or []]
    views_text = next((t for t in texts if "view" in t.lower() or "watching" in t.lower()), "")
    age_text = next((t for t in texts if "ago" in t.lower() or "stream" in t.lower()), "")
    return _channel_video(video_id, title, views_text, age_text, duration_label, parse_duration_seconds(duration_label), channel, _biggest(image[0]) if image else "")


def channel_tab_videos(channel_id: str, tab: str, channel: Dict[str, Any]) -> List[Dict[str, Any]]:
    params = TAB_PARAMS.get(tab)
    if not params:
        return []
    data = _innertube("browse", {"browseId": channel_id, "params": params})
    videos: List[Dict[str, Any]] = []
    seen = set()
    if tab == "shorts":
        nodes: List[Any] = []
        _walk(data, "shortsLockupViewModel", nodes, 60)
        for node in nodes:
            video_id = (((node.get("onTap") or {}).get("innertubeCommand") or {}).get("reelWatchEndpoint") or {}).get("videoId")
            if not video_id or video_id in seen:
                continue
            seen.add(video_id)
            overlay = node.get("overlayMetadata") or {}
            title = ((overlay.get("primaryText") or {}).get("content")) or ""
            views = ((overlay.get("secondaryText") or {}).get("content")) or ""
            item = _channel_video(video_id, title, views, "", "", 0, channel, f"https://i.ytimg.com/vi/{video_id}/hq2.jpg")
            item["is_short"] = True
            videos.append(item)
        return videos
    nodes = []
    _walk(data, "lockupViewModel", nodes, 60)
    for node in nodes:
        item = _lockup_video(node, channel)
        if item and item["id"] not in seen:
            seen.add(item["id"])
            videos.append(item)
    renderers: List[Any] = []
    _walk(data, "videoRenderer", renderers, 60)
    for renderer in renderers:
        video_id = renderer.get("videoId")
        if not video_id or video_id in seen:
            continue
        seen.add(video_id)
        length = innertube_text(renderer.get("lengthText"))
        videos.append(_channel_video(
            video_id, innertube_text(renderer.get("title")), innertube_text(renderer.get("viewCountText")),
            innertube_text(renderer.get("publishedTimeText")), length, parse_duration_seconds(length), channel,
        ))
    return videos


@router.get("/channels/{ref}")
def youtube_channel_page(ref: str) -> Dict[str, Any]:
    """Full live channel profile for a channel id, @handle or name."""
    channel_id = resolve_channel_id(ref)
    profile = channel_profile_page(channel_id)
    try:
        if get_settings().youtube_api_key:
            official = youtube_request("channels", {"part": "snippet,statistics,brandingSettings", "id": channel_id}).get("items") or []
            if official:
                stats = official[0].get("statistics") or {}
                profile["video_count"] = int(stats.get("videoCount") or 0)
                profile["view_count"] = int(stats.get("viewCount") or 0)
                profile["joined"] = (official[0].get("snippet") or {}).get("publishedAt", "")
                banner = ((official[0].get("brandingSettings") or {}).get("image") or {}).get("bannerExternalUrl")
                if banner and not profile["banner"]:
                    profile["banner"] = f"{banner}=w1707"
                profile["source"] = "youtube-data-api"
    except HTTPException:
        pass
    return profile


@router.get("/channels/{ref}/videos")
def youtube_channel_videos(ref: str, tab: str = Query(default="videos", pattern="^(videos|shorts|live)$")) -> List[Dict[str, Any]]:
    channel_id = resolve_channel_id(ref)
    profile = channel_profile_page(channel_id)
    return channel_tab_videos(channel_id, tab, profile)


def _comment(snippet: Dict[str, Any], comment_id: str) -> Dict[str, Any]:
    published = snippet.get("publishedAt", "")
    handle = str(snippet.get("authorDisplayName") or "").lstrip("@")
    return {
        "id": comment_id,
        "name": handle,
        "handle": handle,
        "avatar": snippet.get("authorProfileImageUrl", ""),
        "channel_id": ((snippet.get("authorChannelId") or {}).get("value")) or "",
        "text": snippet.get("textOriginal") or snippet.get("textDisplay", ""),
        "likes": int(snippet.get("likeCount") or 0),
        "age": relative_age(published),
        "publishedAt": published,
        "replies": [],
    }


@router.get("/comments/{video_id}")
def youtube_comments(video_id: str, max_results: int = Query(default=20, ge=1, le=50)) -> List[Dict[str, Any]]:
    """Real top-level comments (and their replies) from the YouTube Data API."""
    result = youtube_request("commentThreads", {
        "part": "snippet,replies", "videoId": video_id, "maxResults": max_results, "order": "relevance", "textFormat": "plainText",
    })
    comments = []
    for thread in result.get("items", []):
        top = (thread.get("snippet") or {}).get("topLevelComment") or {}
        item = _comment(top.get("snippet") or {}, top.get("id") or thread.get("id"))
        for reply in ((thread.get("replies") or {}).get("comments") or []):
            item["replies"].append(_comment(reply.get("snippet") or {}, reply.get("id")))
        comments.append(item)
    return comments


# ───────────────────────── Shorts feed, batch lookups, channel discovery ─────────────────────────
import time as _time

_CACHE: Dict[str, Any] = {}


def _cached(key: str, ttl: int, producer):
    hit = _CACHE.get(key)
    if hit and _time.time() - hit[0] < ttl:
        return hit[1]
    value = producer()
    _CACHE[key] = (_time.time(), value)
    return value


def _fetch_details(ids: List[str]) -> Dict[str, Dict[str, Any]]:
    ids = [i for i in dict.fromkeys(ids) if i][:50]
    if not ids:
        return {}
    result = youtube_request("videos", {"part": "snippet,statistics,contentDetails", "id": ",".join(ids)})
    return {item.get("id"): item for item in result.get("items", [])}


def site_shorts(token: str, q: str) -> Dict[str, Any]:
    """Quota-free Shorts feed from youtube.com search (used when the Data API quota is exhausted)."""
    body: Dict[str, Any] = {"continuation": token} if token else {"query": q, "params": "EgIYAQ=="}
    data = _innertube("search", body)
    nodes: List[Any] = []
    _walk(data, "shortsLockupViewModel", nodes, 60)
    items = []
    for node in nodes:
        video_id = (((node.get("onTap") or {}).get("innertubeCommand") or {}).get("reelWatchEndpoint") or {}).get("videoId")
        if not video_id:
            continue
        overlay = node.get("overlayMetadata") or {}
        title = ((overlay.get("primaryText") or {}).get("content")) or ""
        views = ((overlay.get("secondaryText") or {}).get("content")) or ""
        item = _channel_video(video_id, title, views, "", "", 0, {"name": "", "id": "", "avatar": "", "handle": ""}, f"https://i.ytimg.com/vi/{video_id}/hq2.jpg")
        item["is_short"] = True
        items.append(item)
    try:  # enrich with channel/age/likes when the (cheap) videos.list quota is still available
        details = _fetch_details([i["id"] for i in items])
        for item in items:
            detail = details.get(item["id"])
            if detail:
                mapped = map_video({"id": {"videoId": item["id"]}}, detail)
                item.update({k: mapped[k] for k in ("channel_name", "channelTitle", "channel_id", "channelId", "age", "publishedAt", "likes", "description", "duration_seconds", "duration")})
                item["views"] = mapped["views"] or item["views"]
    except HTTPException:
        pass
    tokens: List[Any] = []
    _walk(data, "continuationCommand", tokens, 5)
    return {"items": items, "next": (tokens[-1].get("token") if tokens else "") or ""}


def site_channels(query: str, limit: int) -> List[Dict[str, Any]]:
    data = _innertube("search", {"query": query, "params": "EgIQAg=="})
    renderers: List[Any] = []
    _walk(data, "channelRenderer", renderers, limit)
    channels = []
    for renderer in renderers:
        texts = [innertube_text(renderer.get("subscriberCountText")), innertube_text(renderer.get("videoCountText"))]
        thumbs = ((renderer.get("thumbnail") or {}).get("thumbnails")) or []
        channels.append({
            "id": renderer.get("channelId", ""),
            "name": innertube_text(renderer.get("title")).strip(),
            "handle": next((t for t in texts if t.startswith("@")), ""),
            "avatar": _abs_url((thumbs[-1] or {}).get("url", "")) if thumbs else "",
            "subscribers": next((t for t in texts if "subscriber" in t.lower()), ""),
        })
    return channels


@router.get("/shorts/feed")
def youtube_shorts_feed(
    token: str = Query(default=""),
    q: str = Query(default="shorts"),
    max_results: int = Query(default=15, ge=1, le=25),
) -> Dict[str, Any]:
    """Paginated real Shorts (<= 60s). Pass back `next` as `token` to keep scrolling."""
    def produce() -> Dict[str, Any]:
        try:
            return official()
        except HTTPException:
            return site_shorts(token, q)

    def official() -> Dict[str, Any]:
        params: Dict[str, Any] = {"part": "snippet", "q": q, "type": "video", "videoDuration": "short", "maxResults": max_results, "regionCode": "IN"}
        if token:
            params["pageToken"] = token
        result = youtube_request("search", params)
        ids = [(item.get("id") or {}).get("videoId") for item in result.get("items", [])]
        details = _fetch_details([i for i in ids if i])
        items = []
        for item in result.get("items", []):
            vid = (item.get("id") or {}).get("videoId")
            detail = details.get(vid)
            if not detail:
                continue
            mapped = map_video(item, detail)
            if 0 < mapped["duration_seconds"] <= 60:
                mapped["is_short"] = True
                items.append(mapped)
        return {"items": with_channel_profiles(items), "next": result.get("nextPageToken", "")}
    return _cached(f"shorts:{q}:{token}:{max_results}", 300, produce)


@router.get("/videos-by-ids")
def youtube_videos_by_ids(ids: str = Query(min_length=1)) -> List[Dict[str, Any]]:
    """Real metadata for saved video ids (History, Liked, Watch later, Playlists), in the requested order."""
    wanted = [i for i in ids.split(",") if re.fullmatch(r"[\w-]{11}", i)][:50]
    details = _cached(f"ids:{','.join(wanted)}", 120, lambda: _fetch_details(wanted))
    videos = [map_video({"id": {"videoId": i}}, details[i]) for i in wanted if i in details]
    return with_channel_profiles(videos)


@router.get("/channels-search")
def youtube_channels_search(q: str = Query(min_length=1), max_results: int = Query(default=6, ge=1, le=15)) -> List[Dict[str, Any]]:
    """Real channels for a topic/name (Subscriptions discovery)."""
    def produce() -> List[Dict[str, Any]]:
        try:
            return official()
        except HTTPException:
            return site_channels(q, max_results)

    def official() -> List[Dict[str, Any]]:
        found = youtube_request("search", {"part": "snippet", "type": "channel", "q": q, "maxResults": max_results})
        ids = [(item.get("id") or {}).get("channelId") for item in found.get("items", [])]
        ids = [i for i in ids if i]
        if not ids:
            return []
        result = youtube_request("channels", {"part": "snippet,statistics", "id": ",".join(ids)})
        channels = []
        for item in result.get("items", []):
            snippet, stats = item.get("snippet") or {}, item.get("statistics") or {}
            thumbs = snippet.get("thumbnails") or {}
            subs = int(stats.get("subscriberCount") or 0)
            handle = str(snippet.get("customUrl") or "")
            channels.append({
                "id": item.get("id"),
                "name": snippet.get("title", ""),
                "handle": handle if handle.startswith("@") or not handle else f"@{handle}",
                "avatar": (thumbs.get("high") or thumbs.get("medium") or thumbs.get("default") or {}).get("url", ""),
                "subscribers": "Subscribers hidden" if stats.get("hiddenSubscriberCount") else f"{_compact_count(subs)} subscribers",
            })
        return channels
    return _cached(f"chsearch:{q}:{max_results}", 900, produce)
