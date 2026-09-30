from datetime import datetime
from typing import Optional, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator


def parse_duration_seconds(value) -> int:
    if value is None or value == "":
        return 0
    if isinstance(value, bool):
        return 0
    if isinstance(value, (int, float)):
        return max(0, int(value))
    text = str(value).strip().lower().rstrip("s")
    if text.isdigit():
        return int(text)
    parts = text.split(":")
    try:
        numbers = [int(part) for part in parts]
    except ValueError:
        return 0
    total = 0
    for number in numbers:
        total = total * 60 + number
    return total


class VideoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = ""
    thumbnail_url: str = ""
    video_url: str = ""
    channel_name: str = Field(default="My Channel", min_length=1, max_length=100)
    duration: Union[int, str] = 0
    duration_seconds: int = 0
    category: str = "All"
    channel_id: str = ""
    likes: int = 0
    dislikes: int = 0

    @field_validator("duration_seconds", mode="before")
    @classmethod
    def coerce_seconds(cls, value):
        return parse_duration_seconds(value)


class VideoUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration: Optional[Union[int, str]] = None
    duration_seconds: Optional[int] = None
    channel_id: Optional[str] = None
    channel_name: Optional[str] = None
    views: Optional[int] = None
    likes: Optional[int] = None
    dislikes: Optional[int] = None


class VideoRead(BaseModel):
    id: str
    title: str
    description: str = ""
    category: str = "All"
    video_url: str = ""
    thumbnail_url: str = ""
    videoUrl: str = ""
    thumbnailUrl: str = ""
    duration: int = 0
    duration_seconds: int = 0
    views: int = 0
    likes: int = 0
    dislikes: int = 0
    channel_id: str = ""
    channelId: str = ""
    channel_name: str = "My Channel"
    preview_url: str = ""
    created_at: datetime
    createdAt: Optional[datetime] = None
    lastWatchedTime: float = 0
    model_config = ConfigDict(from_attributes=True, extra="allow")

    @field_validator("duration", "duration_seconds", mode="before")
    @classmethod
    def coerce_duration(cls, value):
        return parse_duration_seconds(value)
