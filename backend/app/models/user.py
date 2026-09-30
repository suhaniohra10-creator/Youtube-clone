from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class User(BaseModel):
    id: str | None = None
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    hashed_password: str
    created_at: datetime
    watchHistory: list[dict] = Field(default_factory=list)
    searchHistory: list[dict] = Field(default_factory=list)