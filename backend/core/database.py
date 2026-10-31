"""MongoDB client and shared db instance."""
from motor.motor_asyncio import AsyncIOMotorClient
from .config import MONGO_URL, DB_NAME

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


async def next_sequence(name: str, organization_id: str) -> int:
    """Atomically increment a per-tenant counter and return the new value."""
    key = f"{organization_id}:{name}"
    result = await db.counters.find_one_and_update(
        {"_id": key},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    return result["seq"]
