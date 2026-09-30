from datetime import datetime, timezone
from typing import Optional
import asyncio

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from starlette.responses import StreamingResponse

from app.core.config import get_settings
from app.core.security import get_current_user_id, get_optional_user_id
from app.db import mongodb
from app.db.session import get_db
from app.schemas.video import VideoCreate, VideoRead, VideoUpdate, parse_duration_seconds
from app.services.abr import ensure_renditions
from app.services.progress import last_watched_time

router = APIRouter(prefix="/videos", tags=["videos"])
allowed_video_types = {"video/mp4", "video/webm", "video/quicktime", "video/x-matroska"}
DEFAULT_THUMBNAIL = "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80"


def as_object_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=404, detail="Video not found")
    return ObjectId(value)


def serialize_video(document):
    document = dict(document)
    oid = document.get("_id")
    video_id = str(document.pop("_id"))
    file_id = document.get("file_id")
    file_id_str = str(file_id) if file_id else ""
    stream_path = f"/api/videos/{file_id_str}/stream" if file_id_str else (document.get("video_url") or "")
    seconds = parse_duration_seconds(document.get("duration_seconds") or document.get("duration"))
    channel_id = str(document.get("channel_id") or document.get("channelId") or document.get("owner_id") or "")
    created = document.get("created_at") or document.get("createdAt")
    if not created and isinstance(oid, ObjectId):
        created = oid.generation_time
    if not created:
        created = datetime.now(timezone.utc)
    if file_id_str:
        document["file_id"] = file_id_str
    document.update({
        "id": video_id,
        "title": document.get("title", "Untitled video"),
        "description": document.get("description") or "",
        "category": document.get("category") or "All",
        "video_url": stream_path,
        "thumbnail_url": document.get("thumbnail_url") or document.get("thumbnailUrl") or DEFAULT_THUMBNAIL,
        "videoUrl": stream_path,
        "thumbnailUrl": document.get("thumbnail_url") or document.get("thumbnailUrl") or DEFAULT_THUMBNAIL,
        "duration": seconds,
        "duration_seconds": seconds,
        "views": int(document.get("views") or 0),
        "likes": int(document.get("likes") or 0),
        "dislikes": int(document.get("dislikes") or 0),
        "channel_id": channel_id,
        "channelId": channel_id,
        "channel_name": document.get("channel_name") or "My Channel",
        "preview_url": stream_path or document.get("preview_url") or "",
        "created_at": created,
        "createdAt": created,
        "renditions": [
            {**row, "file_id": str(row.get("file_id", ""))}
            for row in (document.get("renditions") or [])
        ],
    })
    return document


async def find_video(db: AsyncIOMotorDatabase, video_id: str):
    document = await db.videos.find_one({"_id": as_object_id(video_id)})
    if not document:
        raise HTTPException(status_code=404, detail="Video not found")
    return document


@router.get("", response_model=list[VideoRead])
async def list_videos(category: Optional[str] = Query(default=None), db: AsyncIOMotorDatabase = Depends(get_db)):
    videos = []
    query = {"category": category} if category else {}
    async for document in db.videos.find(query).sort("created_at", -1):
        videos.append(serialize_video(document))
    return videos


@router.get("/search", response_model=list[VideoRead])
async def search_videos(q: str = Query(min_length=1), db: AsyncIOMotorDatabase = Depends(get_db)):
    pattern = {"$regex": q, "$options": "i"}
    query = {"$or": [{"title": pattern}, {"description": pattern}, {"channel_name": pattern}, {"category": pattern}]}
    videos = []
    async for document in db.videos.find(query).sort("created_at", -1):
        videos.append(serialize_video(document))
    return videos


@router.get("/history", response_model=list[VideoRead])
async def video_history(db: AsyncIOMotorDatabase = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    videos = []
    async for document in db.videos.find({"owner_id": user_id, "history": True}).sort("watched_at", -1):
        videos.append(serialize_video(document))
    return videos


@router.get("/liked", response_model=list[VideoRead])
async def liked_videos(db: AsyncIOMotorDatabase = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    videos = []
    async for document in db.videos.find({"owner_id": user_id, "liked": True}).sort("created_at", -1):
        videos.append(serialize_video(document))
    return videos


@router.get("/my-videos", response_model=list[VideoRead])
async def my_videos(db: AsyncIOMotorDatabase = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    videos = []
    async for document in db.videos.find({"owner_id": user_id}).sort("created_at", -1):
        videos.append(serialize_video(document))
    return videos


@router.post("", response_model=VideoRead, status_code=status.HTTP_201_CREATED)
async def create_video(payload: VideoCreate, db: AsyncIOMotorDatabase = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    seconds = parse_duration_seconds(payload.duration_seconds or payload.duration)
    document = payload.model_dump()
    document.update({
        "views": 0,
        "likes": int(payload.likes or 0),
        "dislikes": int(payload.dislikes or 0),
        "duration": seconds,
        "duration_seconds": seconds,
        "channel_id": payload.channel_id or user_id,
        "created_at": datetime.now(timezone.utc),
        "owner_id": user_id,
        "preview_url": payload.video_url,
    })
    result = await db.videos.insert_one(document)
    document["_id"] = result.inserted_id
    return serialize_video(document)


@router.post("/upload", response_model=VideoRead, status_code=status.HTTP_201_CREATED)
async def upload_video(
    title: str = Form(..., min_length=1, max_length=200),
    channel_name: str = Form(..., min_length=1, max_length=100),
    description: str = Form(""),
    duration: str = Form("0"),
    duration_seconds: str = Form("0"),
    thumbnail_url: str = Form(""),
    category: str = Form("All"),
    channel_id: str = Form(""),
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    user_id: str = Depends(get_optional_user_id),
):
    settings = get_settings()
    kind = (file.content_type or "").split(";")[0].strip().lower()
    name = (file.filename or "").lower()
    named_ok = name.endswith((".mp4", ".webm", ".mov", ".mkv", ".m4v"))
    if kind not in allowed_video_types and not (kind in {"", "application/octet-stream", "binary/octet-stream"} and named_ok):
        raise HTTPException(status_code=415, detail="Upload an MP4, WebM, MOV, or MKV video")

    upload = mongodb.gridfs_bucket.open_upload_stream(
        file.filename or "video",
        metadata={"content_type": file.content_type, "original_name": file.filename or "video"},
    )
    total_size = 0
    try:
        while chunk := await file.read(4 * 1024 * 1024):
            total_size += len(chunk)
            if total_size > settings.max_upload_size_mb * 1024 * 1024:
                await upload.abort()
                raise HTTPException(status_code=413, detail=f"Video must be smaller than {settings.max_upload_size_mb} MB")
            await upload.write(chunk)
        await upload.close()
    except HTTPException:
        raise
    except Exception as error:
        await upload.abort()
        raise HTTPException(status_code=500, detail="Video upload failed") from error

    seconds = parse_duration_seconds(duration_seconds or duration)
    stream_path = f"/api/videos/{upload._id}/stream"
    document = {
        "title": title,
        "description": description,
        "category": category,
        "thumbnail_url": thumbnail_url or DEFAULT_THUMBNAIL,
        "video_url": stream_path,
        "preview_url": stream_path,
        "channel_name": channel_name,
        "channel_id": channel_id or user_id,
        "views": 0,
        "likes": 0,
        "dislikes": 0,
        "duration": seconds,
        "duration_seconds": seconds,
        "owner_id": user_id,
        "created_at": datetime.now(timezone.utc),
        "file_id": upload._id,
        "file_size": total_size,
    }
    result = await db.videos.insert_one(document)
    document["_id"] = result.inserted_id
    asyncio.create_task(ensure_renditions(str(result.inserted_id)))
    return serialize_video(document)


@router.get("/{video_id}", response_model=VideoRead)
async def get_video(
    video_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    user_id: str = Depends(get_optional_user_id),
):
    document = await find_video(db, video_id)
    if document.get("file_id") and not document.get("renditions") and not document.get("abr_ready"):
        asyncio.create_task(ensure_renditions(str(document["_id"])))
    payload = serialize_video(document)
    payload["lastWatchedTime"] = await last_watched_time(db, user_id, video_id)
    return payload


@router.patch("/{video_id}", response_model=VideoRead)
async def update_video(video_id: str, payload: VideoUpdate, db: AsyncIOMotorDatabase = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    document = await find_video(db, video_id)
    if document.get("owner_id") not in {user_id, "guest"} and user_id != "guest":
        raise HTTPException(status_code=403, detail="You can only edit your own videos")
    updates = {key: value for key, value in payload.model_dump(exclude_unset=True).items() if value is not None}
    if "duration" in updates or "duration_seconds" in updates:
        seconds = parse_duration_seconds(updates.get("duration_seconds", updates.get("duration")))
        updates["duration"] = seconds
        updates["duration_seconds"] = seconds
    if updates:
        await db.videos.update_one({"_id": document["_id"]}, {"$set": updates})
        document.update(updates)
    return serialize_video(document)


@router.delete("/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_video(video_id: str, db: AsyncIOMotorDatabase = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    document = await find_video(db, video_id)
    if document.get("owner_id") not in {user_id, "guest"} and user_id != "guest":
        raise HTTPException(status_code=403, detail="You can only delete your own videos")
    file_id = document.get("file_id")
    if file_id:
        try:
            await mongodb.gridfs_bucket.delete(file_id if isinstance(file_id, ObjectId) else ObjectId(str(file_id)))
        except Exception as error:
            if "not found" not in str(error).lower():
                raise HTTPException(status_code=500, detail="Could not delete video file") from error
    await db.videos.delete_one({"_id": document["_id"]})


@router.post("/{video_id}/view", response_model=VideoRead)
async def increment_views(video_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    await db.videos.update_one({"_id": as_object_id(video_id)}, {"$inc": {"views": 1}})
    return serialize_video(await find_video(db, video_id))


def parse_byte_range(header: str, file_size: int):
    unit, _, span = header.partition("=")
    if unit.strip() != "bytes" or not span:
        return 0, file_size - 1
    start_text, _, end_text = span.partition("-")
    start = int(start_text or 0)
    end = int(end_text) if end_text else file_size - 1
    end = min(end, file_size - 1)
    if start > end:
        raise HTTPException(status_code=416, detail="Invalid byte range")
    return start, end


async def open_video_file(file_id: str, db: AsyncIOMotorDatabase):
    if not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=404, detail="Video file not found")
    oid = ObjectId(file_id)
    try:
        return await mongodb.gridfs_bucket.open_download_stream(oid)
    except Exception:
        document = await db.videos.find_one({"_id": oid})
        ref = document.get("file_id") if document else None
        if not ref:
            raise HTTPException(status_code=404, detail="Video file not found")
        return await mongodb.gridfs_bucket.open_download_stream(ref if isinstance(ref, ObjectId) else ObjectId(str(ref)))


async def open_quality_file(file_id: str, quality: Optional[str], db: AsyncIOMotorDatabase):
    if not quality or quality in {"auto", "source", "1080", "hd1080"}:
        return await open_video_file(file_id, db)
    if not ObjectId.is_valid(file_id):
        return await open_video_file(file_id, db)
    oid = ObjectId(file_id)
    document = await db.videos.find_one({"$or": [{"_id": oid}, {"file_id": oid}]}) or {}
    if document.get("file_id") and not document.get("renditions") and not document.get("abr_ready"):
        asyncio.create_task(ensure_renditions(str(document["_id"])))
    for row in document.get("renditions") or []:
        if str(row.get("height")) == str(quality) or str(row.get("id")) == str(quality):
            return await mongodb.gridfs_bucket.open_download_stream(ObjectId(str(row["file_id"])))
    return await open_video_file(file_id, db)


@router.get("/{file_id}/stream")
async def stream_video(file_id: str, request: Request, db: AsyncIOMotorDatabase = Depends(get_db), quality: Optional[str] = Query(default=None)):
    grid_out = await open_quality_file(file_id, quality, db)
    try:
        file_size = int(grid_out.length or 0)
    except Exception:
        file_size = 0
    try:
        meta = grid_out.metadata or {}
    except Exception:
        meta = {}
    content_type = meta.get("content_type") or "video/mp4"
    range_header = request.headers.get("range")
    start, end = (0, file_size - 1) if file_size else (0, 0)
    status_code = 200
    if range_header and file_size:
        start, end = parse_byte_range(range_header, file_size)
        status_code = 206
        grid_out.seek(start)

    async def content_stream():
        remaining = max(0, end - start + 1) if file_size else None
        while True:
            chunk_size = 1024 * 1024 if remaining is None else min(1024 * 1024, remaining)
            if chunk_size <= 0:
                break
            chunk = await grid_out.read(chunk_size)
            if not chunk:
                break
            if remaining is not None:
                remaining -= len(chunk)
            yield chunk

    headers = {"Accept-Ranges": "bytes"}
    if file_size:
        headers["Content-Length"] = str(end - start + 1)
        if status_code == 206:
            headers["Content-Range"] = f"bytes {start}-{end}/{file_size}"
    return StreamingResponse(content_stream(), status_code=status_code, media_type=content_type, headers=headers)
