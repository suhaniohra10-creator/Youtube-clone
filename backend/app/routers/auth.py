from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from google.auth.exceptions import GoogleAuthError
from google.oauth2 import id_token
from google.auth.transport import requests

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.schemas.user import GoogleToken, Token, UserCreate, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])
google_requests = requests.Request()


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    existing = await db.users.find_one({"$or": [{"email": payload.email}, {"username": payload.username}]})
    if existing:
        raise HTTPException(status_code=409, detail="Username or email is already registered")
    document = {
        "username": payload.username,
        "email": payload.email,
        "hashed_password": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc),
        "watchHistory": [],
        "searchHistory": [],
    }
    result = await db.users.insert_one(document)
    return {"id": str(result.inserted_id), "username": document["username"], "email": document["email"]}


@router.post("/login", response_model=Token)
async def login(username: str, password: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db.users.find_one({"username": username})
    if not user or not verify_password(password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return Token(access_token=create_access_token(str(user["_id"])))


@router.post("/google", response_model=Token)
async def google_login(payload: GoogleToken, db: AsyncIOMotorDatabase = Depends(get_db)):
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google authentication is not configured")

    try:
        claims = id_token.verify_oauth2_token(payload.credential, google_requests, settings.google_client_id)
    except (ValueError, GoogleAuthError) as error:
        raise HTTPException(status_code=401, detail="Invalid Google credential") from error

    email = claims.get("email")
    if not email or not claims.get("email_verified"):
        raise HTTPException(status_code=401, detail="Google account email is not verified")

    user = await db.users.find_one({"email": email})
    if not user:
        base_username = (claims.get("name") or email.split("@")[0]).lower().replace(" ", "-")[:42]
        username = base_username or "google-user"
        suffix = 1
        while await db.users.find_one({"username": username}):
            username = f"{base_username[:38]}-{suffix}"
            suffix += 1
        document = {
            "username": username,
            "email": email,
            "google_id": claims.get("sub"),
            "avatar_url": claims.get("picture"),
            "created_at": datetime.now(timezone.utc),
            "watchHistory": [],
            "searchHistory": [],
        }
        result = await db.users.insert_one(document)
        user_id = result.inserted_id
    else:
        user_id = user["_id"]
        await db.users.update_one(
            {"_id": user_id},
            {"$set": {"google_id": claims.get("sub"), "avatar_url": claims.get("picture")}},
        )

    return Token(access_token=create_access_token(str(user_id)))

