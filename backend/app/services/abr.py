import asyncio
import re
import subprocess
import tempfile
from pathlib import Path
from shutil import which

from bson import ObjectId

from app.db import mongodb
from app.db.session import get_database

LADDER = ((720, "2500k"), (480, "1000k"), (360, "600k"))
_building = set()


def ffmpeg_bin():
    found = which("ffmpeg")
    if found:
        return found
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def source_height(ffmpeg, path):
    result = subprocess.run([ffmpeg, "-i", str(path)], capture_output=True, text=True, check=False)
    match = re.search(r"(\d{2,5})x(\d{2,5})", result.stderr or "")
    return int(match.group(2)) if match else 1080


def transcode_file(ffmpeg, source, height, bitrate, dest):
    command = [
        ffmpeg, "-y", "-i", str(source), "-vf", f"scale=-2:{height}",
        "-c:v", "libx264", "-preset", "veryfast", "-b:v", bitrate,
        "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", str(dest),
    ]
    result = subprocess.run(command, capture_output=True, check=False)
    return result.returncode == 0 and dest.exists() and dest.stat().st_size > 0


async def _download_original(file_id, dest):
    grid_out = await mongodb.gridfs_bucket.open_download_stream(file_id if isinstance(file_id, ObjectId) else ObjectId(str(file_id)))
    with dest.open("wb") as handle:
        while True:
            chunk = await grid_out.read(1024 * 1024)
            if not chunk:
                break
            handle.write(chunk)


async def _upload_rendition(path, height):
    upload = mongodb.gridfs_bucket.open_upload_stream(
        f"rendition-{height}.mp4",
        metadata={"content_type": "video/mp4", "height": height},
    )
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(1024 * 1024)
            if not chunk:
                break
            await upload.write(chunk)
    await upload.close()
    return upload._id


async def ensure_renditions(video_id: str):
    if not video_id or video_id in _building:
        return
    ffmpeg = ffmpeg_bin()
    if not ffmpeg:
        return
    _building.add(video_id)
    try:
        await _build_renditions(video_id, ffmpeg)
    finally:
        _building.discard(video_id)


async def _build_renditions(video_id, ffmpeg):
    db = get_database()
    document = await db.videos.find_one({"_id": ObjectId(video_id)}) if ObjectId.is_valid(video_id) else None
    if not document or document.get("abr_ready") or not document.get("file_id"):
        return
    work = Path(tempfile.mkdtemp(prefix="yt-abr-"))
    source = work / "source.mp4"
    try:
        await _download_original(document["file_id"], source)
        height = await asyncio.to_thread(source_height, ffmpeg, source)
        renditions = []
        for target, bitrate in LADDER:
            if height <= target:
                continue
            dest = work / f"{target}.mp4"
            ok = await asyncio.to_thread(transcode_file, ffmpeg, source, target, bitrate, dest)
            if not ok:
                continue
            file_id = await _upload_rendition(dest, target)
            renditions.append({"id": str(target), "height": target, "label": f"{target}p", "file_id": str(file_id)})
        if renditions:
            await db.videos.update_one({"_id": document["_id"]}, {"$set": {"renditions": renditions, "abr_ready": True}})
        else:
            await db.videos.update_one({"_id": document["_id"]}, {"$set": {"abr_ready": True, "renditions": []}})
    finally:
        for path in work.glob("*"):
            path.unlink(missing_ok=True)
        work.rmdir()
