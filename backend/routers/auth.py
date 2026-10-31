"""Authentication routes: register, login, me, logout."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from bson import ObjectId

from core.database import db
from core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    set_auth_cookie,
)
from core.throttle import limiter
from models.schemas import User, UserLogin, UserRegister

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=User)
@limiter.limit("10/minute")
async def register(request: Request, user_data: UserRegister, response: Response):
    email = user_data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    org_doc = {"name": user_data.organization_name, "created_at": datetime.now(timezone.utc)}
    org_result = await db.organizations.insert_one(org_doc)
    org_id = str(org_result.inserted_id)

    user_doc = {
        "email": email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "role": "admin",
        "organization_id": org_id,
        "status": "active",
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    default_stages = [
        {"name": "Lead", "order": 0, "organization_id": org_id},
        {"name": "Qualified", "order": 1, "organization_id": org_id},
        {"name": "Proposal", "order": 2, "organization_id": org_id},
        {"name": "Negotiation", "order": 3, "organization_id": org_id},
        {"name": "Closed Won", "order": 4, "organization_id": org_id},
    ]
    await db.stages.insert_many(default_stages)

    token = create_access_token(user_id, email, org_id, "admin")
    set_auth_cookie(response, token)

    return User(
        id=user_id,
        email=email,
        name=user_data.name,
        role="admin",
        organization_id=org_id,
        created_at=user_doc["created_at"],
    )


@router.post("/login", response_model=User)
@limiter.limit("10/minute")
async def login(request: Request, credentials: UserLogin, response: Response):
    email = credentials.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(user["_id"])
    token = create_access_token(user_id, email, user["organization_id"], user["role"])
    set_auth_cookie(response, token)

    return User(
        id=user_id,
        email=email,
        name=user["name"],
        role=user["role"],
        organization_id=user["organization_id"],
        created_at=user["created_at"],
    )


@router.get("/me", response_model=User)
async def get_me(user: dict = Depends(get_current_user)):
    return User(**user)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    return {"message": "Logged out successfully"}
