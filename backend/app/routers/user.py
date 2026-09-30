from fastapi import APIRouter, Depends, Path
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from app.core.security import get_current_user_id
from app.db.session import get_db
from app.services.progress import last_watched_time, save_watch_progress

router = APIRouter(prefix="/user", tags=["user"])


class ProgressIn(BaseModel):
    videoId: str = Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    currentTime: float = Field(ge=0, le=43200)


class ProgressOut(BaseModel):
    videoId: str
    lastWatchedTime: float


@router.post("/progress", response_model=ProgressOut)
async def save_progress(
    payload: ProgressIn,
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    saved = await save_watch_progress(db, user_id, payload.videoId, payload.currentTime)
    return ProgressOut(videoId=payload.videoId, lastWatchedTime=saved)


@router.get("/progress/{video_id}", response_model=ProgressOut)
async def read_progress(
    video_id: str = Path(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    time_value = await last_watched_time(db, user_id, video_id)
    return ProgressOut(videoId=video_id, lastWatchedTime=time_value)
