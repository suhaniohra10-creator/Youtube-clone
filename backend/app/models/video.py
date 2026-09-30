from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.video import parse_duration_seconds


class VideoBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: str = "All"
    video_url: str = ""
    thumbnail_url: str = ""
    duration: int = 0
    views: int = 0
    likes: int = 0
    dislikes: int = 0
    channel_id: str = ""


class VideoCreate(VideoBase):
    channel_name: str = "My Channel"
    user_id: Optional[str] = "guest_user"


class VideoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration: Optional[int] = None
    views: Optional[int] = None
    likes: Optional[int] = None
    dislikes: Optional[int] = None
    channel_id: Optional[str] = None


class VideoModel(VideoBase):
    id: str
    channel_name: str = "My Channel"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


Video = VideoModel
parse_duration = parse_duration_seconds
