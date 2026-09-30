from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/ai", tags=["ai"])


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    video_id: str = ""
    title: str = ""
    description: str = ""
    category: str = ""
    duration: Optional[str] = None


class AskResponse(BaseModel):
    answer: str


def build_answer(payload: AskRequest) -> str:
    question = payload.question.lower()
    title = payload.title or "this video"
    category = payload.category or "the current topic"
    description = (payload.description or "").strip() or f"A {category.lower()} video titled {title}."
    duration = payload.duration or "the runtime shown on the player"

    if any(word in question for word in ("summary", "summarize", "about", "what is", "what's")):
        return f"{title} is a {category} video. {description[:280]}"
    if any(word in question for word in ("how long", "duration", "length", "runtime", "time")):
        return f"{title} runs for {duration}. Use the player timeline to jump to key moments."
    if any(word in question for word in ("who", "channel", "creator")):
        return f"This watch page is about {title}. Open the channel name under the player for more from this creator."
    if any(word in question for word in ("download", "save", "offline")):
        return "Use Download under the player to save this video file locally, or add it to Watch later."
    if any(word in question for word in ("like", "dislike", "comment")):
        return "Likes, dislikes, and comments on this page are unique to this video. Your reaction updates the counters immediately."
    if payload.category.lower() == "tech" and any(word in question for word in ("python", "ml", "machine", "react", "stack")):
        return f"{title} covers {category} concepts. {description[:240]} Try pausing on code sections and asking about a specific step."
    if payload.category.lower() == "music":
        return f"{title} is trending in Music. {description[:220]} Ask for similar hit videos or playlists from the Home feed."
    return (
        f"For {title}: {description[:220]} "
        "I can summarize the video, explain the topic, or point you to likes, download, and related videos."
    )


@router.post("/ask", response_model=AskResponse)
def ask_about_video(payload: AskRequest) -> AskResponse:
    """Public FAQ assistant scoped to the video currently on the watch page."""
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")
    return AskResponse(answer=build_answer(payload))
