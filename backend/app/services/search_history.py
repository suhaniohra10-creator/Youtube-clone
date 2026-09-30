from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

HISTORY_LIMIT = 20


def serialize_history(user) -> list[dict]:
    items = []
    for row in (user or {}).get("searchHistory") or []:
        query = str((row or {}).get("query") or "").strip()
        item_id = str((row or {}).get("id") or "")
        if query and item_id:
            items.append({"id": item_id, "query": query})
    return items


async def list_search_history(db: AsyncIOMotorDatabase, user_id: str) -> list[dict]:
    if not ObjectId.is_valid(user_id):
        return []
    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"searchHistory": 1})
    return serialize_history(user)


async def add_search_history(db: AsyncIOMotorDatabase, user_id: str, query: str) -> dict:
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=401, detail="Invalid user")
    text = " ".join(query.strip().split())[:200]
    if not text:
        raise HTTPException(status_code=422, detail="Query is required")
    oid = ObjectId(user_id)
    item = {"id": str(ObjectId()), "query": text, "createdAt": datetime.now(timezone.utc)}
    await db.users.update_one({"_id": oid}, {"$pull": {"searchHistory": {"query": text}}})
    result = await db.users.update_one(
        {"_id": oid},
        {"$push": {"searchHistory": {"$each": [item], "$position": 0, "$slice": HISTORY_LIMIT}}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": item["id"], "query": text}


async def remove_search_history(db: AsyncIOMotorDatabase, user_id: str, query_id: str) -> None:
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=401, detail="Invalid user")
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$pull": {"searchHistory": {"id": query_id}}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Search history item not found")
