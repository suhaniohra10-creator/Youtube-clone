from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import get_current_user_id
from app.db.session import get_db
from app.schemas.user import UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def current_user(user_id: str = Depends(get_current_user_id), db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "avatar_url": user.get("avatar_url"),
    }


@router.patch("/me", response_model=UserRead)
async def update_current_user(
    payload: UserUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    updates = payload.model_dump(exclude_unset=True)
    username = (updates.get("username") or "").strip()
    if username:
        taken = await db.users.find_one({"username": username, "_id": {"$ne": user["_id"]}})
        if taken:
            raise HTTPException(status_code=409, detail="Username is already taken")
        updates["username"] = username
    if updates:
        await db.users.update_one({"_id": user["_id"]}, {"$set": updates})
        user.update(updates)
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "avatar_url": user.get("avatar_url"),
    }
