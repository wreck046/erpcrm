"""Enterprise OS - FastAPI application entrypoint.

Thin entrypoint: configures app, middleware, includes routers, seeds admin.
All business logic lives in routers/ and core/.
"""
import logging
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from core.config import ADMIN_EMAIL, ADMIN_PASSWORD
from core.database import db, client
from core.security import hash_password, verify_password
from core.throttle import limiter

from routers import auth, users, dashboard, crm, erp
from routers import email as email_router
from routers import payments as payments_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# ============= APP & MIDDLEWARE =============
app = FastAPI(title="Enterprise OS API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(dashboard.router)
api_router.include_router(crm.router)
api_router.include_router(erp.router)
api_router.include_router(email_router.router)
api_router.include_router(payments_router.router)
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============= ADMIN SEEDING =============
async def seed_admin():
    org = await db.organizations.find_one({"name": "Default Organization"})
    if not org:
        org_doc = {"name": "Default Organization", "created_at": datetime.now(timezone.utc)}
        result = await db.organizations.insert_one(org_doc)
        org_id = str(result.inserted_id)
    else:
        org_id = str(org["_id"])

    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if existing is None:
        await db.users.insert_one({
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Admin User",
            "role": "admin",
            "organization_id": org_id,
            "status": "active",
            "created_at": datetime.now(timezone.utc),
        })
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}},
        )

    if not await db.stages.find_one({"organization_id": org_id}):
        default_stages = [
            {"name": "Lead", "order": 0, "organization_id": org_id},
            {"name": "Qualified", "order": 1, "organization_id": org_id},
            {"name": "Proposal", "order": 2, "organization_id": org_id},
            {"name": "Negotiation", "order": 3, "organization_id": org_id},
            {"name": "Closed Won", "order": 4, "organization_id": org_id},
        ]
        await db.stages.insert_many(default_stages)

    Path("/app/memory").mkdir(exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write("## Admin Account\n")
        f.write(f"- Email: {ADMIN_EMAIL}\n")
        f.write(f"- Password: {ADMIN_PASSWORD}\n")
        f.write("- Role: admin\n\n")
        f.write("## Auth Endpoints\n")
        f.write("- POST /api/auth/register\n")
        f.write("- POST /api/auth/login\n")
        f.write("- GET /api/auth/me\n")
        f.write("- POST /api/auth/logout\n")


# ============= LIFECYCLE =============
@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.organizations.create_index("name")
    await seed_admin()
    logger.info("Database indexes created and admin seeded")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
