from datetime import datetime, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

HISTORY_LIMIT = 200


def last_watched_from_user(user, video_id: str) -> float:
    history = (user or {}).get("watchHistory") or []
    video_id = str(video_id)
    if isinstance(history, dict):
        entry = history.get(video_id) or {}
        if isinstance(entry, (int, float)):
            return max(0.0, float(entry))
        return max(0.0, float(entry.get("currentTime") or 0))
    for row in history:
        if str((row or {}).get("videoId")) == video_id:
            return max(0.0, float(row.get("currentTime") or 0))
    return 0.0


async def last_watched_time(db: AsyncIOMotorDatabase, user_id: str, video_id: str) -> float:
    if not user_id or user_id == "guest" or not ObjectId.is_valid(user_id):
        return 0.0
    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"watchHistory": 1})
    return last_watched_from_user(user, video_id)


async def save_watch_progress(db: AsyncIOMotorDatabase, user_id: str, video_id: str, current_time: float) -> float:
    if not ObjectId.is_valid(user_id):
        return 0.0
    oid = ObjectId(user_id)
    now = datetime.now(timezone.utc)
    time_value = max(0.0, round(float(current_time), 2))
    updated = await db.users.update_one(
        {"_id": oid, "watchHistory.videoId": video_id},
        {"$set": {"watchHistory.$.currentTime": time_value, "watchHistory.$.updatedAt": now}},
    )
    if updated.matched_count:
        return time_value
    await db.users.update_one(
        {"_id": oid},
        {
            "$push": {
                "watchHistory": {
                    "$each": [{"videoId": video_id, "currentTime": time_value, "updatedAt": now}],
                    "$slice": -HISTORY_LIMIT,
                }
            }
        },
    )
    return time_value
