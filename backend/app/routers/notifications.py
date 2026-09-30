from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import get_current_user_id
from app.db.session import get_db

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(user_id: str = Depends(get_current_user_id), db: AsyncIOMotorDatabase = Depends(get_db)):
    notifications = []
    async for notification in db.notifications.find({"user_id": user_id}).sort("created_at", -1).limit(50):
        notification["id"] = str(notification.pop("_id"))
        notifications.append(notification)
    return {"notifications": notifications, "unread_count": sum(1 for notification in notifications if not notification.get("read", False))}
