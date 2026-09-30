import json
import re
from typing import Any, Dict, List

import requests
from fastapi import APIRouter, Depends, Path, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.security import get_current_user_id
from app.db.session import get_db
from app.routers.video import serialize_video
from app.routers.youtube import fallback_youtube_search, map_video, relative_age
from app.services.search_history import add_search_history, list_search_history, remove_search_history

router = APIRouter(prefix="/search", tags=["search"])
SUGGEST_URL = "https://suggestqueries.google.com/complete/search"
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"
YOUTUBE_CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels"


def parse_suggestion_list(raw: str) -> List[str]:
    text = (raw or "").strip()
    if not text:
        return []
    try:
        payload = json.loads(text) if text.startswith("[") else None
        if payload is None:
            match = re.search(r"\[[\s\S]*\]", text)
            payload = json.loads(match.group(0)) if match else None
    except (json.JSONDecodeError, TypeError, ValueError):
        return []
    if not isinstance(payload, list) or len(payload) < 2 or not isinstance(payload[1], list):
        return []
    queries = []
    for item in payload[1]:
        value = item[0] if isinstance(item, list) and item else item
        if isinstance(value, str) and value.strip():
            queries.append(value.strip())
    return queries


def map_youtube_search_item(item: Dict[str, Any]) -> Dict[str, Any]:
    snippet = item.get("snippet") or {}
    video_id = (item.get("id") or {}).get("videoId")
    thumbs = snippet.get("thumbnails") or {}
    thumbnail = (thumbs.get("high") or thumbs.get("medium") or thumbs.get("default") or {}).get("url") or ""
    if video_id and not thumbnail:
        thumbnail = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
    channel = snippet.get("channelTitle", "YouTube creator")
    return {
        "id": video_id,
        "videoId": video_id,
        "title": snippet.get("title", "Untitled video"),
        "description": snippet.get("description", ""),
        "channelTitle": channel,
        "channel_name": channel,
        "thumbnail": thumbnail,
        "thumbnail_url": thumbnail,
        "thumbnailUrl": thumbnail,
        "video_url": f"https://www.youtube.com/watch?v={video_id}" if video_id else "",
        "videoUrl": f"https://www.youtube.com/watch?v={video_id}" if video_id else "",
        "category": "All",
        "views": 0,
        "likes": 0,
        "dislikes": 0,
        "duration_seconds": 0,
        "duration": "",
        "channel_id": snippet.get("channelId", ""),
        "channelId": snippet.get("channelId", ""),
        "publishedAt": snippet.get("publishedAt", ""),
        "createdAt": snippet.get("publishedAt", ""),
        "age": relative_age(snippet.get("publishedAt", "")),
    }


def _channel_avatars(channel_ids: List[str], api_key: str) -> Dict[str, str]:
    unique = []
    for channel_id in channel_ids:
        if channel_id and channel_id not in unique:
            unique.append(channel_id)
    if not unique:
        return {}
    try:
        response = requests.get(
            YOUTUBE_CHANNELS_URL,
            params={"part": "snippet", "id": ",".join(unique[:50]), "key": api_key},
            timeout=8,
        )
        if response.status_code != 200:
            return {}
        avatars = {}
        for item in response.json().get("items", []):
            thumbs = ((item.get("snippet") or {}).get("thumbnails") or {})
            url = (thumbs.get("default") or thumbs.get("medium") or {}).get("url") or ""
            if url and item.get("id"):
                avatars[item["id"]] = url
        return avatars
    except (requests.RequestException, ValueError, TypeError, json.JSONDecodeError):
        return {}


def enrich_search_videos(videos: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    settings = get_settings()
    ids = [str(item.get("videoId") or item.get("id") or "") for item in videos]
    ids = [video_id for video_id in ids if video_id]
    if not settings.youtube_api_key or not ids:
        return videos
    try:
        response = requests.get(
            YOUTUBE_VIDEOS_URL,
            params={
                "part": "snippet,statistics,contentDetails",
                "id": ",".join(ids[:50]),
                "key": settings.youtube_api_key,
            },
            timeout=8,
        )
        if response.status_code != 200:
            return videos
        details = {item.get("id"): item for item in response.json().get("items", [])}
    except (requests.RequestException, ValueError, TypeError, json.JSONDecodeError):
        return videos

    merged = []
    channel_ids = []
    for video in videos:
        video_id = str(video.get("videoId") or video.get("id") or "")
        detail = details.get(video_id)
        item = {**video, **map_video({"id": video_id, "snippet": (detail or {}).get("snippet") or {}}, detail)} if detail else video
        if not item.get("description"):
            item["description"] = video.get("description") or ""
        if not item.get("age"):
            item["age"] = relative_age(item.get("publishedAt") or item.get("createdAt") or "")
        merged.append(item)
        if item.get("channelId"):
            channel_ids.append(item["channelId"])

    avatars = _channel_avatars(channel_ids, settings.youtube_api_key)
    for item in merged:
        avatar = avatars.get(item.get("channelId") or item.get("channel_id") or "")
        if avatar:
            item["channel_avatar"] = avatar
    return merged


def youtube_data_search(query: str) -> List[Dict[str, Any]]:
    settings = get_settings()
    if not settings.youtube_api_key:
        return []
    try:
        response = requests.get(
            YOUTUBE_SEARCH_URL,
            params={
                "part": "snippet",
                "type": "video",
                "maxResults": 20,
                "q": query,
                "key": settings.youtube_api_key,
            },
            timeout=8,
        )
        if response.status_code in {400, 403, 429}:
            return []
        response.raise_for_status()
        payload = response.json()
        if payload.get("error"):
            return []
        videos = [map_youtube_search_item(item) for item in payload.get("items", []) if (item.get("id") or {}).get("videoId")]
        return enrich_search_videos(videos)
    except (requests.RequestException, ValueError, TypeError, json.JSONDecodeError):
        return []


async def local_video_fallback(db: AsyncIOMotorDatabase, query: str) -> List[Dict[str, Any]]:
    pattern = {"$regex": re.escape(query), "$options": "i"}
    filt = {
        "$or": [
            {"title": pattern},
            {"category": pattern},
            {"tags": pattern},
            {"description": pattern},
            {"channel_name": pattern},
        ]
    }
    videos = []
    async for document in db.videos.find(filt).sort("created_at", -1).limit(20):
        videos.append(serialize_video(document))
    return videos


@router.get("/suggestions")
def search_suggestions(q: str = Query(min_length=1)) -> List[str]:
    try:
        response = requests.get(
            SUGGEST_URL,
            params={"client": "firefox", "ds": "yt", "q": q},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=5,
        )
        response.raise_for_status()
        suggestions = parse_suggestion_list(response.text)
    except (requests.RequestException, ValueError, TypeError, json.JSONDecodeError):
        suggestions = []
    if suggestions:
        return suggestions
    return [q]


@router.get("")
async def search_videos(q: str = Query(min_length=1), db: AsyncIOMotorDatabase = Depends(get_db)) -> List[Dict[str, Any]]:
    videos = youtube_data_search(q)
    if videos:
        return videos
    videos = fallback_youtube_search(q, 20)
    if videos:
        return enrich_search_videos(videos)
    return await local_video_fallback(db, q)


class SearchHistoryIn(BaseModel):
    query: str = Field(min_length=1, max_length=200)


@router.get("/history")
async def get_search_history(user_id: str = Depends(get_current_user_id), db: AsyncIOMotorDatabase = Depends(get_db)):
    return await list_search_history(db, user_id)


@router.post("/history", status_code=status.HTTP_201_CREATED)
async def save_search_history(
    payload: SearchHistoryIn,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await add_search_history(db, user_id, payload.query)


@router.delete("/history/{query_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_search_history(
    query_id: str = Path(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await remove_search_history(db, user_id, query_id)
