import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
from app.core.config import settings

class Database:
    client: AsyncIOMotorClient = None

db = Database()

async def connect_to_mongo():
    # tlsCAFile=certifi.where() resolves SSL handshake issues
    db.client = AsyncIOMotorClient(
        settings.mongodb_url,
        tlsCAFile=certifi.where()
    )
    global gridfs_bucket
    gridfs_bucket = AsyncIOMotorGridFSBucket(db.client[settings.database_name])
    print("Connected to MongoDB!")

async def close_mongo_connection():
    if db.client:
        db.client.close()
        print("Closed MongoDB connection!")

def get_database():
    return db.client[settings.database_name]


initialize_mongodb = connect_to_mongo
close_mongodb = close_mongo_connection
gridfs_bucket = None